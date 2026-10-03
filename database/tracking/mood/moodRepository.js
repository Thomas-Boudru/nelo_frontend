import * as Crypto from "expo-crypto";

import { getLocalDatabase } from "../../localDatabase.js";
import { enqueueSyncOperation } from "../../../sync/syncQueueRepository.js";

const MOOD_TYPES = new Set(["happy", "calm", "fussy", "crying", "unwell"]);

export async function createLocalMoodEntry({ userId, childId, data }) {
  if (!userId || !childId) {
    throw new Error("Missing user ID or child ID.");
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Missing mood entry.");
  }

  if (!MOOD_TYPES.has(data.mood)) {
    throw new Error("Invalid mood type.");
  }

  if (!(data.moodDate instanceof Date) && typeof data.moodDate !== "string") {
    throw new Error("Invalid mood date.");
  }

  const date = new Date(data.moodDate);

  if (!Number.isFinite(date.getTime())) {
    throw new Error("Invalid mood date.");
  }

  if (date.getTime() > Date.now()) {
    throw new Error("Mood time cannot be in the future.");
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
  const moodDate = date.toISOString();

  const payload = {
    id,
    mood: data.mood,
    moodDate,
    note: data.note?.trim() || null,
  };

  const entry = {
    ...payload,
    childId,
    type: "mood",
    startedAt: moodDate,
    endedAt: null,
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
          ?, ?, ?, 'mood', ?,
          NULL, 1, 'pending', NULL, ?, ?
        )
      `,
      [userId, id, childId, JSON.stringify(entry), moodDate, now],
    );

    await enqueueSyncOperation({
      userId,
      entityType: "tracking_entry",
      entityId: id,
      operation: "create:1",
      endpoint: `/api/children/${encodeURIComponent(childId)}/mood`,
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
    persistedLocally: true,
  };
}
