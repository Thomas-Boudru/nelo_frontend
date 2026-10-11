import * as Crypto from "expo-crypto";
import * as FileSystem from "expo-file-system/legacy";

import { getLocalDatabase } from "../localDatabase.js";
import { enqueueSyncOperation } from "../../sync/syncQueueRepository.js";

import {
  prepareLocalTrackingPhotos,
  cleanupPreparedPhotos,
} from "../tracking/trackingPhotosRepository.js";

const MOMENT_TYPES = new Set(["photo", "note", "milestone"]);

function dependencyPending(message) {
  const error = new Error(message);
  error.code = "SYNC_DEPENDENCY_PENDING";
  return error;
}

function localConflict() {
  const error = new Error(
    "This moment changed on this device. Reload it before trying again.",
  );

  error.code = "LOCAL_MOMENT_CHANGED";
  return error;
}

function requireIdentifiers(
  { userId, childId, momentId },
  requireMoment = true,
) {
  if (!userId || !childId || (requireMoment && !momentId)) {
    throw new Error("Missing moment identifiers.");
  }
}

function getEndpoint(childId, momentId = null) {
  const base = `/api/children/${encodeURIComponent(childId)}/moments`;

  return momentId ? `${base}/${encodeURIComponent(momentId)}` : base;
}

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

function validateDate(value) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    value.startsWith("0000-")
  ) {
    throw new Error("Invalid moment date.");
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new Error("Invalid moment date.");
  }

  return value;
}

function validateVersion(version) {
  if (!Number.isSafeInteger(version) || version < 1) {
    throw new Error("Invalid moment version.");
  }

  return version;
}

function nextRevision(row) {
  const revision = row.local_revision + 1;

  if (!Number.isSafeInteger(revision) || revision < 2) {
    throw new Error("Invalid local moment revision.");
  }

  return revision;
}

function validateData(data) {
  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data) ||
    !MOMENT_TYPES.has(data.type)
  ) {
    throw new Error("Invalid moment.");
  }

  if (
    data.title != null &&
    (typeof data.title !== "string" || data.title.length > 150)
  ) {
    throw new Error("The title must not exceed 150 characters.");
  }

  if (
    data.story != null &&
    (typeof data.story !== "string" || data.story.length > 600)
  ) {
    throw new Error("The story must not exceed 600 characters.");
  }

  const photos = data.photos ?? [];

  if (!Array.isArray(photos) || photos.length > 6) {
    throw new Error("A moment must not contain more than 6 photos.");
  }

  for (const photo of photos) {
    if (!photo || typeof photo !== "object" || Array.isArray(photo)) {
      throw new Error("Invalid moment photo.");
    }
  }

  if (data.type === "photo" && photos.length === 0) {
    throw new Error("Please add at least one photo.");
  }

  if (data.type === "note") {
    if (!data.story?.trim()) {
      throw new Error("Please write something about this moment.");
    }

    if (photos.length > 0) {
      throw new Error("Note moments cannot contain photos.");
    }
  }

  let milestone = null;

  if (data.type === "milestone") {
    const selection = data.milestone;

    if (
      !selection ||
      typeof selection !== "object" ||
      Array.isArray(selection)
    ) {
      throw new Error("Please select a milestone.");
    }

    const catalogCode = selection.catalogCode ?? null;
    const customMilestoneId = selection.customMilestoneId ?? null;

    if ((catalogCode !== null) === (customMilestoneId !== null)) {
      throw new Error("Select one catalog or custom milestone.");
    }

    if (
      catalogCode !== null &&
      (typeof catalogCode !== "string" || !catalogCode.trim())
    ) {
      throw new Error("Invalid milestone code.");
    }

    if (
      customMilestoneId !== null &&
      (typeof customMilestoneId !== "string" || !customMilestoneId)
    ) {
      throw new Error("Invalid custom milestone ID.");
    }

    milestone = {
      catalogCode,
      customMilestoneId,
    };
  } else if (data.milestone != null) {
    throw new Error("Only milestone moments can reference a milestone.");
  }

  const timezoneAtEvent = data.timezoneAtEvent ?? null;

  if (timezoneAtEvent !== null) {
    if (
      typeof timezoneAtEvent !== "string" ||
      !timezoneAtEvent ||
      timezoneAtEvent.length > 64
    ) {
      throw new Error("Invalid moment timezone.");
    }

    try {
      new Intl.DateTimeFormat("en", {
        timeZone: timezoneAtEvent,
      }).format();
    } catch {
      throw new Error("Invalid moment timezone.");
    }
  }

  return {
    type: data.type,
    title: data.title?.trim() || null,
    story: data.story ?? null,
    occurredOn: validateDate(data.occurredOn),
    timezoneAtEvent,
    milestone,
    photos,
  };
}

