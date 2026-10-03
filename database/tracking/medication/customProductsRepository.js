import * as Crypto from "expo-crypto";

import { getLocalDatabase } from "../../localDatabase.js";
import { enqueueSyncOperation } from "../../../sync/syncQueueRepository.js";

const MEDICATION_UNITS = new Set([
  "ml",
  "drops",
  "tablet",
  "suppository",
  "dose",
]);

const CONFIGURATION = {
  medication: {
    table: "child_custom_medications_local",
    idColumn: "medication_id",
    jsonColumn: "medication_json",
    entityType: "child_custom_medication",
    endpoint: "custom-medications",
  },

  vaccine: {
    table: "child_custom_vaccines_local",
    idColumn: "vaccine_id",
    jsonColumn: "vaccine_json",
    entityType: "child_custom_vaccine",
    endpoint: "custom-vaccines",
  },
};

function createError(code, message, status) {
  const error = new Error(message);
  error.code = code;

  if (status !== undefined) {
    error.status = status;
  }

  return error;
}

function getConfiguration(type) {
  const configuration = CONFIGURATION[type];

  if (!configuration) {
    throw new Error("Invalid custom product type.");
  }

  return configuration;
}

function getOperationType(operation) {
  return Object.keys(CONFIGURATION).find(
    (type) => CONFIGURATION[type].entityType === operation.entity_type,
  );
}

function requireContext(userId, childId) {
  if (!userId || !childId) {
    throw new Error("Missing user ID or child ID.");
  }
}

function normalizeName(name) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function validateProductData(type, data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Missing custom product.");
  }

  if (typeof data.name !== "string") {
    throw new Error("Invalid custom product name.");
  }

  const name = data.name.trim().replace(/\s+/g, " ");

  if (!name || name.length > 150) {
    throw new Error(
      "The product name must contain between 1 and 150 characters.",
    );
  }

  const defaultDoseUnit =
    type === "medication" ? (data.defaultDoseUnit ?? null) : null;

  if (defaultDoseUnit !== null && !MEDICATION_UNITS.has(defaultDoseUnit)) {
    throw new Error("Invalid medication dose unit.");
  }

  return {
    name,
    normalizedName: normalizeName(name),
    ...(type === "medication" ? { defaultDoseUnit } : {}),
  };
}

function mapLocalProduct(row, configuration) {
  return {
    ...JSON.parse(row[configuration.jsonColumn]),
    serverVersion: row.server_version,
    localRevision: row.local_revision,
    syncStatus: row.sync_status,
    archivedAt: row.archived_at,

    // Compatibilité avec les sélecteurs actuels.
    deletedAt: row.archived_at,
    isDeleted: row.archived_at !== null,
  };
}

async function readProduct(database, configuration, userId, productId) {
  return database.getFirstAsync(
    `
      SELECT *
      FROM ${configuration.table}
      WHERE user_id = ?
        AND ${configuration.idColumn} = ?
    `,
    [userId, productId],
  );
}

async function requireAvailableName({
  transaction,
  configuration,
  userId,
  childId,
  normalizedName,
  productId,
}) {
  const existing = await transaction.getFirstAsync(
    `
      SELECT ${configuration.idColumn}
      FROM ${configuration.table}
      WHERE user_id = ?
        AND child_id = ?
        AND normalized_name = ?
        AND archived_at IS NULL
        AND ${configuration.idColumn} <> ?
    `,
    [userId, childId, normalizedName, productId],
  );

  if (existing) {
    throw createError(
      "CUSTOM_PRODUCT_NAME_CONFLICT",
      "A product with this name already exists.",
      409,
    );
  }
}

export async function getLocalCustomProducts({
  userId,
  childId,
  type,
  includeArchived = false,
}) {
  requireContext(userId, childId);

  const configuration = getConfiguration(type);
  const database = await getLocalDatabase();

  const rows = await database.getAllAsync(
    `
      SELECT *
      FROM ${configuration.table}
      WHERE user_id = ?
        AND child_id = ?
        ${includeArchived ? "" : "AND archived_at IS NULL"}
      ORDER BY normalized_name ASC, ${configuration.idColumn} ASC
    `,
    [userId, childId],
  );

  return rows.map((row) => mapLocalProduct(row, configuration));
}

