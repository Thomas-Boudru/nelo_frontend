import { getLocalDatabase } from "../localDatabase.js";
import { enqueueSyncOperation } from "../../sync/syncQueueRepository.js";

function isValidVersion(value) {
  return Number.isSafeInteger(value) && value >= 1;
}

export async function deleteLocalTrackingEntry({ userId, childId, entryId }) {
  if (!userId || !childId || !entryId) {
    throw new Error("Missing user ID, child ID or tracking entry ID.");
  }

  const database = await getLocalDatabase();
  let deletedEntry;

  await database.withExclusiveTransactionAsync(async (transaction) => {
    const row = await transaction.getFirstAsync(
      `
        SELECT *
        FROM tracking_entries_local
        WHERE user_id = ?
          AND child_id = ?
          AND entry_id = ?
      `,
      [userId, childId, entryId],
    );

    if (!row) {
      throw new Error("Local tracking entry not found.");
    }

    const currentEntry = JSON.parse(row.entry_json);

    // Un deuxième appui ne crée pas une deuxième suppression.
    if (row.deleted_at) {
      deletedEntry = {
        ...currentEntry,
        deletedAt: row.deleted_at,
        serverVersion: row.server_version,
        localRevision: row.local_revision,
        syncStatus: row.sync_status,
      };

      return;
    }

    const previousOperation = await transaction.getFirstAsync(
      `
        SELECT id
        FROM sync_queue
        WHERE user_id = ?
          AND entity_type IN ('tracking_entry', 'tracking_photo')
          AND entity_id = ?
        ORDER BY rowid DESC
        LIMIT 1
      `,
      [userId, entryId],
    );

    // Si une opération précède le DELETE, sa réponse serveur
    // fournira la version exacte à utiliser.
    const version = previousOperation ? null : row.server_version;

    if (!previousOperation && !isValidVersion(version)) {
      throw new Error("Missing tracking server version.");
    }

    const localRevision = row.local_revision + 1;

    if (!Number.isSafeInteger(localRevision)) {
      throw new Error("Invalid tracking local revision.");
    }

    const now = new Date().toISOString();

    const entry = {
      ...currentEntry,
      id: entryId,
      childId,
      type: row.entry_type,
      deletedAt: now,
      deletedByUserId: userId,
      updatedByUserId: userId,
      updatedAt: now,
    };

    await transaction.runAsync(
      `
        UPDATE tracking_entries_local
        SET entry_json = ?,
            deleted_at = ?,
            updated_at = ?,
            local_revision = ?,
            sync_status = 'pending'
        WHERE user_id = ?
          AND child_id = ?
          AND entry_id = ?
      `,
      [
        JSON.stringify(entry),
        now,
        now,
        localRevision,
        userId,
        childId,
        entryId,
      ],
    );

    await enqueueSyncOperation({
      userId,
      entityType: "tracking_entry",
      entityId: entryId,
      operation: `delete:${localRevision}`,
      endpoint:
        `/api/children/${encodeURIComponent(childId)}` +
        `/tracking/${encodeURIComponent(entryId)}`,
      method: "DELETE",
      payload: { version },
      database: transaction,
    });

    deletedEntry = {
      ...entry,
      serverVersion: row.server_version,
      localRevision,
      syncStatus: "pending",
    };
  });

  return deletedEntry;
}

// Appelée dans la transaction qui termine l'opération précédente.
// La version est ensuite conservée telle quelle pour les tentatives suivantes.
export async function prepareNextTrackingDeletion({
  database,
  operation,
  serverVersion,
}) {
  if (!isValidVersion(serverVersion)) {
    throw new Error("Invalid tracking server version.");
  }

  const nextOperation = await database.getFirstAsync(
    `
      SELECT *
      FROM sync_queue
      WHERE user_id = ?
        AND entity_type IN ('tracking_entry', 'tracking_photo')
        AND entity_id = ?
        AND rowid > (
          SELECT rowid
          FROM sync_queue
          WHERE id = ?
            AND user_id = ?
        )
      ORDER BY rowid ASC
      LIMIT 1
    `,
    [operation.user_id, operation.entity_id, operation.id, operation.user_id],
  );

  if (!nextOperation || !/^delete:[1-9]\d*$/.test(nextOperation.operation)) {
    return;
  }

  const payload = JSON.parse(nextOperation.payload_json);

  if (payload.version != null) {
    return;
  }

  await database.runAsync(
    `
      UPDATE sync_queue
      SET payload_json = ?,
          updated_at = ?
      WHERE id = ?
        AND user_id = ?
    `,
    [
      JSON.stringify({
        ...payload,
        version: serverVersion,
      }),
      new Date().toISOString(),
      nextOperation.id,
      operation.user_id,
    ],
  );
}

