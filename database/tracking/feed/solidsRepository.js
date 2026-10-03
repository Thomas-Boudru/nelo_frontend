import * as Crypto from "expo-crypto";

import { getLocalDatabase } from "../../localDatabase.js";
import { enqueueSyncOperation } from "../../../sync/syncQueueRepository.js";

import {
  prepareLocalTrackingPhotos,
  enqueueTrackingPhotos,
  cleanupPreparedPhotos,
} from "../trackingPhotosRepository.js";

const UNITS = new Set([
  "piece",
  "g",
  "ml",
  "teaspoon",
  "tablespoon",
  "portion",
]);

const AMOUNTS_EATEN = new Set([
  "tasted",
  "little",
  "half",
  "almost_all",
  "all",
]);

const REACTIONS = new Set(["liked", "neutral", "disliked"]);

export async function createLocalSolidFeedingEntry({ userId, childId, data }) {
  if (!userId || !childId) {
    throw new Error("Missing user ID or child ID.");
  }

  if (
    !data ||
    !Array.isArray(data.foods) ||
    data.foods.length < 1 ||
    data.foods.length > 100
  ) {
    throw new Error("A meal must contain between 1 and 100 foods.");
  }

  if (
    !(data.feedingDate instanceof Date) &&
    typeof data.feedingDate !== "string"
  ) {
    throw new Error("Invalid feeding date.");
  }

  const date = new Date(data.feedingDate);

  if (!Number.isFinite(date.getTime())) {
    throw new Error("Invalid feeding date.");
  }

  const amountEaten = data.amountEaten ?? null;
  const reaction = data.appreciation ?? data.reaction ?? null;

  if (amountEaten !== null && !AMOUNTS_EATEN.has(amountEaten)) {
    throw new Error("Invalid amount eaten.");
  }

  if (reaction !== null && !REACTIONS.has(reaction)) {
    throw new Error("Invalid food reaction.");
  }

  if (
    data.note != null &&
    (typeof data.note !== "string" || data.note.length > 10000)
  ) {
    throw new Error("The note must not exceed 10000 characters.");
  }

  const payloadFoods = data.foods.map((food) => {
    if (
      !food ||
      typeof food.foodId !== "string" ||
      !food.foodId ||
      typeof food.isCustom !== "boolean"
    ) {
      throw new Error("Invalid meal food.");
    }

    const amount = food.amount ?? null;
    const unit = food.unit ?? null;

    if ((amount === null) !== (unit === null)) {
      throw new Error("Food amount and unit must be provided together.");
    }

    let normalizedAmount = null;

    if (amount !== null) {
      if (
        typeof amount !== "number" ||
        !Number.isFinite(amount) ||
        amount <= 0 ||
        amount > 999999999.999 ||
        !UNITS.has(unit)
      ) {
        throw new Error("Invalid food quantity.");
      }

      normalizedAmount = Math.round(amount * 1000) / 1000;

      if (normalizedAmount <= 0) {
        throw new Error("The quantity is too small.");
      }
    }

    return {
      foodId: food.isCustom ? food.foodId.toLowerCase() : food.foodId,
      isCustom: food.isCustom,
      amount: normalizedAmount,
      unit,
    };
  });

  const database = await getLocalDatabase();

  const id = Crypto.randomUUID();
  const now = new Date().toISOString();
  const feedingDate = date.toISOString();

  const payload = {
    id,
    feedingDate,
    amountEaten,
    reaction,
    note: data.note?.trim() || null,
    foods: payloadFoods,
  };

  const selectedPhotos = Array.isArray(data.photos)
    ? data.photos
    : data.photo
      ? [data.photo]
      : [];

  const preparedPhotos = await prepareLocalTrackingPhotos(selectedPhotos);

  const localFoods = payloadFoods.map((food, index) => ({
    ...food,
    id: Crypto.randomUUID(),
    name: data.foods[index].name ?? "",
    translationKey: data.foods[index].translationKey ?? null,
    emoji: data.foods[index].emoji ?? null,
    sortOrder: index,
  }));

  const entry = {
    ...payload,
    childId,
    type: "solids",
    startedAt: feedingDate,
    appreciation: reaction,
    foods: localFoods,
    photos: preparedPhotos,
    source: "manual",
    createdByUserId: userId,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    version: null,
  };

  try {
    await database.withExclusiveTransactionAsync(async (transaction) => {
      // Vérifie que les aliments personnalisés existent pour cet enfant.
      for (const food of payloadFoods.filter((item) => item.isCustom)) {
        const customFood = await transaction.getFirstAsync(
          `
          SELECT food_id
          FROM child_custom_foods_local
          WHERE user_id = ?
            AND child_id = ?
            AND food_id = ?
            AND deleted_at IS NULL
        `,
          [userId, childId, food.foodId],
        );

        if (!customFood) {
          throw new Error("A custom food is unavailable for this child.");
        }
      }

      await transaction.runAsync(
        `
        INSERT INTO tracking_entries_local (
          user_id,
          entry_id,
          child_id,
          entry_type,
          entry_json,
          server_version,
          local_revision,
          sync_status,
          deleted_at,
          started_at,
          updated_at
        )
        VALUES (
          ?, ?, ?, 'solids', ?,
          NULL, 1, 'pending', NULL, ?, ?
        )
      `,
        [userId, id, childId, JSON.stringify(entry), feedingDate, now],
      );

      await enqueueSyncOperation({
        userId,
        entityType: "tracking_entry",
        entityId: id,
        operation: "create:1",
        endpoint: `/api/children/${encodeURIComponent(childId)}/solids`,
        method: "POST",
        payload,
        database: transaction,
      });

      await enqueueTrackingPhotos({
        transaction,
        userId,
        childId,
        entryId: id,
        photos: preparedPhotos,
      });
    });
  } catch (error) {
    await cleanupPreparedPhotos(preparedPhotos);
    throw error;
  }

  return {
    ...entry,
    serverVersion: null,
    localRevision: 1,
    syncStatus: "pending",
  };
}

