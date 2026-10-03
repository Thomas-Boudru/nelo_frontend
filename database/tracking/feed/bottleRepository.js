import * as Crypto from "expo-crypto";

import { getLocalDatabase } from "../../localDatabase.js";

import { enqueueSyncOperation } from "../../../sync/syncQueueRepository.js";

import { saveVaccinationReminderFromEntry } from "../medication/vaccinationReminderRepository.js";

const MILK_TYPES = new Set(["formula", "breast_milk", "mixed", "other"]);

function validatePositiveVolume(value) {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0 &&
    value <= 99999.999
  );
}

function roundVolume(value) {
  return Math.round(value * 1000) / 1000;
}

function mapLocalEntry(row) {
  return {
    ...JSON.parse(row.entry_json),
    serverVersion: row.server_version,
    localRevision: row.local_revision,
    syncStatus: row.sync_status,
    deletedAt: row.deleted_at,
  };
}

export async function getLocalBottleEntries({ userId, childId, limit = 30 }) {
  if (!userId || !childId) {
    throw new Error("Missing user ID or child ID.");
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error("Invalid tracking entry limit.");
  }

  const database = await getLocalDatabase();

  const rows = await database.getAllAsync(
    `
      SELECT *
      FROM tracking_entries_local
      WHERE user_id = ?
        AND child_id = ?
        AND entry_type = 'bottle'
        AND deleted_at IS NULL
      ORDER BY started_at DESC, entry_id DESC
      LIMIT ?
    `,
    [userId, childId, limit],
  );

  return rows.map(mapLocalEntry);
}

export async function createLocalBottleEntry({ userId, childId, data }) {
  if (!userId || !childId) {
    throw new Error("Missing user ID or child ID.");
  }

  if (!data || typeof data !== "object") {
    throw new Error("Missing bottle entry.");
  }

  if (
    !validatePositiveVolume(data.amountMl) ||
    !validatePositiveVolume(data.bottleCapacityMl)
  ) {
    throw new Error("Invalid bottle volume.");
  }

  const amountMl = roundVolume(data.amountMl);
  const bottleCapacityMl = roundVolume(data.bottleCapacityMl);

  if (amountMl <= 0 || bottleCapacityMl <= 0) {
    throw new Error("Invalid bottle volume.");
  }

  if (!MILK_TYPES.has(data.milkType)) {
    throw new Error("Invalid milk type.");
  }

  const dateValue = data.feedingDate;

  if (!(dateValue instanceof Date) && typeof dateValue !== "string") {
    throw new Error("Invalid feeding date.");
  }

  const date = new Date(dateValue);

  if (!Number.isFinite(date.getTime())) {
    throw new Error("Invalid feeding date.");
  }

  if (data.note != null && typeof data.note !== "string") {
    throw new Error("Invalid bottle note.");
  }

  const note = data.note?.trim() || null;

  if (note && note.length > 10000) {
    throw new Error("The bottle note is too long.");
  }

  const database = await getLocalDatabase();

  const id = Crypto.randomUUID();
  const now = new Date().toISOString();
  const feedingDate = date.toISOString();

  const payload = {
    id,
    amountMl,
    bottleCapacityMl,
    milkType: data.milkType,
    feedingDate,
    note,
  };

  const entry = {
    ...payload,
    childId,
    type: "bottle",
    startedAt: feedingDate,
    source: "manual",
    createdByUserId: userId,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    version: null,
  };

  await database.withExclusiveTransactionAsync(async (transaction) => {
    await transaction.runAsync(
      `
          INSERT INTO tracking_entries_local (
            user_id,
            entry_id,
            child_id,
            entry_type,
            entry_json,
            server_version,
            local_revision,
            sync_status,
            deleted_at,
            started_at,
            updated_at
          )
          VALUES (
            ?, ?, ?, 'bottle', ?,
            NULL, 1, 'pending', NULL, ?, ?
          )
        `,
      [userId, id, childId, JSON.stringify(entry), feedingDate, now],
    );

    await enqueueSyncOperation({
      userId,
      entityType: "tracking_entry",
      entityId: id,
      operation: "create:1",
      endpoint: `/api/children/${encodeURIComponent(childId)}/bottles`,
      method: "POST",
      payload,
      database: transaction,
    });
  });

  return {
    ...entry,
    serverVersion: null,
    localRevision: 1,
    syncStatus: "pending",
  };
}