export function prepareTrackingDeletionPayload({ operation, payload }) {
  if (
    operation.http_method !== "DELETE" ||
    !/^delete:[1-9]\d*$/.test(operation.operation)
  ) {
    throw new Error("Invalid tracking deletion operation.");
  }

  if (!isValidVersion(payload?.version)) {
    const error = new Error(
      "The previous tracking operation must finish before deletion.",
    );

    error.code = "SYNC_DEPENDENCY_PENDING";
    throw error;
  }

  return { version: payload.version };
}

export async function completeTrackingDeletionSync({ operation, response }) {
  const serverEntry = response?.entry;
  const match = /^delete:([1-9]\d*)$/.exec(operation.operation);
  const expectedRevision = match ? Number(match[1]) : null;

  if (
    response?.deleted !== true ||
    !serverEntry ||
    serverEntry.id !== operation.entity_id ||
    !isValidVersion(serverEntry.version) ||
    !Number.isSafeInteger(expectedRevision) ||
    typeof serverEntry.deletedAt !== "string" ||
    !Number.isFinite(Date.parse(serverEntry.deletedAt)) ||
    typeof serverEntry.updatedAt !== "string" ||
    !Number.isFinite(Date.parse(serverEntry.updatedAt))
  ) {
    throw new Error("Invalid tracking deletion response.");
  }

  const database = await getLocalDatabase();

  await database.withExclusiveTransactionAsync(async (transaction) => {
    const row = await transaction.getFirstAsync(
      `
        SELECT *
        FROM tracking_entries_local
        WHERE user_id = ?
          AND entry_id = ?
      `,
      [operation.user_id, operation.entity_id],
    );

    if (
      !row ||
      row.child_id !== serverEntry.childId ||
      row.entry_type !== serverEntry.type
    ) {
      throw new Error("Tracking deletion synchronization mismatch.");
    }

    if (row.local_revision !== expectedRevision || !row.deleted_at) {
      throw new Error("The local tracking entry changed during deletion.");
    }

    const localEntry = JSON.parse(row.entry_json);

    // Une lecture serveur a éventuellement déjà reçu une version
    // plus récente. Ne pas la remplacer par une ancienne réponse.
    const hasNewerVersion =
      row.server_version != null && row.server_version > serverEntry.version;

    const version = hasNewerVersion ? row.server_version : serverEntry.version;

    // Conserver les détails locaux : la réponse DELETE est partielle.
    const entry = hasNewerVersion
      ? {
          ...localEntry,
          version,
          deletedAt: row.deleted_at,
        }
      : {
          ...localEntry,
          version,
          deletedAt: serverEntry.deletedAt,
          deletedByUserId: serverEntry.deletedByUserId,
          updatedByUserId: serverEntry.updatedByUserId,
          updatedAt: serverEntry.updatedAt,
        };

    await transaction.runAsync(
      `
        UPDATE tracking_entries_local
        SET entry_json = ?,
            server_version = ?,
            sync_status = 'synced',
            deleted_at = ?,
            updated_at = ?
        WHERE user_id = ?
          AND entry_id = ?
      `,
      [
        JSON.stringify(entry),
        version,
        entry.deletedAt,
        hasNewerVersion ? row.updated_at : serverEntry.updatedAt,
        operation.user_id,
        operation.entity_id,
      ],
    );

    await transaction.runAsync(
      `
        DELETE FROM sync_queue
        WHERE id = ?
          AND user_id = ?
      `,
      [operation.id, operation.user_id],
    );
  });
}
