import * as Crypto from "expo-crypto";
import * as FileSystem from "expo-file-system/legacy";

import { getLocalDatabase } from "../localDatabase.js";
import { cleanupPreparedPhotos } from "./trackingPhotosRepository.js";

const TYPES = new Set([
  "bottle",
  "breastfeeding",
  "pumping",
  "solids",
  "sleep",
  "diaper",
  "potty",
  "mood",
  "medication",
  "vaccine",
  "temperature",
  "symptoms",
  "teething",
  "growth",
  "note",
]);

function photoUri(relativePath) {
  if (
    !FileSystem.documentDirectory ||
    typeof relativePath !== "string" ||
    !/^tracking-photos\/[0-9a-f-]+\.jpg$/i.test(relativePath)
  ) {
    throw new Error("Invalid local photo path.");
  }

  return `${FileSystem.documentDirectory}${relativePath}`;
}

function isDate(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function validateEntry(entry, childId) {
  if (
    !entry ||
    typeof entry.id !== "string" ||
    !entry.id ||
    entry.childId !== childId ||
    !TYPES.has(entry.type) ||
    !Number.isSafeInteger(entry.version) ||
    entry.version < 1 ||
    !isDate(entry.startedAt) ||
    !isDate(entry.updatedAt) ||
    (entry.deletedAt != null && !isDate(entry.deletedAt)) ||
    !Array.isArray(entry.photos) ||
    entry.photos.length > 10
  ) {
    throw new Error("Invalid server tracking entry.");
  }

  const ids = new Set();

  for (const photo of entry.photos) {
    if (
      typeof photo.attachmentId !== "string" ||
      !photo.attachmentId ||
      ids.has(photo.attachmentId) ||
      !Number.isInteger(photo.sortOrder) ||
      photo.sortOrder < 0 ||
      typeof photo.url !== "string" ||
      !photo.url.startsWith("https://")
    ) {
      throw new Error("Invalid server tracking photo.");
    }

    ids.add(photo.attachmentId);
  }
}

async function inspectLocal(database, { userId, childId, entry }) {
  const row = await database.getFirstAsync(
    `
      SELECT *
      FROM tracking_entries_local
      WHERE user_id = ? AND entry_id = ?
    `,
    [userId, entry.id],
  );

  if (row && (row.child_id !== childId || row.entry_type !== entry.type)) {
    throw new Error("Tracking entry mismatch.");
  }

  // Vérifier également les photos : l'entrée peut déjà être
  // marquée synced alors que ses uploads sont encore en attente.
  const queued = await database.getFirstAsync(
    `
      SELECT id
      FROM sync_queue
      WHERE user_id = ?
        AND entity_id = ?
        AND entity_type IN ('tracking_entry', 'tracking_photo')
      LIMIT 1
    `,
    [userId, entry.id],
  );

  const pendingPhoto = await database.getFirstAsync(
    `
      SELECT attachment_id
      FROM tracking_photos_local
      WHERE user_id = ?
        AND entry_id = ?
        AND sync_status <> 'synced'
      LIMIT 1
    `,
    [userId, entry.id],
  );

  if (queued || pendingPhoto || (row && row.sync_status !== "synced")) {
    return { row, status: "deferred" };
  }

  if (row?.server_version > entry.version) {
    return { row, status: "ignored" };
  }

  return { row, status: "ready" };
}

export async function saveRemoteTrackingEntry({ userId, childId, entry }) {
  if (!userId || !childId) {
    throw new Error("Missing user ID or child ID.");
  }

  validateEntry(entry, childId);

  const database = await getLocalDatabase();
  const identifiers = { userId, childId, entry };

  const initial = await inspectLocal(database, identifiers);

  if (initial.status !== "ready") {
    return initial.status;
  }

  const downloaded = [];
  const photos = [];

  let committed = false;

  try {
    if (!entry.deletedAt && entry.photos.length > 0) {
      if (!FileSystem.documentDirectory) {
        throw new Error("Local photo storage is unavailable.");
      }

      await FileSystem.makeDirectoryAsync(
        `${FileSystem.documentDirectory}tracking-photos/`,
        { intermediates: true },
      );

      for (const serverPhoto of entry.photos) {
        const existing = await database.getFirstAsync(
          `
            SELECT *
            FROM tracking_photos_local
            WHERE user_id = ? AND attachment_id = ?
          `,
          [userId, serverPhoto.attachmentId],
        );

        if (
          existing &&
          (existing.child_id !== childId || existing.entry_id !== entry.id)
        ) {
          throw new Error("Tracking photo mismatch.");
        }

        let relativePath = existing?.relative_path ?? null;
        let fileExists = false;

        if (relativePath) {
          const file = await FileSystem.getInfoAsync(photoUri(relativePath));
          fileExists = file.exists && file.size > 0;
        }

        if (!fileExists) {
          // Un chemin propre à cette tentative permet un nettoyage sûr.
          relativePath = `tracking-photos/${Crypto.randomUUID()}.jpg`;

          downloaded.push({ relativePath });

          const result = await FileSystem.downloadAsync(
            serverPhoto.url,
            photoUri(relativePath),
          );

          if (result.status !== 200) {
            throw new Error("Unable to download tracking photo.");
          }

          const file = await FileSystem.getInfoAsync(photoUri(relativePath));

          if (
            !file.exists ||
            !Number.isFinite(file.size) ||
            file.size <= 0 ||
            file.size > 10 * 1024 * 1024
          ) {
            throw new Error("Invalid downloaded tracking photo.");
          }
        }

        photos.push({
          ...serverPhoto,
          id: serverPhoto.attachmentId,
          relativePath,
          uri: photoUri(relativePath),
          syncStatus: "synced",
        });
      }
    }

    photos.sort(
      (a, b) =>
        a.sortOrder - b.sortOrder ||
        a.attachmentId.localeCompare(b.attachmentId),
    );

    let outcome = "saved";

    await database.withExclusiveTransactionAsync(async (transaction) => {
      // Un changement local a pu survenir pendant le téléchargement.
      const latest = await inspectLocal(transaction, identifiers);

      if (latest.status !== "ready") {
        outcome = latest.status;
        return;
      }

      const previous = latest.row;

      // Évite qu'une deuxième récupération concurrente remplace
      // un état enregistré après notre lecture initiale.
      if (
        Boolean(previous) !== Boolean(initial.row) ||
        previous?.local_revision !== initial.row?.local_revision ||
        previous?.server_version !== initial.row?.server_version ||
        previous?.entry_json !== initial.row?.entry_json
      ) {
        outcome = "deferred";
        return;
      }

      const revision = previous
        ? previous.local_revision +
          (entry.version > previous.server_version ? 1 : 0)
        : 1;

      if (!Number.isSafeInteger(revision) || revision < 1) {
        throw new Error("Invalid local tracking revision.");
      }

      const savedEntry = {
        ...entry,
        startedAt: new Date(entry.startedAt).toISOString(),
        deletedAt: entry.deletedAt ?? null,
        photos,
      };

      await transaction.runAsync(
        `
          INSERT INTO tracking_entries_local (
            user_id, entry_id, child_id, entry_type, entry_json,
            server_version, local_revision, sync_status,
            deleted_at, started_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, 'synced', ?, ?, ?)
          ON CONFLICT(user_id, entry_id)
          DO UPDATE SET
            entry_json = excluded.entry_json,
            server_version = excluded.server_version,
            local_revision = excluded.local_revision,
            sync_status = 'synced',
            deleted_at = excluded.deleted_at,
            started_at = excluded.started_at,
            updated_at = excluded.updated_at
        `,
        [
          userId,
          entry.id,
          childId,
          entry.type,
          JSON.stringify(savedEntry),
          entry.version,
          revision,
          savedEntry.deletedAt,
          savedEntry.startedAt,
          entry.updatedAt,
        ],
      );

      // Aucun upload local en attente à ce stade.
      // La liste serveur représente toutes les photos actives.
      await transaction.runAsync(
        `
          DELETE FROM tracking_photos_local
          WHERE user_id = ? AND entry_id = ? AND child_id = ?
        `,
        [userId, entry.id, childId],
      );

      for (const photo of photos) {
        // Contrôle d'identité également dans la transaction.
        const collision = await transaction.getFirstAsync(
          `
            SELECT entry_id
            FROM tracking_photos_local
            WHERE user_id = ? AND attachment_id = ?
          `,
          [userId, photo.attachmentId],
        );

        if (collision) {
          throw new Error("Tracking photo ID conflict.");
        }

        await transaction.runAsync(
          `
            INSERT INTO tracking_photos_local (
              user_id, attachment_id, entry_id, child_id,
              relative_path, photo_json, sync_status,
              sort_order, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, 'synced', ?, ?)
          `,
          [
            userId,
            photo.attachmentId,
            entry.id,
            childId,
            photo.relativePath,
            JSON.stringify(photo),
            photo.sortOrder,
            entry.updatedAt,
          ],
        );
      }
    });

    committed = outcome === "saved";
    return outcome;
  } finally {
    if (!committed) {
      await cleanupPreparedPhotos(downloaded);
    }
  }
}
