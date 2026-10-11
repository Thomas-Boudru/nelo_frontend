import { getLocalDatabase } from "../../localDatabase.js";

import { enqueueSyncOperation } from "../../../sync/syncQueueRepository.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ALLOWED_UNITS = new Set([
  "piece",
  "g",
  "ml",
  "teaspoon",
  "tablespoon",
  "portion",
]);

function requireScope(userId, childId) {
  if (!userId || !childId) {
    throw new Error("Missing user ID or child ID.");
  }
}

function normalizeName(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[-'’]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function mapLocalFood(row) {
  return {
    ...JSON.parse(row.food_json),
    version: row.server_version,
    serverVersion: row.server_version,
    localRevision: row.local_revision,
    syncStatus: row.sync_status,
    deletedAt: row.deleted_at,
  };
}

function validateFood(food) {
  if (!food || !UUID_PATTERN.test(food.id ?? "")) {
    throw new Error("Invalid custom food ID.");
  }

  const name = typeof food.name === "string" ? food.name.trim() : "";
  const suggestedUnit = food.suggestedUnit ?? "piece";
  const emoji = food.emoji ?? "🥣";

  if (!name || name.length > 150 || !normalizeName(name)) {
    throw new Error("Invalid custom food name.");
  }

  if (!ALLOWED_UNITS.has(suggestedUnit)) {
    throw new Error("Invalid suggested food unit.");
  }

  if (typeof emoji !== "string" || !emoji.trim() || emoji.length > 32) {
    throw new Error("Invalid food emoji.");
  }

  return {
    id: food.id.toLowerCase(),
    name,
    suggestedUnit,
    emoji: emoji.trim(),
  };
}

function createDependencyError(message) {
  const error = new Error(message);

  error.code = "SYNC_DEPENDENCY_PENDING";
  error.status = 0;

  return error;
}

export async function getLocalCustomFoods({ userId, childId }) {
  requireScope(userId, childId);

  const database = await getLocalDatabase();

  const rows = await database.getAllAsync(
    `
      SELECT *
      FROM child_custom_foods_local
      WHERE user_id = ?
        AND child_id = ?
      ORDER BY updated_at DESC, food_id ASC
    `,
    [userId, childId],
  );

  return rows.map(mapLocalFood);
}

export async function saveCustomFoodLocally({ userId, childId, food }) {
  requireScope(userId, childId);

  const values = validateFood(food);
  const database = await getLocalDatabase();

  let savedFood;

  await database.withExclusiveTransactionAsync(async (transaction) => {
    const existing = await transaction.getFirstAsync(
      `
        SELECT *
        FROM child_custom_foods_local
        WHERE user_id = ? AND food_id = ?
      `,
      [userId, values.id],
    );

    if (existing && existing.child_id !== childId) {
      throw new Error("Custom food child mismatch.");
    }

    if (existing?.deleted_at) {
      throw new Error("This custom food was deleted.");
    }

    const activeFoods = await transaction.getAllAsync(
      `
        SELECT food_id, food_json
        FROM child_custom_foods_local
        WHERE user_id = ?
          AND child_id = ?
          AND deleted_at IS NULL
          AND food_id <> ?
      `,
      [userId, childId, values.id],
    );

    const duplicate = activeFoods.some((row) => {
      const current = JSON.parse(row.food_json);

      return normalizeName(current.name) === normalizeName(values.name);
    });

    if (duplicate) {
      throw new Error("An active food with this name already exists.");
    }

    const previous = existing ? JSON.parse(existing.food_json) : null;
    const revision = (existing?.local_revision ?? 0) + 1;
    const now = new Date().toISOString();

    savedFood = {
      ...values,
      childId,
      isCustom: true,
      translationKey: null,
      image: null,
      createdAt: previous?.createdAt ?? now,
      updatedAt: now,
      deletedAt: null,
      version: existing?.server_version ?? null,
      serverVersion: existing?.server_version ?? null,
      localRevision: revision,
      syncStatus: "pending",
    };

    await transaction.runAsync(
      `
        INSERT INTO child_custom_foods_local (
          user_id,
          food_id,
          child_id,
          food_json,
          server_version,
          local_revision,
          sync_status,
          deleted_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, 'pending', NULL, ?)
        ON CONFLICT (user_id, food_id)
        DO UPDATE SET
          food_json = excluded.food_json,
          local_revision = excluded.local_revision,
          sync_status = 'pending',
          updated_at = excluded.updated_at
      `,
      [
        userId,
        values.id,
        childId,
        JSON.stringify(savedFood),
        existing?.server_version ?? null,
        revision,
        now,
      ],
    );

    const baseEndpoint = `/api/children/${encodeURIComponent(childId)}/custom-foods`;

    await enqueueSyncOperation({
      userId,
      entityType: "child_custom_food",
      entityId: values.id,
      operation: `${existing ? "update" : "create"}:${revision}`,
      endpoint: existing ? `${baseEndpoint}/${values.id}` : baseEndpoint,
      method: existing ? "PUT" : "POST",
      payload: values,
      database: transaction,
    });
  });

  return savedFood;
}

export async function deleteCustomFoodLocally({ userId, childId, foodId }) {
  requireScope(userId, childId);

  if (!UUID_PATTERN.test(foodId ?? "")) {
    throw new Error("Invalid custom food ID.");
  }

  const normalizedFoodId = foodId.toLowerCase();
  const database = await getLocalDatabase();

  let deletedFood;

  await database.withExclusiveTransactionAsync(async (transaction) => {
    const row = await transaction.getFirstAsync(
      `
        SELECT *
        FROM child_custom_foods_local
        WHERE user_id = ?
          AND child_id = ?
          AND food_id = ?
      `,
      [userId, childId, normalizedFoodId],
    );

    if (!row) {
      throw new Error("Custom food not found.");
    }

    if (row.deleted_at) {
      deletedFood = mapLocalFood(row);
      return;
    }

    const now = new Date().toISOString();
    const revision = row.local_revision + 1;

    deletedFood = {
      ...mapLocalFood(row),
      deletedAt: now,
      updatedAt: now,
      localRevision: revision,
      syncStatus: "pending",
    };

    await transaction.runAsync(
      `
        UPDATE child_custom_foods_local
        SET
          food_json = ?,
          local_revision = ?,
          sync_status = 'pending',
          deleted_at = ?,
          updated_at = ?
        WHERE user_id = ?
          AND child_id = ?
          AND food_id = ?
      `,
      [
        JSON.stringify(deletedFood),
        revision,
        now,
        now,
        userId,
        childId,
        normalizedFoodId,
      ],
    );

    await enqueueSyncOperation({
      userId,
      entityType: "child_custom_food",
      entityId: normalizedFoodId,
      operation: `delete:${revision}`,
      endpoint:
        `/api/children/${encodeURIComponent(childId)}` +
        `/custom-foods/${normalizedFoodId}`,
      method: "DELETE",
      payload: {},
      database: transaction,
    });
  });

  return deletedFood;
}

export async function prepareCustomFoodPayload({ operation, payload }) {
  if (operation.http_method === "POST") {
    return payload;
  }

  const database = await getLocalDatabase();

  if (operation.http_method === "DELETE") {
    const pendingMeals = await database.getAllAsync(
      `
        SELECT payload_json
        FROM sync_queue
        WHERE user_id = ?
          AND entity_type = 'tracking_entry'
          AND (
            (http_method = 'POST' AND endpoint LIKE '%/solids')
            OR
            (http_method = 'PUT' AND endpoint LIKE '%/solids/%')
          )
      `,
      [operation.user_id],
    );

    const isUsedByPendingMeal = pendingMeals.some((row) => {
      const meal = JSON.parse(row.payload_json);

      return (
        Array.isArray(meal?.foods) &&
        meal.foods.some(
          (food) => food.isCustom && food.foodId === operation.entity_id,
        )
      );
    });

    if (isUsedByPendingMeal) {
      throw createDependencyError(
        "Waiting for a meal using this food to be synchronized.",
      );
    }
  }

  const row = await database.getFirstAsync(
    `
      SELECT server_version
      FROM child_custom_foods_local
      WHERE user_id = ? AND food_id = ?
    `,
    [operation.user_id, operation.entity_id],
  );

  if (!Number.isInteger(row?.server_version) || row.server_version < 1) {
    throw createDependencyError(
      "Waiting for the custom food to be synchronized.",
    );
  }

  return {
    ...payload,
    version: row.server_version,
  };
}

export async function completeCustomFoodSync({ operation, serverFood }) {
  if (
    !serverFood ||
    serverFood.id !== operation.entity_id ||
    !Number.isInteger(serverFood.version) ||
    serverFood.version < 1 ||
    typeof serverFood.updatedAt !== "string" ||
    !Number.isFinite(Date.parse(serverFood.updatedAt))
  ) {
    throw new Error("Invalid server custom food.");
  }

  const match = /^(create|update|delete):([1-9]\d*)$/.exec(operation.operation);

  if (!match) {
    throw new Error("Invalid custom food synchronization operation.");
  }

  const revision = Number(match[2]);

  if (!Number.isSafeInteger(revision)) {
    throw new Error("Invalid custom food synchronization revision.");
  }

  const database = await getLocalDatabase();

  await database.withExclusiveTransactionAsync(async (transaction) => {
    const row = await transaction.getFirstAsync(
      `
        SELECT *
        FROM child_custom_foods_local
        WHERE user_id = ? AND food_id = ?
      `,
      [operation.user_id, operation.entity_id],
    );

    if (!row || row.child_id !== serverFood.childId) {
      throw new Error("Custom food synchronization mismatch.");
    }

    if (
      row.server_version !== null &&
      serverFood.version < row.server_version
    ) {
      throw new Error("The server returned an older custom food version.");
    }

    if (row.local_revision === revision) {
      await transaction.runAsync(
        `
          UPDATE child_custom_foods_local
          SET
            food_json = ?,
            server_version = ?,
            sync_status = 'synced',
            deleted_at = ?,
            updated_at = ?
          WHERE user_id = ? AND food_id = ?
        `,
        [
          JSON.stringify(serverFood),
          serverFood.version,
          serverFood.deletedAt ?? null,
          serverFood.updatedAt,
          operation.user_id,
          operation.entity_id,
        ],
      );
    } else {
      // Conserver les modifications locales plus récentes,
      // tout en actualisant leur version serveur.
      const localFood = JSON.parse(row.food_json);

      await transaction.runAsync(
        `
          UPDATE child_custom_foods_local
          SET food_json = ?, server_version = ?
          WHERE user_id = ? AND food_id = ?
        `,
        [
          JSON.stringify({
            ...localFood,
            version: serverFood.version,
            serverVersion: serverFood.version,
          }),
          serverFood.version,
          operation.user_id,
          operation.entity_id,
        ],
      );
    }

    await transaction.runAsync(
      "DELETE FROM sync_queue WHERE id = ? AND user_id = ?",
      [operation.id, operation.user_id],
    );
  });
}
