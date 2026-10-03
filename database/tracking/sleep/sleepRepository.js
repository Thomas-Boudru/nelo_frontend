import * as Crypto from "expo-crypto";

import { getLocalDatabase } from "../../localDatabase.js";
import { enqueueSyncOperation } from "../../../sync/syncQueueRepository.js";

import {
  getActiveSleep,
  getSleepEntry,
} from "../../../api/tracking/sleep/sleepApi.js";

const SLEEP_TYPES = new Set(["nap", "night"]);

function normalizeDate(value, label) {
  if (!(value instanceof Date) && typeof value !== "string") {
    throw new Error(`Invalid sleep ${label} date.`);
  }

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    throw new Error(`Invalid sleep ${label} date.`);
  }

  return date.toISOString();
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

export async function getLocalSleepEntries({ userId, childId, limit = 30 }) {
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
        AND entry_type = 'sleep'
        AND deleted_at IS NULL
      ORDER BY started_at DESC, entry_id DESC
      LIMIT ?
    `,
    [userId, childId, limit],
  );

  return rows.map(mapLocalEntry);
}

export async function createLocalSleepEntry({ userId, childId, data }) {
  if (!userId || !childId) {
    throw new Error("Missing user ID or child ID.");
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Missing sleep entry.");
  }

  if (!SLEEP_TYPES.has(data.sleepType)) {
    throw new Error("Invalid sleep type.");
  }

  const startedAt = normalizeDate(data.startedAt, "start");
  const endedAt = normalizeDate(data.endedAt, "end");

  const startTime = Date.parse(startedAt);
  const endTime = Date.parse(endedAt);
  const nowTime = Date.now();

  if (endTime <= startTime) {
    throw new Error("End time must be after start time.");
  }

  if (startTime > nowTime || endTime > nowTime) {
    throw new Error("Sleep dates cannot be in the future.");
  }

  if (
    data.note != null &&
    (typeof data.note !== "string" || data.note.length > 10000)
  ) {
    throw new Error("The note must not exceed 10000 characters.");
  }

  const database = await getLocalDatabase();

  const id = Crypto.randomUUID();
  const now = new Date(nowTime).toISOString();

  const payload = {
    id,
    sleepType: data.sleepType,
    startedAt,
    endedAt,
    note: data.note?.trim() || null,
  };

  const entry = {
    ...payload,
    childId,
    type: "sleep",
    durationSeconds: Math.floor((endTime - startTime) / 1000),
    source: "manual",
    endedByUserId: null,
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
          ?, ?, ?, 'sleep', ?,
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
      endpoint: `/api/children/${encodeURIComponent(childId)}/sleep`,
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

export async function getLocalActiveSleepEntry({ userId, childId }) {
  if (!userId || !childId) {
    throw new Error("Missing user ID or child ID.");
  }

  const database = await getLocalDatabase();

  const rows = await database.getAllAsync(
    `
      SELECT *
      FROM tracking_entries_local
      WHERE user_id = ?
        AND child_id = ?
        AND entry_type = 'sleep'
        AND deleted_at IS NULL
      ORDER BY started_at DESC, entry_id DESC
    `,
    [userId, childId],
  );

  const activeRow = rows.find((row) => {
    const entry = JSON.parse(row.entry_json);

    return (
      row.sync_status !== "conflict" &&
      entry.source === "timer" &&
      entry.endedAt == null
    );
  });

  return activeRow ? mapLocalEntry(activeRow) : null;
}

export async function startLocalSleepEntry({ userId, childId, data }) {
  if (!userId || !childId) {
    throw new Error("Missing user ID or child ID.");
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Missing sleep entry.");
  }

  if (!SLEEP_TYPES.has(data.sleepType)) {
    throw new Error("Invalid sleep type.");
  }

  const startedAt = normalizeDate(data.startedAt, "start");

  if (Date.parse(startedAt) > Date.now()) {
    throw new Error("Start time cannot be in the future.");
  }

  const database = await getLocalDatabase();

  const id = Crypto.randomUUID();
  const now = new Date().toISOString();

  const payload = {
    id,
    sleepType: data.sleepType,
    startedAt,
  };

  const entry = {
    ...payload,
    childId,
    type: "sleep",
    endedAt: null,
    durationSeconds: null,
    note: "",
    source: "timer",
    endedByUserId: null,
    createdByUserId: userId,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    version: null,
  };

  await database.withExclusiveTransactionAsync(async (transaction) => {
    // Vérifier dans la même transaction pour empêcher
    // deux démarrages locaux simultanés.
    const rows = await transaction.getAllAsync(
      `
    SELECT entry_json
    FROM tracking_entries_local
    WHERE user_id = ?
      AND child_id = ?
      AND entry_type = 'sleep'
      AND deleted_at IS NULL
      AND sync_status <> 'conflict'
  `,
      [userId, childId],
    );

    const alreadyRunning = rows.some((row) => {
      const storedEntry = JSON.parse(row.entry_json);

      return storedEntry.source === "timer" && storedEntry.endedAt == null;
    });

    if (alreadyRunning) {
      const error = new Error(
        "A sleep timer is already running for this child.",
      );

      error.code = "SLEEP_ALREADY_RUNNING";

      throw error;
    }

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
          ?, ?, ?, 'sleep', ?,
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
      endpoint: `/api/children/${encodeURIComponent(childId)}/sleep/start`,
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

export async function stopLocalSleepEntry({ userId, childId, entryId, data }) {
  if (!userId || !childId || !entryId) {
    throw new Error("Missing user ID, child ID or sleep ID.");
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Missing sleep entry.");
  }

  const endedAt = normalizeDate(data.endedAt, "end");

  if (Date.parse(endedAt) > Date.now()) {
    throw new Error("End time cannot be in the future.");
  }

  if (
    data.note != null &&
    (typeof data.note !== "string" || data.note.length > 10000)
  ) {
    throw new Error("The note must not exceed 10000 characters.");
  }

  const note = data.note?.trim() || null;
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
          AND entry_type = 'sleep'
          AND deleted_at IS NULL
      `,
      [userId, childId, entryId],
    );

    if (!row) {
      throw new Error("Local sleep entry not found.");
    }

    const entry = JSON.parse(row.entry_json);

    if (entry.source !== "timer") {
      throw new Error("This sleep entry was not started with a timer.");
    }

    if (entry.endedAt != null) {
      throw new Error("This sleep has already been stopped.");
    }

    if (Date.parse(endedAt) <= Date.parse(entry.startedAt)) {
      throw new Error("End time must be after start time.");
    }

    const revision = row.local_revision + 1;
    const now = new Date().toISOString();

    const updatedEntry = {
      ...entry,
      endedAt,
      durationSeconds: Math.floor(
        (Date.parse(endedAt) - Date.parse(entry.startedAt)) / 1000,
      ),
      note: note ?? "",
      endedByUserId: userId,
      updatedByUserId: userId,
      updatedAt: now,
    };

    await transaction.runAsync(
      `
        UPDATE tracking_entries_local
        SET
          entry_json = ?,
          local_revision = ?,
          sync_status = 'pending',
          updated_at = ?
        WHERE user_id = ?
          AND entry_id = ?
      `,
      [JSON.stringify(updatedEntry), revision, now, userId, entryId],
    );

    await enqueueSyncOperation({
      userId,
      entityType: "tracking_entry",
      entityId: entryId,
      operation: `stop:${revision}`,
      endpoint:
        `/api/children/${encodeURIComponent(childId)}` +
        `/sleep/${encodeURIComponent(entryId)}/stop`,
      method: "PATCH",
      payload: {
        endedAt,
        note,
        // La version sera fixée avant le premier envoi,
        // après la synchronisation du démarrage.
      },
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

export async function prepareSleepSyncPayload({ operation, payload }) {
  if (
    operation.entity_type !== "tracking_entry" ||
    operation.http_method !== "PATCH" ||
    !/^stop:([1-9]\d*)$/.test(operation.operation) ||
    !operation.endpoint.endsWith("/stop")
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
      throw new Error("Sleep synchronization operation not found.");
    }

    const storedPayload = JSON.parse(queued.payload_json);

    if (
      !storedPayload ||
      typeof storedPayload !== "object" ||
      Array.isArray(storedPayload)
    ) {
      throw new Error("Invalid sleep synchronization payload.");
    }

    // Réutiliser exactement la version du premier envoi.
    if (storedPayload.version !== undefined) {
      if (
        !Number.isInteger(storedPayload.version) ||
        storedPayload.version < 1
      ) {
        throw new Error("Invalid sleep synchronization version.");
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

    if (
      !row ||
      row.entry_type !== "sleep" ||
      !Number.isInteger(row.server_version) ||
      row.server_version < 1
    ) {
      const error = new Error(
        "Waiting for the sleep start to be synchronized.",
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

export async function saveServerSleepLocally({ userId, childId, entry }) {
  if (!userId || !childId) {
    throw new Error("Missing user ID or child ID.");
  }

  if (
    !entry ||
    typeof entry.id !== "string" ||
    entry.childId !== childId ||
    entry.type !== "sleep" ||
    !SLEEP_TYPES.has(entry.sleepType) ||
    !Number.isInteger(entry.version) ||
    entry.version < 1
  ) {
    throw new Error("Invalid server sleep entry.");
  }

  const startedAt = normalizeDate(entry.startedAt, "start");
  const endedAt =
    entry.endedAt == null ? null : normalizeDate(entry.endedAt, "end");

  const updatedAt = normalizeDate(entry.updatedAt, "update");

  if (endedAt !== null && Date.parse(endedAt) <= Date.parse(startedAt)) {
    throw new Error("Invalid server sleep period.");
  }

  const normalizedEntry = {
    ...entry,
    startedAt,
    endedAt,
    updatedAt,
    durationSeconds:
      endedAt === null
        ? null
        : Math.floor((Date.parse(endedAt) - Date.parse(startedAt)) / 1000),
    deletedAt: entry.deletedAt ?? null,
  };

  const database = await getLocalDatabase();

  let savedEntry;

  await database.withExclusiveTransactionAsync(async (transaction) => {
    const existing = await transaction.getFirstAsync(
      `
        SELECT *
        FROM tracking_entries_local
        WHERE user_id = ? AND entry_id = ?
      `,
      [userId, entry.id],
    );

    if (
      existing &&
      (existing.child_id !== childId || existing.entry_type !== "sleep")
    ) {
      throw new Error("Sleep entry synchronization mismatch.");
    }

    const queued = await transaction.getFirstAsync(
      `
        SELECT id
        FROM sync_queue
        WHERE user_id = ?
          AND entity_type = 'tracking_entry'
          AND entity_id = ?
        LIMIT 1
      `,
      [userId, entry.id],
    );

    // Une lecture réseau ne remplace pas une modification locale
    // qui attend encore son envoi.
    if (existing && (queued || existing.sync_status === "pending")) {
      savedEntry = mapLocalEntry(existing);
      return;
    }

    // Ignorer une réponse serveur devenue ancienne.
    if (
      existing &&
      existing.server_version != null &&
      existing.server_version >= entry.version
    ) {
      savedEntry = mapLocalEntry(existing);
      return;
    }

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
        VALUES (?, ?, ?, 'sleep', ?, ?, 1, 'synced', ?, ?, ?)
        ON CONFLICT (user_id, entry_id)
        DO UPDATE SET
          entry_json = excluded.entry_json,
          server_version = excluded.server_version,
          sync_status = 'synced',
          deleted_at = excluded.deleted_at,
          started_at = excluded.started_at,
          updated_at = excluded.updated_at
      `,
      [
        userId,
        entry.id,
        childId,
        JSON.stringify(normalizedEntry),
        entry.version,
        normalizedEntry.deletedAt,
        startedAt,
        updatedAt,
      ],
    );

    const row = await transaction.getFirstAsync(
      `
        SELECT *
        FROM tracking_entries_local
        WHERE user_id = ? AND entry_id = ?
      `,
      [userId, entry.id],
    );

    savedEntry = mapLocalEntry(row);
  });

  return savedEntry;
}

function validateSharedSleep(entry, childId, expectedId = null) {
  if (
    !entry ||
    entry.type !== "sleep" ||
    entry.childId !== childId ||
    typeof entry.id !== "string" ||
    (expectedId !== null && entry.id !== expectedId) ||
    !SLEEP_TYPES.has(entry.sleepType) ||
    !Number.isInteger(entry.version) ||
    entry.version < 1
  ) {
    throw new Error("Invalid shared sleep response.");
  }

  normalizeDate(entry.startedAt, "start");
  normalizeDate(entry.updatedAt, "update");

  if (entry.endedAt != null) {
    const endedAt = normalizeDate(entry.endedAt, "end");

    if (Date.parse(endedAt) <= Date.parse(entry.startedAt)) {
      throw new Error("Invalid shared sleep period.");
    }
  }
}

// Met à jour les sommeils actifs déjà connus, puis récupère
// celui qui est actuellement actif sur le serveur.
export async function refreshSharedSleep({
  userId,
  childId,
  accessToken,
  refreshSession,
}) {
  const database = await getLocalDatabase();

  const rows = await database.getAllAsync(
    `
      SELECT *
      FROM tracking_entries_local
      WHERE user_id = ?
        AND child_id = ?
        AND entry_type = 'sleep'
        AND deleted_at IS NULL
        AND sync_status <> 'conflict'
    `,
    [userId, childId],
  );

  const knownActiveEntries = rows.filter((row) => {
    const entry = JSON.parse(row.entry_json);

    return (
      Number.isInteger(row.server_version) &&
      entry.source === "timer" &&
      entry.endedAt == null
    );
  });

  // Vérifier l'entrée connue permet de détecter son arrêt,
  // même si un nouveau sommeil a déjà été démarré.
  for (const row of knownActiveEntries) {
    const response = await getSleepEntry({
      childId,
      entryId: row.entry_id,
      accessToken,
      refreshSession,
    });

    validateSharedSleep(response?.entry, childId, row.entry_id);

    await saveServerSleepLocally({
      userId,
      childId,
      entry: response.entry,
    });
  }

  const response = await getActiveSleep({
    childId,
    accessToken,
    refreshSession,
  });

  if (!response || !Object.hasOwn(response, "entry")) {
    throw new Error("Invalid active sleep response.");
  }

  if (response.entry !== null) {
    validateSharedSleep(response.entry, childId);

    await saveServerSleepLocally({
      userId,
      childId,
      entry: response.entry,
    });
  }

  // Une réponse "aucun sommeil actif" ne supprime jamais
  // un démarrage local qui attend encore sa synchronisation.
  return getLocalActiveSleepEntry({ userId, childId });
}

// Retourne true uniquement lorsque le conflit a été traité.
export async function resolveSleepSyncConflict({
  operation,
  error,
  accessToken,
  refreshSession,
}) {
  if (operation.entity_type !== "tracking_entry" || error?.status !== 409) {
    return false;
  }

  const isStart =
    operation.http_method === "POST" &&
    operation.endpoint.endsWith("/sleep/start") &&
    error.code === "SLEEP_ALREADY_RUNNING";

  const isStop =
    operation.http_method === "PATCH" &&
    operation.endpoint.endsWith("/stop") &&
    ["SLEEP_ALREADY_STOPPED", "TRACKING_VERSION_CONFLICT"].includes(error.code);

  if (!isStart && !isStop) {
    return false;
  }

  const database = await getLocalDatabase();

  const localRow = await database.getFirstAsync(
    `
      SELECT *
      FROM tracking_entries_local
      WHERE user_id = ?
        AND entry_id = ?
        AND entry_type = 'sleep'
    `,
    [operation.user_id, operation.entity_id],
  );

  if (!localRow) {
    throw new Error("Local sleep entry not found.");
  }

  const childId = localRow.child_id;

  if (isStart) {
    await database.withExclusiveTransactionAsync(async (transaction) => {
      const queued = await transaction.getFirstAsync(
        "SELECT id FROM sync_queue WHERE id = ? AND user_id = ?",
        [operation.id, operation.user_id],
      );

      if (!queued) {
        return;
      }

      const row = await transaction.getFirstAsync(
        `
          SELECT *
          FROM tracking_entries_local
          WHERE user_id = ? AND entry_id = ?
        `,
        [operation.user_id, operation.entity_id],
      );

      const entry = JSON.parse(row.entry_json);
      const now = new Date().toISOString();

      // Conserver le démarrage refusé et ses éventuelles notes.
      await transaction.runAsync(
        `
          UPDATE tracking_entries_local
          SET entry_json = ?,
              sync_status = 'conflict',
              updated_at = ?
          WHERE user_id = ? AND entry_id = ?
        `,
        [
          JSON.stringify({
            ...entry,
            syncConflict: {
              code: "SLEEP_ALREADY_RUNNING",
              resolvedAt: now,
            },
          }),
          now,
          operation.user_id,
          operation.entity_id,
        ],
      );

      // Un arrêt de ce démarrage refusé ne doit pas être envoyé.
      await transaction.runAsync(
        `
          DELETE FROM sync_queue
          WHERE user_id = ?
            AND entity_type = 'tracking_entry'
            AND entity_id = ?
        `,
        [operation.user_id, operation.entity_id],
      );
    });

    await refreshSharedSleep({
      userId: operation.user_id,
      childId,
      accessToken,
      refreshSession,
    });

    return true;
  }

  const response = await getSleepEntry({
    childId,
    entryId: operation.entity_id,
    accessToken,
    refreshSession,
  });

  const serverEntry = response?.entry;

  validateSharedSleep(serverEntry, childId, operation.entity_id);

  await database.withExclusiveTransactionAsync(async (transaction) => {
    const queued = await transaction.getFirstAsync(
      `
        SELECT *
        FROM sync_queue
        WHERE id = ? AND user_id = ?
      `,
      [operation.id, operation.user_id],
    );

    if (!queued) {
      return;
    }

    const row = await transaction.getFirstAsync(
      `
        SELECT *
        FROM tracking_entries_local
        WHERE user_id = ? AND entry_id = ?
      `,
      [operation.user_id, operation.entity_id],
    );

    if (
      row.server_version !== null &&
      row.server_version > serverEntry.version
    ) {
      throw new Error("The server sleep response is outdated.");
    }

    const localEntry = JSON.parse(row.entry_json);
    const payload = JSON.parse(queued.payload_json);
    const now = new Date().toISOString();

    if (serverEntry.endedAt != null) {
      // L'autre parent a déjà arrêté le sommeil.
      // Garder notre proposition et notre note dans syncConflict.
      const entry = {
        ...serverEntry,
        startedAt: normalizeDate(serverEntry.startedAt, "start"),
        endedAt: normalizeDate(serverEntry.endedAt, "end"),
        updatedAt: normalizeDate(serverEntry.updatedAt, "update"),
        deletedAt: serverEntry.deletedAt ?? null,
        syncConflict: {
          code: "SLEEP_ALREADY_STOPPED",
          resolvedAt: now,
          localEndedAt: localEntry.endedAt,
          localNote: localEntry.note ?? "",
        },
      };

      await transaction.runAsync(
        `
          UPDATE tracking_entries_local
          SET entry_json = ?,
              server_version = ?,
              sync_status = 'synced',
              deleted_at = ?,
              started_at = ?,
              updated_at = ?
          WHERE user_id = ? AND entry_id = ?
        `,
        [
          JSON.stringify(entry),
          entry.version,
          entry.deletedAt,
          entry.startedAt,
          entry.updatedAt,
          operation.user_id,
          operation.entity_id,
        ],
      );

      await transaction.runAsync(
        "DELETE FROM sync_queue WHERE id = ? AND user_id = ?",
        [operation.id, operation.user_id],
      );

      return;
    }

    // Le sommeil est toujours actif : réessayer avec la version
    // actuelle, uniquement après un refus explicite du serveur.
    if (
      error.code !== "TRACKING_VERSION_CONFLICT" ||
      Date.parse(payload.endedAt) <= Date.parse(serverEntry.startedAt)
    ) {
      throw new Error("Unable to reconcile the sleep stop.");
    }

    await transaction.runAsync(
      `
        UPDATE tracking_entries_local
        SET server_version = ?,
            entry_json = ?
        WHERE user_id = ? AND entry_id = ?
      `,
      [
        serverEntry.version,
        JSON.stringify({
          ...localEntry,
          version: serverEntry.version,
        }),
        operation.user_id,
        operation.entity_id,
      ],
    );

    await transaction.runAsync(
      `
        UPDATE sync_queue
        SET payload_json = ?,
            status = 'pending',
            next_attempt_at = NULL,
            updated_at = ?
        WHERE id = ? AND user_id = ?
      `,
      [
        JSON.stringify({
          ...payload,
          version: serverEntry.version,
        }),
        now,
        operation.id,
        operation.user_id,
      ],
    );
  });

  return true;
}