export async function completeTrackingEntrySync({ operation, serverEntry }) {
  if (
    !serverEntry ||
    serverEntry.id !== operation.entity_id ||
    ![
      "bottle",
      "breastfeeding",
      "pumping",
      "solids",
      "sleep",
      "diaper",
      "potty",
      "mood",
      "medication",
      "vaccine",
    ].includes(serverEntry.type) ||
    !Number.isInteger(serverEntry.version) ||
    serverEntry.version < 1 ||
    typeof serverEntry.updatedAt !== "string" ||
    !Number.isFinite(Date.parse(serverEntry.updatedAt))
  ) {
    throw new Error("Invalid bottle entry synchronization response.");
  }

  const match = /^(create|stop):([1-9]\d*)$/.exec(operation.operation);

  if (!match || (match[1] === "stop" && serverEntry.type !== "sleep")) {
    throw new Error("Invalid tracking entry synchronization operation.");
  }

  const expectedRevision = Number(match[2]);

  if (!Number.isSafeInteger(expectedRevision)) {
    throw new Error("Invalid bottle entry revision.");
  }

  const dateFieldByType = {
    bottle: "feedingDate",
    breastfeeding: "feedingDate",
    solids: "feedingDate",
    pumping: "pumpingDate",
    diaper: "diaperDate",
    potty: "pottyDate",
    mood: "moodDate",
    medication: "medicationDate",
    vaccine: "vaccineDate",
  };

  const dateField = dateFieldByType[serverEntry.type];

  const startedAt =
    serverEntry.startedAt ?? (dateField ? serverEntry[dateField] : undefined);

  if (
    typeof startedAt !== "string" ||
    !Number.isFinite(Date.parse(startedAt))
  ) {
    throw new Error("Invalid server tracking date.");
  }

  const normalizedDate = new Date(startedAt).toISOString();

  const normalizedEntry = {
    ...serverEntry,
    startedAt: normalizedDate,
    ...(dateField ? { [dateField]: normalizedDate } : {}),
    deletedAt: serverEntry.deletedAt ?? null,
  };

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

    if (!row) {
      throw new Error("Local bottle entry not found.");
    }

    if (
      row.child_id !== serverEntry.childId ||
      row.entry_type !== serverEntry.type
    ) {
      throw new Error("Tracking entry synchronization mismatch.");
    }

    if (
      row.server_version !== null &&
      row.server_version > serverEntry.version
    ) {
      throw new Error(
        "The synchronization response contains an older version.",
      );
    }

    const localEntryBeforeSync = JSON.parse(row.entry_json);

    const entryToSave = {
      ...normalizedEntry,

      ...(serverEntry.type === "solids"
        ? {
            appreciation: serverEntry.reaction ?? null,
            photos: localEntryBeforeSync.photos ?? [],
          }
        : {}),

      ...(serverEntry.type === "vaccine"
        ? {
            photos: localEntryBeforeSync.photos ?? serverEntry.photos ?? [],
          }
        : {}),
    };

    if (row.local_revision === expectedRevision) {
      if (serverEntry.type === "vaccine") {
        await saveVaccinationReminderFromEntry({
          database: transaction,
          userId: operation.user_id,
          entry: normalizedEntry,
        });
      }

      await transaction.runAsync(
        `
            UPDATE tracking_entries_local
            SET entry_json = ?,
                server_version = ?,
                sync_status = 'synced',
                deleted_at = ?,
                started_at = ?,
                updated_at = ?
            WHERE user_id = ?
              AND entry_id = ?
              AND local_revision = ?
          `,
        [
          JSON.stringify(entryToSave),
          normalizedEntry.version,
          normalizedEntry.deletedAt,
          normalizedEntry.startedAt,
          normalizedEntry.updatedAt,
          operation.user_id,
          operation.entity_id,
          expectedRevision,
        ],
      );
    } else {
      // Conserver une modification locale plus récente.
      const localEntry = JSON.parse(row.entry_json);

      await transaction.runAsync(
        `
            UPDATE tracking_entries_local
            SET entry_json = ?,
                server_version = ?
            WHERE user_id = ?
              AND entry_id = ?
          `,
        [
          JSON.stringify({
            ...localEntry,
            version: serverEntry.version,
          }),
          serverEntry.version,
          operation.user_id,
          operation.entity_id,
        ],
      );
    }

    // La mise à jour locale et la suppression de l'opération
    // sont validées dans la même transaction.
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

export { completeTrackingEntrySync as completeBottleEntrySync };
