import * as Network from "expo-network";

import { apiRequest } from "../../api/apiClient.js";
import { processSyncQueue } from "../processSyncQueue.js";

import { saveRemoteTrackingEntry } from "../../database/tracking/trackingRemoteRepository.js";

const running = new Map();

async function runSynchronization({
  userId,
  childId,
  accessToken,
  refreshSession,
}) {
  const network = await Network.getNetworkStateAsync();

  if (!network.isConnected || network.isInternetReachable === false) {
    return {
      skipped: true,
      saved: 0,
      deferred: 0,
      ignored: 0,
    };
  }

  // Tenter d'abord l'envoi des modifications locales.
  // Le repository protège aussi les opérations encore en attente.
  await processSyncQueue({
    userId,
    accessToken,
    refreshSession,
  });

  let token = accessToken;

  async function fetchPage(cursor) {
    const base =
      `/api/children/${encodeURIComponent(childId)}` +
      "/tracking/sync?limit=50";

    const endpoint = cursor
      ? `${base}&cursor=${encodeURIComponent(cursor)}`
      : base;

    try {
      return await apiRequest(endpoint, {
        accessToken: token,
      });
    } catch (error) {
      if (
        error?.code !== "ACCESS_TOKEN_EXPIRED" ||
        typeof refreshSession !== "function"
      ) {
        throw error;
      }

      const refreshedToken = await refreshSession();

      if (!refreshedToken) {
        throw error;
      }

      token = refreshedToken;

      return apiRequest(endpoint, {
        accessToken: token,
      });
    }
  }

  const result = {
    skipped: false,
    saved: 0,
    deferred: 0,
    ignored: 0,
  };

  const seenCursors = new Set();

  // Repartir du début à chaque synchronisation complète.
  let cursor = null;

  do {
    const page = await fetchPage(cursor);

    if (
      !page ||
      !Array.isArray(page.entries) ||
      page.entries.length > 50 ||
      !Object.prototype.hasOwnProperty.call(page, "nextCursor") ||
      (page.nextCursor !== null &&
        (typeof page.nextCursor !== "string" ||
          !page.nextCursor ||
          page.nextCursor.length > 500))
    ) {
      throw new Error("Invalid tracking synchronization page.");
    }

    for (const entry of page.entries) {
      const outcome = await saveRemoteTrackingEntry({
        userId,
        childId,
        entry,
      });

      result[outcome] += 1;
    }

    cursor = page.nextCursor;

    if (cursor !== null) {
      if (seenCursors.has(cursor)) {
        throw new Error("Repeated tracking synchronization cursor.");
      }

      seenCursors.add(cursor);
    }
  } while (cursor !== null);

  return result;
}

export function synchronizeTracking(options) {
  const { userId, childId } = options;

  if (!userId || !childId) {
    return Promise.reject(new Error("Missing user ID or child ID."));
  }

  const key = JSON.stringify([userId, childId]);

  if (running.has(key)) {
    return running.get(key);
  }

  const promise = runSynchronization(options).finally(() => {
    running.delete(key);
  });

  running.set(key, promise);

  return promise;
}
