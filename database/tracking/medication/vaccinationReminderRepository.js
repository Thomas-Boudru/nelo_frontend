import { getLocalDatabase } from "../../localDatabase.js";

const REMINDER_STATUSES = new Set(["pending", "completed", "cancelled"]);

function requireContext(userId, childId) {
  if (!userId || !childId) {
    throw new Error("Missing user ID or child ID.");
  }
}

/*
 * Une prochaine dose correspond à un jour du calendrier,
 * pas à une heure UTC.
 */
export function normalizeNextDoseDate(value) {
  if (value == null) {
    return null;
  }

  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime())) {
      throw new Error("Invalid next dose date.");
    }

    const year = String(value.getFullYear()).padStart(4, "0");
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");

    return normalizeNextDoseDate(`${year}-${month}-${day}`);
  }

  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Invalid next dose date.");
  }

  const [year, month, day] = value.split("-").map(Number);

  if (year < 1 || year > 9999) {
    throw new Error("Invalid next dose date.");
  }

  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error("Invalid next dose date.");
  }

  return value;
}

/*
 * À utiliser pour réafficher une date enregistrée
 * dans un sélecteur React Native.
 */
export function nextDoseDateToLocalDate(value) {
  const normalized = normalizeNextDoseDate(value);

  if (!normalized) {
    return null;
  }

  const [year, month, day] = normalized.split("-").map(Number);

  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setFullYear(year, month - 1, day);

  return date;
}

function mapLocalReminder(row) {
  return {
    ...JSON.parse(row.reminder_json),
    serverVersion: row.server_version,
    syncStatus: row.sync_status,
  };
}

async function writeReminder({
  database,
  userId,
  reminder,
  serverVersion,
  syncStatus,
}) {
  await database.runAsync(
    `
      INSERT INTO vaccination_reminders_local (
        user_id,
        source_tracking_entry_id,
        reminder_id,
        child_id,
        reminder_json,
        server_version,
        sync_status,
        status,
        due_date,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)

      ON CONFLICT (user_id, source_tracking_entry_id)
      DO UPDATE SET
        reminder_id = excluded.reminder_id,
        reminder_json = excluded.reminder_json,
        server_version = excluded.server_version,
        sync_status = excluded.sync_status,
        status = excluded.status,
        due_date = excluded.due_date,
        updated_at = excluded.updated_at
    `,
    [
      userId,
      reminder.sourceTrackingEntryId,
      reminder.id ?? null,
      reminder.childId,
      JSON.stringify(reminder),
      serverVersion,
      syncStatus,
      reminder.status,
      reminder.dueDate,
      reminder.updatedAt,
    ],
  );
}

/*
 * Appelée dans la transaction qui crée la vaccination locale.
 * Le serveur attribuera l'identifiant du rappel.
 */
