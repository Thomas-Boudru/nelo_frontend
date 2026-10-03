import { getBottlePresets } from "../../../api/tracking/feed/bottlePresetsApi.js";

import { saveServerBottlePresetsLocally } from "../../../database/tracking/feed/bottlePresetsRepository.js";

import { processSyncQueue } from "../../processSyncQueue.js";

export async function synchronizeBottlePresets({
  userId,
  childId,
  accessToken,
  refreshSession,
}) {
  if (!userId || !childId || !accessToken) {
    throw new Error("Missing user ID, child ID or access token.");
  }

  if (typeof refreshSession !== "function") {
    throw new Error("Missing session refresh function.");
  }

  await processSyncQueue({
    userId,
    accessToken,
    refreshSession,
  });

  let response;

  try {
    response = await getBottlePresets({
      childId,
      accessToken,
    });
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

    response = await getBottlePresets({
      childId,
      accessToken: refreshedAccessToken,
    });
  }

  return saveServerBottlePresetsLocally({
    userId,
    childId,
    presets: response?.presets,
  });
}
