import * as Crypto from "expo-crypto";

import { getLocalDatabase } from "../../localDatabase.js";
import { enqueueSyncOperation } from "../../../sync/syncQueueRepository.js";

const MEASUREMENT_SITES = new Set(["forehead", "armpit", "rectal", "ear"]);

const INPUT_UNITS = new Set(["celsius", "fahrenheit"]);

function validateIdentifiers(userId, childId) {
  if (!userId || !childId) {
    throw new Error("Missing user ID or child ID.");
  }
}

function normalizeTemperatureData(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Missing temperature entry.");
  }

  if (!INPUT_UNITS.has(data.inputUnit)) {
    throw new Error("Invalid temperature unit.");
  }

  if (
    typeof data.inputValue !== "number" ||
    !Number.isFinite(data.inputValue)
  ) {
    throw new Error("Invalid temperature value.");
  }

  const inputValue = Number(data.inputValue.toFixed(2));

  if (Math.abs(inputValue - data.inputValue) > 0.00000001) {
    throw new Error("Temperature must have at most two decimal places.");
  }

  const celsius =
    data.inputUnit === "fahrenheit" ? ((inputValue - 32) * 5) / 9 : inputValue;

  if (celsius < 34 - 0.000001 || celsius > 42 + 0.000001) {
    throw new Error("Temperature must be between 34 and 42 degrees Celsius.");
  }

  if (!MEASUREMENT_SITES.has(data.measurementSite)) {
    throw new Error("Invalid temperature measurement site.");
  }

  if (
    !(data.measuredAt instanceof Date) &&
    typeof data.measuredAt !== "string"
  ) {
    throw new Error("Invalid measurement date.");
  }

  const date = new Date(data.measuredAt);

  if (!Number.isFinite(date.getTime()) || date.getTime() > Date.now()) {
    throw new Error("Invalid measurement date.");
  }

  if (
    data.note != null &&
    (typeof data.note !== "string" || data.note.length > 10000)
  ) {
    throw new Error("The note must not exceed 10000 characters.");
  }

  return {
    temperatureCelsius: Number(celsius.toFixed(2)),
    inputValue,
    inputUnit: data.inputUnit,
    measurementSite: data.measurementSite,
    measuredAt: date.toISOString(),
    note: data.note === undefined ? undefined : data.note?.trim() || null,
  };
}

function createPayload(values) {
  return {
    inputValue: values.inputValue,
    inputUnit: values.inputUnit,
    measurementSite: values.measurementSite,
    measuredAt: values.measuredAt,
    note: values.note,
  };
}

function createEntryFields(values) {
  return {
    ...values,
    type: "temperature",
    startedAt: values.measuredAt,
    endedAt: null,
    note: values.note ?? "",

    // Compatibilité avec la sheet actuelle.
    temperature: values.temperatureCelsius,
    value: values.temperatureCelsius,
    unit: "celsius",
    location: values.measurementSite,
    measurementLocation: values.measurementSite,
  };
}

function mapLocalEntry(row) {
  return {
    ...JSON.parse(row.entry_json),
    serverVersion: row.server_version,
    localRevision: row.local_revision,
    syncStatus: row.sync_status,
    deletedAt: row.deleted_at,
    persistedLocally: true,
  };
}

