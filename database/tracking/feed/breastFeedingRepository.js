import * as Crypto from "expo-crypto";

import { getLocalDatabase } from "../../localDatabase.js";
import { enqueueSyncOperation } from "../../../sync/syncQueueRepository.js";

import { saveLocalFeedingUpdate } from "./feedingUpdatesRepository.js";

function validateDuration(value) {
  return Number.isInteger(value) && value >= 0 && value <= 2147483647;
}

function validateSide(value, name) {
  if (value != null && !["left", "right"].includes(value)) {
    throw new Error(`Invalid ${name}.`);
  }

  return value ?? null;
}

export async function getLocalBreastfeedingEntries({
  userId,
  childId,
  limit = 30,
}) {
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
        AND entry_type = 'breastfeeding'
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

export async function createLocalBreastfeedingEntry({ userId, childId, data }) {
  if (!userId || !childId) {
    throw new Error("Missing user ID or child ID.");
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Invalid breastfeeding entry.");
  }

  const leftDurationSeconds = data.leftDurationSeconds ?? 0;
  const rightDurationSeconds = data.rightDurationSeconds ?? 0;

  if (
    !validateDuration(leftDurationSeconds) ||
    !validateDuration(rightDurationSeconds) ||
    (leftDurationSeconds === 0 && rightDurationSeconds === 0)
  ) {
    throw new Error("Invalid breastfeeding duration.");
  }

  if (
    !(data.feedingDate instanceof Date) &&
    typeof data.feedingDate !== "string"
  ) {
    throw new Error("Invalid feeding date.");
  }

  const date = new Date(data.feedingDate);

  if (!Number.isFinite(date.getTime())) {
    throw new Error("Invalid feeding date.");
  }

  if (
    data.note != null &&
    (typeof data.note !== "string" || data.note.length > 10000)
  ) {
    throw new Error("The note must not exceed 10000 characters.");
  }

  const id = Crypto.randomUUID();
  const now = new Date().toISOString();
  const feedingDate = date.toISOString();

  const payload = {
    id,
    feedingDate,
    leftDurationSeconds,
    rightDurationSeconds,
    firstSide: validateSide(data.firstSide, "first side"),
    lastSide: validateSide(data.lastSide, "last side"),
    note: data.note?.trim() || null,
  };

  const entry = {
    ...payload,
    childId,
    type: "breastfeeding",
    startedAt: feedingDate,
    source: "manual",
    createdByUserId: userId,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    version: null,
  };

  const database = await getLocalDatabase();

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
          ?, ?, ?, 'breastfeeding', ?,
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
      endpoint: `/api/children/${encodeURIComponent(childId)}/breastfeeding`,
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

export async function updateLocalBreastfeedingEntry({
  userId,
  childId,
  entryId,
  data,
}) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Invalid breastfeeding entry.");
  }

  const leftDurationSeconds = data.leftDurationSeconds ?? 0;
  const rightDurationSeconds = data.rightDurationSeconds ?? 0;

  if (
    !validateDuration(leftDurationSeconds) ||
    !validateDuration(rightDurationSeconds) ||
    (leftDurationSeconds === 0 && rightDurationSeconds === 0)
  ) {
    throw new Error("Invalid breastfeeding duration.");
  }

  if (
    !(data.feedingDate instanceof Date) &&
    typeof data.feedingDate !== "string"
  ) {
    throw new Error("Invalid feeding date.");
  }

  const date = new Date(data.feedingDate);

  if (!Number.isFinite(date.getTime())) {
    throw new Error("Invalid feeding date.");
  }

  if (
    data.note != null &&
    (typeof data.note !== "string" || data.note.length > 10000)
  ) {
    throw new Error("The note must not exceed 10000 characters.");
  }

  const feedingDate = date.toISOString();

  return saveLocalFeedingUpdate({
    userId,
    childId,
    entryId,
    type: "breastfeeding",
    startedAt: feedingDate,
    values: {
      feedingDate,
      leftDurationSeconds,
      rightDurationSeconds,
      firstSide: validateSide(data.firstSide, "first side"),
      lastSide: validateSide(data.lastSide, "last side"),
      note: data.note?.trim() || null,
    },
  });
}
