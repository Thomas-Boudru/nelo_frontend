import { apiRequest } from "../apiClient.js";

const ENDPOINT = "/api/users/me/notification-preferences";

export function getNotificationPreferences({ accessToken, signal }) {
  return apiRequest(ENDPOINT, {
    accessToken,
    signal,
  });
}

export function updateNotificationPreferences({
  preferences,
  accessToken,
  signal,
}) {
  return apiRequest(ENDPOINT, {
    method: "PATCH",
    body: preferences,
    accessToken,
    signal,
  });
}