export async function getLocalTemperatureEntries({
  userId,
  childId,
  limit = 30,
}) {
  validateIdentifiers(userId, childId);

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
        AND entry_type = 'temperature'
        AND deleted_at IS NULL
      ORDER BY started_at DESC, entry_id DESC
      LIMIT ?
    `,
    [userId, childId, limit],
  );

  return rows.map(mapLocalEntry);
}

export async function createLocalTemperatureEntry({ userId, childId, data }) {
  validateIdentifiers(userId, childId);

  const values = normalizeTemperatureData(data);
  values.note = values.note ?? null;

  const database = await getLocalDatabase();
  const id = Crypto.randomUUID();
  const now = new Date().toISOString();

  const entry = {
    ...createEntryFields(values),
    id,
    childId,
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
          ?, ?, ?, 'temperature', ?,
          NULL, 1, 'pending', NULL, ?, ?
        )
      `,
      [userId, id, childId, JSON.stringify(entry), values.measuredAt, now],
    );

    await enqueueSyncOperation({
      userId,
      entityType: "tracking_entry",
      entityId: id,
      operation: "create:1",
      endpoint: `/api/children/${encodeURIComponent(childId)}/temperature`,
      method: "POST",
      payload: {
        id,
        ...createPayload(values),
      },
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

export async function updateLocalTemperatureEntry({
  userId,
  childId,
  entryId,
  data,
}) {
  validateIdentifiers(userId, childId);

  if (!entryId) {
    throw new Error("Missing tracking entry ID.");
  }

  const values = normalizeTemperatureData(data);
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
          AND entry_type = 'temperature'
          AND deleted_at IS NULL
      `,
      [userId, childId, entryId],
    );

    if (!row) {
      throw new Error("Local temperature entry not found.");
    }

    if (row.sync_status === "conflict") {
      throw new Error("Resolve the tracking conflict before editing.");
    }

    const previousEntry = JSON.parse(row.entry_json);

    if (values.note === undefined) {
      values.note = previousEntry.note?.trim() || null;
    }

    const revision = row.local_revision + 1;
    const now = new Date().toISOString();

    const updatedEntry = {
      ...previousEntry,
      ...createEntryFields(values),
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
        WHERE user_id = ? AND entry_id = ?
      `,
      [
        JSON.stringify(updatedEntry),
        revision,
        values.measuredAt,
        now,
        userId,
        entryId,
      ],
    );

    await enqueueSyncOperation({
      userId,
      entityType: "tracking_entry",
      entityId: entryId,
      operation: `update:${revision}`,
      endpoint:
        `/api/children/${encodeURIComponent(childId)}` +
        `/temperature/${encodeURIComponent(entryId)}`,
      method: "PATCH",
      payload: createPayload(values),
      database: transaction,
    });

    savedEntry = {
      ...updatedEntry,
      serverVersion: row.server_version,
      localRevision: revision,
      syncStatus: "pending",
      persistedLocally: true,
    };
  });

  return savedEntry;
}

export async function prepareTemperatureSyncPayload({ operation, payload }) {
  if (
    operation.entity_type !== "tracking_entry" ||
    operation.http_method !== "PATCH" ||
    !/^update:([1-9]\d*)$/.test(operation.operation) ||
    !/\/temperature\/[^/]+$/.test(operation.endpoint)
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
        WHERE id = ? AND user_id = ?
      `,
      [operation.id, operation.user_id],
    );

    if (!queued) {
      throw new Error("Temperature synchronization operation not found.");
    }

    const storedPayload = JSON.parse(queued.payload_json);

    if (
      !storedPayload ||
      typeof storedPayload !== "object" ||
      Array.isArray(storedPayload)
    ) {
      throw new Error("Invalid temperature synchronization payload.");
    }

    // Une nouvelle tentative conserve la version du premier envoi.
    if (storedPayload.version !== undefined) {
      if (
        !Number.isInteger(storedPayload.version) ||
        storedPayload.version < 1
      ) {
        throw new Error("Invalid temperature synchronization version.");
      }

      preparedPayload = storedPayload;
      return;
    }

    const row = await transaction.getFirstAsync(
      `
        SELECT server_version, entry_type
        FROM tracking_entries_local
        WHERE user_id = ? AND entry_id = ?
      `,
      [operation.user_id, operation.entity_id],
    );

    if (!row || row.entry_type !== "temperature") {
      throw new Error("Local temperature entry not found.");
    }

    if (!Number.isInteger(row.server_version) || row.server_version < 1) {
      const error = new Error(
        "Waiting for the temperature entry to be synchronized.",
      );

      error.code = "SYNC_DEPENDENCY_PENDING";
      error.status = 0;

      throw error;
    }

    preparedPayload = {
      ...storedPayload,
      version: row.server_version,
    };

    await transaction.runAsync(
      `
        UPDATE sync_queue
        SET payload_json = ?, updated_at = ?
        WHERE id = ? AND user_id = ?
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