function contentPayload(normalized) {
  return {
    type: normalized.type,
    title: normalized.title,
    story: normalized.story,
    occurredOn: normalized.occurredOn,
    timezoneAtEvent: normalized.timezoneAtEvent,
    milestone: normalized.milestone,
  };
}

function mapPhoto(row) {
  const photo = JSON.parse(row.photo_json);

  return {
    ...photo,
    id: row.attachment_id,
    attachmentId: row.attachment_id,
    uri: row.relative_path
      ? getPhotoUri(row.relative_path)
      : (photo.url ?? photo.uri),
    relativePath: row.relative_path,
    displayOrder: row.display_order,
    syncStatus: row.sync_status,
  };
}

async function readPhotos(database, { userId, momentId }) {
  const rows = await database.getAllAsync(
    `
      SELECT *
      FROM moment_photos_local
      WHERE user_id = ?
        AND moment_id = ?
        AND deleted_at IS NULL
      ORDER BY display_order ASC, attachment_id ASC
    `,
    [userId, momentId],
  );

  return rows.map(mapPhoto);
}

async function readMomentRow(database, { userId, childId, momentId }) {
  const row = await database.getFirstAsync(
    `
      SELECT *
      FROM moments_local
      WHERE user_id = ?
        AND child_id = ?
        AND moment_id = ?
    `,
    [userId, childId, momentId],
  );

  if (!row) {
    throw new Error("Local moment not found.");
  }

  return row;
}

async function mapMomentRow(database, row) {
  return {
    ...JSON.parse(row.moment_json),
    id: row.moment_id,
    childId: row.child_id,
    photos: await readPhotos(database, {
      userId: row.user_id,
      momentId: row.moment_id,
    }),
    serverVersion: row.server_version,
    localRevision: row.local_revision,
    syncStatus: row.sync_status,
    status: row.publication_status,
    deletedAt: row.deleted_at,
  };
}

async function resolveLocalMilestone(
  database,
  { userId, childId, selection, nameSnapshot, current = null },
) {
  if (!selection) {
    return null;
  }

  // Conserver le nom historique si l'étape n'a pas changé,
  // même lorsqu'une étape personnalisée a été archivée.
  if (
    current &&
    current.catalogCode === selection.catalogCode &&
    current.customMilestoneId === selection.customMilestoneId
  ) {
    return {
      ...selection,
      nameSnapshot: current.nameSnapshot ?? nameSnapshot ?? null,
    };
  }

  if (selection.customMilestoneId) {
    const row = await database.getFirstAsync(
      `
        SELECT milestone_json, archived_at
        FROM child_custom_milestones_local
        WHERE user_id = ?
          AND child_id = ?
          AND milestone_id = ?
      `,
      [userId, childId, selection.customMilestoneId],
    );

    if (!row || row.archived_at) {
      throw new Error("This custom milestone is unavailable for this child.");
    }

    return {
      ...selection,
      nameSnapshot: JSON.parse(row.milestone_json).name,
    };
  }

  return {
    ...selection,
    nameSnapshot: nameSnapshot ?? null,
  };
}