export async function createLocalCustomProduct({
  userId,
  childId,
  type,
  data,
}) {
  requireContext(userId, childId);

  const configuration = getConfiguration(type);
  const values = validateProductData(type, data);
  const database = await getLocalDatabase();

  // Les nouveaux identifiants sont de vrais UUID acceptés par PostgreSQL.
  const id = Crypto.randomUUID();
  const now = new Date().toISOString();

  const payload = {
    id,
    name: values.name,
    ...(type === "medication"
      ? { defaultDoseUnit: values.defaultDoseUnit }
      : {}),
  };

  const product = {
    ...payload,
    normalizedName: values.normalizedName,
    childId,
    type,
    isCustom: true,
    translationKey: null,
    category: null,
    createdByUserId: userId,
    updatedByUserId: null,
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
    version: null,
  };

  await database.withExclusiveTransactionAsync(async (transaction) => {
    await requireAvailableName({
      transaction,
      configuration,
      userId,
      childId,
      normalizedName: values.normalizedName,
      productId: id,
    });

    await transaction.runAsync(
      `
        INSERT INTO ${configuration.table} (
          user_id,
          ${configuration.idColumn},
          child_id,
          ${configuration.jsonColumn},
          normalized_name,
          server_version,
          local_revision,
          sync_status,
          archived_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, NULL, 1, 'pending', NULL, ?)
      `,
      [
        userId,
        id,
        childId,
        JSON.stringify(product),
        values.normalizedName,
        now,
      ],
    );

    await enqueueSyncOperation({
      userId,
      entityType: configuration.entityType,
      entityId: id,
      operation: "create:1",
      endpoint:
        `/api/children/${encodeURIComponent(childId)}` +
        `/${configuration.endpoint}`,
      method: "POST",
      payload,
      database: transaction,
    });
  });

  return {
    ...product,
    deletedAt: null,
    isDeleted: false,
    serverVersion: null,
    localRevision: 1,
    syncStatus: "pending",
    persistedLocally: true,
  };
}

export async function updateLocalCustomProduct({
  userId,
  childId,
  type,
  productId,
  data,
}) {
  requireContext(userId, childId);

  const configuration = getConfiguration(type);
  const values = validateProductData(type, data);
  const database = await getLocalDatabase();

  let result;

  await database.withExclusiveTransactionAsync(async (transaction) => {
    const row = await readProduct(
      transaction,
      configuration,
      userId,
      productId,
    );

    if (!row || row.child_id !== childId || row.archived_at) {
      throw new Error("Custom product not found.");
    }

    await requireAvailableName({
      transaction,
      configuration,
      userId,
      childId,
      normalizedName: values.normalizedName,
      productId,
    });

    const revision = row.local_revision + 1;
    const now = new Date().toISOString();

    const product = {
      ...JSON.parse(row[configuration.jsonColumn]),
      ...values,
      updatedByUserId: userId,
      updatedAt: now,
    };

    await transaction.runAsync(
      `
        UPDATE ${configuration.table}
        SET ${configuration.jsonColumn} = ?,
            normalized_name = ?,
            local_revision = ?,
            sync_status = 'pending',
            updated_at = ?
        WHERE user_id = ?
          AND ${configuration.idColumn} = ?
      `,
      [
        JSON.stringify(product),
        values.normalizedName,
        revision,
        now,
        userId,
        productId,
      ],
    );

    await enqueueSyncOperation({
      userId,
      entityType: configuration.entityType,
      entityId: productId,
      operation: `update:${revision}`,
      endpoint:
        `/api/children/${encodeURIComponent(childId)}` +
        `/${configuration.endpoint}/${encodeURIComponent(productId)}`,
      method: "PATCH",
      payload: {
        name: values.name,
        ...(type === "medication"
          ? { defaultDoseUnit: values.defaultDoseUnit }
          : {}),
      },
      database: transaction,
    });

    result = {
      ...product,
      deletedAt: null,
      isDeleted: false,
      serverVersion: row.server_version,
      localRevision: revision,
      syncStatus: "pending",
      persistedLocally: true,
    };
  });

  return result;
}