export async function saveLocalVaccinationReminder({
  database,
  userId,
  entry,
}) {
  if (!database || !userId || entry?.type !== "vaccine") {
    throw new Error("Invalid local vaccination reminder.");
  }

  const row = await database.getFirstAsync(
    `
      SELECT *
      FROM vaccination_reminders_local
      WHERE user_id = ? AND source_tracking_entry_id = ?
    `,
    [userId, entry.id],
  );

  if (row && row.child_id !== entry.childId) {
    throw new Error("Vaccination reminder child mismatch.");
  }

  const previous = row ? JSON.parse(row.reminder_json) : null;
  const dueDate = normalizeNextDoseDate(entry.nextDoseDate);

  if (previous?.status === "completed") {
    const changed =
      previous.dueDate !== dueDate ||
      previous.vaccineId !== entry.vaccineId ||
      previous.isCustomVaccine !== entry.isCustomVaccine ||
      previous.vaccineName !== entry.vaccineName;

    if (changed) {
      const error = new Error(
        "A completed reminder cannot be changed from this entry.",
      );
      error.code = "VACCINATION_REMINDER_COMPLETED";
      throw error;
    }
  }

  if (!dueDate && !previous) {
    return null;
  }

  const status =
    previous?.status === "completed"
      ? "completed"
      : dueDate
        ? "pending"
        : "cancelled";

  const reminder = {
    ...previous,
    id: previous?.id ?? entry.reminderId ?? null,
    childId: entry.childId,
    sourceTrackingEntryId: entry.id,
    vaccineId: entry.vaccineId,
    vaccineName: entry.vaccineName,
    isCustomVaccine: entry.isCustomVaccine,
    dueDate: dueDate ?? previous.dueDate,
    status,
    sourceDeletedAt: entry.deletedAt ?? null,
    completedByTrackingEntryId:
      status === "completed" ? previous.completedByTrackingEntryId : null,
    completedAt: status === "completed" ? previous.completedAt : null,
    cancelledAt: status === "cancelled" ? entry.updatedAt : null,
    createdByUserId: previous?.createdByUserId ?? userId,
    updatedByUserId: userId,
    createdAt: previous?.createdAt ?? entry.createdAt,
    updatedAt: entry.updatedAt,
    version: previous?.version ?? null,
  };

  await writeReminder({
    database,
    userId,
    reminder,
    serverVersion: row?.server_version ?? null,
    syncStatus: "pending",
  });

  return reminder;
}

/*
 * Appelée dans la transaction qui confirme la synchronisation
 * de la vaccination.
 */
export async function saveVaccinationReminderFromEntry({
  database,
  userId,
  entry,
}) {
  if (!database || !userId || entry?.type !== "vaccine") {
    throw new Error("Invalid vaccination reminder response.");
  }

  // Les réponses d'édition contiennent le rappel complet,
  // avec sa propre version et son état.
  if (Object.hasOwn(entry, "reminder")) {
    if (entry.reminder === null) {
      await database.runAsync(
        `
          DELETE FROM vaccination_reminders_local
          WHERE user_id = ?
            AND source_tracking_entry_id = ?
            AND child_id = ?
        `,
        [userId, entry.id, entry.childId],
      );

      return null;
    }

    const reminder = validateServerReminder(entry.reminder, entry.childId);

    if (reminder.sourceTrackingEntryId !== entry.id) {
      throw new Error("Vaccination reminder entry mismatch.");
    }

    await writeReminder({
      database,
      userId,
      reminder,
      serverVersion: reminder.version,
      syncStatus: "synced",
    });

    return reminder;
  }

  const dueDate = normalizeNextDoseDate(entry.nextDoseDate);

  if (!dueDate) {
    return null;
  }

  if (typeof entry.reminderId !== "string" || !entry.reminderId) {
    throw new Error("Missing server vaccination reminder ID.");
  }

  const status = entry.reminderStatus ?? "pending";

  if (!REMINDER_STATUSES.has(status)) {
    throw new Error("Invalid vaccination reminder status.");
  }

  const row = await database.getFirstAsync(
    `
      SELECT *
      FROM vaccination_reminders_local
      WHERE user_id = ?
        AND source_tracking_entry_id = ?
    `,
    [userId, entry.id],
  );

  if (row && row.child_id !== entry.childId) {
    throw new Error("Vaccination reminder child mismatch.");
  }

  /*
   * Une récupération complète a éventuellement déjà enregistré
   * ce rappel. Elle contient sa propre version et davantage
   * de métadonnées que la réponse de création du vaccin.
   */
  if (
    row?.reminder_id === entry.reminderId &&
    Number.isInteger(row.server_version) &&
    row.sync_status === "synced"
  ) {
    return mapLocalReminder(row);
  }

  const reminder = {
    id: entry.reminderId,
    childId: entry.childId,
    sourceTrackingEntryId: entry.id,
    vaccineId: entry.vaccineId,
    vaccineName: entry.vaccineName,
    isCustomVaccine: entry.isCustomVaccine,
    dueDate,
    status,
    sourceDeletedAt: entry.deletedAt ?? null,
    completedByTrackingEntryId: null,
    createdByUserId: entry.createdByUserId,
    updatedByUserId: null,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    completedAt: null,
    cancelledAt: null,

    // Le rappel possède une version distincte de celle du vaccin.
    version: null,
  };

  await writeReminder({
    database,
    userId,
    reminder,
    serverVersion: null,
    syncStatus: "synced",
  });

  return reminder;
}