async function insertPhoto(
  database,
  { userId, childId, momentId, photo, revision, now },
) {
  await database.runAsync(
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
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', NULL, ?)
    `,
    [
      userId,
      photo.attachmentId,
      momentId,
      childId,
      photo.relativePath,
      JSON.stringify(photo),
      photo.displayOrder,
      revision,
      now,
    ],
  );
}

async function queuePhotoOperation(
  database,
  { userId, childId, momentId, attachmentId, remove = false },
) {
  const endpoint = getEndpoint(childId, momentId);

  await enqueueSyncOperation({
    userId,
    entityType: "moment",
    entityId: momentId,
    operation: `${remove ? "delete-photo" : "upload"}:${attachmentId}`,
    endpoint: `${endpoint}/photos/${encodeURIComponent(attachmentId)}`,
    method: remove ? "DELETE" : "PUT",
    payload: {
      childId,
      momentId,
      attachmentId,
    },
    database,
  });
}

async function cleanupAfterFailure(photos) {
  try {
    await cleanupPreparedPhotos(photos);
  } catch (error) {
    console.warn("Unable to clean prepared moment photos:", error);
  }
}

export async function getLocalMoment({ userId, childId, momentId }) {
  requireIdentifiers({ userId, childId, momentId });

  const database = await getLocalDatabase();

  const row = await database.getFirstAsync(
    `
      SELECT *
      FROM moments_local
      WHERE user_id = ?
        AND child_id = ?
        AND moment_id = ?
        AND deleted_at IS NULL
    `,
    [userId, childId, momentId],
  );

  return row ? mapMomentRow(database, row) : null;
}

export async function getLocalMoments({ userId, childId }) {
  requireIdentifiers({ userId, childId }, false);

  const database = await getLocalDatabase();

  const rows = await database.getAllAsync(
    `
      SELECT *
      FROM moments_local
      WHERE user_id = ?
        AND child_id = ?
        AND deleted_at IS NULL
      ORDER BY occurred_on DESC, updated_at DESC, moment_id DESC
    `,
    [userId, childId],
  );

  return Promise.all(rows.map((row) => mapMomentRow(database, row)));
}

export async function createLocalMoment({ userId, childId, data }) {
  requireIdentifiers({ userId, childId }, false);

  const normalized = validateData(data);
  const database = await getLocalDatabase();

  const id = Crypto.randomUUID();
  const now = new Date().toISOString();

  const preparedPhotos = await prepareLocalTrackingPhotos(normalized.photos);

  const photos = preparedPhotos.map((photo, index) => ({
    ...photo,
    displayOrder: index,
  }));

  const payload = {
    id,
    ...contentPayload(normalized),
  };

  let savedMoment;

  try {
    await database.withExclusiveTransactionAsync(async (transaction) => {
      const milestone = await resolveLocalMilestone(transaction, {
        userId,
        childId,
        selection: normalized.milestone,
        nameSnapshot: data.milestone?.nameSnapshot,
      });

      const moment = {
        ...payload,
        childId,
        milestone,
        photos,
        status: "draft",
        createdByUserId: userId,
        updatedByUserId: userId,
        deletedByUserId: null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        version: null,
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
          VALUES (
            ?, ?, ?, ?, ?, ?,
            'draft', NULL, 1, 'pending', NULL, ?
          )
        `,
        [
          userId,
          id,
          childId,
          normalized.type,
          JSON.stringify(moment),
          normalized.occurredOn,
          now,
        ],
      );

      await enqueueSyncOperation({
        userId,
        entityType: "moment",
        entityId: id,
        operation: "create:1",
        endpoint: getEndpoint(childId),
        method: "POST",
        payload,
        database: transaction,
      });

      for (const photo of photos) {
        await insertPhoto(transaction, {
          userId,
          childId,
          momentId: id,
          photo,
          revision: 1,
          now,
        });

        await queuePhotoOperation(transaction, {
          userId,
          childId,
          momentId: id,
          attachmentId: photo.attachmentId,
        });
      }

      await enqueueSyncOperation({
        userId,
        entityType: "moment",
        entityId: id,
        operation: "publish:1",
        endpoint: `${getEndpoint(childId, id)}/publish`,
        method: "POST",
        payload: {},
        database: transaction,
      });

      savedMoment = await mapMomentRow(
        transaction,
        await readMomentRow(transaction, {
          userId,
          childId,
          momentId: id,
        }),
      );
    });
  } catch (error) {
    await cleanupAfterFailure(preparedPhotos);
    throw error;
  }

  return savedMoment;
}

