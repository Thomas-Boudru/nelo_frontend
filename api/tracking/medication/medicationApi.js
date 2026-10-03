import { apiRequest } from "../../apiClient.js";

async function requestWithRefresh({ endpoint, accessToken, refreshSession }) {
  try {
    return await apiRequest(endpoint, {
      method: "GET",
      accessToken,
    });
  } catch (error) {
    if (
      error?.code !== "ACCESS_TOKEN_EXPIRED" ||
      typeof refreshSession !== "function"
    ) {
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

function getChildEndpoint(childId) {
  if (!childId) {
    throw new Error("Missing child ID.");
  }

  return `/api/children/${encodeURIComponent(childId)}`;
}

export async function getCustomMedications({
  childId,
  accessToken,
  refreshSession,
}) {
  return requestWithRefresh({
    endpoint: `${getChildEndpoint(childId)}/custom-medications`,
    accessToken,
    refreshSession,
  });
}

export async function getCustomVaccines({
  childId,
  accessToken,
  refreshSession,
}) {
  return requestWithRefresh({
    endpoint: `${getChildEndpoint(childId)}/custom-vaccines`,
    accessToken,
    refreshSession,
  });
}

export async function getVaccinationReminders({
  childId,
  accessToken,
  refreshSession,
}) {
  return requestWithRefresh({
    endpoint: `${getChildEndpoint(childId)}/vaccination-reminders`,
    accessToken,
    refreshSession,
  });
}
