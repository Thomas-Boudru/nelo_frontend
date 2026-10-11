import * as SQLite from "expo-sqlite";

let databasePromise = null;

export function getLocalDatabase() {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync("nelo.db");
  }

  return databasePromise;
}

export async function initializeLocalDatabase() {
  const database = await getLocalDatabase();

  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      operation TEXT NOT NULL,
      endpoint TEXT NOT NULL,
      http_method TEXT NOT NULL,
      payload_json TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      attempt_count INTEGER NOT NULL DEFAULT 0,
      next_attempt_at TEXT,
      last_error_code TEXT,
      last_error_message TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sync_queue_user_status
      ON sync_queue(user_id, status, created_at);

    CREATE TABLE IF NOT EXISTS child_preferences_local (
      child_id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      visible_tracking_types_json TEXT NOT NULL,
      visible_feeding_methods_json TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'synced',
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS children_local (
      child_id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      profile_json TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'synced',
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_children_local_user
      ON children_local(user_id, updated_at);

    CREATE TABLE IF NOT EXISTS child_relationships_local (
      user_id TEXT NOT NULL,
      child_id TEXT NOT NULL,
      relationship_type TEXT NOT NULL,
      relationship_label TEXT,
      sync_status TEXT NOT NULL DEFAULT 'synced',
      updated_at TEXT NOT NULL,

      PRIMARY KEY (user_id, child_id)
    );


    CREATE TABLE IF NOT EXISTS user_notification_preferences_local (
      user_id TEXT PRIMARY KEY NOT NULL,
      notifications_enabled INTEGER NOT NULL DEFAULT 1,
      tracking_reminders_enabled INTEGER NOT NULL DEFAULT 0,
      daily_tip_enabled INTEGER NOT NULL DEFAULT 1,
      invitation_accepted_enabled INTEGER NOT NULL DEFAULT 1,
      important_shared_activity_enabled INTEGER NOT NULL DEFAULT 0,
      sync_status TEXT NOT NULL DEFAULT 'synced',
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_preferences_local (
      user_id TEXT PRIMARY KEY NOT NULL,
      language_code TEXT,
      weight_unit TEXT NOT NULL DEFAULT 'kg',
      length_unit TEXT NOT NULL DEFAULT 'cm',
      temperature_unit TEXT NOT NULL DEFAULT 'c',
      volume_unit TEXT NOT NULL DEFAULT 'ml',
      analytics_enabled INTEGER NOT NULL DEFAULT 0,
      crash_reports_enabled INTEGER NOT NULL DEFAULT 0,
      ai_improvement_enabled INTEGER NOT NULL DEFAULT 0,
      sync_status TEXT NOT NULL DEFAULT 'synced',
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bottle_preferences_local (
      user_id TEXT NOT NULL,
      child_id TEXT NOT NULL,
      bottle_capacity_ml REAL,
      milk_type TEXT,
      amount_view TEXT,
      updated_at TEXT NOT NULL,

      PRIMARY KEY (user_id, child_id)
    );

    CREATE TABLE IF NOT EXISTS tracking_entries_local (
  user_id TEXT NOT NULL,
  entry_id TEXT NOT NULL,
  child_id TEXT NOT NULL,
  entry_type TEXT NOT NULL,
  entry_json TEXT NOT NULL,

  server_version INTEGER,
  local_revision INTEGER NOT NULL DEFAULT 1,

  sync_status TEXT NOT NULL DEFAULT 'synced',
  deleted_at TEXT,
  started_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  PRIMARY KEY (user_id, entry_id)
);

CREATE INDEX IF NOT EXISTS idx_tracking_entries_local_child_date
  ON tracking_entries_local (
    user_id,
    child_id,
    started_at DESC,
    entry_id DESC
  );

CREATE TABLE IF NOT EXISTS child_bottle_presets_local (
  user_id TEXT NOT NULL,
  preset_id TEXT NOT NULL,
  child_id TEXT NOT NULL,
  preset_json TEXT NOT NULL,

  server_version INTEGER,
  local_revision INTEGER NOT NULL DEFAULT 1,

  sync_status TEXT NOT NULL DEFAULT 'synced',
  archived_at TEXT,
  updated_at TEXT NOT NULL,

  PRIMARY KEY (user_id, preset_id)
);

CREATE INDEX IF NOT EXISTS idx_bottle_presets_local_child
  ON child_bottle_presets_local (
    user_id,
    child_id,
    archived_at
  );

  CREATE TABLE IF NOT EXISTS child_custom_foods_local (
  user_id TEXT NOT NULL,
  food_id TEXT NOT NULL,
  child_id TEXT NOT NULL,
  food_json TEXT NOT NULL,

  server_version INTEGER,
  local_revision INTEGER NOT NULL DEFAULT 1,

  sync_status TEXT NOT NULL DEFAULT 'synced',
  deleted_at TEXT,
  updated_at TEXT NOT NULL,

  PRIMARY KEY (user_id, food_id)
);

CREATE INDEX IF NOT EXISTS idx_child_custom_foods_local_child
  ON child_custom_foods_local (
    user_id,
    child_id,
    deleted_at
  );

CREATE TABLE IF NOT EXISTS tracking_photos_local (
  user_id TEXT NOT NULL,
  attachment_id TEXT NOT NULL,
  entry_id TEXT NOT NULL,
  child_id TEXT NOT NULL,

  relative_path TEXT NOT NULL,
  photo_json TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  sort_order INTEGER NOT NULL,
  updated_at TEXT NOT NULL,

  PRIMARY KEY (user_id, attachment_id)
);

CREATE INDEX IF NOT EXISTS idx_tracking_photos_local_entry
  ON tracking_photos_local (user_id, entry_id, sort_order);

  CREATE TABLE IF NOT EXISTS moments_local (
  user_id TEXT NOT NULL,
  moment_id TEXT NOT NULL,
  child_id TEXT NOT NULL,

  moment_type TEXT NOT NULL,
  moment_json TEXT NOT NULL,

  occurred_on TEXT NOT NULL,
  publication_status TEXT NOT NULL DEFAULT 'draft',

  server_version INTEGER,
  local_revision INTEGER NOT NULL DEFAULT 1,

  sync_status TEXT NOT NULL DEFAULT 'pending',

  deleted_at TEXT,
  updated_at TEXT NOT NULL,

  PRIMARY KEY (user_id, moment_id),

  CHECK (moment_type IN ('photo', 'note', 'milestone')),
  CHECK (publication_status IN ('draft', 'published')),
  CHECK (local_revision >= 1),
  CHECK (server_version IS NULL OR server_version >= 1)
);

CREATE INDEX IF NOT EXISTS idx_moments_local_child_date
  ON moments_local (
    user_id,
    child_id,
    occurred_on DESC,
    moment_id DESC
  )
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_moments_local_child_sync
  ON moments_local (
    user_id,
    child_id,
    sync_status
  );

  CREATE TABLE IF NOT EXISTS moment_photos_local (
  user_id TEXT NOT NULL,
  attachment_id TEXT NOT NULL,
  moment_id TEXT NOT NULL,
  child_id TEXT NOT NULL,

  relative_path TEXT,
  photo_json TEXT NOT NULL,

  display_order INTEGER NOT NULL,

  local_revision INTEGER NOT NULL DEFAULT 1,
  sync_status TEXT NOT NULL DEFAULT 'pending',

  deleted_at TEXT,
  updated_at TEXT NOT NULL,

  PRIMARY KEY (user_id, attachment_id),

  FOREIGN KEY (user_id, moment_id)
    REFERENCES moments_local(user_id, moment_id)
    ON DELETE CASCADE,

  CHECK (display_order >= 0),
  CHECK (local_revision >= 1)
);

CREATE INDEX IF NOT EXISTS idx_moment_photos_local_moment
  ON moment_photos_local (
    user_id,
    moment_id,
    display_order,
    attachment_id
  )
  WHERE deleted_at IS NULL;


  CREATE TABLE IF NOT EXISTS child_custom_milestones_local (
  user_id TEXT NOT NULL,
  milestone_id TEXT NOT NULL,
  child_id TEXT NOT NULL,

  milestone_json TEXT NOT NULL,

  normalized_name TEXT NOT NULL,
  category_code TEXT NOT NULL,

  server_version INTEGER,
  local_revision INTEGER NOT NULL DEFAULT 1,

  sync_status TEXT NOT NULL DEFAULT 'pending',

  archived_at TEXT,
  updated_at TEXT NOT NULL,

  PRIMARY KEY (user_id, milestone_id),

  CHECK (
    category_code IN (
      'development',
      'feeding',
      'sleep',
      'growth',
      'daily-life'
    )
  ),

  CHECK (local_revision >= 1),
  CHECK (server_version IS NULL OR server_version >= 1)
);

CREATE INDEX IF NOT EXISTS idx_custom_milestones_local_child
  ON child_custom_milestones_local (
    user_id,
    child_id,
    archived_at,
    category_code,
    normalized_name
  );

  CREATE TABLE IF NOT EXISTS moments_sync_state_local (
  user_id TEXT NOT NULL,
  child_id TEXT NOT NULL,

  moments_cursor TEXT,
  custom_milestones_cursor TEXT,

  updated_at TEXT NOT NULL,

  PRIMARY KEY (user_id, child_id)
);
      `);

  const columns = await database.getAllAsync(
    "PRAGMA table_info(user_preferences_local)",
  );

  if (!columns.some((column) => column.name === "volume_unit")) {
    await database.execAsync(
      "ALTER TABLE user_preferences_local ADD COLUMN volume_unit TEXT NOT NULL DEFAULT 'ml'",
    );
  }
}
