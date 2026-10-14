import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAuth } from "../auth/AuthProvider.js";
import useFamilyEntitlements from "./useFamilyEntitlements.js";

import {
  getLocalEntitlements,
  saveLocalEntitlements,
  deleteLocalEntitlements,
} from "../database/billing/entitlementsRepository.js";

import { usePremiumAccessModal } from "../components/billing/PremiumAccessProvider.js";

import { useToast } from "../components/ui/toast/useToast.js";

const OFFLINE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function hasMemoryCardAccess(entitlements) {
  return entitlements?.features?.memory_cards?.enabled === true;
}

function canUseOfflineCache(cached) {
  if (!cached || !hasMemoryCardAccess(cached.entitlements)) {
    return false;
  }

  const elapsed = Date.now() - cached.receivedAt;

  // Une horloge revenue en arrière impose une vérification en ligne.
  if (
    !Number.isFinite(elapsed) ||
    elapsed < 0 ||
    elapsed >= OFFLINE_MAX_AGE_MS
  ) {
    return false;
  }

  const expiresAt = Date.parse(cached.entitlements.premiumAccess?.expiresAt);

  if (!Number.isFinite(expiresAt)) {
    return false;
  }

  // Utiliser l'heure serveur enregistrée comme référence.
  const estimatedServerTime = cached.serverTime + elapsed;

  return estimatedServerTime < expiresAt;
}

function isTemporaryError(error) {
  return (
    error?.code === "OFFLINE_SESSION" ||
    error?.code === "NETWORK_ERROR" ||
    error?.code === "REQUEST_TIMEOUT" ||
    error?.status === 0 ||
    error?.status === 429 ||
    error?.status >= 500
  );
}

export default function useMemoryCardAccess({ familyId, childId, navigation }) {
  const { t } = useTranslation();
  const { showToast } = useToast();

  const { user, isAuthenticated } = useAuth();
  const { showPremium, closePremium } = usePremiumAccessModal();

  const { refresh } = useFamilyEntitlements(familyId);

  const [checking, setChecking] = useState(false);

  const busyRef = useRef(false);
  const mountedRef = useRef(false);
  const scopeRef = useRef(null);

  const userId = isAuthenticated ? (user?.id ?? null) : null;
  const scopeKey = `${userId ?? ""}:${familyId ?? ""}`;

  scopeRef.current = scopeKey;

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Une modale ouverte pour une ancienne famille doit disparaître.
  useEffect(() => {
    return () => {
      closePremium();
    };
  }, [scopeKey, closePremium]);

  const requireAccess = useCallback(async () => {
    if (busyRef.current) {
      return false;
    }

    if (!userId || !familyId) {
      showToast({
        type: "error",
        title: t("Unable to verify access"),
        message: t("Reopen this moment and try again."),
      });

      return false;
    }

    const requestedScope = scopeKey;

    const isCurrent = () =>
      mountedRef.current && scopeRef.current === requestedScope;

    busyRef.current = true;
    setChecking(true);

    try {
      let entitlements;

      try {
        entitlements = await refresh();
      } catch (error) {
        if (!isCurrent()) return false;

        if (
          error?.code === "ACCESS_CONTEXT_CHANGED" ||
          error?.code === "AUTH_SESSION_CHANGED"
        ) {
          return false;
        }

        if (
          error?.status === 401 ||
          error?.status === 403 ||
          error?.status === 404
        ) {
          await deleteLocalEntitlements({ userId, familyId });
          throw error;
        }

        if (!isTemporaryError(error)) {
          throw error;
        }

        const cached = await getLocalEntitlements({
          userId,
          familyId,
        });

        if (!isCurrent()) return false;

        if (canUseOfflineCache(cached)) {
          return true;
        }

        showToast({
          type: "error",
          title: t("Internet connection required"),
          message: t("Connect to the internet to verify your Premium access."),
        });

        return false;
      }

      if (!isCurrent()) return false;

      // Conserver aussi une réponse Free pour remplacer
      // d'anciens droits Premium présents dans le cache.
      try {
        await saveLocalEntitlements({
          userId,
          familyId,
          entitlements,
          receivedAt: Date.now(),
        });
      } catch {
        // La réponse serveur reste utilisable pour cette action.
        console.warn("[Billing] Unable to cache memory card access.");
      }

      if (!isCurrent()) return false;

      // Une fonctionnalité absente indique un problème de configuration,
      // pas une raison d'inviter l'utilisateur à payer.
      if (typeof entitlements.features?.memory_cards?.enabled !== "boolean") {
        throw new Error("Memory card access is not configured.");
      }

      if (hasMemoryCardAccess(entitlements)) {
        return true;
      }

      showPremium({
        familyId,
        message:
          "Create beautiful memory cards to share with your loved ones with Nelo Premium.",

        onViewPlans: () => {
          if (!isCurrent()) return;

          navigation.navigate("Subscription", {
            familyId,
            childId,
          });
        },
      });

      return false;
    } catch {
      if (isCurrent()) {
        showToast({
          type: "error",
          title: t("Unable to verify access"),
          message: t("Please try again in a moment."),
        });
      }

      return false;
    } finally {
      busyRef.current = false;

      if (mountedRef.current) {
        setChecking(false);
      }
    }
  }, [
    userId,
    familyId,
    childId,
    scopeKey,
    refresh,
    navigation,
    showPremium,
    showToast,
    t,
  ]);

  return {
    requireAccess,
    checking,
  };
}
