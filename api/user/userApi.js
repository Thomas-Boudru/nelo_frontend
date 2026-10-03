import { apiRequest } from "../apiClient.js";

export function updatePreferredName({ displayName, accessToken, signal }) {
  return apiRequest("/api/users/me", {
    method: "PATCH",
    body: { displayName },
    accessToken,
    signal,
  });
}

export function requestEmailChange({ email, locale, accessToken, signal }) {
  return apiRequest("/api/users/me/email-change/request", {
    method: "POST",
    body: { email, locale },
    accessToken,
    signal,
  });
}

export function verifyEmailChange({ email, code, accessToken, signal }) {
  return apiRequest("/api/users/me/email-change/verify", {
    method: "POST",
    body: { email, code },
    accessToken,
    signal,
  });
}

export function deleteCurrentAccount({ accessToken, signal }) {
  return apiRequest("/api/users/me", {
    method: "DELETE",
    accessToken,
    signal,
  });
}

export function getAccountDeletionCheck({ accessToken, signal }) {
  return apiRequest("/api/users/me/account-deletion-check", {
    accessToken,
    signal,
  });
}
