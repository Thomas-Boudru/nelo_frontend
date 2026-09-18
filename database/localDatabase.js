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
      `);
}
