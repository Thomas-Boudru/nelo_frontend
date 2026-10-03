import * as Crypto from "expo-crypto";

import { getLocalDatabase } from "../../localDatabase.js";
import { enqueueSyncOperation } from "../../../sync/syncQueueRepository.js";

function normalizeVolume(value) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 99999.999
  ) {
    throw new Error("Invalid pumping amount.");
  }

  return Math.round(value * 1000) / 1000;
}

export async function getLocalPumpingEntries({ userId, childId, limit = 30 }) {
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
        AND entry_type = 'pumping'
        AND deleted_at IS NULL
      ORDER BY started_at DESC, entry_id DESC
      LIMIT ?
    `,
    [userId, childId, limit],
  );

  return rows.map((row) => ({
    ...JSON.parse(row.entry_json),
    serverVersion: row.server_version,
    localRevision: row.local_revision,
    syncStatus: row.sync_status,
    deletedAt: row.deleted_at,
  }));
}

export async function createLocalPumpingEntry({ userId, childId, data }) {
  if (!userId || !childId) {
    throw new Error("Missing user ID or child ID.");
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Invalid pumping entry.");
  }

  const leftAmountMl = normalizeVolume(data.leftAmountMl);
  const rightAmountMl = normalizeVolume(data.rightAmountMl);

  if (leftAmountMl === 0 && rightAmountMl === 0) {
    throw new Error("The total pumping amount must be greater than zero.");
  }

  if (
    !(data.pumpingDate instanceof Date) &&
    typeof data.pumpingDate !== "string"
  ) {
    throw new Error("Invalid pumping date.");
  }

  const date = new Date(data.pumpingDate);

  if (!Number.isFinite(date.getTime())) {
    throw new Error("Invalid pumping date.");
  }

  if (
    data.note != null &&
    (typeof data.note !== "string" || data.note.length > 10000)
  ) {
    throw new Error("The note must not exceed 10000 characters.");
  }

  const database = await getLocalDatabase();

  const id = Crypto.randomUUID();
  const now = new Date().toISOString();
  const pumpingDate = date.toISOString();

  const payload = {
    id,
    pumpingDate,
    leftAmountMl,
    rightAmountMl,
    note: data.note?.trim() || null,
  };

  const entry = {
    ...payload,
    childId,
    type: "pumping",
    startedAt: pumpingDate,
    totalAmountMl: Math.round((leftAmountMl + rightAmountMl) * 1000) / 1000,
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
          ?, ?, ?, 'pumping', ?,
          NULL, 1, 'pending', NULL, ?, ?
        )
      `,
      [userId, id, childId, JSON.stringify(entry), pumpingDate, now],
    );

    await enqueueSyncOperation({
      userId,
      entityType: "tracking_entry",
      entityId: id,
      operation: "create:1",
      endpoint: `/api/children/${encodeURIComponent(childId)}/pumping`,
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
