import { apiRequest } from "../apiClient.js";
import { getDeviceMeasurementUnits } from "../../utils/deviceMeasurementUnits.js";

const SUPPORTED_LANGUAGES = new Set(["en", "fr", "de", "es", "it", "nl", "pt"]);

export function getUserPreferences({ accessToken, signal }) {
  const initialUnits = getDeviceMeasurementUnits();

  const query = Object.entries(initialUnits)
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
    )
    .join("&");

  return apiRequest(`/api/users/me/preferences?${query}`, {
    accessToken,
    signal,
  });
}

export function updateUserLanguage({ languageCode, accessToken, signal }) {
  if (languageCode !== null && !SUPPORTED_LANGUAGES.has(languageCode)) {
    throw new Error("Unsupported language.");
  }

  return apiRequest("/api/users/me/preferences", {
    method: "PATCH",
    body: { languageCode },
    accessToken,
    signal,
  });
}