export async function getLocalVaccinationReminders({
  userId,
  childId,
  includeFinished = false,
}) {
  requireContext(userId, childId);

  const database = await getLocalDatabase();

  const rows = await database.getAllAsync(
    `
      SELECT reminder.*
      FROM vaccination_reminders_local AS reminder

      LEFT JOIN tracking_entries_local AS entry
        ON entry.user_id = reminder.user_id
        AND entry.entry_id = reminder.source_tracking_entry_id

      WHERE reminder.user_id = ?
        AND reminder.child_id = ?
        AND entry.deleted_at IS NULL
        ${includeFinished ? "" : "AND reminder.status = 'pending'"}

      ORDER BY
        reminder.due_date ASC,
        reminder.source_tracking_entry_id ASC
    `,
    [userId, childId],
  );

  return rows
    .map(mapLocalReminder)
    .filter((reminder) => !reminder.sourceDeletedAt);
}

function validateServerReminder(reminder, childId) {
  if (
    !reminder ||
    typeof reminder.id !== "string" ||
    !reminder.id ||
    reminder.childId !== childId ||
    typeof reminder.sourceTrackingEntryId !== "string" ||
    !reminder.sourceTrackingEntryId ||
    !REMINDER_STATUSES.has(reminder.status) ||
    !Number.isInteger(reminder.version) ||
    reminder.version < 1 ||
    typeof reminder.updatedAt !== "string" ||
    !Number.isFinite(Date.parse(reminder.updatedAt))
  ) {
    throw new Error("Invalid vaccination reminders response.");
  }

  const dueDate = normalizeNextDoseDate(reminder.dueDate);

  if (!dueDate) {
    throw new Error("Missing next dose date.");
  }

  return {
    ...reminder,
    dueDate,
    sourceDeletedAt: reminder.sourceDeletedAt ?? null,
  };
}

