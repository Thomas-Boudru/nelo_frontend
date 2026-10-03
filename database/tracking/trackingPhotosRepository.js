import * as Crypto from "expo-crypto";
import * as FileSystem from "expo-file-system/legacy";

import { manipulateAsync, SaveFormat } from "expo-image-manipulator";

import { getLocalDatabase } from "../localDatabase.js";
import { enqueueSyncOperation } from "../../sync/syncQueueRepository.js";

function getPhotoUri(relativePath) {
  if (
    !FileSystem.documentDirectory ||
    typeof relativePath !== "string" ||
    !/^tracking-photos\/[0-9a-f-]+\.jpg$/i.test(relativePath)
  ) {
    throw new Error("Invalid local photo path.");
  }

  return `${FileSystem.documentDirectory}${relativePath}`;
}

export async function cleanupPreparedPhotos(photos) {
  for (const photo of photos) {
    try {
      await FileSystem.deleteAsync(getPhotoUri(photo.relativePath), {
        idempotent: true,
      });
    } catch (error) {
      console.warn("Unable to clean up a local photo:", error);
    }
  }
}

export async function prepareLocalTrackingPhotos(photos = []) {
  if (!Array.isArray(photos) || photos.length > 10) {
    throw new Error("A tracking entry must not contain more than 10 photos.");
  }

  if (!FileSystem.documentDirectory) {
    throw new Error("Local photo storage is unavailable.");
  }

  const prepared = [];

  try {
    await FileSystem.makeDirectoryAsync(
      `${FileSystem.documentDirectory}tracking-photos/`,
      { intermediates: true },
    );

    for (const [sortOrder, photo] of photos.entries()) {
      const sourceUri = typeof photo === "string" ? photo : photo?.uri;

      if (typeof sourceUri !== "string" || !sourceUri) {
        throw new Error("Invalid photo.");
      }

      const attachmentId = Crypto.randomUUID();
      const relativePath = `tracking-photos/${attachmentId}.jpg`;
      let temporaryUri = null;

      // Enregistrer le chemin avant la copie permet son nettoyage
      // même si la copie échoue partiellement.
      const localPhoto = {
        id: attachmentId,
        attachmentId,
        relativePath,
        uri: getPhotoUri(relativePath),
        mimeType: "image/jpeg",
        sortOrder,
        syncStatus: "pending",
      };

      prepared.push(localPhoto);

      try {
        const image = await manipulateAsync(sourceUri, [], {
          compress: 0.8,
          format: SaveFormat.JPEG,
        });

        temporaryUri = image.uri;

        await FileSystem.copyAsync({
          from: image.uri,
          to: localPhoto.uri,
        });

        const file = await FileSystem.getInfoAsync(localPhoto.uri);

        if (
          !file.exists ||
          !Number.isFinite(file.size) ||
          file.size <= 0 ||
          file.size > 10 * 1024 * 1024
        ) {
          throw new Error("The image must not exceed 10 MB.");
        }

        localPhoto.width = image.width;
        localPhoto.height = image.height;
        localPhoto.sizeBytes = file.size;
      } finally {
        if (temporaryUri && temporaryUri !== sourceUri) {
          await FileSystem.deleteAsync(temporaryUri, {
            idempotent: true,
          }).catch(() => {});
        }
      }
    }

    return prepared;
  } catch (error) {
    await cleanupPreparedPhotos(prepared);
    throw error;
  }
}

export async function enqueueTrackingPhotos({
  transaction,
  userId,
  childId,
  entryId,
  photos,
}) {
  const now = new Date().toISOString();

  for (const photo of photos) {
    await transaction.runAsync(
      `
        INSERT INTO tracking_photos_local (
          user_id,
          attachment_id,
          entry_id,
          child_id,
          relative_path,
          photo_json,
          sync_status,
          sort_order,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)
      `,
      [
        userId,
        photo.attachmentId,
        entryId,
        childId,
        photo.relativePath,
        JSON.stringify(photo),
        photo.sortOrder,
        now,
      ],
    );

    await enqueueSyncOperation({
      userId,
      entityType: "tracking_photo",

      // Toutes les photos d'un repas sont envoyées dans l'ordre.
      entityId: entryId,

      operation: `upload:${photo.attachmentId}`,

      endpoint:
        `/api/children/${encodeURIComponent(childId)}` +
        `/tracking/${encodeURIComponent(entryId)}` +
        `/photos/${photo.attachmentId}`,

      method: "PUT",

      payload: {
        entryId,
        childId,
        attachmentId: photo.attachmentId,
      },

      database: transaction,
    });
  }
}

