import { getLocalDatabase } from "../../localDatabase.js";

function validateIds(userId, childId) {
  if (!userId || !childId) {
    throw new Error("Missing user ID or child ID.");
  }
}

export async function getLocalBottlePreferences({ userId, childId }) {
  validateIds(userId, childId);

  const database = await getLocalDatabase();

  const row = await database.getFirstAsync(
    `
      SELECT bottle_capacity_ml, milk_type, amount_view
      FROM bottle_preferences_local
      WHERE user_id = ? AND child_id = ?
    `,
    [userId, childId],
  );

  if (!row) {
    return null;
  }

  return {
    bottleCapacityMl: row.bottle_capacity_ml,
    milkType: row.milk_type,
    amountView: row.amount_view,
  };
}

const PREFERENCE_COLUMNS = {
  bottleCapacityMl: "bottle_capacity_ml",
  milkType: "milk_type",
  amountView: "amount_view",
};

export async function saveLocalBottlePreference({
  userId,
  childId,
  preference,
  value,
}) {
  validateIds(userId, childId);

  const column = PREFERENCE_COLUMNS[preference];

  if (!column) {
    throw new Error("Invalid bottle preference.");
  }

  if (preference === "bottleCapacityMl") {
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
      throw new Error("Invalid bottle capacity.");
    }
  } else if (typeof value !== "string" || !value.trim()) {
    throw new Error("Invalid bottle preference value.");
  }

  const database = await getLocalDatabase();

  // La colonne vient exclusivement de PREFERENCE_COLUMNS.
  await database.runAsync(
    `
      INSERT INTO bottle_preferences_local (
        user_id,
        child_id,
        ${column},
        updated_at
      )
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id, child_id)
      DO UPDATE SET
        ${column} = excluded.${column},
        updated_at = excluded.updated_at
    `,
    [userId, childId, value, new Date().toISOString()],
  );
}