export async function updateLocalMoment({
  userId,
  childId,
  momentId,
  data,
  expectedLocalRevision,
}) {
  requireIdentifiers({ userId, childId, momentId });

  const normalized = validateData(data);
  const database = await getLocalDatabase();

  const initialRow = await readMomentRow(database, {
    userId,
    childId,
    momentId,
  });

  if (initialRow.deleted_at) {
    throw new Error("This moment has been deleted.");
  }

  if (initialRow.moment_type !== normalized.type) {
    throw new Error("The moment type cannot be changed.");
  }

  if (
    expectedLocalRevision !== undefined &&
    initialRow.local_revision !== expectedLocalRevision
  ) {
    throw localConflict();
  }

  const existingPhotos = await readPhotos(database, {
    userId,
    momentId,
  });

  const existingById = new Map(
    existingPhotos.map((photo) => [photo.attachmentId, photo]),
  );

  const keptIds = new Set();
  const newPhotos = [];

  for (const photo of normalized.photos) {
    const candidateId = photo.attachmentId ?? photo.id;

    if (candidateId && existingById.has(candidateId)) {
      if (keptIds.has(candidateId)) {
        throw new Error("The same photo cannot be selected twice.");
      }

      keptIds.add(candidateId);
      continue;
    }

    // Une photo déjà persistée doit appartenir à ce souvenir.
    if (photo.attachmentId) {
      throw new Error("This photo is unavailable for this moment.");
    }

    if (typeof photo.uri !== "string" || !photo.uri) {
      throw new Error("Invalid moment photo.");
    }

    newPhotos.push(photo);
  }

  // Le backend ajoute les nouvelles photos en fin de liste.
  // Les photos conservées gardent leur ordre relatif.
  const keptPhotos = existingPhotos.filter((photo) =>
    keptIds.has(photo.attachmentId),
  );

  const removedPhotos = existingPhotos.filter(
    (photo) => !keptIds.has(photo.attachmentId),
  );

  const preparedPhotos = await prepareLocalTrackingPhotos(newPhotos);

  let savedMoment;

  try {
    await database.withExclusiveTransactionAsync(async (transaction) => {
      const row = await readMomentRow(transaction, {
        userId,
        childId,
        momentId,
      });

      // La préparation des images est asynchrone.
      // Refuser d'écraser une autre sauvegarde intervenue entre-temps.
      if (row.deleted_at || row.local_revision !== initialRow.local_revision) {
        throw localConflict();
      }

      const current = JSON.parse(row.moment_json);
      const revision = nextRevision(row);
      const now = new Date().toISOString();

      const milestone = await resolveLocalMilestone(transaction, {
        userId,
        childId,
        selection: normalized.milestone,
        nameSnapshot: data.milestone?.nameSnapshot,
        current: current.milestone,
      });

      const addedPhotos = preparedPhotos.map((photo, index) => ({
        ...photo,
        displayOrder: keptPhotos.length + index,
      }));

      for (const photo of removedPhotos) {
        // Conserver le fichier : un upload antérieur peut encore
        // être dans la queue ou en cours sur le réseau.
        await transaction.runAsync(
          `
            UPDATE moment_photos_local
            SET
              deleted_at = ?,
              local_revision = ?,
              sync_status = 'pending',
              updated_at = ?
            WHERE user_id = ?
              AND child_id = ?
              AND moment_id = ?
              AND attachment_id = ?
          `,
          [now, revision, now, userId, childId, momentId, photo.attachmentId],
        );
      }

      for (let index = 0; index < keptPhotos.length; index += 1) {
        await transaction.runAsync(
          `
            UPDATE moment_photos_local
            SET display_order = ?
            WHERE user_id = ?
              AND moment_id = ?
              AND attachment_id = ?
          `,
          [index, userId, momentId, keptPhotos[index].attachmentId],
        );
      }

      for (const photo of addedPhotos) {
        await insertPhoto(transaction, {
          userId,
          childId,
          momentId,
          photo,
          revision,
          now,
        });
      }

      /*
       * Si toutes les anciennes photos sont remplacées :
       * - garder temporairement une ancienne photo côté serveur ;
       * - supprimer les autres pour libérer de la place ;
       * - envoyer la première nouvelle photo ;
       * - supprimer la dernière ancienne ;
       * - envoyer les autres nouvelles.
       *
       * Cela respecte la limite de six et l'interdiction de
       * supprimer la dernière photo d'un souvenir publié.
       */
      const anchor =
        normalized.type === "photo" &&
        keptPhotos.length === 0 &&
        removedPhotos.length > 0 &&
        addedPhotos.length > 0
          ? removedPhotos[0]
          : null;

      for (const photo of removedPhotos) {
        if (photo.attachmentId === anchor?.attachmentId) {
          continue;
        }

        await queuePhotoOperation(transaction, {
          userId,
          childId,
          momentId,
          attachmentId: photo.attachmentId,
          remove: true,
        });
      }

      let firstRemainingUpload = 0;

      if (anchor) {
        await queuePhotoOperation(transaction, {
          userId,
          childId,
          momentId,
          attachmentId: addedPhotos[0].attachmentId,
        });

        await queuePhotoOperation(transaction, {
          userId,
          childId,
          momentId,
          attachmentId: anchor.attachmentId,
          remove: true,
        });

        firstRemainingUpload = 1;
      }

      for (
        let index = firstRemainingUpload;
        index < addedPhotos.length;
        index += 1
      ) {
        await queuePhotoOperation(transaction, {
          userId,
          childId,
          momentId,
          attachmentId: addedPhotos[index].attachmentId,
        });
      }

      // La version serveur sera fixée après les opérations de photos.
      await enqueueSyncOperation({
        userId,
        entityType: "moment",
        entityId: momentId,
        operation: `update:${revision}`,
        endpoint: getEndpoint(childId, momentId),
        method: "PATCH",
        payload: contentPayload(normalized),
        database: transaction,
      });

      const photos = await readPhotos(transaction, {
        userId,
        momentId,
      });

      const moment = {
        ...current,
        ...contentPayload(normalized),
        milestone,
        photos,
        updatedByUserId: userId,
        updatedAt: now,
      };

      await transaction.runAsync(
        `
          UPDATE moments_local
          SET
            moment_json = ?,
            occurred_on = ?,
            local_revision = ?,
            sync_status = 'pending',
            updated_at = ?
          WHERE user_id = ?
            AND child_id = ?
            AND moment_id = ?
        `,
        [
          JSON.stringify(moment),
          normalized.occurredOn,
          revision,
          now,
          userId,
          childId,
          momentId,
        ],
      );

      savedMoment = await mapMomentRow(
        transaction,
        await readMomentRow(transaction, {
          userId,
          childId,
          momentId,
        }),
      );
    });
  } catch (error) {
    await cleanupAfterFailure(preparedPhotos);
    throw error;
  }

  return savedMoment;
}

