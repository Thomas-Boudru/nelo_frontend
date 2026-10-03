import { apiRequest } from "../../apiClient.js";

export async function getBottlePresets({ childId, accessToken }) {
  if (!childId) {
    throw new Error("Missing child ID.");
  }

  return apiRequest(
    `/api/children/${encodeURIComponent(childId)}/bottle-presets`,
    {
      method: "GET",
      accessToken,
    },
  );
}
