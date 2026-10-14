import { getLocalDatabase } from "../localDatabase.js";

function requireScope(userId, familyId) {
  if (
    typeof userId !== "string" ||
    !userId.trim() ||
    typeof familyId !== "string" ||
    !familyId.trim()
  ) {
    throw new Error("A user ID and a family ID are required.");
  }
}

function isValidEntitlements(entitlements, familyId) {
  return Boolean(
    entitlements &&
    entitlements.familyId === familyId &&
    typeof entitlements.isPremium === "boolean" &&
    typeof entitlements.planCode === "string" &&
    entitlements.features &&
    typeof entitlements.features === "object" &&
    !Array.isArray(entitlements.features) &&
    Number.isFinite(Date.parse(entitlements.serverTime)),
  );
}

export async function saveLocalEntitlements({
  userId,
  familyId,
  entitlements,
  receivedAt,
}) {
  requireScope(userId, familyId);

  if (!isValidEntitlements(entitlements, familyId)) {
    throw new Error("Invalid family entitlements.");
  }

  if (!Number.isSafeInteger(receivedAt) || receivedAt < 0) {
    throw new Error("Invalid entitlements reception time.");
  }

  const serverTime = Date.parse(entitlements.serverTime);
  const database = await getLocalDatabase();

  await database.runAsync(
    `
      INSERT INTO family_entitlements_local (
        user_id,
        family_id,
        entitlements_json,
        server_time_ms,
        received_at_ms
      )
      VALUES (?, ?, ?, ?, ?)

      ON CONFLICT(user_id, family_id)
      DO UPDATE SET
        entitlements_json = excluded.entitlements_json,
        server_time_ms = excluded.server_time_ms,
        received_at_ms = excluded.received_at_ms

      WHERE excluded.server_time_ms >
        family_entitlements_local.server_time_ms
    `,
    [userId, familyId, JSON.stringify(entitlements), serverTime, receivedAt],
  );
}

export async function getLocalEntitlements({ userId, familyId }) {
  requireScope(userId, familyId);

  const database = await getLocalDatabase();

  const row = await database.getFirstAsync(
    `
      SELECT
        entitlements_json,
        server_time_ms,
        received_at_ms
      FROM family_entitlements_local
      WHERE user_id = ?
        AND family_id = ?
    `,
    [userId, familyId],
  );

  if (!row) {
    return null;
  }

  let entitlements;

  try {
    entitlements = JSON.parse(row.entitlements_json);
  } catch {
    return null;
  }

  if (
    !isValidEntitlements(entitlements, familyId) ||
    !Number.isSafeInteger(row.received_at_ms) ||
    Date.parse(entitlements.serverTime) !== row.server_time_ms
  ) {
    return null;
  }

  // Une entrée peut être ancienne : cette lecture ne l'autorise pas
  // automatiquement à débloquer une fonctionnalité Premium.
  return {
    entitlements,
    serverTime: row.server_time_ms,
    receivedAt: row.received_at_ms,
  };
}

export async function deleteLocalEntitlements({ userId, familyId }) {
  requireScope(userId, familyId);

  const database = await getLocalDatabase();

  await database.runAsync(
    `
      DELETE FROM family_entitlements_local
      WHERE user_id = ?
        AND family_id = ?
    `,
    [userId, familyId],
  );
}

export async function deleteLocalEntitlementsForUser(userId) {
  if (typeof userId !== "string" || !userId.trim()) {
    throw new Error("A user ID is required.");
  }

  const database = await getLocalDatabase();

  await database.runAsync(
    `
      DELETE FROM family_entitlements_local
      WHERE user_id = ?
    `,
    [userId],
  );
}
