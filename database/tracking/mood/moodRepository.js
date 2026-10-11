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

export async function updateLocalMoodEntry({ userId, childId, entryId, data }) {
  if (!userId || !childId || !entryId) {
    throw new Error("Missing user, child or tracking entry ID.");
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
  const moodDate = date.toISOString();

  const collectionEndpoint = `/api/children/${encodeURIComponent(childId)}/mood`;

  const entryEndpoint = `${collectionEndpoint}/${encodeURIComponent(entryId)}`;

  let savedEntry;

  await database.withExclusiveTransactionAsync(async (transaction) => {
    const row = await transaction.getFirstAsync(
      `
        SELECT *
        FROM tracking_entries_local
        WHERE user_id = ?
          AND child_id = ?
          AND entry_id = ?
          AND entry_type = 'mood'
          AND deleted_at IS NULL
      `,
      [userId, childId, entryId],
    );

    if (!row) {
      throw new Error("Local mood entry not found.");
    }

    if (row.sync_status === "conflict") {
      const error = new Error(
        "Resolve this entry's synchronization conflict before editing it.",
      );
      error.code = "TRACKING_VERSION_CONFLICT";
      throw error;
    }

    const previous = await transaction.getFirstAsync(
      `
        SELECT *
        FROM sync_queue
        WHERE user_id = ?
          AND entity_id = ?
          AND entity_type IN ('tracking_entry', 'tracking_photo')
        ORDER BY rowid DESC
        LIMIT 1
      `,
      [userId, entryId],
    );

    let expectedVersion = row.server_version;

    if (previous) {
      const isPendingCreation =
        previous.entity_type === "tracking_entry" &&
        previous.http_method === "POST" &&
        previous.endpoint === collectionEndpoint &&
        /^create:[1-9]\d*$/.test(previous.operation);

      const isPendingUpdate =
        previous.entity_type === "tracking_entry" &&
        previous.http_method === "PUT" &&
        previous.endpoint === entryEndpoint &&
        /^update:[1-9]\d*$/.test(previous.operation);

      if (isPendingCreation) {
        expectedVersion = 1;
      } else if (isPendingUpdate) {
        const previousPayload = JSON.parse(previous.payload_json);

        if (
          !Number.isSafeInteger(previousPayload?.version) ||
          previousPayload.version < 1
        ) {
          throw new Error("Invalid pending mood version.");
        }

        expectedVersion = previousPayload.version + 1;
      } else {
        const error = new Error(
          "Wait for this entry to finish syncing before editing it.",
        );
        error.code = "MOOD_SYNC_PENDING";
        throw error;
      }
    }

    if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1) {
      const error = new Error(
        "Wait for this entry to finish syncing before editing it.",
      );
      error.code = "MOOD_SYNC_PENDING";
      throw error;
    }

    const localRevision = row.local_revision + 1;

    if (!Number.isSafeInteger(localRevision) || localRevision < 1) {
      throw new Error("Invalid mood local revision.");
    }

    const current = JSON.parse(row.entry_json);

    const noteValue =
      data.note === undefined ? (current.note ?? null) : data.note;

    if (
      noteValue != null &&
      (typeof noteValue !== "string" || noteValue.length > 10000)
    ) {
      throw new Error("The note must not exceed 10000 characters.");
    }

    const note = noteValue?.trim() || null;
    const now = new Date().toISOString();

    const payload = {
      mood: data.mood,
      moodDate,
      note,
      version: expectedVersion,
    };

    const entry = {
      ...current,
      id: entryId,
      childId,
      type: "mood",
      mood: payload.mood,
      moodDate,
      startedAt: moodDate,
      note: note ?? "",
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
          AND entry_type = 'mood'
      `,
      [
        JSON.stringify(entry),
        localRevision,
        moodDate,
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
      payload,
      database: transaction,
    });

    savedEntry = {
      ...entry,
      serverVersion: row.server_version,
      localRevision,
      syncStatus: "pending",
      persistedLocally: true,
    };
  });

  return savedEntry;
}
