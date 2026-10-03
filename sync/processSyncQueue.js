import * as Network from "expo-network";

import { apiRequest } from "../api/apiClient.js";

import { markChildPreferencesSynced } from "../database/children/childPreferencesRepository.js";
import { markChildProfileSynced } from "../database/children/childProfileRepository.js";
import { markChildRelationshipSynced } from "../database/children/childRelationshipRepository.js";

import { markUserPreferencesSynced } from "../database/user/userPreferencesRepository.js";
import { markNotificationPreferencesSynced } from "../database/user/notificationPreferencesRepository.js";

import { completeBottlePresetSync } from "../database/tracking/feed/bottlePresetsRepository.js";
import { prepareBottlePresetUpdatePayload } from "../database/tracking/feed/bottlePresetUpdatesRepository.js";
import { completeTrackingEntrySync } from "../database/tracking/feed/bottleRepository.js";

import {
  prepareCustomProductPayload,
  completeCustomProductSync,
} from "../database/tracking/medication/customProductsRepository.js";

import { prepareMedicationSyncPayload } from "../database/tracking/medication/medicationRepository.js";

import {
  prepareSleepSyncPayload,
  resolveSleepSyncConflict,
} from "../database/tracking/sleep/sleepRepository.js";

import {
  prepareTrackingPhotoPayload,
  completeTrackingPhotoSync,
} from "../database/tracking/trackingPhotosRepository.js";

import {
  prepareCustomFoodPayload,
  completeCustomFoodSync,
} from "../database/tracking/feed/customFoodsRepository.js";

import {
  getPendingSyncOperations,
  markSyncOperationFailed,
  removeSyncOperation,
} from "./syncQueueRepository.js";

import { prepareSolidFeedingPayload } from "../database/tracking/feed/solidsRepository.js";

let isProcessing = false;

function parsePayload(payloadJson) {
  if (payloadJson === null || payloadJson === undefined) {
    return undefined;
  }

  try {
    return JSON.parse(payloadJson);
  } catch {
    const error = new Error(
      "The synchronization payload contains invalid JSON.",
    );

    error.code = "INVALID_SYNC_PAYLOAD";

    throw error;
  }
}

function calculateNextAttemptAt(attemptCount) {
  const retryDelays = [5_000, 15_000, 60_000, 5 * 60_000, 30 * 60_000];

  const safeAttemptCount =
    Number.isInteger(attemptCount) && attemptCount >= 0 ? attemptCount : 0;

  const delayIndex = Math.min(safeAttemptCount, retryDelays.length - 1);

  return new Date(Date.now() + retryDelays[delayIndex]).toISOString();
}

function isTemporaryError(error) {
  return (
    error.status === 0 ||
    error.code === "NETWORK_ERROR" ||
    error.status === 408 ||
    error.status === 429 ||
    error.status >= 500
  );
}

async function executeOperation({ operation, accessToken, refreshSession }) {
  const parsedPayload = parsePayload(operation.payload_json);

  let payload = parsedPayload;

  if (
    operation.entity_type === "child_custom_medication" ||
    operation.entity_type === "child_custom_vaccine"
  ) {
    payload = await prepareCustomProductPayload({
      operation,
      payload,
    });
  }

  if (operation.entity_type === "child_bottle_preset") {
    payload = await prepareBottlePresetUpdatePayload({
      operation,
      payload: parsedPayload,
    });
  }

  if (operation.entity_type === "child_custom_food") {
    payload = await prepareCustomFoodPayload({
      operation,
      payload: parsedPayload,
    });
  }

  if (operation.entity_type === "tracking_entry") {
    payload = await prepareSolidFeedingPayload({
      operation,
      payload,
    });

    payload = await prepareSleepSyncPayload({
      operation,
      payload,
    });

    payload = await prepareMedicationSyncPayload({
      operation,
      payload,
    });
  }

  if (operation.entity_type === "tracking_photo") {
    payload = await prepareTrackingPhotoPayload({
      operation,
      payload: parsedPayload,
    });
  }

  const executeRequest = (currentAccessToken) =>
    apiRequest(operation.endpoint, {
      method: operation.http_method,
      body: payload,
      accessToken: currentAccessToken,
      headers: {
        "Idempotency-Key": operation.id,
      },
    });

  try {
    return await executeRequest(accessToken);
  } catch (error) {
    if (error.code !== "ACCESS_TOKEN_EXPIRED") {
      throw error;
    }

    const refreshedAccessToken = await refreshSession();

    if (!refreshedAccessToken) {
      const sessionError = new Error(
        "Unable to restore the authentication session.",
      );

      sessionError.code = "AUTHENTICATION_SESSION_EXPIRED";

      throw sessionError;
    }

    return executeRequest(refreshedAccessToken);
  }
}

