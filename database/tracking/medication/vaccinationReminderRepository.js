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

  const dueDate = normalizeNextDoseDate(entry.nextDoseDate);

  if (!dueDate) {
    return null;
  }

  const reminder = {
    id: null,
    childId: entry.childId,
    sourceTrackingEntryId: entry.id,
    vaccineId: entry.vaccineId,
    vaccineName: entry.vaccineName,
    isCustomVaccine: entry.isCustomVaccine,
    dueDate,
    status: "pending",
    sourceDeletedAt: null,
    completedByTrackingEntryId: null,
    createdByUserId: userId,
    updatedByUserId: null,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    completedAt: null,
    cancelledAt: null,
    version: null,
  };

  await writeReminder({
    database,
    userId,
    reminder,
    serverVersion: null,
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
