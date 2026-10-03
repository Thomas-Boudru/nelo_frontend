import { apiRequest } from "../apiClient.js";

const SUPPORTED_LANGUAGES = new Set(["en", "fr", "de", "es", "it", "nl", "pt"]);

export function getUserPreferences({ accessToken, signal }) {
  return apiRequest("/api/users/me/preferences", {
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
