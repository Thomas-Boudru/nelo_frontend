import * as Network from "expo-network";

import { apiRequest } from "../api/apiClient.js";
import { markChildPreferencesSynced } from "../database/childPreferencesRepository.js";
import { markChildProfileSynced } from "../database/childProfileRepository.js";
import { markChildRelationshipSynced } from "../database/childRelationshipRepository.js";
import {
  getPendingSyncOperations,
  markSyncOperationFailed,
  removeSyncOperation,
} from "./syncQueueRepository.js";

let isProcessing = false;

function parsePayload(payloadJson) {
  if (!payloadJson) {
    return undefined;
  }

  try {
    return JSON.parse(payloadJson);
  } catch {
    return undefined;
  }
}

function calculateNextAttemptAt(attemptCount) {
  const retryDelays = [5_000, 15_000, 60_000, 5 * 60_000, 30 * 60_000];

  const delayIndex = Math.min(attemptCount, retryDelays.length - 1);

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
  const executeRequest = (currentAccessToken) =>
    apiRequest(operation.endpoint, {
      method: operation.http_method,
      body: parsePayload(operation.payload_json),
      accessToken: currentAccessToken,

      /*
       * Le backend peut ignorer ce header actuellement.
       * Il sera utilisé plus tard pour l'idempotence.
       */
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

  const networkState = await Network.getNetworkStateAsync();

  if (!networkState.isConnected || networkState.isInternetReachable === false) {
    return;
  }

  isProcessing = true;

  try {
    const operations = await getPendingSyncOperations(userId);

    for (const operation of operations) {
      try {
        await executeOperation({
          operation,
          accessToken,
          refreshSession,
        });

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

        await removeSyncOperation(operation.id);
      } catch (error) {
        /*
         * Une session expirée demande une reconnexion.
         * On garde les données locales dans la queue.
         */
        if (error.code === "AUTHENTICATION_SESSION_EXPIRED") {
          break;
        }

        if (isTemporaryError(error)) {
          await markSyncOperationFailed({
            operationId: operation.id,
            errorCode: error.code,
            errorMessage: error.message,
            nextAttemptAt: calculateNextAttemptAt(operation.attempt_count),
          });

          /*
           * Si le réseau ou le serveur est indisponible,
           * il est inutile d'essayer les opérations suivantes.
           */
          break;
        }

        /*
         * Pour le moment, on garde également les erreurs
         * définitives afin de ne perdre aucune donnée.
         * Nous ajouterons ensuite un statut "blocked".
         */
        await markSyncOperationFailed({
          operationId: operation.id,
          errorCode: error.code,
          errorMessage: error.message,
          nextAttemptAt: calculateNextAttemptAt(operation.attempt_count),
        });
      }
    }
  } finally {
    isProcessing = false;
  }
}
