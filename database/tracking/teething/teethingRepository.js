import * as Crypto from "expo-crypto";

import { getLocalDatabase } from "../../localDatabase.js";
import { enqueueSyncOperation } from "../../../sync/syncQueueRepository.js";

const TOOTH_CODES = new Set(
  ["upper", "lower"].flatMap((jaw) =>
    ["left", "right"].flatMap((side) =>
      [
        "central_incisor",
        "lateral_incisor",
        "canine",
        "first_molar",
        "second_molar",
      ].map((tooth) => `${jaw}_${side}_${tooth}`),
    ),
  ),
);

function createError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function validateData(data) {
  if (!data || typeof data !== "object") {
    throw new Error("Missing teething entry.");
  }

  if (
    !Array.isArray(data.toothCodes) ||
    data.toothCodes.length < 1 ||
    data.toothCodes.length > 20 ||
    data.toothCodes.some((code) => !TOOTH_CODES.has(code)) ||
    new Set(data.toothCodes).size !== data.toothCodes.length
  ) {
    throw new Error("Invalid tooth selection.");
  }

  if (
    typeof data.eruptionDate !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(data.eruptionDate) ||
    Number(data.eruptionDate.slice(0, 4)) < 1
  ) {
    throw new Error("Invalid eruption date.");
  }

  const date = new Date(`${data.eruptionDate}T12:00:00.000Z`);

  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== data.eruptionDate
  ) {
    throw new Error("Invalid eruption date.");
  }

  if (data.note != null && typeof data.note !== "string") {
    throw new Error("Invalid teething note.");
  }

  const note = data.note?.trim() || null;

  if (note && note.length > 10000) {
    throw new Error("The teething note is too long.");
  }

  return {
    toothCodes: [...data.toothCodes].sort(),
    eruptionDate: data.eruptionDate,
    note,
  };
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

async function readEruptedToothCodes({
  database,
  userId,
  childId,
  excludeEntryId = null,
}) {
  const rows = await database.getAllAsync(
    `
      SELECT entry_json
      FROM tracking_entries_local
      WHERE user_id = ?
        AND child_id = ?
        AND entry_type = 'teething'
        AND deleted_at IS NULL
        AND (? IS NULL OR entry_id <> ?)
    `,
    [userId, childId, excludeEntryId, excludeEntryId],
  );

  const codes = new Set();

  for (const row of rows) {
    const entry = JSON.parse(row.entry_json);

    for (const code of entry.toothCodes ?? []) {
      if (TOOTH_CODES.has(code)) {
        codes.add(code);
      }
    }
  }

  return [...codes];
}

async function ensureAvailableTeeth({
  database,
  userId,
  childId,
  toothCodes,
  excludeEntryId = null,
}) {
  const existingCodes = new Set(
    await readEruptedToothCodes({
      database,
      userId,
      childId,
      excludeEntryId,
    }),
  );

  if (toothCodes.some((code) => existingCodes.has(code))) {
    throw createError(
      "One or more selected teeth have already been recorded.",
      "TOOTH_ALREADY_RECORDED",
    );
  }
}

export async function getLocalEruptedToothCodes({
  userId,
  childId,
  excludeEntryId = null,
}) {
  if (!userId || !childId) {
    throw new Error("Missing user ID or child ID.");
  }

  return readEruptedToothCodes({
    database: await getLocalDatabase(),
    userId,
    childId,
    excludeEntryId,
  });
}

