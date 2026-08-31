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
  googleIdToken,
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
      googleIdToken,
    },
  });
}

export function signInWithApple({
  identityToken,
  authorizationCode,
  nonce,
  locale,
  deviceName,
  platform,
  appVersion,
}) {
  return apiRequest("/api/auth/apple", {
    method: "POST",
    body: {
      identityToken,
      authorizationCode,
      nonce,
      locale,
      deviceName,
      platform,
      appVersion,
    },
  });
}

export function signInWithGoogle({
  idToken,
  locale,
  deviceName,
  platform,
  appVersion,
}) {
  return apiRequest("/api/auth/google", {
    method: "POST",
    body: {
      idToken,
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
