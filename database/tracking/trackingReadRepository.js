import * as FileSystem from "expo-file-system/legacy";

import { getLocalDatabase } from "../localDatabase.js";

const TRACKING_TYPES = new Set([
  "bottle",
  "breastfeeding",
  "pumping",
  "solids",
  "sleep",
  "diaper",
  "potty",
  "mood",
  "medication",
  "vaccine",
  "temperature",
  "symptoms",
  "teething",
  "growth",
  "note",
]);

function requireIdentifiers(userId, childId) {
  if (!userId || !childId) {
    throw new Error("Missing user ID or child ID.");
  }
}

function normalizeDate(value) {
  if (!(value instanceof Date) && typeof value !== "string") {
    throw new Error("Invalid tracking date.");
  }

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    throw new Error("Invalid tracking date.");
  }

  return date;
}

function getLocalDateKey(date) {
  return [
    String(date.getFullYear()).padStart(4, "0"),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function getPhotoUri(relativePath) {
  if (
    !FileSystem.documentDirectory ||
    typeof relativePath !== "string" ||
    !/^tracking-photos\/[0-9a-f-]+\.jpg$/i.test(relativePath)
  ) {
    throw new Error("Invalid local photo path.");
  }

  return `${FileSystem.documentDirectory}${relativePath}`;
}

async function mapEntries(database, userId, childId, rows) {
  if (rows.length === 0) {
    return [];
  }

  const photosByEntry = new Map();

  // Petits lots pour ne pas dépasser la limite de paramètres SQLite.
  for (let offset = 0; offset < rows.length; offset += 100) {
    const ids = rows.slice(offset, offset + 100).map((row) => row.entry_id);
    const placeholders = ids.map(() => "?").join(", ");

    const photos = await database.getAllAsync(
      `
        SELECT *
        FROM tracking_photos_local
        WHERE user_id = ?
          AND child_id = ?
          AND entry_id IN (${placeholders})
        ORDER BY sort_order ASC, attachment_id ASC
      `,
      [userId, childId, ...ids],
    );

    for (const row of photos) {
      if (!photosByEntry.has(row.entry_id)) {
        photosByEntry.set(row.entry_id, []);
      }

      photosByEntry.get(row.entry_id).push({
        ...JSON.parse(row.photo_json),
        id: row.attachment_id,
        attachmentId: row.attachment_id,
        relativePath: row.relative_path,
        uri: getPhotoUri(row.relative_path),
        sortOrder: row.sort_order,
        syncStatus: row.sync_status,
      });
    }
  }

  return rows.map((row) => ({
    ...JSON.parse(row.entry_json),

    // Les colonnes locales font autorité sur ces métadonnées.
    id: row.entry_id,
    childId: row.child_id,
    type: row.entry_type,
    startedAt: row.started_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    serverVersion: row.server_version,
    localRevision: row.local_revision,
    syncStatus: row.sync_status,

    photos: photosByEntry.get(row.entry_id) ?? [],
  }));
}

/*
 * Période de journées locales :
 * - from inclus, à minuit ;
 * - to exclu, à minuit.
 *
 * Exemple : aujourd'hui à minuit → demain à minuit.
 */
export async function getLocalTrackingPeriod({
  userId,
  childId,
  from,
  to,
  types = [],
}) {
  requireIdentifiers(userId, childId);

  const start = normalizeDate(from);
  const end = normalizeDate(to);

  const isMidnight = (date) =>
    date.getHours() === 0 &&
    date.getMinutes() === 0 &&
    date.getSeconds() === 0 &&
    date.getMilliseconds() === 0;

  if (
    !isMidnight(start) ||
    !isMidnight(end) ||
    start.getTime() >= end.getTime()
  ) {
    throw new Error("A valid range of full local days is required.");
  }

  if (
    !Array.isArray(types) ||
    types.some((type) => !TRACKING_TYPES.has(type))
  ) {
    throw new Error("Invalid tracking types.");
  }

  const parameters = [
    userId,
    childId,
    start.toISOString(),
    end.toISOString(),
    getLocalDateKey(start),
    getLocalDateKey(end),
  ];

  const uniqueTypes = [...new Set(types)];

  const typeCondition = uniqueTypes.length
    ? `AND entry_type IN (${uniqueTypes.map(() => "?").join(", ")})`
    : "";

  parameters.push(...uniqueTypes);

  const database = await getLocalDatabase();
  let entries;

  // Une même transaction pour les événements et leurs photos.
  await database.withExclusiveTransactionAsync(async (transaction) => {
    const rows = await transaction.getAllAsync(
      `
        WITH bounds AS (
          SELECT
            ? AS user_id,
            ? AS child_id,
            ? AS start_iso,
            ? AS end_iso,
            ? AS start_day,
            ? AS end_day
        )
        SELECT e.*
        FROM tracking_entries_local e
        CROSS JOIN bounds b
        WHERE e.user_id = b.user_id
          AND e.child_id = b.child_id
          AND e.deleted_at IS NULL
          AND (
            (
              e.entry_type = 'sleep'
              AND e.started_at < b.end_iso
              AND (
                json_extract(e.entry_json, '$.endedAt') IS NULL
                OR julianday(
                  json_extract(e.entry_json, '$.endedAt')
                ) > julianday(b.start_iso)
              )
            )
            OR
            (
              e.entry_type = 'growth'
              AND json_extract(
                e.entry_json, '$.measurementDate'
              ) >= b.start_day
              AND json_extract(
                e.entry_json, '$.measurementDate'
              ) < b.end_day
            )
            OR
            (
              e.entry_type = 'teething'
              AND json_extract(
                e.entry_json, '$.eruptionDate'
              ) >= b.start_day
              AND json_extract(
                e.entry_json, '$.eruptionDate'
              ) < b.end_day
            )
            OR
            (
              e.entry_type NOT IN ('sleep', 'growth', 'teething')
              AND e.started_at >= b.start_iso
              AND e.started_at < b.end_iso
            )
          )
          ${typeCondition}
        ORDER BY e.started_at DESC, e.entry_id DESC
      `,
      parameters,
    );

    entries = await mapEntries(transaction, userId, childId, rows);
  });

  return entries;
}

export async function getLocalTrackingEntry({ userId, childId, entryId }) {
  requireIdentifiers(userId, childId);

  if (!entryId) {
    throw new Error("Missing tracking entry ID.");
  }

  const database = await getLocalDatabase();
  let entry = null;

  await database.withExclusiveTransactionAsync(async (transaction) => {
    const row = await transaction.getFirstAsync(
      `
        SELECT *
        FROM tracking_entries_local
        WHERE user_id = ?
          AND child_id = ?
          AND entry_id = ?
          AND deleted_at IS NULL
      `,
      [userId, childId, entryId],
    );

    if (row) {
      const entries = await mapEntries(transaction, userId, childId, [row]);

      entry = entries[0];
    }
  });

  return entry;
}

export async function getLocalGrowthHistory({ userId, childId }) {
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
        AND entry_type = 'growth'
        AND deleted_at IS NULL
      ORDER BY started_at DESC, entry_id DESC
    `,
    [userId, childId],
  );

  return rows.map((row) => ({
    ...JSON.parse(row.entry_json),
    id: row.entry_id,
    childId: row.child_id,
    type: row.entry_type,
    startedAt: row.started_at,
    deletedAt: row.deleted_at,
    serverVersion: row.server_version,
    localRevision: row.local_revision,
    syncStatus: row.sync_status,
  }));
}