export async function getLocalTeethingEntries({ userId, childId, limit = 30 }) {
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
        AND entry_type = 'teething'
        AND deleted_at IS NULL
      ORDER BY started_at DESC, entry_id DESC
      LIMIT ?
    `,
    [userId, childId, limit],
  );

  return rows.map(mapLocalEntry);
}

export async function createLocalTeethingEntry({ userId, childId, data }) {
  if (!userId || !childId) {
    throw new Error("Missing user ID or child ID.");
  }

  const normalizedData = validateData(data);
  const database = await getLocalDatabase();

  const id = Crypto.randomUUID();
  const now = new Date().toISOString();

  // Date technique de tri, cohérente avec le backend.
  const startedAt = `${normalizedData.eruptionDate}T12:00:00.000Z`;

  const payload = {
    id,
    ...normalizedData,
  };

  const entry = {
    ...payload,
    childId,
    type: "teething",
    startedAt,
    endedAt: null,
    source: "manual",
    createdByUserId: userId,
    updatedByUserId: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    version: null,
  };

  await database.withExclusiveTransactionAsync(async (transaction) => {
    await ensureAvailableTeeth({
      database: transaction,
      userId,
      childId,
      toothCodes: normalizedData.toothCodes,
    });

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
          ?, ?, ?, 'teething', ?,
          NULL, 1, 'pending', NULL, ?, ?
        )
      `,
      [userId, id, childId, JSON.stringify(entry), startedAt, now],
    );

    await enqueueSyncOperation({
      userId,
      entityType: "tracking_entry",
      entityId: id,
      operation: "create:1",
      endpoint: `/api/children/${encodeURIComponent(childId)}/teething`,
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

export async function updateLocalTeethingEntry({
  userId,
  childId,
  entryId,
  data,
}) {
  if (!userId || !childId || !entryId) {
    throw new Error("Missing user ID, child ID or entry ID.");
  }

  const database = await getLocalDatabase();

  let result;

  await database.withExclusiveTransactionAsync(async (transaction) => {
    const row = await transaction.getFirstAsync(
      `
        SELECT *
        FROM tracking_entries_local
        WHERE user_id = ?
          AND child_id = ?
          AND entry_id = ?
          AND entry_type = 'teething'
          AND deleted_at IS NULL
      `,
      [userId, childId, entryId],
    );

    if (!row) {
      throw new Error("Local teething entry not found.");
    }

    if (row.sync_status === "conflict") {
      throw new Error("Resolve the synchronization conflict first.");
    }

    const previousEntry = JSON.parse(row.entry_json);

    const normalizedData = validateData({
      ...data,
      note: data?.note === undefined ? previousEntry.note : data.note,
    });

    await ensureAvailableTeeth({
      database: transaction,
      userId,
      childId,
      toothCodes: normalizedData.toothCodes,
      excludeEntryId: entryId,
    });

    const localRevision = row.local_revision + 1;
    const now = new Date().toISOString();
    const startedAt = `${normalizedData.eruptionDate}T12:00:00.000Z`;

    const entry = {
      ...previousEntry,
      ...normalizedData,
      startedAt,
      updatedByUserId: userId,
      updatedAt: now,
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
      endpoint:
        `/api/children/${encodeURIComponent(childId)}` +
        `/teething/${encodeURIComponent(entryId)}`,
      method: "PATCH",
      payload: normalizedData,
      database: transaction,
    });

    result = {
      ...entry,
      serverVersion: row.server_version,
      localRevision,
      syncStatus: "pending",
      persistedLocally: true,
    };
  });

  return result;
}

export async function prepareTeethingSyncPayload({ operation, payload }) {
  if (
    operation.entity_type !== "tracking_entry" ||
    operation.http_method !== "PATCH" ||
    !/^update:([1-9]\d*)$/.test(operation.operation) ||
    !/\/teething\/[^/]+$/.test(operation.endpoint)
  ) {
    return payload;
  }

  const database = await getLocalDatabase();

  let preparedPayload;

  await database.withExclusiveTransactionAsync(async (transaction) => {
    const queuedOperation = await transaction.getFirstAsync(
      `
        SELECT payload_json
        FROM sync_queue
        WHERE id = ?
          AND user_id = ?
      `,
      [operation.id, operation.user_id],
    );

    if (!queuedOperation) {
      throw new Error("Teething synchronization operation not found.");
    }

    const storedPayload = JSON.parse(queuedOperation.payload_json);

    if (
      !storedPayload ||
      typeof storedPayload !== "object" ||
      Array.isArray(storedPayload)
    ) {
      throw new Error("Invalid teething synchronization payload.");
    }

    // Une tentative répétée conserve exactement la même version.
    if (Object.prototype.hasOwnProperty.call(storedPayload, "version")) {
      if (
        !Number.isInteger(storedPayload.version) ||
        storedPayload.version < 1
      ) {
        throw new Error("Invalid teething synchronization version.");
      }

      preparedPayload = storedPayload;
      return;
    }

    const row = await transaction.getFirstAsync(
      `
        SELECT server_version, entry_type
        FROM tracking_entries_local
        WHERE user_id = ?
          AND entry_id = ?
      `,
      [operation.user_id, operation.entity_id],
    );

    if (!row || row.entry_type !== "teething") {
      throw new Error("Local teething entry not found.");
    }

    if (!Number.isInteger(row.server_version) || row.server_version < 1) {
      throw createError(
        "The teething entry must be created on the server first.",
        "SYNC_DEPENDENCY_PENDING",
      );
    }

    preparedPayload = {
      ...storedPayload,
      version: row.server_version,
    };

    await transaction.runAsync(
      `
        UPDATE sync_queue
        SET payload_json = ?,
            updated_at = ?
        WHERE id = ?
          AND user_id = ?
      `,
      [
        JSON.stringify(preparedPayload),
        new Date().toISOString(),
        operation.id,
        operation.user_id,
      ],
    );
  });

  return preparedPayload;
}