export async function deleteLocalMoment({
  userId,
  childId,
  momentId,
  expectedLocalRevision,
}) {
  requireIdentifiers({ userId, childId, momentId });

  const database = await getLocalDatabase();

  let savedMoment;

  await database.withExclusiveTransactionAsync(async (transaction) => {
    const row = await readMomentRow(transaction, {
      userId,
      childId,
      momentId,
    });

    if (row.deleted_at) {
      savedMoment = await mapMomentRow(transaction, row);
      return;
    }

    if (
      expectedLocalRevision !== undefined &&
      row.local_revision !== expectedLocalRevision
    ) {
      throw localConflict();
    }

    const now = new Date().toISOString();
    const revision = nextRevision(row);

    const moment = {
      ...JSON.parse(row.moment_json),
      deletedAt: now,
      deletedByUserId: userId,
      updatedByUserId: userId,
      updatedAt: now,
    };

    await transaction.runAsync(
      `
        UPDATE moments_local
        SET
          moment_json = ?,
          deleted_at = ?,
          local_revision = ?,
          sync_status = 'pending',
          updated_at = ?
        WHERE user_id = ?
          AND child_id = ?
          AND moment_id = ?
      `,
      [JSON.stringify(moment), now, revision, now, userId, childId, momentId],
    );

    /*
     * Ne pas supprimer les opérations précédentes :
     * une requête peut déjà avoir été reçue par le serveur
     * sans que sa réponse soit encore enregistrée localement.
     */
    await enqueueSyncOperation({
      userId,
      entityType: "moment",
      entityId: momentId,
      operation: `delete:${revision}`,
      endpoint: getEndpoint(childId, momentId),
      method: "DELETE",
      payload: {},
      database: transaction,
    });

    savedMoment = await mapMomentRow(
      transaction,
      await readMomentRow(transaction, {
        userId,
        childId,
        momentId,
      }),
    );
  });

  return savedMoment;
}

