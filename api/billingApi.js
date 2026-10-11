import { apiRequest } from "./apiClient";

function requireFamilyId(familyId) {
  if (typeof familyId !== "string" || !familyId.trim()) {
    const error = new Error("Missing family ID.");
    error.code = "MISSING_FAMILY_ID";
    throw error;
  }
}

async function requestWithRefresh({
  path,
  method = "GET",
  body,
  headers,
  accessToken,
  refreshSession,
  signal,
}) {
  const request = (currentAccessToken) =>
    apiRequest(path, {
      method,
      body,
      headers,
      accessToken: currentAccessToken,
      signal,
    });

  try {
    return await request(accessToken);
  } catch (error) {
    if (
      error?.code !== "ACCESS_TOKEN_EXPIRED" ||
      typeof refreshSession !== "function"
    ) {
      throw error;
    }

    const refreshedAccessToken = await refreshSession();

    if (!refreshedAccessToken) {
      throw error;
    }

    // Même corps et même clé d'idempotence lors de la relance.
    return request(refreshedAccessToken);
  }
}

export function getSubscriptionProducts({
  store = "app_store",
  accessToken,
  refreshSession,
  signal,
}) {
  return requestWithRefresh({
    path: `/api/billing/products?store=${encodeURIComponent(store)}`,
    accessToken,
    refreshSession,
    signal,
  });
}

export function getFamilyEntitlements({
  familyId,
  accessToken,
  refreshSession,
  signal,
}) {
  requireFamilyId(familyId);

  return requestWithRefresh({
    path: `/api/families/${encodeURIComponent(familyId)}/entitlements`,
    accessToken,
    refreshSession,
    signal,
  });
}

export function createSubscriptionPurchaseIntent({
  familyId,
  productId,
  idempotencyKey,
  accessToken,
  refreshSession,
  signal,
}) {
  requireFamilyId(familyId);

  if (!productId || !idempotencyKey) {
    const error = new Error(
      "A product ID and an idempotency key are required.",
    );

    error.code = "INVALID_PURCHASE_REQUEST";
    throw error;
  }

  return requestWithRefresh({
    path:
      `/api/families/${encodeURIComponent(familyId)}` +
      "/billing/purchase-intents",

    method: "POST",

    headers: {
      "Idempotency-Key": idempotencyKey,
    },

    body: {
      productId,
    },

    accessToken,
    refreshSession,
    signal,
  });
}

export function synchronizeRevenueCatPurchase({
  familyId,
  accessToken,
  refreshSession,
  signal,
}) {
  requireFamilyId(familyId);

  return requestWithRefresh({
    path: "/api/billing/revenuecat/sync",

    method: "POST",

    body: {
      familyId,
    },

    accessToken,
    refreshSession,
    signal,
  });
}
