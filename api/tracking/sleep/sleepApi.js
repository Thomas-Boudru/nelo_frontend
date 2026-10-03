import { apiRequest } from "../../apiClient.js";

async function requestWithRefresh({ endpoint, accessToken, refreshSession }) {
  try {
    return await apiRequest(endpoint, {
      method: "GET",
      accessToken,
    });
  } catch (error) {
    if (error?.code !== "ACCESS_TOKEN_EXPIRED") {
      throw error;
    }

    const refreshedAccessToken = await refreshSession();

    if (!refreshedAccessToken) {
      throw error;
    }

    return apiRequest(endpoint, {
      method: "GET",
      accessToken: refreshedAccessToken,
    });
  }
}

export async function getActiveSleep({ childId, accessToken, refreshSession }) {
  return requestWithRefresh({
    endpoint: `/api/children/${encodeURIComponent(childId)}/sleep/active`,
    accessToken,
    refreshSession,
  });
}

export async function getSleepEntry({
  childId,
  entryId,
  accessToken,
  refreshSession,
}) {
  return requestWithRefresh({
    endpoint:
      `/api/children/${encodeURIComponent(childId)}` +
      `/sleep/${encodeURIComponent(entryId)}`,
    accessToken,
    refreshSession,
  });
}
