import { Platform } from "react-native";
import Purchases from "react-native-purchases";

let authenticatedUserId = null;
let sessionVersion = 0;
let queue = Promise.resolve();

function billingError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

export function setBillingUser(userId) {
  const nextUserId = userId ? userId.toLowerCase() : null;

  if (nextUserId !== authenticatedUserId) {
    authenticatedUserId = nextUserId;
    sessionVersion += 1;
  }
}

function assertSession(userId, version) {
  if (!userId || authenticatedUserId !== userId || version !== sessionVersion) {
    throw billingError(
      "BILLING_SESSION_CHANGED",
      "Your session has changed. Please reopen this screen.",
    );
  }
}

function runForUser(userId, operation) {
  const normalizedUserId = userId?.toLowerCase();
  const version = sessionVersion;

  const task = queue.then(async () => {
    assertSession(normalizedUserId, version);

    if (!["ios", "android"].includes(Platform.OS)) {
      throw billingError(
        "BILLING_PLATFORM_NOT_SUPPORTED",
        "Purchases are available on iOS and Android only.",
      );
    }

    const apiKey =
      Platform.OS === "ios"
        ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY?.trim()
        : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY?.trim();

    const expectedPrefix = Platform.OS === "ios" ? "appl_" : "goog_";

    if (!apiKey?.startsWith(expectedPrefix)) {
      throw billingError(
        "BILLING_CONFIGURATION_ERROR",
        "The RevenueCat SDK key for this platform is missing or invalid.",
      );
    }
    if (!(await Purchases.isConfigured())) {
      assertSession(normalizedUserId, version);

      Purchases.configure({
        apiKey,
        appUserID: normalizedUserId,
      });
    }

    if ((await Purchases.getAppUserID()) !== normalizedUserId) {
      assertSession(normalizedUserId, version);
      await Purchases.logIn(normalizedUserId);
    }

    assertSession(normalizedUserId, version);

    const result = await operation();

    assertSession(normalizedUserId, version);

    return result;
  });

  // Une opération échouée ne bloque pas les suivantes.
  queue = task.catch(() => {});

  return task;
}

export function loadRevenueCatProducts({ userId, identifiers }) {
  return runForUser(userId, () => Purchases.getProducts(identifiers));
}

export function purchaseRevenueCatProduct({ userId, product }) {
  return runForUser(userId, () => Purchases.purchaseStoreProduct(product));
}

export function restoreRevenueCatPurchases({ userId }) {
  return runForUser(userId, () => Purchases.restorePurchases());
}