// Un repas ne doit pas être envoyé avant la création
// de ses aliments personnalisés sur le serveur.
export async function prepareSolidFeedingPayload({ operation, payload }) {
  if (
    operation.http_method !== "POST" ||
    !operation.endpoint.endsWith("/solids")
  ) {
    return payload;
  }

  if (!Array.isArray(payload?.foods)) {
    throw new Error("Invalid solid feeding synchronization payload.");
  }

  const database = await getLocalDatabase();

  for (const food of payload.foods.filter((item) => item.isCustom)) {
    const row = await database.getFirstAsync(
      `
        SELECT child_id, server_version
        FROM child_custom_foods_local
        WHERE user_id = ? AND food_id = ?
      `,
      [operation.user_id, food.foodId],
    );

    if (!row || !Number.isInteger(row.server_version)) {
      const error = new Error(
        "Waiting for the custom food to be synchronized.",
      );

      error.code = "SYNC_DEPENDENCY_PENDING";
      error.status = 0;

      throw error;
    }

    const pendingDelete = await database.getFirstAsync(
      `
        SELECT id
        FROM sync_queue
        WHERE user_id = ?
          AND entity_type = 'child_custom_food'
          AND entity_id = ?
          AND http_method = 'DELETE'
      `,
      [operation.user_id, food.foodId],
    );

    // Une suppression déjà envoyée rendrait cet aliment inutilisable.
    // Ce cas doit être résolu avant de réessayer le repas.
    const localFood = await database.getFirstAsync(
      `
        SELECT food_json
        FROM child_custom_foods_local
        WHERE user_id = ? AND food_id = ?
      `,
      [operation.user_id, food.foodId],
    );

    const storedFood = JSON.parse(localFood.food_json);

    if (storedFood.deletedAt && !pendingDelete) {
      const error = new Error(
        "A food used by this meal has already been deleted.",
      );

      error.code = "SOLID_FOOD_DEPENDENCY_DELETED";

      throw error;
    }
  }

  return payload;
}
