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