export async function archiveLocalCustomProduct({
  userId,
  childId,
  type,
  productId,
}) {
  requireContext(userId, childId);

  const configuration = getConfiguration(type);
  const database = await getLocalDatabase();

  let result;

  await database.withExclusiveTransactionAsync(async (transaction) => {
    const row = await readProduct(
      transaction,
      configuration,
      userId,
      productId,
    );

    if (!row || row.child_id !== childId) {
      throw new Error("Custom product not found.");
    }

    if (row.archived_at) {
      result = {
        ...mapLocalProduct(row, configuration),
        persistedLocally: true,
      };

      return;
    }

    const revision = row.local_revision + 1;
    const now = new Date().toISOString();

    const product = {
      ...JSON.parse(row[configuration.jsonColumn]),
      archivedAt: now,
      updatedByUserId: userId,
      updatedAt: now,
    };

    await transaction.runAsync(
      `
        UPDATE ${configuration.table}
        SET ${configuration.jsonColumn} = ?,
            archived_at = ?,
            local_revision = ?,
            sync_status = 'pending',
            updated_at = ?
        WHERE user_id = ?
          AND ${configuration.idColumn} = ?
      `,
      [JSON.stringify(product), now, revision, now, userId, productId],
    );

    await enqueueSyncOperation({
      userId,
      entityType: configuration.entityType,
      entityId: productId,
      operation: `archive:${revision}`,
      endpoint:
        `/api/children/${encodeURIComponent(childId)}` +
        `/${configuration.endpoint}/${encodeURIComponent(productId)}`,
      method: "DELETE",
      payload: {},
      database: transaction,
    });

    result = {
      ...product,
      deletedAt: now,
      isDeleted: true,
      serverVersion: row.server_version,
      localRevision: revision,
      syncStatus: "pending",
      persistedLocally: true,
    };
  });

  return result;
}

export async function prepareCustomProductPayload({ operation, payload }) {
  const type = getOperationType(operation);

  if (!type) {
    return payload;
  }

  const configuration = getConfiguration(type);

  if (operation.http_method === "POST") {
    return payload;
  }

  const database = await getLocalDatabase();

  const row = await readProduct(
    database,
    configuration,
    operation.user_id,
    operation.entity_id,
  );

  if (!row || !Number.isInteger(row.server_version)) {
    throw createError(
      "SYNC_DEPENDENCY_PENDING",
      "Waiting for the custom product to be synchronized.",
      0,
    );
  }

  if (operation.http_method === "DELETE") {
    // Une prise créée hors ligne doit atteindre le serveur
    // avant l'archivage du produit qu'elle utilise.
    const pendingEntries = await database.getAllAsync(
      `
        SELECT payload_json
        FROM sync_queue
        WHERE user_id = ?
          AND entity_type = 'tracking_entry'
          AND http_method = 'POST'
      `,
      [operation.user_id],
    );

    const hasPendingReference = pendingEntries.some((item) => {
      const entry = JSON.parse(item.payload_json);

      return type === "medication"
        ? entry?.isCustomMedication === true &&
            entry.medicationId === operation.entity_id
        : entry?.isCustomVaccine === true &&
            entry.vaccineId === operation.entity_id;
    });

    if (hasPendingReference) {
      throw createError(
        "SYNC_DEPENDENCY_PENDING",
        "Waiting for the tracking entry to be synchronized.",
        0,
      );
    }
  }

  return {
    ...payload,
    version: row.server_version,
  };
}

function validateServerProduct(product, type) {
  if (
    !product ||
    typeof product.id !== "string" ||
    typeof product.childId !== "string" ||
    product.type !== type ||
    !Number.isInteger(product.version) ||
    product.version < 1 ||
    typeof product.updatedAt !== "string" ||
    !Number.isFinite(Date.parse(product.updatedAt)) ||
    (product.archivedAt != null &&
      (typeof product.archivedAt !== "string" ||
        !Number.isFinite(Date.parse(product.archivedAt))))
  ) {
    throw new Error("Invalid custom product synchronization response.");
  }

  return {
    ...product,
    ...validateProductData(type, product),
    isCustom: true,
    translationKey: null,
    category: null,
    archivedAt: product.archivedAt ?? null,
  };
}

