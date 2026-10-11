import * as Crypto from "expo-crypto";

import { getLocalDatabase } from "../localDatabase.js";
import { enqueueSyncOperation } from "../../sync/syncQueueRepository.js";

const CATEGORIES = new Set([
  "development",
  "feeding",
  "sleep",
  "growth",
  "daily-life",
]);

function requireIdentifiers({ userId, childId }) {
  if (!userId || !childId) {
    throw new Error("Missing user ID or child ID.");
  }
}

function validateData(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Invalid custom milestone.");
  }

  if (typeof data.name !== "string") {
    throw new Error("Invalid milestone name.");
  }

  // Même normalisation que dans le service backend.
  const name = data.name.normalize("NFKC").trim().replace(/\s+/gu, " ");

  if (!name || name.length > 150) {
    throw new Error(
      "The milestone name must contain between 1 and 150 characters.",
    );
  }

  if (!CATEGORIES.has(data.categoryCode)) {
    throw new Error("Invalid milestone category.");
  }

  return {
    name,
    normalizedName: name.toLowerCase(),
    categoryCode: data.categoryCode,
  };
}

function mapLocalMilestone(row) {
  return {
    ...JSON.parse(row.milestone_json),
    serverVersion: row.server_version,
    localRevision: row.local_revision,
    syncStatus: row.sync_status,
    archivedAt: row.archived_at,
  };
}

async function requireLocalMilestone(
  database,
  { userId, childId, milestoneId },
) {
  const row = await database.getFirstAsync(
    `
      SELECT *
      FROM child_custom_milestones_local
      WHERE user_id = ?
        AND child_id = ?
        AND milestone_id = ?
    `,
    [userId, childId, milestoneId],
  );

  if (!row) {
    throw new Error("Local custom milestone not found.");
  }

  return row;
}

async function checkDuplicate(
  database,
  { userId, childId, normalizedName, categoryCode, excludedMilestoneId = null },
) {
  const duplicate = await database.getFirstAsync(
    `
      SELECT milestone_id
      FROM child_custom_milestones_local
      WHERE user_id = ?
        AND child_id = ?
        AND normalized_name = ?
        AND category_code = ?
        AND archived_at IS NULL
        AND (? IS NULL OR milestone_id <> ?)
      LIMIT 1
    `,
    [
      userId,
      childId,
      normalizedName,
      categoryCode,
      excludedMilestoneId,
      excludedMilestoneId,
    ],
  );

  if (duplicate) {
    throw new Error(
      "A milestone with this name already exists in this category.",
    );
  }
}

function getEndpoint(childId, milestoneId) {
  const base = `/api/children/${encodeURIComponent(childId)}/custom-milestones`;

  return milestoneId ? `${base}/${encodeURIComponent(milestoneId)}` : base;
}

export async function getLocalCustomMilestones({
  userId,
  childId,
  includeArchived = false,
}) {
  requireIdentifiers({ userId, childId });

  const database = await getLocalDatabase();

  const rows = await database.getAllAsync(
    `
      SELECT *
      FROM child_custom_milestones_local
      WHERE user_id = ?
        AND child_id = ?
        AND (? = 1 OR archived_at IS NULL)
      ORDER BY category_code ASC, normalized_name ASC, milestone_id ASC
    `,
    [userId, childId, includeArchived ? 1 : 0],
  );

  return rows.map(mapLocalMilestone);
}

export async function createLocalCustomMilestone({ userId, childId, data }) {
  requireIdentifiers({ userId, childId });

  const normalized = validateData(data);
  const database = await getLocalDatabase();

  const id = Crypto.randomUUID();
  const now = new Date().toISOString();

  const payload = {
    id,
    name: normalized.name,
    categoryCode: normalized.categoryCode,
  };

  const milestone = {
    ...payload,
    childId,
    createdByUserId: userId,
    updatedByUserId: userId,
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
    version: null,
  };

  await database.withExclusiveTransactionAsync(async (transaction) => {
    await checkDuplicate(transaction, {
      userId,
      childId,
      normalizedName: normalized.normalizedName,
      categoryCode: normalized.categoryCode,
    });

    await transaction.runAsync(
      `
        INSERT INTO child_custom_milestones_local (
          user_id,
          milestone_id,
          child_id,
          milestone_json,
          normalized_name,
          category_code,
          server_version,
          local_revision,
          sync_status,
          archived_at,
          updated_at
        )
        VALUES (
          ?, ?, ?, ?, ?, ?,
          NULL, 1, 'pending', NULL, ?
        )
      `,
      [
        userId,
        id,
        childId,
        JSON.stringify(milestone),
        normalized.normalizedName,
        normalized.categoryCode,
        now,
      ],
    );

    await enqueueSyncOperation({
      userId,
      entityType: "child_custom_milestone",
      entityId: id,
      operation: "create:1",
      endpoint: getEndpoint(childId),
      method: "POST",
      payload,
      database: transaction,
    });
  });

  return {
    ...milestone,
    serverVersion: null,
    localRevision: 1,
    syncStatus: "pending",
  };
}

