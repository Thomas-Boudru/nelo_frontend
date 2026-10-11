import * as Crypto from "expo-crypto";

import { getLocalDatabase } from "../../localDatabase.js";
import { enqueueSyncOperation } from "../../../sync/syncQueueRepository.js";

import {
  prepareLocalTrackingPhotos,
  enqueueTrackingPhotos,
  cleanupPreparedPhotos,
} from "../trackingPhotosRepository.js";

import {
  normalizeNextDoseDate,
  saveLocalVaccinationReminder,
} from "./vaccinationReminderRepository.js";

const ML_PER_FL_OZ = 29.5735295625;

const MEDICATION_UNITS = new Set([
  "ml",
  "drops",
  "tablet",
  "suppository",
  "dose",
]);

function requireContext(userId, childId) {
  if (!userId || !childId) {
    throw new Error("Missing user ID or child ID.");
  }
}

function validateData(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Missing tracking entry.");
  }
}

function normalizeTrackingDate(value, fieldName) {
  if (!(value instanceof Date) && typeof value !== "string") {
    throw new Error(`Invalid ${fieldName}.`);
  }

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    throw new Error(`Invalid ${fieldName}.`);
  }

  if (date.getTime() > Date.now()) {
    throw new Error("Tracking time cannot be in the future.");
  }

  return date.toISOString();
}

function normalizeNote(note) {
  if (note != null && (typeof note !== "string" || note.length > 10000)) {
    throw new Error("The note must not exceed 10000 characters.");
  }

  return note?.trim() || null;
}

function validateProductSelection(id, name, isCustom) {
  if (
    typeof id !== "string" ||
    !id ||
    typeof name !== "string" ||
    !name.trim() ||
    name.trim().length > 150 ||
    typeof isCustom !== "boolean"
  ) {
    throw new Error("Invalid product selection.");
  }

  return {
    id: isCustom ? id.toLowerCase() : id,
    name: name.trim(),
    isCustom,
  };
}

/*
 * La conversion est effectuée une seule fois ici.
 * Le backend et SQLite reçoivent toujours des ml.
 */
function normalizeMedicationQuantity(amount, unit) {
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    throw new Error("Invalid medication amount.");
  }

  const storageUnit = unit === "fl_oz" ? "ml" : unit;

  if (!MEDICATION_UNITS.has(storageUnit)) {
    throw new Error("Invalid medication dose unit.");
  }

  const convertedAmount = unit === "fl_oz" ? amount * ML_PER_FL_OZ : amount;

  if (!Number.isFinite(convertedAmount) || convertedAmount > 9999999.999) {
    throw new Error("Invalid medication amount.");
  }

  const roundedAmount = Math.round(convertedAmount * 1000) / 1000;

  if (roundedAmount <= 0) {
    throw new Error("The medication amount is too small.");
  }

  return {
    amount: roundedAmount,
    unit: storageUnit,
  };
}

function normalizeVaccineDose(dose) {
  if (dose == null || dose === "booster") {
    return dose ?? null;
  }

  if (!Number.isInteger(dose) || dose < 1 || dose > 32767) {
    throw new Error("Invalid vaccine dose.");
  }

  return dose;
}

async function requireLocalCustomProduct({
  transaction,
  userId,
  childId,
  type,
  productId,
}) {
  // Les noms de table viennent uniquement de ces constantes.
  const table =
    type === "medication"
      ? "child_custom_medications_local"
      : "child_custom_vaccines_local";

  const idColumn = type === "medication" ? "medication_id" : "vaccine_id";

  const row = await transaction.getFirstAsync(
    `
      SELECT child_id, archived_at
      FROM ${table}
      WHERE user_id = ?
        AND ${idColumn} = ?
    `,
    [userId, productId],
  );

  if (!row || row.child_id !== childId || row.archived_at) {
    throw new Error("The custom product is unavailable for this child.");
  }
}

