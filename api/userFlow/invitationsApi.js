import { apiRequest } from "../apiClient.js";

export function getPendingInvitations({ accessToken, signal }) {
  return apiRequest("/api/invitations/pending", {
    accessToken,
    signal,
  });
}

export function acceptInvitation({
  invitationId,
  relationshipType,
  displayName,
  accessToken,
  signal,
}) {
  if (!invitationId) {
    throw new Error("Missing invitation ID.");
  }

  if (!relationshipType) {
    throw new Error("Missing relationship type.");
  }

  if (!displayName?.trim()) {
    throw new Error("Missing display name.");
  }

  return apiRequest(
    `/api/invitations/${encodeURIComponent(invitationId)}/accept`,
    {
      method: "POST",
      accessToken,
      signal,

      body: {
        relationshipType,
        displayName: displayName.trim(),
      },
    },
  );
}