export async function prepareTrackingPhotoPayload({ operation, payload }) {
  if (
    !payload ||
    payload.entryId !== operation.entity_id ||
    typeof payload.attachmentId !== "string"
  ) {
    throw new Error("Invalid photo synchronization payload.");
  }

  const database = await getLocalDatabase();

  const entry = await database.getFirstAsync(
    `
      SELECT server_version, child_id, deleted_at
      FROM tracking_entries_local
      WHERE user_id = ? AND entry_id = ?
    `,
    [operation.user_id, payload.entryId],
  );

  if (!entry || !Number.isInteger(entry.server_version)) {
    const error = new Error("Waiting for the meal to be synchronized.");

    error.code = "SYNC_DEPENDENCY_PENDING";
    error.status = 0;

    throw error;
  }

  if (entry.deleted_at || entry.child_id !== payload.childId) {
    throw new Error("Photo tracking entry mismatch.");
  }

  const photo = await database.getFirstAsync(
    `
      SELECT *
      FROM tracking_photos_local
      WHERE user_id = ?
        AND attachment_id = ?
        AND entry_id = ?
        AND child_id = ?
    `,
    [operation.user_id, payload.attachmentId, payload.entryId, payload.childId],
  );

  if (!photo) {
    throw new Error("Local tracking photo not found.");
  }

  const uri = getPhotoUri(photo.relative_path);
  const file = await FileSystem.getInfoAsync(uri);

  if (!file.exists) {
    throw new Error("The local photo file is missing.");
  }

  const formData = new FormData();

  formData.append("photo", {
    uri,
    name: `${payload.attachmentId}.jpg`,
    type: "image/jpeg",
  });

  return formData;
}

export async function completeTrackingPhotoSync({ operation, response }) {
  const payload = JSON.parse(operation.payload_json);

  if (
    !response?.photo ||
    response.photo.attachmentId !== payload.attachmentId ||
    !Number.isInteger(response.entryVersion) ||
    response.entryVersion < 1
  ) {
    throw new Error("Invalid photo synchronization response.");
  }

  const database = await getLocalDatabase();

  await database.withExclusiveTransactionAsync(async (transaction) => {
    const row = await transaction.getFirstAsync(
      `
        SELECT *
        FROM tracking_photos_local
        WHERE user_id = ?
          AND attachment_id = ?
          AND entry_id = ?
      `,
      [operation.user_id, payload.attachmentId, operation.entity_id],
    );

    const entryRow = await transaction.getFirstAsync(
      `
        SELECT *
        FROM tracking_entries_local
        WHERE user_id = ? AND entry_id = ?
      `,
      [operation.user_id, operation.entity_id],
    );

    if (!row || !entryRow || row.child_id !== entryRow.child_id) {
      throw new Error("Photo synchronization mismatch.");
    }

    const photo = {
      ...JSON.parse(row.photo_json),
      ...response.photo,
      relativePath: row.relative_path,
      uri: getPhotoUri(row.relative_path),
      syncStatus: "synced",
    };

    await transaction.runAsync(
      `
        UPDATE tracking_photos_local
        SET photo_json = ?, sync_status = 'synced', updated_at = ?
        WHERE user_id = ? AND attachment_id = ?
      `,
      [
        JSON.stringify(photo),
        new Date().toISOString(),
        operation.user_id,
        payload.attachmentId,
      ],
    );

    const photoRows = await transaction.getAllAsync(
      `
        SELECT photo_json, relative_path, sync_status
        FROM tracking_photos_local
        WHERE user_id = ? AND entry_id = ?
        ORDER BY sort_order ASC
      `,
      [operation.user_id, operation.entity_id],
    );

    const photos = photoRows.map((item) => ({
      ...JSON.parse(item.photo_json),
      uri: getPhotoUri(item.relative_path),
      syncStatus: item.sync_status,
    }));

    const version = Math.max(
      entryRow.server_version ?? 0,
      response.entryVersion,
    );

    const localEntry = JSON.parse(entryRow.entry_json);

    await transaction.runAsync(
      `
        UPDATE tracking_entries_local
        SET entry_json = ?, server_version = ?
        WHERE user_id = ? AND entry_id = ?
      `,
      [
        JSON.stringify({
          ...localEntry,
          photos,
          version,
        }),
        version,
        operation.user_id,
        operation.entity_id,
      ],
    );

    await transaction.runAsync(
      "DELETE FROM sync_queue WHERE id = ? AND user_id = ?",
      [operation.id, operation.user_id],
    );
  });
}