function parseOperation(operation) {
  const name = operation.operation;

  if (name === "create:1") {
    return { kind: "create", revision: 1 };
  }

  if (name === "publish:1") {
    return { kind: "publish", revision: 1 };
  }

  const mutation = /^(update|delete):([1-9]\d*)$/.exec(name);

  if (mutation) {
    const revision = Number(mutation[2]);

    if (!Number.isSafeInteger(revision)) {
      throw new Error("Invalid local moment revision.");
    }

    return {
      kind: mutation[1],
      revision,
    };
  }

  const photo = /^(upload|delete-photo):([0-9a-f-]+)$/i.exec(name);

  if (photo) {
    return {
      kind: photo[1],
      attachmentId: photo[2],
    };
  }

  throw new Error("Unsupported moment synchronization operation.");
}

async function requireCustomMilestoneSynced(
  database,
  { userId, childId, customMilestoneId },
) {
  if (!customMilestoneId) {
    return;
  }

  const row = await database.getFirstAsync(
    `
      SELECT server_version
      FROM child_custom_milestones_local
      WHERE user_id = ?
        AND child_id = ?
        AND milestone_id = ?
    `,
    [userId, childId, customMilestoneId],
  );

  if (
    !row ||
    !Number.isSafeInteger(row.server_version) ||
    row.server_version < 1
  ) {
    throw dependencyPending(
      "Waiting for the custom milestone to be synchronized.",
    );
  }
}

async function fixOperationVersion(database, operation) {
  let prepared;

  await database.withExclusiveTransactionAsync(async (transaction) => {
    const queued = await transaction.getFirstAsync(
      `
        SELECT payload_json
        FROM sync_queue
        WHERE id = ?
          AND user_id = ?
          AND entity_type = 'moment'
          AND entity_id = ?
      `,
      [operation.id, operation.user_id, operation.entity_id],
    );

    if (!queued) {
      throw new Error("Moment synchronization operation not found.");
    }

    const payload = JSON.parse(queued.payload_json);

    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("Invalid moment synchronization payload.");
    }

    // Une nouvelle tentative conserve exactement la même version.
    if (payload.version !== undefined) {
      validateVersion(payload.version);
      prepared = payload;
      return;
    }

    const row = await transaction.getFirstAsync(
      `
        SELECT server_version
        FROM moments_local
        WHERE user_id = ?
          AND moment_id = ?
      `,
      [operation.user_id, operation.entity_id],
    );

    if (
      !row ||
      !Number.isSafeInteger(row.server_version) ||
      row.server_version < 1
    ) {
      throw dependencyPending("Waiting for the moment to be synchronized.");
    }

    prepared = {
      ...payload,
      version: row.server_version,
    };

    await transaction.runAsync(
      `
        UPDATE sync_queue
        SET payload_json = ?, updated_at = ?
        WHERE id = ?
          AND user_id = ?
      `,
      [
        JSON.stringify(prepared),
        new Date().toISOString(),
        operation.id,
        operation.user_id,
      ],
    );
  });

  return prepared;
}

