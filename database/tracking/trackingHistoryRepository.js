import * as FileSystem from "expo-file-system/legacy";

import { getLocalDatabase } from "../localDatabase.js";

const HISTORY_TYPES = {
  temperature: ["temperature"],
  medication: ["medication"],
  vaccine: ["vaccine"],
  teething: ["teething"],
  note: ["note"],
  symptoms: ["symptoms"],
  feeding: ["bottle", "breastfeeding", "solids", "pumping"],
  diaper: ["diaper", "potty"],
  mood: ["mood"],
};

function getPhotoUri(row, photo) {
  if (!row.relative_path) {
    return photo.url ?? photo.uri ?? null;
  }

  if (
    !FileSystem.documentDirectory ||
    !/^tracking-photos\/[0-9a-f-]+\.jpg$/i.test(row.relative_path)
  ) {
    throw new Error("Invalid local photo path.");
  }

  return `${FileSystem.documentDirectory}${row.relative_path}`;
}

export async function getLocalTrackingHistory({
  userId,
  childId,
  trackingType,
}) {
  if (!userId || !childId) {
    throw new Error("Missing user ID or child ID.");
  }

  if (!Object.hasOwn(HISTORY_TYPES, trackingType)) {
    throw new Error("Unsupported tracking history.");
  }

  const types = HISTORY_TYPES[trackingType];
  const placeholders = types.map(() => "?").join(", ");
  const database = await getLocalDatabase();

  let entries = [];

  await database.withExclusiveTransactionAsync(async (transaction) => {
    const rows = await transaction.getAllAsync(
      `
        SELECT *
        FROM tracking_entries_local
        WHERE user_id = ?
          AND child_id = ?
          AND entry_type IN (${placeholders})
          AND deleted_at IS NULL
        ORDER BY started_at DESC, entry_id DESC
      `,
      [userId, childId, ...types],
    );

    const photoRows = await transaction.getAllAsync(
      `
        SELECT p.*
        FROM tracking_photos_local p
        INNER JOIN tracking_entries_local e
          ON e.user_id = p.user_id
          AND e.entry_id = p.entry_id
          AND e.child_id = p.child_id
        WHERE e.user_id = ?
          AND e.child_id = ?
          AND e.entry_type IN (${placeholders})
          AND e.deleted_at IS NULL
        ORDER BY p.sort_order ASC, p.attachment_id ASC
      `,
      [userId, childId, ...types],
    );

    const photosByEntry = new Map();

    for (const row of photoRows) {
      const photo = JSON.parse(row.photo_json);

      if (!photosByEntry.has(row.entry_id)) {
        photosByEntry.set(row.entry_id, []);
      }

      photosByEntry.get(row.entry_id).push({
        ...photo,
        id: row.attachment_id,
        attachmentId: row.attachment_id,
        uri: getPhotoUri(row, photo),
        sortOrder: row.sort_order,
        syncStatus: row.sync_status,
      });
    }

    entries = rows.map((row) => ({
      ...JSON.parse(row.entry_json),
      id: row.entry_id,
      childId: row.child_id,
      type: row.entry_type,
      startedAt: row.started_at,
      deletedAt: row.deleted_at,
      serverVersion: row.server_version,
      localRevision: row.local_revision,
      syncStatus: row.sync_status,
      photos: photosByEntry.get(row.entry_id) ?? [],
    }));
  });

  return entries;
}
