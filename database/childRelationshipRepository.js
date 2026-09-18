import { getLocalDatabase } from "./localDatabase.js";

export async function saveChildRelationshipLocally({
  userId,
  childId,
  relationship,
  relationshipLabel = null,
  syncStatus = "pending",
}) {
  if (!userId) {
    throw new Error("Missing user ID.");
  }

  if (!childId) {
    throw new Error("Missing child ID.");
  }

  if (!relationship) {
    throw new Error("Missing relationship.");
  }

  const database = await getLocalDatabase();
  const now = new Date().toISOString();

  await database.runAsync(
    `
      INSERT INTO child_relationships_local (
        user_id,
        child_id,
        relationship_type,
        relationship_label,
        sync_status,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?)

      ON CONFLICT(user_id, child_id)
      DO UPDATE SET
        relationship_type = excluded.relationship_type,
        relationship_label = excluded.relationship_label,
        sync_status = excluded.sync_status,
        updated_at = excluded.updated_at
    `,
    [userId, childId, relationship, relationshipLabel, syncStatus, now],
  );

  return {
    childId,
    relationship,
    relationshipLabel,
    syncStatus,
    updatedAt: now,
  };
}

export async function getLocalChildRelationships(userId) {
  if (!userId) {
    return [];
  }

  const database = await getLocalDatabase();

  const rows = await database.getAllAsync(
    `
      SELECT
        user_id,
        child_id,
        relationship_type,
        relationship_label,
        sync_status,
        updated_at
      FROM child_relationships_local
      WHERE user_id = ?
    `,
    [userId],
  );

  return rows.map((row) => ({
    userId: row.user_id,
    childId: row.child_id,
    relationship: row.relationship_type,
    relationshipLabel: row.relationship_label,
    syncStatus: row.sync_status,
    updatedAt: row.updated_at,
  }));
}

export async function markChildRelationshipSynced({ userId, childId }) {
  const database = await getLocalDatabase();

  await database.runAsync(
    `
      UPDATE child_relationships_local
      SET sync_status = 'synced'
      WHERE user_id = ?
        AND child_id = ?
    `,
    [userId, childId],
  );
}
