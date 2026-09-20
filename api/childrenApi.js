import { apiRequest } from "./apiClient.js";

function getAvatarFileName({ childId, fileName, mimeType }) {
  if (fileName) {
    return fileName;
  }

  const extensionByMimeType = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };

  const extension = extensionByMimeType[mimeType] || "jpg";

  return `child-${childId}-avatar.${extension}`;
}

export function getAccessibleChildren({ accessToken, signal }) {
  return apiRequest("/api/children", {
    accessToken,
    signal,
  });
}

export function createChild({ childData, accessToken, signal }) {
  if (!childData || typeof childData !== "object" || Array.isArray(childData)) {
    throw new Error("Missing child data.");
  }

  return apiRequest("/api/children", {
    method: "POST",
    body: childData,
    accessToken,
    signal,
  });
}

export function updateChild({ childId, childData, accessToken, signal }) {
  if (!childId) {
    throw new Error("Missing child ID.");
  }

  if (!childData || typeof childData !== "object" || Array.isArray(childData)) {
    throw new Error("Missing child data.");
  }

  return apiRequest(`/api/children/${encodeURIComponent(childId)}`, {
    method: "PATCH",
    body: childData,
    accessToken,
    signal,
  });
}

export function updateChildPreferences({
  childId,
  preferences,
  accessToken,
  signal,
}) {
  if (!childId) {
    throw new Error("Missing child ID.");
  }

  if (
    !preferences ||
    typeof preferences !== "object" ||
    Array.isArray(preferences)
  ) {
    throw new Error("Missing child preferences.");
  }

  return apiRequest(
    `/api/children/${encodeURIComponent(childId)}/preferences`,
    {
      method: "PATCH",
      body: preferences,
      accessToken,
      signal,
    },
  );
}

export function uploadChildAvatar({ childId, accessToken, image, signal }) {
  if (!childId) {
    throw new Error("Missing child ID.");
  }

  if (!image?.uri) {
    throw new Error("Missing avatar image.");
  }

  const mimeType = image.mimeType || "image/jpeg";

  const formData = new FormData();

  formData.append("avatar", {
    uri: image.uri,

    name: getAvatarFileName({
      childId,
      fileName: image.fileName,
      mimeType,
    }),

    type: mimeType,
  });

  return apiRequest(`/api/children/${encodeURIComponent(childId)}/avatar`, {
    method: "PUT",
    body: formData,
    accessToken,
    signal,
  });
}

export function deleteChildAvatar({ childId, accessToken, signal }) {
  if (!childId) {
    throw new Error("Missing child ID.");
  }

  return apiRequest(`/api/children/${encodeURIComponent(childId)}/avatar`, {
    method: "DELETE",
    accessToken,
    signal,
  });
}

export function getChildSharing({ childId, accessToken, signal }) {
  if (!childId) {
    throw new Error("Missing child ID.");
  }

  return apiRequest(`/api/children/${encodeURIComponent(childId)}/sharing`, {
    accessToken,
    signal,
  });
}

export function removeChildMember({
  childId,
  childMemberId,
  accessToken,
  signal,
}) {
  if (!childId) {
    throw new Error("Missing child ID.");
  }

  if (!childMemberId) {
    throw new Error("Missing child member ID.");
  }

  return apiRequest(
    `/api/children/${encodeURIComponent(
      childId,
    )}/members/${encodeURIComponent(childMemberId)}`,
    {
      method: "DELETE",
      accessToken,
      signal,
    },
  );
}

export function createChildInvitation({
  childId,
  email,
  locale,
  accessToken,
  signal,
}) {
  if (!childId) {
    throw new Error("Missing child ID.");
  }

  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();

  if (!normalizedEmail) {
    throw new Error("Missing invitation email.");
  }

  return apiRequest(
    `/api/children/${encodeURIComponent(childId)}/invitations`,
    {
      method: "POST",
      body: {
        email: normalizedEmail,
        locale: locale || "en",
      },
      accessToken,
      signal,
    },
  );
}

export function resendChildInvitation({
  childId,
  invitationId,
  locale,
  accessToken,
  signal,
}) {
  if (!childId) {
    throw new Error("Missing child ID.");
  }

  if (!invitationId) {
    throw new Error("Missing invitation ID.");
  }

  return apiRequest(
    `/api/children/${encodeURIComponent(
      childId,
    )}/invitations/${encodeURIComponent(invitationId)}/resend`,
    {
      method: "POST",
      body: {
        locale: locale || "en",
      },
      accessToken,
      signal,
    },
  );
}

export function revokeChildInvitation({
  childId,
  invitationId,
  accessToken,
  signal,
}) {
  if (!childId) {
    throw new Error("Missing child ID.");
  }

  if (!invitationId) {
    throw new Error("Missing invitation ID.");
  }

  return apiRequest(
    `/api/children/${encodeURIComponent(
      childId,
    )}/invitations/${encodeURIComponent(invitationId)}`,
    {
      method: "DELETE",
      accessToken,
      signal,
    },
  );
}