async function insertLocalTrackingEntry({ transaction, userId, entry }) {
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
        ?, ?, ?, ?, ?,
        NULL, 1, 'pending', NULL, ?, ?
      )
    `,
    [
      userId,
      entry.id,
      entry.childId,
      entry.type,
      JSON.stringify(entry),
      entry.startedAt,
      entry.updatedAt,
    ],
  );
}

function mapLocalEntry(row) {
  return {
    ...JSON.parse(row.entry_json),
    serverVersion: row.server_version,
    localRevision: row.local_revision,
    syncStatus: row.sync_status,
    deletedAt: row.deleted_at,
  };
}

export async function getLocalMedicationEntries({
  userId,
  childId,
  type = "medication",
  limit = 30,
}) {
  requireContext(userId, childId);

  if (!["medication", "vaccine"].includes(type)) {
    throw new Error("Invalid medication tracking type.");
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error("Invalid tracking entry limit.");
  }

  const database = await getLocalDatabase();

  const rows = await database.getAllAsync(
    `
      SELECT *
      FROM tracking_entries_local
      WHERE user_id = ?
        AND child_id = ?
        AND entry_type = ?
        AND deleted_at IS NULL
      ORDER BY started_at DESC, entry_id DESC
      LIMIT ?
    `,
    [userId, childId, type, limit],
  );

  return rows.map(mapLocalEntry);
}

export async function createLocalMedicationEntry({ userId, childId, data }) {
  requireContext(userId, childId);
  validateData(data);

  const product = validateProductSelection(
    data.medicationId,
    data.medicationName,
    data.isCustomMedication,
  );

  const quantity = normalizeMedicationQuantity(data.amount, data.unit);

  const medicationDate = normalizeTrackingDate(
    data.medicationDate,
    "medication date",
  );

  const note = normalizeNote(data.note);
  const database = await getLocalDatabase();

  const id = Crypto.randomUUID();
  const now = new Date().toISOString();

  const payload = {
    id,
    medicationId: product.id,
    medicationName: product.name,
    isCustomMedication: product.isCustom,
    amount: quantity.amount,
    unit: quantity.unit,
    medicationDate,
    note,
  };

  const entry = {
    ...payload,
    childId,
    type: "medication",
    startedAt: medicationDate,
    endedAt: null,
    source: "manual",
    createdByUserId: userId,
    updatedByUserId: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    version: null,
  };

  await database.withExclusiveTransactionAsync(async (transaction) => {
    if (product.isCustom) {
      await requireLocalCustomProduct({
        transaction,
        userId,
        childId,
        type: "medication",
        productId: product.id,
      });
    }

    await insertLocalTrackingEntry({
      transaction,
      userId,
      entry,
    });

    await enqueueSyncOperation({
      userId,
      entityType: "tracking_entry",
      entityId: id,
      operation: "create:1",
      endpoint: `/api/children/${encodeURIComponent(childId)}/medications`,
      method: "POST",
      payload,
      database: transaction,
    });
  });

  return {
    ...entry,
    serverVersion: null,
    localRevision: 1,
    syncStatus: "pending",
    persistedLocally: true,
  };
}

export async function createLocalVaccineEntry({ userId, childId, data }) {
  requireContext(userId, childId);
  validateData(data);

  const product = validateProductSelection(
    data.vaccineId,
    data.vaccineName,
    data.isCustomVaccine,
  );

  const vaccineDate = normalizeTrackingDate(data.vaccineDate, "vaccine date");

  const dose = normalizeVaccineDose(data.dose);
  const nextDoseDate = normalizeNextDoseDate(data.nextDoseDate);
  const note = normalizeNote(data.note);

  const database = await getLocalDatabase();

  const id = Crypto.randomUUID();
  const now = new Date().toISOString();

  const payload = {
    id,
    vaccineId: product.id,
    vaccineName: product.name,
    isCustomVaccine: product.isCustom,
    dose,
    vaccineDate,
    nextDoseDate,
    note,
  };

  const selectedPhotos = data.photos ?? [];

  if (!Array.isArray(selectedPhotos)) {
    throw new Error("Invalid vaccine photos.");
  }

  const preparedPhotos = await prepareLocalTrackingPhotos(selectedPhotos);

  const entry = {
    ...payload,
    childId,
    type: "vaccine",
    startedAt: vaccineDate,
    endedAt: null,
    photos: preparedPhotos,
    reminderId: null,
    reminderStatus: nextDoseDate ? "pending" : null,
    source: "manual",
    createdByUserId: userId,
    updatedByUserId: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    version: null,
  };

  try {
    await database.withExclusiveTransactionAsync(async (transaction) => {
      if (product.isCustom) {
        await requireLocalCustomProduct({
          transaction,
          userId,
          childId,
          type: "vaccine",
          productId: product.id,
        });
      }

      await insertLocalTrackingEntry({
        transaction,
        userId,
        entry,
      });

      await enqueueSyncOperation({
        userId,
        entityType: "tracking_entry",
        entityId: id,
        operation: "create:1",
        endpoint: `/api/children/${encodeURIComponent(childId)}/vaccines`,
        method: "POST",
        payload,
        database: transaction,
      });

      await saveLocalVaccinationReminder({
        database: transaction,
        userId,
        entry,
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
    persistedLocally: true,
  };
}

/*
 * Une prise utilisant un produit personnalisé attend que
 * ce produit existe sur le serveur.
 */
export async function prepareMedicationSyncPayload({ operation, payload }) {
  if (operation.entity_type !== "tracking_entry") {
    return payload;
  }

  let type = null;

  if (operation.http_method === "POST") {
    if (operation.endpoint.endsWith("/medications")) {
      type = "medication";
    } else if (operation.endpoint.endsWith("/vaccines")) {
      type = "vaccine";
    }
  } else if (
    operation.http_method === "PUT" &&
    /^update:[1-9]\d*$/.test(operation.operation)
  ) {
    if (/\/medications\/[^/]+$/.test(operation.endpoint)) {
      type = "medication";
    } else if (/\/vaccines\/[^/]+$/.test(operation.endpoint)) {
      type = "vaccine";
    }

    if (
      type &&
      (!Number.isSafeInteger(payload?.version) || payload.version < 1)
    ) {
      throw new Error("Invalid medication synchronization version.");
    }
  }

  if (!type) {
    return payload;
  }

  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid medication synchronization payload.");
  }

  const isCustom =
    type === "medication"
      ? payload.isCustomMedication
      : payload.isCustomVaccine;

  if (typeof isCustom !== "boolean") {
    throw new Error("Invalid custom product selection.");
  }

  if (!isCustom) {
    return payload;
  }

  const productId =
    type === "medication" ? payload.medicationId : payload.vaccineId;

  const table =
    type === "medication"
      ? "child_custom_medications_local"
      : "child_custom_vaccines_local";

  const idColumn = type === "medication" ? "medication_id" : "vaccine_id";

  const jsonColumn = type === "medication" ? "medication_json" : "vaccine_json";

  const entityType =
    type === "medication" ? "child_custom_medication" : "child_custom_vaccine";

  const database = await getLocalDatabase();

  const entry = await database.getFirstAsync(
    `
      SELECT child_id
      FROM tracking_entries_local
      WHERE user_id = ?
        AND entry_id = ?
        AND entry_type = ?
    `,
    [operation.user_id, operation.entity_id, type],
  );

  const product = await database.getFirstAsync(
    `
      SELECT *
      FROM ${table}
      WHERE user_id = ?
        AND ${idColumn} = ?
    `,
    [operation.user_id, productId],
  );

  if (!entry || !product || product.child_id !== entry.child_id) {
    throw new Error("Custom product tracking mismatch.");
  }

  if (!Number.isInteger(product.server_version)) {
    const error = new Error(
      "Waiting for the custom product to be synchronized.",
    );

    error.code = "SYNC_DEPENDENCY_PENDING";
    error.status = 0;

    throw error;
  }

  const storedProduct = JSON.parse(product[jsonColumn]);

  if (storedProduct.archivedAt) {
    const pendingArchive = await database.getFirstAsync(
      `
        SELECT id
        FROM sync_queue
        WHERE user_id = ?
          AND entity_type = ?
          AND entity_id = ?
          AND http_method = 'DELETE'
      `,
      [operation.user_id, entityType, productId],
    );

    /*
     * Un archivage encore local peut attendre cette prise.
     * Un produit déjà archivé sur le serveur est inutilisable
     * pour une nouvelle prise.
     */
    if (!pendingArchive) {
      const error = new Error("The custom product has already been archived.");

      error.code = "CUSTOM_PRODUCT_DEPENDENCY_ARCHIVED";

      throw error;
    }
  }

  // Le nom envoyé reste celui choisi lors de la sauvegarde.
  return payload;
}

export async function updateLocalMedicationEntry({
  userId,
  childId,
  entryId,
  data,
}) {
  requireContext(userId, childId);
  validateData(data);

  if (!entryId) {
    throw new Error("Missing tracking entry ID.");
  }

  const product = validateProductSelection(
    data.medicationId,
    data.medicationName,
    data.isCustomMedication,
  );

  const quantity = normalizeMedicationQuantity(data.amount, data.unit);
  const medicationDate = normalizeTrackingDate(
    data.medicationDate,
    "medication date",
  );
  const note = normalizeNote(data.note);

  const collectionEndpoint = `/api/children/${encodeURIComponent(childId)}/medications`;
  const entryEndpoint = `${collectionEndpoint}/${encodeURIComponent(entryId)}`;

  const database = await getLocalDatabase();
  let savedEntry;

  await database.withExclusiveTransactionAsync(async (transaction) => {
    const row = await transaction.getFirstAsync(
      `
        SELECT *
        FROM tracking_entries_local
        WHERE user_id = ?
          AND child_id = ?
          AND entry_id = ?
          AND entry_type = 'medication'
          AND deleted_at IS NULL
      `,
      [userId, childId, entryId],
    );

    if (!row) {
      throw new Error("Local medication entry not found.");
    }

    if (row.sync_status === "conflict") {
      const error = new Error(
        "Resolve this entry's synchronization conflict before editing it.",
      );
      error.code = "TRACKING_VERSION_CONFLICT";
      throw error;
    }

    if (product.isCustom) {
      await requireLocalCustomProduct({
        transaction,
        userId,
        childId,
        type: "medication",
        productId: product.id,
      });
    }

    const previous = await transaction.getFirstAsync(
      `
        SELECT *
        FROM sync_queue
        WHERE user_id = ?
          AND entity_id = ?
          AND entity_type IN ('tracking_entry', 'tracking_photo')
        ORDER BY rowid DESC
        LIMIT 1
      `,
      [userId, entryId],
    );

    let version = row.server_version;

    if (previous) {
      const isCreation =
        previous.entity_type === "tracking_entry" &&
        previous.http_method === "POST" &&
        previous.endpoint === collectionEndpoint &&
        /^create:[1-9]\d*$/.test(previous.operation);

      const isUpdate =
        previous.entity_type === "tracking_entry" &&
        previous.http_method === "PUT" &&
        previous.endpoint === entryEndpoint &&
        /^update:[1-9]\d*$/.test(previous.operation);

      if (isCreation) {
        version = 1;
      } else if (isUpdate) {
        const previousPayload = JSON.parse(previous.payload_json);

        if (
          !Number.isSafeInteger(previousPayload?.version) ||
          previousPayload.version < 1
        ) {
          throw new Error("Invalid pending medication version.");
        }

        version = previousPayload.version + 1;
      } else {
        const error = new Error(
          "Wait for this entry to finish syncing before editing it.",
        );
        error.code = "MEDICATION_SYNC_PENDING";
        throw error;
      }
    }

    if (!Number.isSafeInteger(version) || version < 1) {
      const error = new Error(
        "Wait for this entry to finish syncing before editing it.",
      );
      error.code = "MEDICATION_SYNC_PENDING";
      throw error;
    }

    const localRevision = row.local_revision + 1;

    if (!Number.isSafeInteger(localRevision) || localRevision < 2) {
      throw new Error("Invalid medication local revision.");
    }

    const now = new Date().toISOString();

    const payload = {
      medicationId: product.id,
      medicationName: product.name,
      isCustomMedication: product.isCustom,
      amount: quantity.amount,
      unit: quantity.unit,
      medicationDate,
      note,
      version,
    };

    const entry = {
      ...JSON.parse(row.entry_json),
      ...payload,
      id: entryId,
      childId,
      type: "medication",
      startedAt: medicationDate,
      note: note ?? "",
      updatedByUserId: userId,
      updatedAt: now,
      deletedAt: null,
      version: row.server_version,
    };

    await transaction.runAsync(
      `
        UPDATE tracking_entries_local
        SET entry_json = ?,
            local_revision = ?,
            sync_status = 'pending',
            started_at = ?,
            updated_at = ?
        WHERE user_id = ?
          AND child_id = ?
          AND entry_id = ?
          AND entry_type = 'medication'
      `,
      [
        JSON.stringify(entry),
        localRevision,
        medicationDate,
        now,
        userId,
        childId,
        entryId,
      ],
    );

    await enqueueSyncOperation({
      userId,
      entityType: "tracking_entry",
      entityId: entryId,
      operation: `update:${localRevision}`,
      endpoint: entryEndpoint,
      method: "PUT",
      payload,
      database: transaction,
    });

    savedEntry = {
      ...entry,
      serverVersion: row.server_version,
      localRevision,
      syncStatus: "pending",
      persistedLocally: true,
    };
  });

  return savedEntry;
}

export async function updateLocalVaccineEntry({
  userId,
  childId,
  entryId,
  data,
}) {
  requireContext(userId, childId);
  validateData(data);

  if (!entryId) {
    throw new Error("Missing tracking entry ID.");
  }

  const product = validateProductSelection(
    data.vaccineId,
    data.vaccineName,
    data.isCustomVaccine,
  );

  const vaccineDate = normalizeTrackingDate(data.vaccineDate, "vaccine date");

  const dose = normalizeVaccineDose(data.dose);
  const nextDoseDate = normalizeNextDoseDate(data.nextDoseDate);
  const note = normalizeNote(data.note);

  const database = await getLocalDatabase();

  const initialRow = await database.getFirstAsync(
    `
      SELECT *
      FROM tracking_entries_local
      WHERE user_id = ?
        AND child_id = ?
        AND entry_id = ?
        AND entry_type = 'vaccine'
        AND deleted_at IS NULL
    `,
    [userId, childId, entryId],
  );

  if (!initialRow) {
    throw new Error("Local vaccine entry not found.");
  }

  const initialEntry = JSON.parse(initialRow.entry_json);
  const existingPhotos = initialEntry.photos ?? [];
  const selectedPhotos = data.photos ?? existingPhotos;

  if (!Array.isArray(selectedPhotos) || selectedPhotos.length > 10) {
    throw new Error("A vaccine entry must not contain more than 10 photos.");
  }

  const getPhotoId = (photo) => photo?.attachmentId ?? photo?.id;

  const existingById = new Map(
    existingPhotos.map((photo) => [getPhotoId(photo), photo]),
  );

  const retainedIds = new Set();
  const newPhotos = [];

  for (const photo of selectedPhotos) {
    const id = getPhotoId(photo);

    if (id && existingById.has(id)) {
      if (retainedIds.has(id)) {
        throw new Error("Duplicate vaccine photo.");
      }

      retainedIds.add(id);
    } else {
      if (photo?.attachmentId) {
        throw new Error("Unknown vaccine photo.");
      }

      newPhotos.push(photo);
    }
  }

  const retainedPhotos = existingPhotos.filter((photo) =>
    retainedIds.has(getPhotoId(photo)),
  );

  const removedPhotos = existingPhotos.filter(
    (photo) => !retainedIds.has(getPhotoId(photo)),
  );

  const preparedPhotos = await prepareLocalTrackingPhotos(newPhotos);

  let savedEntry;

  try {
    await database.withExclusiveTransactionAsync(async (transaction) => {
      const row = await transaction.getFirstAsync(
        `
          SELECT *
          FROM tracking_entries_local
          WHERE user_id = ?
            AND child_id = ?
            AND entry_id = ?
            AND entry_type = 'vaccine'
            AND deleted_at IS NULL
        `,
        [userId, childId, entryId],
      );

      if (!row) {
        throw new Error("Local vaccine entry not found.");
      }

      // La préparation des photos a pu prendre du temps.
      if (
        row.local_revision !== initialRow.local_revision ||
        row.server_version !== initialRow.server_version ||
        row.entry_json !== initialRow.entry_json ||
        row.sync_status === "conflict"
      ) {
        const error = new Error("This entry changed. Reopen it before saving.");

        error.code = "TRACKING_VERSION_CONFLICT";
        throw error;
      }

      const pending = await transaction.getFirstAsync(
        `
          SELECT id
          FROM sync_queue
          WHERE user_id = ?
            AND entity_id = ?
            AND entity_type IN ('tracking_entry', 'tracking_photo')
          LIMIT 1
        `,
        [userId, entryId],
      );

      if (
        pending ||
        row.sync_status !== "synced" ||
        !Number.isSafeInteger(row.server_version) ||
        row.server_version < 1
      ) {
        const error = new Error(
          "Wait for this entry to finish syncing before editing it.",
        );

        error.code = "VACCINE_SYNC_PENDING";
        throw error;
      }

      if (product.isCustom) {
        await requireLocalCustomProduct({
          transaction,
          userId,
          childId,
          type: "vaccine",
          productId: product.id,
        });
      }

      const current = JSON.parse(row.entry_json);

      // Un rappel déjà terminé ne peut pas être reprogrammé ici.
      if (
        current.reminderStatus === "completed" &&
        (normalizeNextDoseDate(current.nextDoseDate) !== nextDoseDate ||
          current.vaccineId !== product.id ||
          current.vaccineName !== product.name ||
          current.isCustomVaccine !== product.isCustom)
      ) {
        const error = new Error(
          "A completed reminder cannot be changed from this entry.",
        );

        error.code = "VACCINATION_REMINDER_COMPLETED";
        throw error;
      }

      const localRevision = row.local_revision + 1;

      if (!Number.isSafeInteger(localRevision) || localRevision < 2) {
        throw new Error("Invalid vaccine local revision.");
      }

      const lastOrder = retainedPhotos.reduce(
        (maximum, photo, index) => Math.max(maximum, photo.sortOrder ?? index),
        -1,
      );

      const addedPhotos = preparedPhotos.map((photo, index) => ({
        ...photo,
        sortOrder: lastOrder + index + 1,
      }));

      const now = new Date().toISOString();

      const payload = {
        vaccineId: product.id,
        vaccineName: product.name,
        isCustomVaccine: product.isCustom,
        dose,
        vaccineDate,
        nextDoseDate,
        note,
        version: row.server_version,
      };

      const entry = {
        ...current,
        ...payload,
        id: entryId,
        childId,
        type: "vaccine",
        startedAt: vaccineDate,
        endedAt: null,
        note: note ?? "",
        photos: [...retainedPhotos, ...addedPhotos],
        reminderStatus:
          current.reminderStatus === "completed"
            ? "completed"
            : nextDoseDate
              ? "pending"
              : current.reminderId || current.reminderStatus
                ? "cancelled"
                : null,
        updatedByUserId: userId,
        updatedAt: now,
        deletedAt: null,
      };

      await transaction.runAsync(
        `
          UPDATE tracking_entries_local
          SET entry_json = ?,
              local_revision = ?,
              sync_status = 'pending',
              started_at = ?,
              updated_at = ?
          WHERE user_id = ?
            AND child_id = ?
            AND entry_id = ?
            AND entry_type = 'vaccine'
        `,
        [
          JSON.stringify(entry),
          localRevision,
          vaccineDate,
          now,
          userId,
          childId,
          entryId,
        ],
      );

      // Modifier le vaccin avant de supprimer ou ajouter ses photos.
      await enqueueSyncOperation({
        userId,
        entityType: "tracking_entry",
        entityId: entryId,
        operation: `update:${localRevision}`,
        endpoint:
          `/api/children/${encodeURIComponent(childId)}` +
          `/vaccines/${encodeURIComponent(entryId)}`,
        method: "PUT",
        payload,
        database: transaction,
      });

      await saveLocalVaccinationReminder({
        database: transaction,
        userId,
        entry,
      });

      // Libérer les places avant l'envoi des nouvelles photos.
      for (const photo of removedPhotos) {
        const attachmentId = getPhotoId(photo);

        if (!attachmentId) {
          throw new Error("Missing photo attachment ID.");
        }

        await enqueueSyncOperation({
          userId,
          entityType: "tracking_photo",
          entityId: entryId,
          operation: `delete:${attachmentId}`,
          endpoint:
            `/api/children/${encodeURIComponent(childId)}` +
            `/tracking/${encodeURIComponent(entryId)}` +
            `/photos/${encodeURIComponent(attachmentId)}`,
          method: "DELETE",
          payload: {
            childId,
            entryId,
            attachmentId,
          },
          database: transaction,
        });
      }

      await enqueueTrackingPhotos({
        transaction,
        userId,
        childId,
        entryId,
        photos: addedPhotos,
      });

      savedEntry = {
        ...entry,
        serverVersion: row.server_version,
        localRevision,
        syncStatus: "pending",
        persistedLocally: true,
      };
    });
  } catch (error) {
    await cleanupPreparedPhotos(preparedPhotos);
    throw error;
  }

  return savedEntry;
}
