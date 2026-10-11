import * as Crypto from "expo-crypto";
import * as FileSystem from "expo-file-system/legacy";

import { getLocalDatabase } from "../localDatabase.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateRemoteMoment(moment, childId) {
  if (
    !moment ||
    typeof moment !== "object" ||
    !UUID_PATTERN.test(moment.id ?? "") ||
    moment.childId !== childId ||
    !["photo", "note", "milestone"].includes(moment.type) ||
    !["draft", "published"].includes(moment.status) ||
    !Number.isSafeInteger(moment.version) ||
    moment.version < 1 ||
    typeof moment.updatedAt !== "string" ||
    !Number.isFinite(Date.parse(moment.updatedAt))
  ) {
    throw new Error("Invalid remote moment.");
  }

  if (
    typeof moment.occurredOn !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(moment.occurredOn) ||
    moment.occurredOn.startsWith("0000-")
  ) {
    throw new Error("Invalid remote moment date.");
  }

  const date = new Date(`${moment.occurredOn}T00:00:00.000Z`);

  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== moment.occurredOn
  ) {
    throw new Error("Invalid remote moment date.");
  }

  if (
    moment.deletedAt != null &&
    (typeof moment.deletedAt !== "string" ||
      !Number.isFinite(Date.parse(moment.deletedAt)))
  ) {
    throw new Error("Invalid remote moment deletion.");
  }

  if (!Array.isArray(moment.photos) || moment.photos.length > 6) {
    throw new Error("Invalid remote moment photos.");
  }

  const ids = new Set();
  const orders = new Set();

  for (const photo of moment.photos) {
    if (
      !photo ||
      !UUID_PATTERN.test(photo.attachmentId ?? "") ||
      !Number.isInteger(photo.displayOrder) ||
      photo.displayOrder < 0 ||
      ids.has(photo.attachmentId) ||
      orders.has(photo.displayOrder) ||
      typeof photo.url !== "string" ||
      !photo.url.startsWith("https://")
    ) {
      throw new Error("Invalid remote moment photo.");
    }

    ids.add(photo.attachmentId);
    orders.add(photo.displayOrder);
  }

  if (
    !moment.deletedAt &&
    moment.status === "published" &&
    moment.type === "photo" &&
    moment.photos.length === 0
  ) {
    throw new Error("A published photo moment must contain a photo.");
  }

  if (moment.type === "note" && moment.photos.length > 0) {
    throw new Error("Note moments cannot contain photos.");
  }
}

function localPhotoUri(relativePath) {
  if (
    !FileSystem.documentDirectory ||
    !/^tracking-photos\/[0-9a-f-]+\.jpg$/i.test(relativePath ?? "")
  ) {
    return null;
  }

  return `${FileSystem.documentDirectory}${relativePath}`;
}

async function hasPendingOperations(database, userId, momentId) {
  const row = await database.getFirstAsync(
    `
      SELECT id
      FROM sync_queue
      WHERE user_id = ?
        AND entity_type = 'moment'
        AND entity_id = ?
      LIMIT 1
    `,
    [userId, momentId],
  );

  return Boolean(row);
}

async function readLocalRow(database, userId, momentId) {
  return database.getFirstAsync(
    `
      SELECT *
      FROM moments_local
      WHERE user_id = ?
        AND moment_id = ?
    `,
    [userId, momentId],
  );
}

function hasLocalChanges(row) {
  return Boolean(row && row.sync_status !== "synced");
}

async function cleanupDownloads(relativePaths) {
  for (const relativePath of relativePaths) {
    const uri = localPhotoUri(relativePath);

    if (!uri) {
      continue;
    }

    try {
      await FileSystem.deleteAsync(uri, {
        idempotent: true,
      });
    } catch (error) {
      console.warn("Unable to clean downloaded moment photo:", error);
    }
  }
}

async function prepareRemotePhotos({
  database,
  userId,
  childId,
  moment,
  downloadedPaths,
}) {
  if (moment.deletedAt) {
    return [];
  }

  if (!FileSystem.documentDirectory) {
    throw new Error("Local photo storage is unavailable.");
  }

  const folder = `${FileSystem.documentDirectory}tracking-photos/`;

  if (moment.photos.length > 0) {
    await FileSystem.makeDirectoryAsync(folder, {
      intermediates: true,
    });
  }

  const result = [];

  for (const photo of moment.photos) {
    const existing = await database.getFirstAsync(
      `
        SELECT *
        FROM moment_photos_local
        WHERE user_id = ?
          AND attachment_id = ?
      `,
      [userId, photo.attachmentId],
    );

    if (
      existing &&
      (existing.moment_id !== moment.id || existing.child_id !== childId)
    ) {
      throw new Error("Remote moment photo ownership mismatch.");
    }

    let relativePath = existing?.relative_path ?? null;
    let uri = localPhotoUri(relativePath);

    if (uri) {
      const info = await FileSystem.getInfoAsync(uri);

      if (!info.exists || info.isDirectory) {
        uri = null;
      }
    }

    if (!uri) {
      relativePath = `tracking-photos/${Crypto.randomUUID()}.jpg`;
      uri = localPhotoUri(relativePath);

      // Inclure aussi les téléchargements partiels dans le nettoyage.
      downloadedPaths.push(relativePath);

      const download = await FileSystem.downloadAsync(photo.url, uri);

      if (download.status !== 200) {
        throw new Error("Unable to download a moment photo.");
      }

      const info = await FileSystem.getInfoAsync(uri);

      if (
        !info.exists ||
        info.isDirectory ||
        (typeof info.size === "number" && info.size <= 0)
      ) {
        throw new Error("The downloaded moment photo is invalid.");
      }
    }

    result.push({
      ...photo,
      id: photo.attachmentId,
      relativePath,
      uri,
    });
  }

  return result;
}