export async function prepareMomentSyncPayload({ operation, payload }) {
  if (operation.entity_type !== "moment") {
    return payload;
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Invalid moment synchronization payload.");
  }

  const parsed = parseOperation(operation);
  const database = await getLocalDatabase();

  const row = await database.getFirstAsync(
    `
      SELECT *
      FROM moments_local
      WHERE user_id = ?
        AND moment_id = ?
    `,
    [operation.user_id, operation.entity_id],
  );

  if (!row) {
    throw new Error("Local moment is unavailable.");
  }

  // Un souvenir supprimé localement doit encore terminer ses
  // opérations précédentes, puis transmettre son DELETE.
  if (parsed.kind === "create" || parsed.kind === "update") {
    await requireCustomMilestoneSynced(database, {
      userId: operation.user_id,
      childId: row.child_id,
      customMilestoneId: payload.milestone?.customMilestoneId,
    });
  }

  if (parsed.kind === "create") {
    if (payload.id !== operation.entity_id) {
      throw new Error("Moment synchronization mismatch.");
    }

    return payload;
  }

  if (!Number.isSafeInteger(row.server_version) || row.server_version < 1) {
    throw dependencyPending("Waiting for the moment to be synchronized.");
  }

  if (parsed.kind === "upload" || parsed.kind === "delete-photo") {
    if (
      payload.momentId !== operation.entity_id ||
      payload.childId !== row.child_id ||
      payload.attachmentId !== parsed.attachmentId
    ) {
      throw new Error("Moment photo synchronization mismatch.");
    }

    if (parsed.kind === "delete-photo") {
      return {};
    }

    const photo = await database.getFirstAsync(
      `
        SELECT *
        FROM moment_photos_local
        WHERE user_id = ?
          AND moment_id = ?
          AND attachment_id = ?
          AND child_id = ?
      `,
      [
        operation.user_id,
        operation.entity_id,
        parsed.attachmentId,
        row.child_id,
      ],
    );

    // Ne pas exclure deleted_at ici : une photo retirée plus tard
    // peut encore avoir un upload antérieur dans la queue.
    if (!photo) {
      throw new Error("Local moment photo not found.");
    }

    const uri = getPhotoUri(photo.relative_path);
    const file = await FileSystem.getInfoAsync(uri);

    if (!file.exists) {
      throw new Error("The local photo file is missing.");
    }

    const formData = new FormData();

    formData.append("photo", {
      uri,
      name: `${parsed.attachmentId}.jpg`,
      type: "image/jpeg",
    });

    return formData;
  }

  /*
   * La queue impose déjà l'ordre par souvenir.
   * Ne pas attendre ici toutes les photos locales : certaines
   * peuvent appartenir à une édition située APRÈS publish:1.
   */
  return fixOperationVersion(database, operation);
}

