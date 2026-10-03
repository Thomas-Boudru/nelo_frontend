import * as Crypto from "expo-crypto";

import { getLocalDatabase } from "../../localDatabase.js";
import { enqueueSyncOperation } from "../../../sync/syncQueueRepository.js";

const ML_PER_US_FL_OZ = 29.5735295625;

function validateIds(userId, childId) {
  if (!userId || !childId) {
    throw new Error("Missing user ID or child ID.");
  }
}

function mapRow(row) {
  return {
    ...JSON.parse(row.preset_json),
    archivedAt: row.archived_at,
    serverVersion: row.server_version,
    localRevision: row.local_revision,
    syncStatus: row.sync_status,
  };
}

export async function getLocalBottlePresets({ userId, childId }) {
  validateIds(userId, childId);

  const database = await getLocalDatabase();

  const rows = await database.getAllAsync(
    `
      SELECT *
      FROM child_bottle_presets_local
      WHERE user_id = ?
        AND child_id = ?
        AND archived_at IS NULL
    `,
    [userId, childId],
  );

  return rows
    .map(mapRow)
    .sort((a, b) => a.capacityMl - b.capacityMl || a.id.localeCompare(b.id));
}

export async function createBottlePresetLocally({
  userId,
  childId,
  originalValue,
  originalUnit = "ml",
  label = null,
}) {
  validateIds(userId, childId);

  if (
    typeof originalValue !== "number" ||
    !Number.isFinite(originalValue) ||
    originalValue <= 0 ||
    originalValue > 99999.999
  ) {
    throw new Error("Invalid bottle capacity.");
  }

  if (!["ml", "fl_oz"].includes(originalUnit)) {
    throw new Error("Invalid volume unit.");
  }

  if (
    label !== null &&
    (typeof label !== "string" || label.trim().length > 80)
  ) {
    throw new Error("Invalid bottle label.");
  }

  const storedValue = Math.round(originalValue * 1000) / 1000;

  const capacityMl =
    Math.round(
      storedValue * (originalUnit === "fl_oz" ? ML_PER_US_FL_OZ : 1) * 1000,
    ) / 1000;

  if (storedValue <= 0 || capacityMl <= 0 || capacityMl > 99999.999) {
    throw new Error("Invalid bottle capacity.");
  }

  const database = await getLocalDatabase();
  const now = new Date().toISOString();
  const id = Crypto.randomUUID();

  const preset = {
    id,
    childId,
    label: label?.trim() || null,
    capacityMl,
    originalValue: storedValue,
    originalUnit,
    createdByUserId: userId,
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
    version: null,
  };

  await database.withExclusiveTransactionAsync(async (transaction) => {
    const rows = await transaction.getAllAsync(
      `
        SELECT preset_json
        FROM child_bottle_presets_local
        WHERE user_id = ?
          AND child_id = ?
          AND archived_at IS NULL
      `,
      [userId, childId],
    );

    const alreadyExists = rows.some(
      (row) => JSON.parse(row.preset_json).capacityMl === capacityMl,
    );

    if (alreadyExists) {
      throw new Error(
        "A bottle with this capacity already exists for this child.",
      );
    }

    await transaction.runAsync(
      `
        INSERT INTO child_bottle_presets_local (
          user_id,
          preset_id,
          child_id,
          preset_json,
          server_version,
          local_revision,
          sync_status,
          archived_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, NULL, 1, 'pending', NULL, ?)
      `,
      [userId, id, childId, JSON.stringify(preset), now],
    );

    await enqueueSyncOperation({
      userId,
      entityType: "child_bottle_preset",
      entityId: id,
      operation: "create:1",
      endpoint: `/api/children/${childId}/bottle-presets`,
      method: "POST",
      payload: {
        id,
        label: preset.label,
        originalValue: storedValue,
        originalUnit,
      },
      database: transaction,
    });
  });

  return {
    ...preset,
    serverVersion: null,
    localRevision: 1,
    syncStatus: "pending",
  };
}

export async function archiveBottlePresetLocally({
  userId,
  childId,
  presetId,
}) {
  validateIds(userId, childId);

  if (!presetId) {
    throw new Error("Missing bottle preset ID.");
  }

  const database = await getLocalDatabase();
  const now = new Date().toISOString();

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
      return;
    }

    const revision = row.local_revision + 1;

    const preset = {
      ...JSON.parse(row.preset_json),
      archivedAt: now,
      updatedAt: now,
    };

    await transaction.runAsync(
      `
        UPDATE child_bottle_presets_local
        SET
          preset_json = ?,
          archived_at = ?,
          updated_at = ?,
          local_revision = ?,
          sync_status = 'pending'
        WHERE user_id = ?
          AND child_id = ?
          AND preset_id = ?
      `,
      [JSON.stringify(preset), now, now, revision, userId, childId, presetId],
    );

    await enqueueSyncOperation({
      userId,
      entityType: "child_bottle_preset",
      entityId: presetId,
      operation: `archive:${revision}`,
      endpoint: `/api/children/${childId}/bottle-presets/${presetId}`,
      method: "DELETE",
      database: transaction,
    });
  });
}