export async function saveServerVaccinationRemindersLocally({
  userId,
  childId,
  reminders,
}) {
  requireContext(userId, childId);

  if (!Array.isArray(reminders)) {
    throw new Error("Invalid vaccination reminders response.");
  }

  const database = await getLocalDatabase();

  await database.withExclusiveTransactionAsync(async (transaction) => {
    for (const serverReminder of reminders) {
      const reminder = validateServerReminder(serverReminder, childId);

      const pendingEntry = await transaction.getFirstAsync(
        `
          SELECT id
          FROM sync_queue
          WHERE user_id = ?
            AND entity_id = ?
            AND entity_type = 'tracking_entry'
          LIMIT 1
        `,
        [userId, reminder.sourceTrackingEntryId],
      );

      if (pendingEntry) {
        continue;
      }

      const existing = await transaction.getFirstAsync(
        `
          SELECT *
          FROM vaccination_reminders_local
          WHERE user_id = ?
            AND source_tracking_entry_id = ?
        `,
        [userId, reminder.sourceTrackingEntryId],
      );

      if (existing && existing.child_id !== childId) {
        throw new Error("Vaccination reminder child mismatch.");
      }

      /*
       * La réponse serveur ne remplace pas un rappel
       * dont la vaccination locale attend sa synchronisation.
       */
      if (existing?.sync_status === "pending") {
        continue;
      }

      if (existing?.reminder_id && existing.reminder_id !== reminder.id) {
        throw new Error("Vaccination reminder ID mismatch.");
      }

      if (
        existing?.server_version != null &&
        existing.server_version > reminder.version
      ) {
        continue;
      }

      await writeReminder({
        database: transaction,
        userId,
        reminder,
        serverVersion: reminder.version,
        syncStatus: "synced",
      });
    }
  });

  return getLocalVaccinationReminders({
    userId,
    childId,
  });
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

  const snapshot = await database.getFirstAsync(
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

  if (!snapshot) {
    throw new Error("Local vaccination entry not found.");
  }

  const current = JSON.parse(snapshot.entry_json);
  const existingPhotos = current.photos ?? [];
  const selectedPhotos = data.photos ?? existingPhotos;

  if (!Array.isArray(selectedPhotos) || selectedPhotos.length > 10) {
    throw new Error("A tracking entry must not contain more than 10 photos.");
  }

  const getId = (photo) => photo?.attachmentId ?? photo?.id;

  const existingById = new Map(
    existingPhotos.map((photo) => [getId(photo), photo]),
  );

  const keptIds = new Set();
  const newPhotos = [];

  for (const photo of selectedPhotos) {
    const id = getId(photo);

    if (id && existingById.has(id)) {
      if (keptIds.has(id)) {
        throw new Error("Duplicate vaccine photo.");
      }

      keptIds.add(id);
    } else {
      newPhotos.push(photo);
    }
  }

  const removedPhotos = existingPhotos.filter(
    (photo) => !keptIds.has(getId(photo)),
  );

  // Conserver l'ordre des photos existantes.
  // Le serveur ajoute les nouvelles à la suite.
  const keptPhotos = existingPhotos.filter((photo) =>
    keptIds.has(getId(photo)),
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
        throw new Error("Local vaccination entry not found.");
      }

      // La préparation des fichiers est asynchrone :
      // vérifier que l'entrée n'a pas changé entre-temps.
      if (
        row.local_revision !== snapshot.local_revision ||
        row.server_version !== snapshot.server_version ||
        row.entry_json !== snapshot.entry_json
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

      if (
        current.reminderStatus === "completed" &&
        ((current.nextDoseDate ?? null) !== nextDoseDate ||
          current.vaccineId !== product.id ||
          current.isCustomVaccine !== product.isCustom ||
          current.vaccineName !== product.name)
      ) {
        const error = new Error(
          "A completed reminder cannot be changed from this entry.",
        );
        error.code = "VACCINATION_REMINDER_COMPLETED";
        throw error;
      }

      const localRevision = row.local_revision + 1;

      if (!Number.isSafeInteger(localRevision)) {
        throw new Error("Invalid vaccination local revision.");
      }

      const now = new Date().toISOString();

      const addedPhotos = preparedPhotos.map((photo, index) => ({
        ...photo,
        sortOrder: keptPhotos.length + index,
      }));

      const payload = {
        vaccineId: product.id,
        vaccineName: product.name,
        isCustomVaccine: product.isCustom,
        vaccineDate,
        dose,
        nextDoseDate,
        note,
        version: row.server_version,
      };

      const entry = {
        ...current,
        ...payload,
        startedAt: vaccineDate,
        note: note ?? "",
        photos: [...keptPhotos, ...addedPhotos],
        reminderStatus:
          current.reminderStatus === "completed"
            ? "completed"
            : nextDoseDate
              ? "pending"
              : current.reminderId
                ? "cancelled"
                : null,
        updatedByUserId: userId,
        updatedAt: now,
      };

      await transaction.runAsync(
        `
          UPDATE tracking_entries_local
          SET entry_json = ?,
              local_revision = ?,
              sync_status = 'pending',
              started_at = ?,
              updated_at = ?
          WHERE user_id = ? AND child_id = ? AND entry_id = ?
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

      // Modifier d'abord le vaccin avec sa version actuelle.
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

      // Supprimer avant d'ajouter pour respecter la limite de photos.
      for (const photo of removedPhotos) {
        const attachmentId = getId(photo);

        if (typeof attachmentId !== "string" || !attachmentId) {
          throw new Error("Missing vaccine photo ID.");
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
          payload: { childId, entryId, attachmentId },
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
