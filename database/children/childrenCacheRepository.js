import { getLocalDatabase } from "../localDatabase.js";

function validateChildren(children) {
  return (
    Array.isArray(children) &&
    children.every(
      (child) => child && typeof child.id === "string" && child.id.length > 0,
    )
  );
}

export async function getCachedChildren(userId) {
  if (!userId) {
    throw new Error("Missing user ID.");
  }

  const database = await getLocalDatabase();

  const row = await database.getFirstAsync(
    `
      SELECT children_json, synced_at
      FROM accessible_children_cache_local
      WHERE user_id = ?
    `,
    [userId],
  );

  if (!row) {
    return null;
  }

  try {
    const children = JSON.parse(row.children_json);

    if (!validateChildren(children)) {
      return null;
    }

    return {
      children,
      lastSyncAt: row.synced_at,
    };
  } catch {
    return null;
  }
}

export async function saveCachedChildren({ userId, children, syncedAt }) {
  if (!userId || !validateChildren(children)) {
    throw new Error("Invalid children cache.");
  }

  const database = await getLocalDatabase();

  await database.runAsync(
    `
      INSERT INTO accessible_children_cache_local (
        user_id,
        children_json,
        synced_at
      )
      VALUES (?, ?, ?)

      ON CONFLICT(user_id)
      DO UPDATE SET
        children_json = excluded.children_json,
        synced_at = excluded.synced_at
    `,
    [userId, JSON.stringify(children), syncedAt],
  );
}
