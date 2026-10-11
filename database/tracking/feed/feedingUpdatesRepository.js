import { getLocalDatabase } from "../../localDatabase.js";
import { enqueueSyncOperation } from "../../../sync/syncQueueRepository.js";

const PATH_BY_TYPE = {
  breastfeeding: "breastfeeding",
  pumping: "pumping",
  solids: "solids",
};
export async function saveLocalFeedingUpdate({
  userId,
  childId,
  entryId,
  type,
  values,
  startedAt,
  localValues = {},
  validateLocal,
}) {
  if (!userId || !childId || !entryId) {
    throw new Error("Missing user ID, child ID or tracking entry ID.");
  }

  const path = PATH_BY_TYPE[type];

  if (!path) {
    throw new Error("Unsupported feeding update type.");
  }

  const database = await getLocalDatabase();
  let savedEntry;

  await database.withExclusiveTransactionAsync(async (transaction) => {
    const row = await transaction.getFirstAsync(
      `
        SELECT *
        FROM tracking_entries_local
        WHERE user_id = ?
          AND child_id = ?
          AND entry_id = ?
          AND entry_type = ?
          AND deleted_at IS NULL
      `,
      [userId, childId, entryId, type],
    );

    if (!row) {
      throw new Error("Local feeding entry not found.");
    }

    if (validateLocal) {
      await validateLocal({
        transaction,
        row,
      });
    }

    const previous = await transaction.getFirstAsync(
      `
        SELECT *
        FROM sync_queue
        WHERE user_id = ?
          AND entity_type = 'tracking_entry'
          AND entity_id = ?
        ORDER BY rowid DESC
        LIMIT 1
      `,
      [userId, entryId],
    );

    const collectionEndpoint = `/api/children/${encodeURIComponent(childId)}/${path}`;

    const entryEndpoint = `${collectionEndpoint}/${encodeURIComponent(entryId)}`;

    let expectedVersion = row.server_version;

    if (previous) {
      if (
        previous.http_method === "POST" &&
        previous.endpoint === collectionEndpoint &&
        /^create:[1-9]\d*$/.test(previous.operation)
      ) {
        expectedVersion = 1;
      } else if (
        previous.http_method === "PUT" &&
        previous.endpoint === entryEndpoint &&
        /^update:[1-9]\d*$/.test(previous.operation)
      ) {
        const previousPayload = JSON.parse(previous.payload_json);

        if (
          !Number.isSafeInteger(previousPayload?.version) ||
          previousPayload.version < 1
        ) {
          throw new Error("Invalid pending feeding version.");
        }

        expectedVersion = previousPayload.version + 1;
      } else {
        throw new Error("This feeding has an incompatible pending operation.");
      }
    }

    if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1) {
      throw new Error("Missing feeding server version.");
    }

    const localRevision = row.local_revision + 1;

    if (!Number.isSafeInteger(localRevision) || localRevision < 2) {
      throw new Error("Invalid feeding local revision.");
    }

    const now = new Date().toISOString();

    const entry = {
      ...JSON.parse(row.entry_json),
      ...values,
      ...localValues,
      id: entryId,
      childId,
      type,
      startedAt,
      updatedByUserId: userId,
      updatedAt: now,
      deletedAt: null,
      version: row.server_version,
    };

    await transaction.runAsync(
      `
        UPDATE tracking_entries_local
        SET entry_json = ?,
            local_revision = ?,
            sync_status = 'pending',
            started_at = ?,
            updated_at = ?
        WHERE user_id = ?
          AND child_id = ?
          AND entry_id = ?
      `,
      [
        JSON.stringify(entry),
        localRevision,
        startedAt,
        now,
        userId,
        childId,
        entryId,
      ],
    );

    await enqueueSyncOperation({
      userId,
      entityType: "tracking_entry",
      entityId: entryId,
      operation: `update:${localRevision}`,
      endpoint: entryEndpoint,
      method: "PUT",
      payload: {
        ...values,
        version: expectedVersion,
      },
      database: transaction,
    });

    savedEntry = {
      ...entry,
      serverVersion: row.server_version,
      localRevision,
      syncStatus: "pending",
    };
  });

  return savedEntry;
}
