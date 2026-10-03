import { getLocalDatabase } from "../localDatabase.js";

export async function saveChildProfileLocally({
  userId,
  childId,
  childData,
  syncStatus = "pending",
}) {
  if (!userId) {
    throw new Error("Missing user ID.");
  }

  if (!childId) {
    throw new Error("Missing child ID.");
  }

  const database = await getLocalDatabase();
  const now = new Date().toISOString();

  const existingRow = await database.getFirstAsync(
    `
      SELECT profile_json
      FROM children_local
      WHERE child_id = ?
        AND user_id = ?
    `,
    [childId, userId],
  );

  let existingProfile = {};

  if (existingRow?.profile_json) {
    try {
      existingProfile = JSON.parse(existingRow.profile_json);
    } catch {
      existingProfile = {};
    }
  }

  const nextProfile = {
    ...existingProfile,
    ...childData,
    id: childId,
    updatedAt: now,
  };

  await database.runAsync(
    `
      INSERT INTO children_local (
        child_id,
        user_id,
        profile_json,
        sync_status,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(child_id)
      DO UPDATE SET
        user_id = excluded.user_id,
        profile_json = excluded.profile_json,
        sync_status = excluded.sync_status,
        updated_at = excluded.updated_at
    `,
    [childId, userId, JSON.stringify(nextProfile), syncStatus, now],
  );

  return nextProfile;
}

export async function getLocalChildProfiles(userId) {
  const database = await getLocalDatabase();

  const rows = await database.getAllAsync(
    `
      SELECT child_id, profile_json, sync_status, updated_at
      FROM children_local
      WHERE user_id = ?
    `,
    [userId],
  );

  return rows.map((row) => ({
    ...JSON.parse(row.profile_json),
    id: row.child_id,
    profileSyncStatus: row.sync_status,
    updatedAt: row.updated_at,
  }));
}

export async function markChildProfileSynced(childId) {
  const database = await getLocalDatabase();

  await database.runAsync(
    `
      UPDATE children_local
      SET sync_status = 'synced'
      WHERE child_id = ?
    `,
    [childId],
  );
}