export async function completeMomentSync({ operation, response }) {
  if (operation.entity_type !== "moment") {
    throw new Error("Invalid moment synchronization operation.");
  }

  const parsed = parseOperation(operation);

  const isPhotoOperation =
    parsed.kind === "upload" || parsed.kind === "delete-photo";

  const version = validateVersion(
    isPhotoOperation ? response?.momentVersion : response?.moment?.version,
  );

  const database = await getLocalDatabase();

  await database.withExclusiveTransactionAsync(async (transaction) => {
    const queued = await transaction.getFirstAsync(
      `
        SELECT id
        FROM sync_queue
        WHERE id = ?
          AND user_id = ?
          AND entity_type = 'moment'
          AND entity_id = ?
      `,
      [operation.id, operation.user_id, operation.entity_id],
    );

    if (!queued) {
      return;
    }

    const row = await transaction.getFirstAsync(
      `
        SELECT *
        FROM moments_local
        WHERE user_id = ?
          AND moment_id = ?
      `,
      [operation.user_id, operation.entity_id],
    );

    if (!row) {
      throw new Error("Local moment not found.");
    }

    if (parsed.revision !== undefined && row.local_revision < parsed.revision) {
      throw new Error("Invalid local moment revision.");
    }

    if (row.server_version !== null && row.server_version > version) {
      throw new Error(
        "The synchronization response contains an older version.",
      );
    }

    const localMoment = JSON.parse(row.moment_json);

    let nextMoment = {
      ...localMoment,
      version,
    };

    let publicationStatus = row.publication_status;
    let deletedAt = row.deleted_at;
    let updatedAt = row.updated_at;

    if (parsed.kind === "upload") {
      const serverPhoto = response?.photo;

      if (
        !serverPhoto ||
        serverPhoto.attachmentId !== parsed.attachmentId ||
        !Number.isInteger(serverPhoto.displayOrder) ||
        serverPhoto.displayOrder < 0
      ) {
        throw new Error("Invalid moment photo synchronization response.");
      }

      const photoRow = await transaction.getFirstAsync(
        `
          SELECT *
          FROM moment_photos_local
          WHERE user_id = ?
            AND moment_id = ?
            AND attachment_id = ?
            AND child_id = ?
        `,
        [
          operation.user_id,
          operation.entity_id,
          parsed.attachmentId,
          row.child_id,
        ],
      );

      if (!photoRow) {
        throw new Error("Local moment photo not found.");
      }

      const photoStatus = photoRow.deleted_at ? "pending" : "synced";

      const photo = {
        ...JSON.parse(photoRow.photo_json),
        ...serverPhoto,
        relativePath: photoRow.relative_path,
        uri: getPhotoUri(photoRow.relative_path),

        // L'ordre local peut avoir changé depuis cet upload.
        displayOrder: photoRow.display_order,
        syncStatus: photoStatus,
      };

      await transaction.runAsync(
        `
          UPDATE moment_photos_local
          SET
            photo_json = ?,
            sync_status = ?,
            updated_at = ?
          WHERE user_id = ?
            AND moment_id = ?
            AND attachment_id = ?
        `,
        [
          JSON.stringify(photo),
          photoStatus,
          new Date().toISOString(),
          operation.user_id,
          operation.entity_id,
          parsed.attachmentId,
        ],
      );
    } else if (parsed.kind === "delete-photo") {
      if (typeof response?.removed !== "boolean") {
        throw new Error("Invalid moment photo deletion response.");
      }

      const photoRow = await transaction.getFirstAsync(
        `
          SELECT deleted_at
          FROM moment_photos_local
          WHERE user_id = ?
            AND moment_id = ?
            AND attachment_id = ?
        `,
        [operation.user_id, operation.entity_id, parsed.attachmentId],
      );

      if (!photoRow || !photoRow.deleted_at) {
        throw new Error("Local moment photo deletion mismatch.");
      }

      await transaction.runAsync(
        `
          UPDATE moment_photos_local
          SET sync_status = 'synced'
          WHERE user_id = ?
            AND moment_id = ?
            AND attachment_id = ?
        `,
        [operation.user_id, operation.entity_id, parsed.attachmentId],
      );
    } else {
      const serverMoment = response.moment;

      if (
        serverMoment.id !== operation.entity_id ||
        serverMoment.childId !== row.child_id ||
        serverMoment.type !== row.moment_type ||
        !["draft", "published"].includes(serverMoment.status) ||
        typeof serverMoment.updatedAt !== "string" ||
        !Number.isFinite(Date.parse(serverMoment.updatedAt))
      ) {
        throw new Error("Moment synchronization mismatch.");
      }

      validateDate(serverMoment.occurredOn);

      if (parsed.kind === "delete") {
        if (
          response.deleted !== true ||
          typeof serverMoment.deletedAt !== "string" ||
          !Number.isFinite(Date.parse(serverMoment.deletedAt)) ||
          !row.deleted_at
        ) {
          throw new Error("The moment deletion was not confirmed.");
        }
      } else if (serverMoment.deletedAt != null) {
        throw new Error("Unexpected deleted moment response.");
      }

      if (parsed.kind === "publish" && serverMoment.status !== "published") {
        throw new Error("The moment publication was not confirmed.");
      }

      publicationStatus = serverMoment.status;

      if (row.local_revision === parsed.revision) {
        nextMoment = { ...serverMoment };
        deletedAt = serverMoment.deletedAt ?? null;
        updatedAt = serverMoment.updatedAt;
      } else {
        // Une édition ou suppression locale plus récente existe.
        // Avancer la version sans remplacer son contenu.
        nextMoment = {
          ...localMoment,
          version,
          status: publicationStatus,
        };
      }
    }

    await transaction.runAsync(
      `
        DELETE FROM sync_queue
        WHERE id = ?
          AND user_id = ?
      `,
      [operation.id, operation.user_id],
    );

    const remaining = await transaction.getFirstAsync(
      `
        SELECT id
        FROM sync_queue
        WHERE user_id = ?
          AND entity_type = 'moment'
          AND entity_id = ?
        LIMIT 1
      `,
      [operation.user_id, operation.entity_id],
    );

    nextMoment = {
      ...nextMoment,
      version,
      status: publicationStatus,
      deletedAt,
      photos: await readPhotos(transaction, {
        userId: operation.user_id,
        momentId: operation.entity_id,
      }),
    };

    await transaction.runAsync(
      `
        UPDATE moments_local
        SET
          moment_json = ?,
          server_version = ?,
          publication_status = ?,
          sync_status = ?,
          occurred_on = ?,
          deleted_at = ?,
          updated_at = ?
        WHERE user_id = ?
          AND moment_id = ?
      `,
      [
        JSON.stringify(nextMoment),
        version,
        publicationStatus,
        remaining ? "pending" : "synced",
        nextMoment.occurredOn,
        deletedAt,
        updatedAt,
        operation.user_id,
        operation.entity_id,
      ],
    );
  });
}
