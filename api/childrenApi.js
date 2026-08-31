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