export async function completeCustomProductSync({ operation, serverProduct }) {
  const type = getOperationType(operation);

  if (!type) {
    throw new Error("Invalid custom product synchronization operation.");
  }

  const configuration = getConfiguration(type);
  const product = validateServerProduct(serverProduct, type);

  const match = /^(create|update|archive):([1-9]\d*)$/.exec(
    operation.operation,
  );

  if (!match || product.id !== operation.entity_id) {
    throw new Error("Custom product synchronization mismatch.");
  }

  const expectedRevision = Number(match[2]);

  if (!Number.isSafeInteger(expectedRevision)) {
    throw new Error("Invalid custom product revision.");
  }

  const database = await getLocalDatabase();

  await database.withExclusiveTransactionAsync(async (transaction) => {
    const row = await readProduct(
      transaction,
      configuration,
      operation.user_id,
      operation.entity_id,
    );

    if (!row || row.child_id !== product.childId) {
      throw new Error("Custom product synchronization mismatch.");
    }

    if (row.server_version !== null && row.server_version > product.version) {
      throw new Error(
        "The synchronization response contains an older version.",
      );
    }

    if (row.local_revision === expectedRevision) {
      await transaction.runAsync(
        `
          UPDATE ${configuration.table}
          SET ${configuration.jsonColumn} = ?,
              normalized_name = ?,
              server_version = ?,
              sync_status = 'synced',
              archived_at = ?,
              updated_at = ?
          WHERE user_id = ?
            AND ${configuration.idColumn} = ?
        `,
        [
          JSON.stringify(product),
          product.normalizedName,
          product.version,
          product.archivedAt,
          product.updatedAt,
          operation.user_id,
          operation.entity_id,
        ],
      );
    } else {
      // Une modification locale plus récente garde la priorité.
      const localProduct = JSON.parse(row[configuration.jsonColumn]);

      await transaction.runAsync(
        `
          UPDATE ${configuration.table}
          SET ${configuration.jsonColumn} = ?,
              server_version = ?
          WHERE user_id = ?
            AND ${configuration.idColumn} = ?
        `,
        [
          JSON.stringify({
            ...localProduct,
            version: product.version,
          }),
          product.version,
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

export async function saveServerCustomProductsLocally({
  userId,
  childId,
  type,
  products,
}) {
  requireContext(userId, childId);

  if (!Array.isArray(products)) {
    throw new Error("Invalid custom products response.");
  }

  const configuration = getConfiguration(type);
  const database = await getLocalDatabase();

  await database.withExclusiveTransactionAsync(async (transaction) => {
    for (const serverProduct of products) {
      const product = validateServerProduct(serverProduct, type);

      if (product.childId !== childId) {
        throw new Error("Custom product child mismatch.");
      }

      const existing = await readProduct(
        transaction,
        configuration,
        userId,
        product.id,
      );

      if (existing && existing.child_id !== childId) {
        throw new Error("Custom product child mismatch.");
      }

      // Ne pas remplacer une création, un renommage
      // ou un archivage local encore en attente.
      if (existing && existing.sync_status !== "synced") {
        continue;
      }

      if (existing && existing.server_version > product.version) {
        continue;
      }

      await transaction.runAsync(
        `
          INSERT INTO ${configuration.table} (
            user_id,
            ${configuration.idColumn},
            child_id,
            ${configuration.jsonColumn},
            normalized_name,
            server_version,
            local_revision,
            sync_status,
            archived_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, 1, 'synced', ?, ?)

          ON CONFLICT (user_id, ${configuration.idColumn})
          DO UPDATE SET
            ${configuration.jsonColumn} =
              excluded.${configuration.jsonColumn},
            normalized_name = excluded.normalized_name,
            server_version = excluded.server_version,
            sync_status = 'synced',
            archived_at = excluded.archived_at,
            updated_at = excluded.updated_at
        `,
        [
          userId,
          product.id,
          childId,
          JSON.stringify(product),
          product.normalizedName,
          product.version,
          product.archivedAt,
          product.updatedAt,
        ],
      );
    }
  });
}
