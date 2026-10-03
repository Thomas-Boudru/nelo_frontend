import { getLocalDatabase } from "../localDatabase.js";

const SUPPORTED_LANGUAGES = new Set(["en", "fr", "de", "es", "it", "nl", "pt"]);

function validateLanguageCode(languageCode) {
  if (languageCode !== null && !SUPPORTED_LANGUAGES.has(languageCode)) {
    throw new Error("Unsupported language.");
  }
}

function mapRow(row) {
  if (!row) {
    return null;
  }

  return {
    userId: row.user_id,
    languageCode: row.language_code,
    weightUnit: row.weight_unit,
    lengthUnit: row.length_unit,
    temperatureUnit: row.temperature_unit,
    volumeUnit: row.volume_unit ?? "ml",
    analyticsEnabled: Boolean(row.analytics_enabled),
    crashReportsEnabled: Boolean(row.crash_reports_enabled),
    aiImprovementEnabled: Boolean(row.ai_improvement_enabled),
    syncStatus: row.sync_status,
    updatedAt: row.updated_at,
  };
}

export async function getLocalUserPreferences(userId) {
  if (!userId) {
    throw new Error("Missing user ID.");
  }

  const database = await getLocalDatabase();

  const row = await database.getFirstAsync(
    `
      SELECT *
      FROM user_preferences_local
      WHERE user_id = ?
    `,
    [userId],
  );

  return mapRow(row);
}

export async function saveUserLanguageLocally({ userId, languageCode }) {
  if (!userId) {
    throw new Error("Missing user ID.");
  }

  validateLanguageCode(languageCode);

  const database = await getLocalDatabase();
  const now = new Date().toISOString();

  await database.runAsync(
    `
      INSERT INTO user_preferences_local (
        user_id,
        language_code,
        sync_status,
        updated_at
      )
      VALUES (?, ?, 'pending', ?)
      ON CONFLICT(user_id)
      DO UPDATE SET
        language_code = excluded.language_code,
        sync_status = 'pending',
        updated_at = excluded.updated_at
    `,
    [userId, languageCode, now],
  );

  return getLocalUserPreferences(userId);
}

export async function saveServerUserPreferencesLocally({
  userId,
  preferences,
}) {
  if (!userId) {
    throw new Error("Missing user ID.");
  }

  if (!preferences || typeof preferences !== "object") {
    throw new Error("Missing user preferences.");
  }

  validateLanguageCode(preferences.languageCode);

  const database = await getLocalDatabase();
  const now = new Date().toISOString();

  await database.runAsync(
    `
    INSERT INTO user_preferences_local (
      user_id,
      language_code,
      weight_unit,
      length_unit,
      temperature_unit,
      volume_unit,
      analytics_enabled,
      crash_reports_enabled,
      ai_improvement_enabled,
      sync_status,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)
    ON CONFLICT(user_id)
    DO UPDATE SET
      language_code = excluded.language_code,
      weight_unit = excluded.weight_unit,
      length_unit = excluded.length_unit,
      temperature_unit = excluded.temperature_unit,
      volume_unit = excluded.volume_unit,
      analytics_enabled = excluded.analytics_enabled,
      crash_reports_enabled = excluded.crash_reports_enabled,
      ai_improvement_enabled = excluded.ai_improvement_enabled,
      sync_status = 'synced',
      updated_at = excluded.updated_at
    WHERE user_preferences_local.sync_status = 'synced'
  `,
    [
      userId,
      preferences.languageCode,
      preferences.weightUnit,
      preferences.lengthUnit,
      preferences.temperatureUnit,
      preferences.volumeUnit ?? "ml",
      Number(preferences.analyticsEnabled),
      Number(preferences.crashReportsEnabled),
      Number(preferences.aiImprovementEnabled),
      now,
    ],
  );

  return getLocalUserPreferences(userId);
}

export async function markUserPreferencesSynced({ userId, expectedUpdatedAt }) {
  if (!userId || !expectedUpdatedAt) {
    throw new Error("Missing user ID or update date.");
  }

  const database = await getLocalDatabase();

  await database.runAsync(
    `
      UPDATE user_preferences_local
      SET sync_status = 'synced'
      WHERE user_id = ?
        AND sync_status = 'pending'
        AND updated_at = ?
    `,
    [userId, expectedUpdatedAt],
  );
}

const UNIT_COLUMNS = {
  weight: {
    column: "weight_unit",
    values: ["kg", "lb"],
  },
  length: {
    column: "length_unit",
    values: ["cm", "in"],
  },
  temperature: {
    column: "temperature_unit",
    values: ["c", "f"],
  },

  volume: {
    column: "volume_unit",
    values: ["ml", "fl_oz"],
  },
};

export async function saveUserMeasurementUnitLocally({
  userId,
  unitType,
  unitValue,
}) {
  if (!userId) {
    throw new Error("Missing user ID.");
  }

  const unit = UNIT_COLUMNS[unitType];

  if (!unit || !unit.values.includes(unitValue)) {
    throw new Error("Invalid measurement unit.");
  }

  const database = await getLocalDatabase();
  const now = new Date().toISOString();

  // La colonne provient uniquement de UNIT_COLUMNS,
  // jamais directement d'une valeur fournie par l'utilisateur.
  await database.runAsync(
    `
      INSERT INTO user_preferences_local (
        user_id,
        ${unit.column},
        sync_status,
        updated_at
      )
      VALUES (?, ?, 'pending', ?)
      ON CONFLICT(user_id)
      DO UPDATE SET
        ${unit.column} = excluded.${unit.column},
        sync_status = 'pending',
        updated_at = excluded.updated_at
    `,
    [userId, unitValue, now],
  );

  return getLocalUserPreferences(userId);
}

const PRIVACY_COLUMNS = {
  usageAnalytics: "analytics_enabled",
  crashReports: "crash_reports_enabled",
  improveAiResponses: "ai_improvement_enabled",
};

export async function saveUserPrivacyPreferenceLocally({
  userId,
  settingName,
  value,
}) {
  if (!userId) {
    throw new Error("Missing user ID.");
  }

  const column = PRIVACY_COLUMNS[settingName];

  if (!column || typeof value !== "boolean") {
    throw new Error("Invalid privacy preference.");
  }

  const database = await getLocalDatabase();
  const now = new Date().toISOString();

  await database.runAsync(
    `
      INSERT INTO user_preferences_local (
        user_id,
        ${column},
        sync_status,
        updated_at
      )
      VALUES (?, ?, 'pending', ?)
      ON CONFLICT(user_id)
      DO UPDATE SET
        ${column} = excluded.${column},
        sync_status = 'pending',
        updated_at = excluded.updated_at
    `,
    [userId, Number(value), now],
  );

  return getLocalUserPreferences(userId);
}
