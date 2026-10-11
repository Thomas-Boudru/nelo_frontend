import * as Crypto from "expo-crypto";

import { getLocalDatabase } from "../../localDatabase.js";

import { enqueueSyncOperation } from "../../../sync/syncQueueRepository.js";

import {
  prepareLocalTrackingPhotos,
  enqueueTrackingPhotos,
  cleanupPreparedPhotos,
} from "../trackingPhotosRepository.js";

export async function createLocalNoteEntry({ userId, childId, data }) {
  if (!userId || !childId) {
    throw new Error("Missing user ID or child ID.");
  }

  if (!data || typeof data !== "object") {
    throw new Error("Invalid note entry.");
  }

  if (typeof data.note !== "string" || data.note.length > 10000) {
    throw new Error("Invalid note text.");
  }

  const photos = data.photos ?? [];

  if (!Array.isArray(photos) || photos.length > 5) {
    throw new Error("A note must not contain more than 5 photos.");
  }

  if (!data.note.trim() && photos.length === 0) {
    throw new Error("Write a note or add a photo.");
  }

  if (!(data.notedAt instanceof Date) && typeof data.notedAt !== "string") {
    throw new Error("Invalid note date.");
  }

  const date = new Date(data.notedAt);

  if (!Number.isFinite(date.getTime())) {
    throw new Error("Invalid note date.");
  }

  const database = await getLocalDatabase();

  const id = Crypto.randomUUID();
  const now = new Date().toISOString();
  const notedAt = date.toISOString();

  // Copier les photos dans le stockage durable de l'application
  // avant de référencer leurs fichiers dans SQLite.
  const preparedPhotos = await prepareLocalTrackingPhotos(photos);

  const payload = {
    id,
    note: data.note,
    notedAt,
  };

  const entry = {
    ...payload,
    childId,
    type: "note",
    startedAt: notedAt,
    source: "manual",
    photos: preparedPhotos,
    createdByUserId: userId,
    updatedByUserId: userId,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    version: null,
  };

  try {
    await database.withExclusiveTransactionAsync(async (transaction) => {
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
            ?, ?, ?, 'note', ?,
            NULL, 1, 'pending', NULL, ?, ?
          )
        `,
        [userId, id, childId, JSON.stringify(entry), notedAt, now],
      );

      // Créer le tracking avant d'envoyer ses photos.
      await enqueueSyncOperation({
        userId,
        entityType: "tracking_entry",
        entityId: id,
        operation: "create:1",
        endpoint: `/api/children/${encodeURIComponent(childId)}/notes`,
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
    // La transaction a échoué : les fichiers préparés
    // ne sont référencés par aucune nouvelle entrée.
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

export async function updateLocalNoteEntry({ userId, childId, entryId, data }) {
  if (!userId || !childId || !entryId) {
    throw new Error("Missing user ID, child ID or tracking entry ID.");
  }

  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data) ||
    typeof data.note !== "string" ||
    data.note.length > 10000
  ) {
    throw new Error("Invalid note text.");
  }

  const selectedPhotos = data.photos ?? [];

  if (!Array.isArray(selectedPhotos) || selectedPhotos.length > 5) {
    throw new Error("A note must not contain more than 5 photos.");
  }

  if (!data.note.trim() && selectedPhotos.length === 0) {
    throw new Error("Write a note or add a photo.");
  }

  if (!(data.notedAt instanceof Date) && typeof data.notedAt !== "string") {
    throw new Error("Invalid note date.");
  }

  const date = new Date(data.notedAt);

  if (!Number.isFinite(date.getTime())) {
    throw new Error("Invalid note date.");
  }

  const database = await getLocalDatabase();

  const initialRow = await database.getFirstAsync(
    `
      SELECT *
      FROM tracking_entries_local
      WHERE user_id = ?
        AND child_id = ?
        AND entry_id = ?
        AND entry_type = 'note'
        AND deleted_at IS NULL
    `,
    [userId, childId, entryId],
  );

  if (!initialRow) {
    throw new Error("Local note entry not found.");
  }

  const initialEntry = JSON.parse(initialRow.entry_json);

  const getPhotoId = (photo) => photo?.attachmentId ?? photo?.id;

  const existingPhotos = initialEntry.photos ?? [];
  const existingById = new Map(
    existingPhotos.map((photo) => [getPhotoId(photo), photo]),
  );

  const retainedIds = new Set();
  const newPhotos = [];

  for (const photo of selectedPhotos) {
    const id = getPhotoId(photo);

    if (id && existingById.has(id)) {
      if (retainedIds.has(id)) {
        throw new Error("Duplicate note photo.");
      }

      retainedIds.add(id);
    } else {
      // Un attachmentId désigne une pièce jointe déjà persistée.
      // Ne pas importer silencieusement une photo d'une autre entrée.
      if (photo?.attachmentId) {
        throw new Error("Unknown note photo.");
      }

      newPhotos.push(photo);
    }
  }

  const removedPhotos = existingPhotos.filter(
    (photo) => !retainedIds.has(getPhotoId(photo)),
  );

  // Préparer uniquement les nouvelles images.
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
            AND entry_type = 'note'
            AND deleted_at IS NULL
        `,
        [userId, childId, entryId],
      );

      if (!row) {
        throw new Error("Local note entry not found.");
      }

      // La préparation des images est asynchrone :
      // vérifier que la note n'a pas changé entre-temps.
      if (
        row.local_revision !== initialRow.local_revision ||
        row.server_version !== initialRow.server_version ||
        row.entry_json !== initialRow.entry_json
      ) {
        const error = new Error("This note changed. Reopen it before saving.");
        error.code = "NOTE_CHANGED_DURING_SAVE";
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

      if (pending) {
        const error = new Error(
          "Wait for this note to finish syncing before editing it again.",
        );
        error.code = "NOTE_SYNC_PENDING";
        throw error;
      }

      if (!Number.isSafeInteger(row.server_version) || row.server_version < 1) {
        throw new Error("Missing note server version.");
      }

      const localRevision = row.local_revision + 1;

      if (!Number.isSafeInteger(localRevision)) {
        throw new Error("Invalid note local revision.");
      }

      // Le serveur conserve l'ordre des photos restantes
      // et ajoute les nouvelles à la fin.
      const retainedPhotos = existingPhotos.filter((photo) =>
        retainedIds.has(getPhotoId(photo)),
      );

      const lastOrder = retainedPhotos.reduce(
        (maximum, photo, index) => Math.max(maximum, photo.sortOrder ?? index),
        -1,
      );

      const addedPhotos = preparedPhotos.map((photo, index) => ({
        ...photo,
        sortOrder: lastOrder + index + 1,
      }));

      const now = new Date().toISOString();
      const notedAt = date.toISOString();

      const entry = {
        ...JSON.parse(row.entry_json),
        note: data.note,
        notedAt,
        startedAt: notedAt,
        photos: [...retainedPhotos, ...addedPhotos],
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
          WHERE user_id = ?
            AND child_id = ?
            AND entry_id = ?
        `,
        [
          JSON.stringify(entry),
          localRevision,
          notedAt,
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
        endpoint:
          `/api/children/${encodeURIComponent(childId)}` +
          `/notes/${encodeURIComponent(entryId)}`,
        method: "PATCH",
        payload: {
          note: data.note,
          notedAt,
          version: row.server_version,
        },
        database: transaction,
      });

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
      };
    });
  } catch (error) {
    await cleanupPreparedPhotos(preparedPhotos);
    throw error;
  }

  return savedEntry;
}
