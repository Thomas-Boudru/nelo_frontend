import { apiRequest } from "./apiClient.js";

export function completeOnboardingRequest({ payload, accessToken }) {
  return apiRequest("/api/onboarding", {
    method: "POST",
    body: payload,
    accessToken,
  });
}
