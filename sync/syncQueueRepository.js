import * as Crypto from "expo-crypto";

import { getLocalDatabase } from "../database/localDatabase.js";

function serializePayload(payload) {
  return payload === undefined || payload === null
    ? null
    : JSON.stringify(payload);
}

export async function enqueueSyncOperation({
  userId,
  entityType,
  entityId,
  operation,
  endpoint,
  method,
  payload,
  database: providedDatabase,
}) {
  if (!userId) {
    throw new Error("Missing user ID.");
  }

  if (!entityId) {
    throw new Error("Missing entity ID.");
  }

  const database = providedDatabase ?? (await getLocalDatabase());
  const operationId = Crypto.randomUUID();
  const now = new Date().toISOString();

  /*
   * Pour les préférences, seule la dernière modification
   * non synchronisée est utile.
   */
  const replacePreviousOperation = [
    "child_preferences",
    "child_profile",
    "child_relationship",
    "user_notification_preferences",
  ].includes(entityType);

  if (replacePreviousOperation) {
    await database.runAsync(
      `
      DELETE FROM sync_queue
      WHERE user_id = ?
        AND entity_type = ?
        AND entity_id = ?
        AND status IN ('pending', 'failed')
    `,
      [userId, entityType, entityId],
    );
  }

  await database.runAsync(
    `
      INSERT INTO sync_queue (
        id,
        user_id,
        entity_type,
        entity_id,
        operation,
        endpoint,
        http_method,
        payload_json,
        status,
        attempt_count,
        next_attempt_at,
        last_error_code,
        last_error_message,
        created_at,
        updated_at
      )
      VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?,
        'pending', 0, NULL, NULL, NULL, ?, ?
      )
    `,
    [
      operationId,
      userId,
      entityType,
      entityId,
      operation,
      endpoint,
      method,
      serializePayload(payload),
      now,
      now,
    ],
  );

  return operationId;
}

export async function getPendingSyncOperations(userId) {
  if (!userId) {
    throw new Error("Missing user ID.");
  }

  const database = await getLocalDatabase();
  const now = new Date().toISOString();

  return database.getAllAsync(
    `
      SELECT current.*
      FROM sync_queue AS current
      WHERE current.user_id = ?
        AND current.status IN ('pending', 'failed')
        AND (
          current.next_attempt_at IS NULL
          OR current.next_attempt_at <= ?
        )
        AND NOT EXISTS (
          SELECT 1
          FROM sync_queue AS previous
          WHERE previous.user_id = current.user_id
            AND previous.entity_type = current.entity_type
            AND previous.entity_id = current.entity_id
            AND previous.rowid < current.rowid
        )
      ORDER BY current.rowid ASC
    `,
    [userId, now],
  );
}

export async function markSyncOperationFailed({
  operationId,
  errorCode,
  errorMessage,
  nextAttemptAt,
}) {
  const database = await getLocalDatabase();
  const now = new Date().toISOString();

  await database.runAsync(
    `
      UPDATE sync_queue
      SET status = 'failed',
          attempt_count = attempt_count + 1,
          next_attempt_at = ?,
          last_error_code = ?,
          last_error_message = ?,
          updated_at = ?
      WHERE id = ?
    `,
    [
      nextAttemptAt,
      errorCode || "SYNC_FAILED",
      errorMessage || "Unable to synchronize data.",
      now,
      operationId,
    ],
  );
}

export async function removeSyncOperation(operationId) {
  const database = await getLocalDatabase();

  await database.runAsync(
    `
      DELETE FROM sync_queue
      WHERE id = ?
    `,
    [operationId],
  );
}