export async function updateLocalCustomMilestone({
  userId,
  childId,
  milestoneId,
  data,
}) {
  requireIdentifiers({ userId, childId });

  if (!milestoneId) {
    throw new Error("Missing milestone ID.");
  }

  const normalized = validateData(data);
  const database = await getLocalDatabase();

  let savedMilestone;

  await database.withExclusiveTransactionAsync(async (transaction) => {
    const row = await requireLocalMilestone(transaction, {
      userId,
      childId,
      milestoneId,
    });

    if (row.archived_at) {
      throw new Error("This milestone has been archived.");
    }

    await checkDuplicate(transaction, {
      userId,
      childId,
      normalizedName: normalized.normalizedName,
      categoryCode: normalized.categoryCode,
      excludedMilestoneId: milestoneId,
    });

    const current = JSON.parse(row.milestone_json);

    if (
      current.name === normalized.name &&
      current.categoryCode === normalized.categoryCode
    ) {
      savedMilestone = mapLocalMilestone(row);
      return;
    }

    const now = new Date().toISOString();
    const revision = row.local_revision + 1;

    if (!Number.isSafeInteger(revision)) {
      throw new Error("Invalid local milestone revision.");
    }

    const milestone = {
      ...current,
      name: normalized.name,
      categoryCode: normalized.categoryCode,
      updatedByUserId: userId,
      updatedAt: now,
    };

    await transaction.runAsync(
      `
        UPDATE child_custom_milestones_local
        SET
          milestone_json = ?,
          normalized_name = ?,
          category_code = ?,
          local_revision = ?,
          sync_status = 'pending',
          updated_at = ?
        WHERE user_id = ?
          AND child_id = ?
          AND milestone_id = ?
      `,
      [
        JSON.stringify(milestone),
        normalized.normalizedName,
        normalized.categoryCode,
        revision,
        now,
        userId,
        childId,
        milestoneId,
      ],
    );

    await enqueueSyncOperation({
      userId,
      entityType: "child_custom_milestone",
      entityId: milestoneId,
      operation: `update:${revision}`,
      endpoint: getEndpoint(childId, milestoneId),
      method: "PATCH",

      // La version sera fixée avant le premier envoi,
      // après la synchronisation des opérations précédentes.
      payload: {
        name: normalized.name,
        categoryCode: normalized.categoryCode,
      },

      database: transaction,
    });

    savedMilestone = {
      ...milestone,
      serverVersion: row.server_version,
      localRevision: revision,
      syncStatus: "pending",
    };
  });

  return savedMilestone;
}

export async function archiveLocalCustomMilestone({
  userId,
  childId,
  milestoneId,
}) {
  requireIdentifiers({ userId, childId });

  if (!milestoneId) {
    throw new Error("Missing milestone ID.");
  }

  const database = await getLocalDatabase();

  let savedMilestone;

  await database.withExclusiveTransactionAsync(async (transaction) => {
    const row = await requireLocalMilestone(transaction, {
      userId,
      childId,
      milestoneId,
    });

    if (row.archived_at) {
      savedMilestone = mapLocalMilestone(row);
      return;
    }

    const current = JSON.parse(row.milestone_json);
    const now = new Date().toISOString();
    const revision = row.local_revision + 1;

    if (!Number.isSafeInteger(revision)) {
      throw new Error("Invalid local milestone revision.");
    }

    const milestone = {
      ...current,
      archivedAt: now,
      updatedAt: now,
      updatedByUserId: userId,
    };

    await transaction.runAsync(
      `
        UPDATE child_custom_milestones_local
        SET
          milestone_json = ?,
          archived_at = ?,
          updated_at = ?,
          local_revision = ?,
          sync_status = 'pending'
        WHERE user_id = ?
          AND child_id = ?
          AND milestone_id = ?
      `,
      [
        JSON.stringify(milestone),
        now,
        now,
        revision,
        userId,
        childId,
        milestoneId,
      ],
    );

    await enqueueSyncOperation({
      userId,
      entityType: "child_custom_milestone",
      entityId: milestoneId,
      operation: `archive:${revision}`,
      endpoint: getEndpoint(childId, milestoneId),
      method: "DELETE",
      payload: {},
      database: transaction,
    });

    savedMilestone = {
      ...milestone,
      serverVersion: row.server_version,
      localRevision: revision,
      syncStatus: "pending",
    };
  });

  return savedMilestone;
}