export async function saveRemoteMoment({ userId, childId, moment }) {
  if (!userId || !childId) {
    throw new Error("Missing user ID or child ID.");
  }

  validateRemoteMoment(moment, childId);

  const database = await getLocalDatabase();

  const initialRow = await readLocalRow(database, userId, moment.id);

  if (initialRow && initialRow.child_id !== childId) {
    throw new Error("Remote moment ownership mismatch.");
  }

  if (
    hasLocalChanges(initialRow) ||
    (await hasPendingOperations(database, userId, moment.id))
  ) {
    return { status: "deferred", momentId: moment.id };
  }

  if (
    initialRow?.server_version != null &&
    initialRow.server_version > moment.version
  ) {
    return { status: "ignored", momentId: moment.id };
  }

  const downloadedPaths = [];
  let committed = false;

  let result = {
    status: "ignored",
    momentId: moment.id,
  };

  try {
    const photos = await prepareRemotePhotos({
      database,
      userId,
      childId,
      moment,
      downloadedPaths,
    });

    await database.withExclusiveTransactionAsync(async (transaction) => {
      const current = await readLocalRow(transaction, userId, moment.id);

      if (current && current.child_id !== childId) {
        throw new Error("Remote moment ownership mismatch.");
      }

      if (
        hasLocalChanges(current) ||
        (await hasPendingOperations(transaction, userId, moment.id))
      ) {
        result = {
          status: "deferred",
          momentId: moment.id,
        };

        return;
      }

      if (
        current?.server_version != null &&
        current.server_version > moment.version
      ) {
        return;
      }

      // Ne jamais ressusciter un souvenir supprimé avec une
      // réponse de même version qui aurait été lue plus tôt.
      if (
        current?.deleted_at &&
        !moment.deletedAt &&
        current.server_version >= moment.version
      ) {
        return;
      }

      const serverContentChanged =
        current && current.server_version !== moment.version;

      const revision = current
        ? current.local_revision + (serverContentChanged ? 1 : 0)
        : 1;

      if (!Number.isSafeInteger(revision) || revision < 1) {
        throw new Error("Invalid local moment revision.");
      }

      const storedMoment = {
        ...moment,
        photos,
      };

      await transaction.runAsync(
        `
          INSERT INTO moments_local (
            user_id,
            moment_id,
            child_id,
            moment_type,
            moment_json,
            occurred_on,
            publication_status,
            server_version,
            local_revision,
            sync_status,
            deleted_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?, ?)
          ON CONFLICT(user_id, moment_id) DO UPDATE SET
            moment_type = excluded.moment_type,
            moment_json = excluded.moment_json,
            occurred_on = excluded.occurred_on,
            publication_status = excluded.publication_status,
            server_version = excluded.server_version,
            local_revision = excluded.local_revision,
            sync_status = 'synced',
            deleted_at = excluded.deleted_at,
            updated_at = excluded.updated_at
        `,
        [
          userId,
          moment.id,
          childId,
          moment.type,
          JSON.stringify(storedMoment),
          moment.occurredOn,
          moment.status,
          moment.version,
          revision,
          moment.deletedAt ?? null,
          moment.updatedAt,
        ],
      );

      /*
       * Masquer d'abord les anciennes photos.
       * Les photos toujours présentes seront réactivées ci-dessous.
       *
       * Ne pas supprimer les fichiers physiques ici.
       */
      await transaction.runAsync(
        `
          UPDATE moment_photos_local
          SET
            deleted_at = COALESCE(deleted_at, ?),
            sync_status = 'synced',
            updated_at = ?
          WHERE user_id = ?
            AND moment_id = ?
        `,
        [
          moment.deletedAt ?? moment.updatedAt,
          moment.updatedAt,
          userId,
          moment.id,
        ],
      );

      for (const photo of photos) {
        const existing = await transaction.getFirstAsync(
          `
            SELECT moment_id, child_id
            FROM moment_photos_local
            WHERE user_id = ?
              AND attachment_id = ?
          `,
          [userId, photo.attachmentId],
        );

        if (
          existing &&
          (existing.moment_id !== moment.id || existing.child_id !== childId)
        ) {
          throw new Error("Remote moment photo ownership mismatch.");
        }

        await transaction.runAsync(
          `
            INSERT INTO moment_photos_local (
              user_id,
              attachment_id,
              moment_id,
              child_id,
              relative_path,
              photo_json,
              display_order,
              local_revision,
              sync_status,
              deleted_at,
              updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'synced', NULL, ?)
            ON CONFLICT(user_id, attachment_id) DO UPDATE SET
              relative_path = excluded.relative_path,
              photo_json = excluded.photo_json,
              display_order = excluded.display_order,
              local_revision = excluded.local_revision,
              sync_status = 'synced',
              deleted_at = NULL,
              updated_at = excluded.updated_at
          `,
          [
            userId,
            photo.attachmentId,
            moment.id,
            childId,
            photo.relativePath,
            JSON.stringify(photo),
            photo.displayOrder,
            revision,
            moment.updatedAt,
          ],
        );
      }

      result = {
        status: "saved",
        momentId: moment.id,
      };
    });

    committed = result.status === "saved";

    return result;
  } finally {
    if (!committed) {
      await cleanupDownloads(downloadedPaths);
    }
  }
}
