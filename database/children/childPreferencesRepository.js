import { getLocalDatabase } from "../localDatabase.js";

export async function saveChildPreferencesLocally({
  userId,
  childId,
  preferences,
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

  const existingPreferences = await database.getFirstAsync(
    `
        SELECT
          visible_tracking_types_json,
          visible_feeding_methods_json
        FROM child_preferences_local
        WHERE child_id = ?
      `,
    [childId],
  );

  const currentVisibleTrackingTypes =
    existingPreferences?.visible_tracking_types_json
      ? JSON.parse(existingPreferences.visible_tracking_types_json)
      : [];

  const currentVisibleFeedingMethods =
    existingPreferences?.visible_feeding_methods_json
      ? JSON.parse(existingPreferences.visible_feeding_methods_json)
      : [];

  const nextVisibleTrackingTypes =
    preferences.visibleTrackingTypes ?? currentVisibleTrackingTypes;

  const nextVisibleFeedingMethods =
    preferences.visibleFeedingMethods ?? currentVisibleFeedingMethods;

  await database.runAsync(
    `
      INSERT INTO child_preferences_local (
        child_id,
        user_id,
        visible_tracking_types_json,
        visible_feeding_methods_json,
        sync_status,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(child_id)
      DO UPDATE SET
        user_id = excluded.user_id,
        visible_tracking_types_json =
          excluded.visible_tracking_types_json,
        visible_feeding_methods_json =
          excluded.visible_feeding_methods_json,
        sync_status = excluded.sync_status,
        updated_at = excluded.updated_at
    `,
    [
      childId,
      userId,
      JSON.stringify(nextVisibleTrackingTypes),
      JSON.stringify(nextVisibleFeedingMethods),
      syncStatus,
      now,
    ],
  );
}

export async function markChildPreferencesSynced(childId) {
  const database = await getLocalDatabase();

  await database.runAsync(
    `
      UPDATE child_preferences_local
      SET sync_status = 'synced'
      WHERE child_id = ?
    `,
    [childId],
  );
}