export async function completeBottlePresetSync({ operation, serverPreset }) {
  if (
    !serverPreset ||
    serverPreset.id !== operation.entity_id ||
    !Number.isInteger(serverPreset.version) ||
    serverPreset.version < 1
  ) {
    throw new Error("Invalid bottle preset synchronization response.");
  }

  const match = /^(create|update|archive):([1-9]\d*)$/.exec(
    operation.operation,
  );

  if (!match) {
    throw new Error("Invalid bottle preset synchronization operation.");
  }

  const expectedRevision = Number(match[2]);

  if (!Number.isSafeInteger(expectedRevision)) {
    throw new Error("Invalid bottle preset revision.");
  }

  const database = await getLocalDatabase();

  await database.withExclusiveTransactionAsync(async (transaction) => {
    const row = await transaction.getFirstAsync(
      `
          SELECT *
          FROM child_bottle_presets_local
          WHERE user_id = ?
            AND preset_id = ?
        `,
      [operation.user_id, operation.entity_id],
    );

    if (row && row.child_id !== serverPreset.childId) {
      throw new Error("Bottle preset child mismatch.");
    }

    if (
      row?.server_version != null &&
      row.server_version > serverPreset.version
    ) {
      throw new Error(
        "The synchronization response contains an older version.",
      );
    }

    if (row && row.local_revision === expectedRevision) {
      await transaction.runAsync(
        `
            UPDATE child_bottle_presets_local
            SET preset_json = ?,
                server_version = ?,
                sync_status = 'synced',
                archived_at = ?,
                updated_at = ?
            WHERE user_id = ?
              AND preset_id = ?
              AND local_revision = ?
          `,
        [
          JSON.stringify(serverPreset),
          serverPreset.version,
          serverPreset.archivedAt ?? null,
          serverPreset.updatedAt,
          operation.user_id,
          operation.entity_id,
          expectedRevision,
        ],
      );
    } else if (row) {
      // Conserver les changements locaux plus récents.
      const localPreset = JSON.parse(row.preset_json);

      await transaction.runAsync(
        `
            UPDATE child_bottle_presets_local
            SET preset_json = ?,
                server_version = ?
            WHERE user_id = ?
              AND preset_id = ?
          `,
        [
          JSON.stringify({
            ...localPreset,
            version: serverPreset.version,
          }),
          serverPreset.version,
          operation.user_id,
          operation.entity_id,
        ],
      );
    }

    await transaction.runAsync(
      `
          DELETE FROM sync_queue
          WHERE id = ?
            AND user_id = ?
        `,
      [operation.id, operation.user_id],
    );
  });
}

export async function saveServerBottlePresetsLocally({
  userId,
  childId,
  presets,
}) {
  if (!userId || !childId) {
    throw new Error("Missing user ID or child ID.");
  }

  if (!Array.isArray(presets)) {
    throw new Error("Invalid bottle presets.");
  }

  // Valider toute la réponse avant de commencer l'enregistrement.
  for (const preset of presets) {
    if (
      !preset ||
      typeof preset.id !== "string" ||
      !preset.id ||
      preset.childId !== childId ||
      !Number.isInteger(preset.version) ||
      preset.version < 1 ||
      typeof preset.capacityMl !== "number" ||
      !Number.isFinite(preset.capacityMl) ||
      preset.capacityMl <= 0 ||
      typeof preset.updatedAt !== "string" ||
      !Number.isFinite(Date.parse(preset.updatedAt)) ||
      (preset.archivedAt != null &&
        (typeof preset.archivedAt !== "string" ||
          !Number.isFinite(Date.parse(preset.archivedAt))))
    ) {
      throw new Error("Invalid server bottle preset.");
    }
  }

  const database = await getLocalDatabase();

  await database.withExclusiveTransactionAsync(async (transaction) => {
    for (const preset of presets) {
      const localRow = await transaction.getFirstAsync(
        `
            SELECT *
            FROM child_bottle_presets_local
            WHERE user_id = ?
              AND preset_id = ?
          `,
        [userId, preset.id],
      );

      if (localRow && localRow.child_id !== childId) {
        throw new Error("Bottle preset child mismatch.");
      }

      // Une modification locale a priorité sur la réponse serveur.
      if (localRow && localRow.sync_status !== "synced") {
        continue;
      }

      const queuedOperation = await transaction.getFirstAsync(
        `
            SELECT id
            FROM sync_queue
            WHERE user_id = ?
              AND entity_type = 'child_bottle_preset'
              AND entity_id = ?
            LIMIT 1
          `,
        [userId, preset.id],
      );

      if (queuedOperation) {
        continue;
      }

      // Une réponse ancienne ne doit pas remplacer une version récente.
      if (
        localRow?.server_version != null &&
        localRow.server_version >= preset.version
      ) {
        continue;
      }

      await transaction.runAsync(
        `
            INSERT INTO child_bottle_presets_local (
              user_id,
              preset_id,
              child_id,
              preset_json,
              server_version,
              local_revision,
              sync_status,
              archived_at,
              updated_at
            )
            VALUES (?, ?, ?, ?, ?, 1, 'synced', ?, ?)
            ON CONFLICT(user_id, preset_id)
            DO UPDATE SET
              preset_json = excluded.preset_json,
              server_version = excluded.server_version,
              sync_status = 'synced',
              archived_at = excluded.archived_at,
              updated_at = excluded.updated_at
          `,
        [
          userId,
          preset.id,
          childId,
          JSON.stringify(preset),
          preset.version,
          preset.archivedAt ?? null,
          preset.updatedAt,
        ],
      );
    }
  });

  return getLocalBottlePresets({
    userId,
    childId,
  });
}