async function completeOperation({ operation, response }) {
  if (
    operation.entity_type === "child_custom_medication" ||
    operation.entity_type === "child_custom_vaccine"
  ) {
    await completeCustomProductSync({
      operation,
      serverProduct: response?.product,
    });

    return;
  }

  if (operation.entity_type === "child_custom_food") {
    await completeCustomFoodSync({
      operation,
      serverFood: response?.food,
    });

    return;
  }

  if (operation.entity_type === "child_bottle_preset") {
    await completeBottlePresetSync({
      operation,
      serverPreset: response?.preset,
    });

    return;
  }

  if (operation.entity_type === "tracking_entry") {
    await completeTrackingEntrySync({
      operation,
      serverEntry: response?.entry,
    });

    return;
  }

  if (operation.entity_type === "tracking_photo") {
    await completeTrackingPhotoSync({
      operation,
      response,
    });

    return;
  }

  if (operation.entity_type === "user_notification_preferences") {
    await markNotificationPreferencesSynced(operation.user_id);
  }

  if (operation.entity_type === "child_preferences") {
    await markChildPreferencesSynced(operation.entity_id);
  }

  if (operation.entity_type === "child_profile") {
    await markChildProfileSynced(operation.entity_id);
  }

  if (operation.entity_type === "child_relationship") {
    await markChildRelationshipSynced({
      userId: operation.user_id,
      childId: operation.entity_id,
    });
  }

  if (operation.entity_type === "user_preferences") {
    const versionSeparator = operation.operation.indexOf(":");

    if (versionSeparator !== -1) {
      await markUserPreferencesSynced({
        userId: operation.user_id,
        expectedUpdatedAt: operation.operation.slice(versionSeparator + 1),
      });
    }
  }

  await removeSyncOperation(operation.id);
}

export async function processSyncQueue({
  userId,
  accessToken,
  refreshSession,
}) {
  if (
    isProcessing ||
    !userId ||
    !accessToken ||
    typeof refreshSession !== "function"
  ) {
    return;
  }

  // Le verrou est activé avant le premier appel asynchrone.
  isProcessing = true;

  try {
    const networkState = await Network.getNetworkStateAsync();

    if (
      !networkState.isConnected ||
      networkState.isInternetReachable === false
    ) {
      return;
    }

    while (true) {
      const operations = await getPendingSyncOperations(userId);

      if (operations.length === 0) {
        break;
      }

      let shouldStop = false;

      for (const operation of operations) {
        try {
          const response = await executeOperation({
            operation,
            accessToken,
            refreshSession,
          });

          await completeOperation({
            operation,
            response,
          });
        } catch (error) {
          let syncError = error;

          try {
            const resolved = await resolveSleepSyncConflict({
              operation,
              error,
              accessToken,
              refreshSession,
            });

            if (resolved) {
              continue;
            }
          } catch (resolutionError) {
            syncError = resolutionError;
          }

          if (
            syncError.code === "AUTHENTICATION_SESSION_EXPIRED" ||
            syncError.code === "ACCESS_TOKEN_EXPIRED"
          ) {
            shouldStop = true;
            break;
          }

          if (syncError.code === "SYNC_DEPENDENCY_PENDING") {
            await markSyncOperationFailed({
              operationId: operation.id,
              errorCode: syncError.code,
              errorMessage: syncError.message,
              nextAttemptAt: new Date(Date.now() + 5_000).toISOString(),
            });

            continue;
          }

          await markSyncOperationFailed({
            operationId: operation.id,
            errorCode: syncError.code,
            errorMessage: syncError.message,
            nextAttemptAt: calculateNextAttemptAt(operation.attempt_count),
          });

          if (
            isTemporaryError(syncError) ||
            operation.entity_type === "child_bottle_preset" ||
            operation.entity_type === "child_custom_food" ||
            operation.entity_type === "tracking_photo"
          ) {
            shouldStop = true;
            break;
          }
        }
      }

      if (shouldStop) {
        break;
      }
    }
  } finally {
    isProcessing = false;
  }
}
