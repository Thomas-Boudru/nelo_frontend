import * as Crypto from "expo-crypto";

import { getLocalDatabase } from "../../localDatabase.js";
import { enqueueSyncOperation } from "../../../sync/syncQueueRepository.js";

function validateDate(value) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    Number(value.slice(0, 4)) < 1
  ) {
    throw new Error("Invalid growth measurement date.");
  }

  const date = new Date(`${value}T12:00:00.000Z`);

  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new Error("Invalid growth measurement date.");
  }

  return value;
}

function normalizeValue(value, factor, maxStorageValue) {
  if (value == null) {
    return null;
  }

  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error("Invalid growth measurement.");
  }

  const converted = value * factor;

  if (!Number.isFinite(converted) || converted > maxStorageValue) {
    throw new Error("Invalid growth measurement.");
  }

  // Même précision que les colonnes PostgreSQL en g/mm.
  const storedValue = Number(converted.toFixed(3));

  if (storedValue <= 0 || storedValue > maxStorageValue) {
    throw new Error("Invalid growth measurement.");
  }

  return storedValue / factor;
}

function normalizeData(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Missing growth entry.");
  }

  const weightKg = normalizeValue(data.weightKg, 1000, 999999999.999);

  const heightCm = normalizeValue(data.heightCm, 10, 9999999.999);

  const headCircumferenceCm = normalizeValue(
    data.headCircumferenceCm,
    10,
    9999999.999,
  );

  if (weightKg === null && heightCm === null && headCircumferenceCm === null) {
    throw new Error("At least one growth measurement is required.");
  }

  if (
    data.note != null &&
    (typeof data.note !== "string" || data.note.length > 10000)
  ) {
    throw new Error("Invalid growth note.");
  }

  return {
    measurementDate: validateDate(data.measurementDate),
    weightKg,
    heightCm,
    headCircumferenceCm,
    note: data.note?.trim() || null,
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

export async function getLocalGrowthEntries({ userId, childId, limit = 30 }) {
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
        AND entry_type = 'growth'
        AND deleted_at IS NULL
      ORDER BY started_at DESC, entry_id DESC
      LIMIT ?
    `,
    [userId, childId, limit],
  );

  return rows.map(mapLocalEntry);
}

export async function getLatestLocalGrowthMeasurements({
  userId,
  childId,
  onOrBefore = null,
  excludeEntryId = null,
}) {
  if (!userId || !childId) {
    throw new Error("Missing user ID or child ID.");
  }

  const cutoff = validateDate(
    onOrBefore ?? new Date().toISOString().slice(0, 10),
  );
  const database = await getLocalDatabase();

  /*
   * Pas de LIMIT 30 : une mesure peut être beaucoup plus ancienne
   * que les autres.
   */
  const rows = await database.getAllAsync(
    `
      SELECT entry_json
      FROM tracking_entries_local
      WHERE user_id = ?
        AND child_id = ?
        AND entry_type = 'growth'
        AND deleted_at IS NULL
        AND sync_status <> 'conflict'
        AND (? IS NULL OR entry_id <> ?)
      ORDER BY
        started_at DESC,
        json_extract(entry_json, '$.createdAt') DESC,
        entry_id DESC
    `,
    [userId, childId, excludeEntryId, excludeEntryId],
  );

  const result = {
    weight: null,
    height: null,
    headCircumference: null,
  };

  const fields = {
    weight: "weightKg",
    height: "heightCm",
    headCircumference: "headCircumferenceCm",
  };

  for (const row of rows) {
    const entry = JSON.parse(row.entry_json);

    if (
      typeof entry.measurementDate !== "string" ||
      entry.measurementDate > cutoff
    ) {
      continue;
    }

    for (const [type, field] of Object.entries(fields)) {
      const value = entry[field];

      if (
        result[type] === null &&
        typeof value === "number" &&
        Number.isFinite(value) &&
        value > 0
      ) {
        result[type] = value;
      }
    }

    if (Object.values(result).every((value) => value !== null)) {
      break;
    }
  }

  return result;
}

export async function createLocalGrowthEntry({ userId, childId, data }) {
  if (!userId || !childId) {
    throw new Error("Missing user ID or child ID.");
  }

  const values = normalizeData(data);
  const database = await getLocalDatabase();

  const id = Crypto.randomUUID();
  const now = new Date().toISOString();
  const startedAt = `${values.measurementDate}T12:00:00.000Z`;

  const payload = { id, ...values };

  const entry = {
    ...payload,
    childId,
    type: "growth",
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
          ?, ?, ?, 'growth', ?,
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
      endpoint: `/api/children/${encodeURIComponent(childId)}/growth`,
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

export async function updateLocalGrowthEntry({
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
          AND entry_type = 'growth'
          AND deleted_at IS NULL
      `,
      [userId, childId, entryId],
    );

    if (!row) {
      throw new Error("Local growth entry not found.");
    }

    if (row.sync_status === "conflict") {
      throw new Error("Resolve the synchronization conflict first.");
    }

    const previous = JSON.parse(row.entry_json);

    const values = normalizeData({
      measurementDate:
        data?.measurementDate === undefined
          ? previous.measurementDate
          : data.measurementDate,
      weightKg:
        data?.weightKg === undefined ? previous.weightKg : data.weightKg,
      heightCm:
        data?.heightCm === undefined ? previous.heightCm : data.heightCm,
      headCircumferenceCm:
        data?.headCircumferenceCm === undefined
          ? previous.headCircumferenceCm
          : data.headCircumferenceCm,
      note: data?.note === undefined ? previous.note : data.note,
    });

    const now = new Date().toISOString();
    const localRevision = row.local_revision + 1;
    const startedAt = `${values.measurementDate}T12:00:00.000Z`;

    const entry = {
      ...previous,
      ...values,
      startedAt,
      updatedAt: now,
      updatedByUserId: userId,
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
        `/growth/${encodeURIComponent(entryId)}`,
      method: "PATCH",
      payload: values,
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

export async function prepareGrowthSyncPayload({ operation, payload }) {
  if (
    operation.entity_type !== "tracking_entry" ||
    operation.http_method !== "PATCH" ||
    !/^update:([1-9]\d*)$/.test(operation.operation) ||
    !/\/growth\/[^/]+$/.test(operation.endpoint)
  ) {
    return payload;
  }

  const database = await getLocalDatabase();
  let preparedPayload;

  await database.withExclusiveTransactionAsync(async (transaction) => {
    const queued = await transaction.getFirstAsync(
      `
        SELECT payload_json
        FROM sync_queue
        WHERE id = ?
          AND user_id = ?
      `,
      [operation.id, operation.user_id],
    );

    if (!queued) {
      throw new Error("Growth synchronization operation not found.");
    }

    const storedPayload = JSON.parse(queued.payload_json);

    if (
      !storedPayload ||
      typeof storedPayload !== "object" ||
      Array.isArray(storedPayload)
    ) {
      throw new Error("Invalid growth synchronization payload.");
    }

    // Conserver la version utilisée à la première tentative.
    if (Object.prototype.hasOwnProperty.call(storedPayload, "version")) {
      if (
        !Number.isSafeInteger(storedPayload.version) ||
        storedPayload.version < 1
      ) {
        throw new Error("Invalid growth synchronization version.");
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

    if (!row || row.entry_type !== "growth") {
      throw new Error("Local growth entry not found.");
    }

    if (!Number.isSafeInteger(row.server_version) || row.server_version < 1) {
      const error = new Error(
        "The growth entry must be created on the server first.",
      );

      error.code = "SYNC_DEPENDENCY_PENDING";
      throw error;
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
