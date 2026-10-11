import * as Network from "expo-network";

import { apiRequest } from "../../api/apiClient.js";
import { processSyncQueue } from "../processSyncQueue.js";

import { saveRemoteMoment } from "../../database/moments/momentsRemoteRepository.js";

const runningSynchronizations = new Map();

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
    };
  }

  await processSyncQueue({
    userId,
    accessToken,
    refreshSession,
  });

  let currentAccessToken = accessToken;

  async function requestPage(cursor) {
    let endpoint =
      `/api/children/${encodeURIComponent(childId)}` + "/moments/sync?limit=50";

    if (cursor) {
      endpoint += `&cursor=${encodeURIComponent(cursor)}`;
    }

    const execute = () =>
      apiRequest(endpoint, {
        method: "GET",
        accessToken: currentAccessToken,
      });

    try {
      return await execute();
    } catch (error) {
      if (error.code !== "ACCESS_TOKEN_EXPIRED") {
        throw error;
      }

      currentAccessToken = await refreshSession();

      if (!currentAccessToken) {
        const sessionError = new Error(
          "Unable to restore the authentication session.",
        );

        sessionError.code = "AUTHENTICATION_SESSION_EXPIRED";
        throw sessionError;
      }

      return execute();
    }
  }

  let cursor = null;
  let saved = 0;
  let deferred = 0;

  const seenCursors = new Set();

  do {
    const response = await requestPage(cursor);

    if (
      !response ||
      !Array.isArray(response.moments) ||
      (response.nextCursor !== null && typeof response.nextCursor !== "string")
    ) {
      throw new Error("Invalid moments synchronization response.");
    }

    if (
      response.nextCursor !== null &&
      (!response.nextCursor || seenCursors.has(response.nextCursor))
    ) {
      throw new Error("Invalid moments synchronization cursor.");
    }

    for (const moment of response.moments) {
      const result = await saveRemoteMoment({
        userId,
        childId,
        moment,
      });

      if (result.status === "saved") {
        saved += 1;
      } else if (result.status === "deferred") {
        deferred += 1;
      }
    }

    cursor = response.nextCursor;

    if (cursor) {
      seenCursors.add(cursor);
    }
  } while (cursor);

  return {
    skipped: false,
    saved,
    deferred,
  };
}

export function synchronizeMoments({
  userId,
  childId,
  accessToken,
  refreshSession,
}) {
  if (
    !userId ||
    !childId ||
    !accessToken ||
    typeof refreshSession !== "function"
  ) {
    return Promise.resolve({
      skipped: true,
      saved: 0,
      deferred: 0,
    });
  }

  const key = JSON.stringify([userId, childId]);

  const existing = runningSynchronizations.get(key);

  if (existing) {
    return existing;
  }

  const task = runSynchronization({
    userId,
    childId,
    accessToken,
    refreshSession,
  }).finally(() => {
    runningSynchronizations.delete(key);
  });

  runningSynchronizations.set(key, task);

  return task;
}
