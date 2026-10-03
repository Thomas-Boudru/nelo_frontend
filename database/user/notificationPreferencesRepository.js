import { getLocalDatabase } from "../localDatabase.js";

export const DEFAULT_NOTIFICATION_PREFERENCES = {
  notifications_enabled: true,
  tracking_reminders_enabled: false,
  daily_tip_enabled: true,
  invitation_accepted_enabled: true,
  important_shared_activity_enabled: false,
};

const FIELDS = Object.keys(DEFAULT_NOTIFICATION_PREFERENCES);

function fromRow(row) {
  if (!row) return null;

  return Object.fromEntries(
    FIELDS.map((field) => [field, Boolean(row[field])]),
  );
}

export async function getLocalNotificationPreferences(userId) {
  const database = await getLocalDatabase();

  const row = await database.getFirstAsync(
    `
      SELECT *
      FROM user_notification_preferences_local
      WHERE user_id = ?
    `,
    [userId],
  );

  return row
    ? {
        preferences: fromRow(row),
        syncStatus: row.sync_status,
      }
    : null;
}

export async function saveNotificationPreferencesLocally({
  userId,
  preferences,
  syncStatus = "pending",
}) {
  const database = await getLocalDatabase();
  const now = new Date().toISOString();

  const current = await getLocalNotificationPreferences(userId);

  const next = {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    ...current?.preferences,
    ...preferences,
  };

  await database.runAsync(
    `
      INSERT INTO user_notification_preferences_local (
        user_id,
        notifications_enabled,
        tracking_reminders_enabled,
        daily_tip_enabled,
        invitation_accepted_enabled,
        important_shared_activity_enabled,
        sync_status,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        notifications_enabled = excluded.notifications_enabled,
        tracking_reminders_enabled = excluded.tracking_reminders_enabled,
        daily_tip_enabled = excluded.daily_tip_enabled,
        invitation_accepted_enabled = excluded.invitation_accepted_enabled,
        important_shared_activity_enabled =
          excluded.important_shared_activity_enabled,
        sync_status = excluded.sync_status,
        updated_at = excluded.updated_at
    `,
    [
      userId,
      Number(next.notifications_enabled),
      Number(next.tracking_reminders_enabled),
      Number(next.daily_tip_enabled),
      Number(next.invitation_accepted_enabled),
      Number(next.important_shared_activity_enabled),
      syncStatus,
      now,
    ],
  );

  return next;
}

export async function markNotificationPreferencesSynced(userId) {
  const database = await getLocalDatabase();

  await database.runAsync(
    `
      UPDATE user_notification_preferences_local
      SET sync_status = 'synced'
      WHERE user_id = ?
    `,
    [userId],
  );
}
