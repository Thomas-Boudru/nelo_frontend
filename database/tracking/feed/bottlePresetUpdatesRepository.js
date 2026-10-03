import { getLocalDatabase } from "../../localDatabase.js";

import { enqueueSyncOperation } from "../../../sync/syncQueueRepository.js";

const ML_PER_US_FL_OZ = 29.5735295625;

function roundToThreeDecimals(value) {
  return Math.round(value * 1000) / 1000;
}

export async function updateLocalBottlePreset({
  userId,
  childId,
  presetId,
  originalValue,
  originalUnit,
}) {
  if (!userId || !childId || !presetId) {
    throw new Error("Missing user ID, child ID or preset ID.");
  }

  if (!["ml", "fl_oz"].includes(originalUnit)) {
    throw new Error("Invalid bottle capacity unit.");
  }

  if (
    typeof originalValue !== "number" ||
    !Number.isFinite(originalValue) ||
    originalValue <= 0 ||
    originalValue > 99999.999
  ) {
    throw new Error("Invalid bottle capacity.");
  }

  const roundedOriginalValue = roundToThreeDecimals(originalValue);

  const capacityMl = roundToThreeDecimals(
    originalUnit === "fl_oz"
      ? roundedOriginalValue * ML_PER_US_FL_OZ
      : roundedOriginalValue,
  );

  if (roundedOriginalValue <= 0 || capacityMl <= 0 || capacityMl > 99999.999) {
    throw new Error("Invalid bottle capacity.");
  }

  const database = await getLocalDatabase();
  let updatedPreset;

  await database.withExclusiveTransactionAsync(async (transaction) => {
    const row = await transaction.getFirstAsync(
      `
          SELECT *
          FROM child_bottle_presets_local
          WHERE user_id = ?
            AND child_id = ?
            AND preset_id = ?
        `,
      [userId, childId, presetId],
    );

    if (!row) {
      throw new Error("Bottle preset not found.");
    }

    if (row.archived_at) {
      throw new Error("This bottle preset has been archived.");
    }

    const duplicateRows = await transaction.getAllAsync(
      `
          SELECT preset_json
          FROM child_bottle_presets_local
          WHERE user_id = ?
            AND child_id = ?
            AND preset_id <> ?
            AND archived_at IS NULL
        `,
      [userId, childId, presetId],
    );

    const hasDuplicate = duplicateRows.some(
      (duplicateRow) =>
        Number(JSON.parse(duplicateRow.preset_json).capacityMl) === capacityMl,
    );

    if (hasDuplicate) {
      throw new Error("This bottle capacity already exists.");
    }

    const currentPreset = JSON.parse(row.preset_json);

    if (
      Number(currentPreset.capacityMl) === capacityMl &&
      Number(currentPreset.originalValue) === roundedOriginalValue &&
      currentPreset.originalUnit === originalUnit
    ) {
      updatedPreset = currentPreset;
      return;
    }

    const revision = row.local_revision + 1;
    const now = new Date().toISOString();

    updatedPreset = {
      ...currentPreset,
      capacityMl,
      originalValue: roundedOriginalValue,
      originalUnit,
      updatedAt: now,
    };

    await transaction.runAsync(
      `
          UPDATE child_bottle_presets_local
          SET preset_json = ?,
              local_revision = ?,
              sync_status = 'pending',
              updated_at = ?
          WHERE user_id = ?
            AND child_id = ?
            AND preset_id = ?
        `,
      [JSON.stringify(updatedPreset), revision, now, userId, childId, presetId],
    );

    await enqueueSyncOperation({
      userId,
      entityType: "child_bottle_preset",
      entityId: presetId,
      operation: `update:${revision}`,
      endpoint:
        `/api/children/${encodeURIComponent(childId)}` +
        `/bottle-presets/${encodeURIComponent(presetId)}`,
      method: "PUT",
      payload: {
        label: currentPreset.label ?? null,
        originalValue: roundedOriginalValue,
        originalUnit,

        // La version sera fixée au premier envoi, après
        // la réussite des opérations précédentes.
        version: null,
      },
      database: transaction,
    });
  });

  return updatedPreset;
}

export async function prepareBottlePresetUpdatePayload({ operation, payload }) {
  if (
    operation.entity_type !== "child_bottle_preset" ||
    !operation.operation.startsWith("update:")
  ) {
    return payload;
  }

  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid bottle preset update payload.");
  }

  // Une tentative précédente a déjà fixé la version.
  // La conserver permet de détecter les conflits au renvoi.
  if (Number.isInteger(payload.version) && payload.version >= 1) {
    return payload;
  }

  if (payload.version !== null) {
    throw new Error("Invalid bottle preset update version.");
  }

  const database = await getLocalDatabase();
  let preparedPayload;

  await database.withExclusiveTransactionAsync(async (transaction) => {
    const row = await transaction.getFirstAsync(
      `
          SELECT server_version
          FROM child_bottle_presets_local
          WHERE user_id = ?
            AND preset_id = ?
        `,
      [operation.user_id, operation.entity_id],
    );

    if (!Number.isInteger(row?.server_version) || row.server_version < 1) {
      throw new Error("The bottle preset creation must be synchronized first.");
    }

    preparedPayload = {
      ...payload,
      version: row.server_version,
    };

    const result = await transaction.runAsync(
      `
          UPDATE sync_queue
          SET payload_json = ?,
              updated_at = ?
          WHERE id = ?
            AND user_id = ?
        `,
      [
        JSON.stringify(preparedPayload),
        new Date().toISOString(),
        operation.id,
        operation.user_id,
      ],
    );

    if (result.changes !== 1) {
      throw new Error("Synchronization operation not found.");
    }
  });

  return preparedPayload;
}