export async function prepareCustomMilestonePayload({ operation, payload }) {
  if (operation.entity_type !== "child_custom_milestone") {
    return payload;
  }

  const match = /^(create|update|archive):([1-9]\d*)$/.exec(
    operation.operation,
  );

  if (
    !match ||
    !payload ||
    typeof payload !== "object" ||
    Array.isArray(payload)
  ) {
    throw new Error("Invalid custom milestone synchronization operation.");
  }

  if (match[1] === "create") {
    if (payload.id !== operation.entity_id) {
      throw new Error("Custom milestone synchronization mismatch.");
    }

    return payload;
  }

  // Conserver la version déjà utilisée lors d'une tentative.
  // La remplacer au retry risquerait d'écraser une modification distante.
  if (payload.version !== undefined) {
    if (!Number.isSafeInteger(payload.version) || payload.version < 1) {
      throw new Error("Invalid milestone version.");
    }

    return payload;
  }

  const database = await getLocalDatabase();
  let preparedPayload;

  await database.withExclusiveTransactionAsync(async (transaction) => {
    const queued = await transaction.getFirstAsync(
      `
        SELECT payload_json
        FROM sync_queue
        WHERE id = ?
          AND user_id = ?
          AND entity_type = 'child_custom_milestone'
          AND entity_id = ?
      `,
      [operation.id, operation.user_id, operation.entity_id],
    );

    if (!queued) {
      throw new Error("Custom milestone synchronization operation not found.");
    }

    const currentPayload = JSON.parse(queued.payload_json);

    if (
      !currentPayload ||
      typeof currentPayload !== "object" ||
      Array.isArray(currentPayload)
    ) {
      throw new Error("Invalid custom milestone synchronization payload.");
    }

    if (currentPayload.version !== undefined) {
      if (
        !Number.isSafeInteger(currentPayload.version) ||
        currentPayload.version < 1
      ) {
        throw new Error("Invalid milestone version.");
      }

      preparedPayload = currentPayload;
      return;
    }

    const row = await transaction.getFirstAsync(
      `
        SELECT server_version
        FROM child_custom_milestones_local
        WHERE user_id = ?
          AND milestone_id = ?
      `,
      [operation.user_id, operation.entity_id],
    );

    if (
      !row ||
      !Number.isSafeInteger(row.server_version) ||
      row.server_version < 1
    ) {
      const error = new Error(
        "Waiting for the custom milestone to be synchronized.",
      );

      error.code = "SYNC_DEPENDENCY_PENDING";
      throw error;
    }

    preparedPayload = {
      ...currentPayload,
      version: row.server_version,
    };

    // Persister la version avant le réseau pour que toutes
    // les tentatives de cette opération utilisent la même.
    await transaction.runAsync(
      `
        UPDATE sync_queue
        SET payload_json = ?, updated_at = ?
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
  });

  return preparedPayload;
}

export async function completeCustomMilestoneSync({
  operation,
  serverMilestone,
}) {
  const match = /^(create|update|archive):([1-9]\d*)$/.exec(
    operation.operation,
  );

  const expectedRevision = match ? Number(match[2]) : null;

  if (
    operation.entity_type !== "child_custom_milestone" ||
    !match ||
    !Number.isSafeInteger(expectedRevision) ||
    !serverMilestone ||
    serverMilestone.id !== operation.entity_id ||
    !Number.isSafeInteger(serverMilestone.version) ||
    serverMilestone.version < 1 ||
    typeof serverMilestone.updatedAt !== "string" ||
    !Number.isFinite(Date.parse(serverMilestone.updatedAt)) ||
    (serverMilestone.archivedAt != null &&
      (typeof serverMilestone.archivedAt !== "string" ||
        !Number.isFinite(Date.parse(serverMilestone.archivedAt))))
  ) {
    throw new Error("Invalid custom milestone synchronization response.");
  }

  if (match[1] === "archive" && !serverMilestone.archivedAt) {
    throw new Error("The milestone archive was not confirmed.");
  }

  const normalized = validateData(serverMilestone);
  const database = await getLocalDatabase();

  await database.withExclusiveTransactionAsync(async (transaction) => {
    const row = await transaction.getFirstAsync(
      `
        SELECT *
        FROM child_custom_milestones_local
        WHERE user_id = ?
          AND milestone_id = ?
      `,
      [operation.user_id, operation.entity_id],
    );

    if (!row || row.child_id !== serverMilestone.childId) {
      throw new Error("Custom milestone synchronization mismatch.");
    }

    if (row.local_revision < expectedRevision) {
      throw new Error("Invalid local milestone revision.");
    }

    if (
      row.server_version !== null &&
      row.server_version > serverMilestone.version
    ) {
      throw new Error(
        "The synchronization response contains an older version.",
      );
    }

    if (row.local_revision === expectedRevision) {
      await transaction.runAsync(
        `
          UPDATE child_custom_milestones_local
          SET
            milestone_json = ?,
            normalized_name = ?,
            category_code = ?,
            server_version = ?,
            sync_status = 'synced',
            archived_at = ?,
            updated_at = ?
          WHERE user_id = ?
            AND milestone_id = ?
        `,
        [
          JSON.stringify(serverMilestone),
          normalized.normalizedName,
          normalized.categoryCode,
          serverMilestone.version,
          serverMilestone.archivedAt ?? null,
          serverMilestone.updatedAt,
          operation.user_id,
          operation.entity_id,
        ],
      );
    } else {
      // Une modification locale plus récente existe :
      // conserver son contenu et avancer seulement la version serveur.
      const localMilestone = JSON.parse(row.milestone_json);

      await transaction.runAsync(
        `
          UPDATE child_custom_milestones_local
          SET
            milestone_json = ?,
            server_version = ?
          WHERE user_id = ?
            AND milestone_id = ?
        `,
        [
          JSON.stringify({
            ...localMilestone,
            version: serverMilestone.version,
          }),
          serverMilestone.version,
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
