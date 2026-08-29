import { apiRequest } from "./apiClient";

export function requestLoginCode(email, locale) {
  return apiRequest("/api/auth/code/request", {
    method: "POST",
    body: {
      email,
      locale,
    },
  });
}

export function verifyLoginCode({
  email,
  code,
  locale,
  deviceName,
  platform,
  appVersion,
}) {
  return apiRequest("/api/auth/code/verify", {
    method: "POST",
    body: {
      email,
      code,
      locale,
      deviceName,
      platform,
      appVersion,
    },
  });
}

export function refreshAuthSession(refreshToken) {
  return apiRequest("/api/auth/refresh", {
    method: "POST",
    body: {
      refreshToken,
    },
  });
}

export function logoutAuthSession(refreshToken) {
  return apiRequest("/api/auth/logout", {
    method: "POST",
    body: {
      refreshToken,
    },
  });
}

export function getCurrentUser(accessToken) {
  return apiRequest("/api/me", {
    accessToken,
  });
}
