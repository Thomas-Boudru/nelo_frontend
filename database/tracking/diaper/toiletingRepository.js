import * as Crypto from "expo-crypto";

import { getLocalDatabase } from "../../localDatabase.js";
import { enqueueSyncOperation } from "../../../sync/syncQueueRepository.js";

const CONTENTS = {
  diaper: ["dry", "wet", "dirty", "wetAndDirty"],
  potty: ["pee", "poop", "peeAndPoop"],
};

const CONSISTENCIES = ["liquid", "soft", "formed", "hard"];

export async function createLocalToiletingEntry({
  userId,
  childId,
  type,
  data,
}) {
  if (!userId || !childId) {
    throw new Error("Missing user ID or child ID.");
  }

  if (!Object.hasOwn(CONTENTS, type)) {
    throw new Error("Invalid toileting type.");
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Missing toileting entry.");
  }

  if (!CONTENTS[type].includes(data.content)) {
    throw new Error("Invalid toileting content.");
  }

  const dateField = type === "diaper" ? "diaperDate" : "pottyDate";
  const dateValue = data[dateField];

  if (!(dateValue instanceof Date) && typeof dateValue !== "string") {
    throw new Error("Invalid toileting date.");
  }

  const date = new Date(dateValue);

  if (!Number.isFinite(date.getTime()) || date.getTime() > Date.now()) {
    throw new Error("Invalid toileting date.");
  }

  const consistency = data.consistency ?? null;

  const includesPoop =
    type === "diaper" && ["dirty", "wetAndDirty"].includes(data.content);

  if (
    consistency !== null &&
    (!includesPoop || !CONSISTENCIES.includes(consistency))
  ) {
    throw new Error("Invalid toileting consistency.");
  }

  const isAccident = data.isAccident === undefined ? false : data.isAccident;

  if (typeof isAccident !== "boolean" || (type === "diaper" && isAccident)) {
    throw new Error("Invalid toileting accident.");
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
  const startedAt = date.toISOString();

  const payload = {
    id,
    [dateField]: startedAt,
    content: data.content,
    consistency,
    isAccident,
    note: data.note?.trim() || null,
  };

  const entry = {
    ...payload,
    childId,
    type,
    startedAt,
    endedAt: null,
    source: "manual",
    createdByUserId: userId,
    updatedByUserId: null,
    deletedByUserId: null,
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
        VALUES (?, ?, ?, ?, ?, NULL, 1, 'pending', NULL, ?, ?)
      `,
      [userId, id, childId, type, JSON.stringify(entry), startedAt, now],
    );

    await enqueueSyncOperation({
      userId,
      entityType: "tracking_entry",
      entityId: id,
      operation: "create:1",
      endpoint:
        `/api/children/${encodeURIComponent(childId)}` +
        (type === "diaper" ? "/diapers" : "/potty"),
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

export async function updateLocalToiletingEntry({
  userId,
  childId,
  entryId,
  type,
  data,
}) {
  if (!userId || !childId || !entryId) {
    throw new Error("Missing user, child or tracking entry ID.");
  }

  if (!Object.hasOwn(CONTENTS, type)) {
    throw new Error("Invalid toileting type.");
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Missing toileting entry.");
  }

  if (!CONTENTS[type].includes(data.content)) {
    throw new Error("Invalid toileting content.");
  }

  const dateField = type === "diaper" ? "diaperDate" : "pottyDate";
  const dateValue = data[dateField];

  if (!(dateValue instanceof Date) && typeof dateValue !== "string") {
    throw new Error("Invalid toileting date.");
  }

  const date = new Date(dateValue);

  if (!Number.isFinite(date.getTime()) || date.getTime() > Date.now()) {
    throw new Error("Invalid toileting date.");
  }

  const consistency = data.consistency ?? null;

  const includesPoop =
    type === "diaper" && ["dirty", "wetAndDirty"].includes(data.content);

  if (
    consistency !== null &&
    (!includesPoop || !CONSISTENCIES.includes(consistency))
  ) {
    throw new Error("Invalid toileting consistency.");
  }

  const isAccident = data.isAccident ?? false;

  if (typeof isAccident !== "boolean" || (type === "diaper" && isAccident)) {
    throw new Error("Invalid toileting accident.");
  }

  if (
    data.note != null &&
    (typeof data.note !== "string" || data.note.length > 10000)
  ) {
    throw new Error("The note must not exceed 10000 characters.");
  }

  const database = await getLocalDatabase();
  const startedAt = date.toISOString();
  const endpoint =
    `/api/children/${encodeURIComponent(childId)}` +
    (type === "diaper" ? "/diapers" : "/potty");

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
      throw new Error("Tracking entry not found.");
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

    let version = row.server_version;

    if (previous) {
      const isPendingCreation =
        previous.entity_type === "tracking_entry" &&
        previous.http_method === "POST" &&
        previous.endpoint === endpoint &&
        /^create:[1-9]\d*$/.test(previous.operation);

      const isPendingUpdate =
        previous.entity_type === "tracking_entry" &&
        previous.http_method === "PUT" &&
        previous.endpoint === `${endpoint}/${encodeURIComponent(entryId)}` &&
        /^update:[1-9]\d*$/.test(previous.operation);

      if (isPendingCreation) {
        // La création sera envoyée avant cette modification.
        version = 1;
      } else if (isPendingUpdate) {
        const previousPayload = JSON.parse(previous.payload_json);

        if (
          !Number.isSafeInteger(previousPayload?.version) ||
          previousPayload.version < 1
        ) {
          throw new Error("Invalid tracking synchronization version.");
        }

        version = previousPayload.version + 1;
      } else {
        const error = new Error(
          "Wait for this entry to finish syncing before editing it.",
        );
        error.code = "TOILETING_SYNC_PENDING";
        throw error;
      }
    }

    if (!Number.isSafeInteger(version) || version < 1) {
      const error = new Error(
        "Wait for this entry to finish syncing before editing it.",
      );
      error.code = "TOILETING_SYNC_PENDING";
      throw error;
    }

    const now = new Date().toISOString();
    const localRevision = row.local_revision + 1;
    const current = JSON.parse(row.entry_json);

    const payload = {
      [dateField]: startedAt,
      content: data.content,
      consistency,
      isAccident,
      note: data.note?.trim() || null,
      version,
    };

    const entry = {
      ...current,
      id: entryId,
      childId,
      type,
      [dateField]: startedAt,
      startedAt,
      endedAt: null,
      content: payload.content,
      consistency,
      isAccident,
      note: payload.note ?? "",
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
          AND entry_type = ?
      `,
      [
        JSON.stringify(entry),
        localRevision,
        startedAt,
        now,
        userId,
        childId,
        entryId,
        type,
      ],
    );

    await enqueueSyncOperation({
      userId,
      entityType: "tracking_entry",
      entityId: entryId,
      operation: `update:${localRevision}`,
      endpoint: `${endpoint}/${encodeURIComponent(entryId)}`,
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
