import { useCallback, useEffect, useRef } from "react";
import { useSelector, useStore } from "react-redux";
import { nanoid } from "@reduxjs/toolkit";

import { useAuth } from "../auth/AuthProvider.js";

import { getFamilyEntitlements } from "../api/billingApi.js";

import {
  setEntitlementsUser,
  entitlementsRequested,
  entitlementsReceived,
  entitlementsFailed,
  selectFamilyEntitlementsEntry,
} from "../store/slices/entitlementsSlice.js";

// Partager une requête entre les écrans utilisant le même store.
const requestsByStore = new WeakMap();

function createAccessError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

export default function useFamilyEntitlements(familyId) {
  const store = useStore();

  const { isAuthenticated, user, accessToken, refreshSession } = useAuth();

  const userId = isAuthenticated ? (user?.id ?? null) : null;

  const entry = useSelector((state) =>
    selectFamilyEntitlementsEntry(state, userId, familyId),
  );

  // Garder les dernières informations sans recréer refresh
  // à chaque renouvellement de l'access token.
  const sessionRef = useRef(null);

  sessionRef.current = {
    userId,
    familyId,
    accessToken,
    refreshSession,
  };

  const refresh = useCallback(async () => {
    const session = sessionRef.current;

    if (
      !userId ||
      !familyId ||
      session.userId !== userId ||
      session.familyId !== familyId
    ) {
      throw createAccessError(
        "ACCESS_CONTEXT_CHANGED",
        "Your account or family has changed.",
      );
    }

    if (!session.accessToken) {
      throw createAccessError(
        "OFFLINE_SESSION",
        "Connect to the internet to verify your access.",
      );
    }

    store.dispatch(setEntitlementsUser(userId));

    let requests = requestsByStore.get(store);

    if (!requests) {
      requests = new Map();
      requestsByStore.set(store, requests);
    }

    const key = `${userId}:${familyId}`;

    const existing = requests.get(key);

    const currentEntry = selectFamilyEntitlementsEntry(
      store.getState(),
      userId,
      familyId,
    );

    // Réutiliser uniquement la requête encore reconnue par Redux.
    if (existing && currentEntry?.requestId === existing.requestId) {
      return existing.promise;
    }

    const requestId = nanoid();

    store.dispatch(
      entitlementsRequested({
        userId,
        familyId,
        requestId,
      }),
    );

    const promise = (async () => {
      try {
        const response = await getFamilyEntitlements({
          familyId,
          accessToken: session.accessToken,
          refreshSession: session.refreshSession,
        });

        // Accepte une réponse { entitlements: {...} }
        // ou directement l'objet de droits.
        const entitlements = response?.entitlements ?? response;

        if (
          entitlements?.familyId !== familyId ||
          typeof entitlements?.isPremium !== "boolean" ||
          !entitlements?.features ||
          typeof entitlements.features !== "object" ||
          Array.isArray(entitlements.features)
        ) {
          throw createAccessError(
            "INVALID_ENTITLEMENTS_RESPONSE",
            "The access information received is invalid.",
          );
        }

        const latestSession = sessionRef.current;

        const latestEntry = selectFamilyEntitlementsEntry(
          store.getState(),
          userId,
          familyId,
        );

        if (
          latestSession.userId !== userId ||
          latestSession.familyId !== familyId ||
          latestEntry?.requestId !== requestId
        ) {
          throw createAccessError(
            "ACCESS_CONTEXT_CHANGED",
            "Your account or family has changed.",
          );
        }

        store.dispatch(
          entitlementsReceived({
            userId,
            familyId,
            requestId,
            entitlements,
            receivedAt: Date.now(),
          }),
        );

        return entitlements;
      } catch (error) {
        store.dispatch(
          entitlementsFailed({
            userId,
            familyId,
            requestId,

            error: {
              code: error?.code,
              message: error?.message,
              status: error?.status,
            },

            discardCachedData:
              error?.status === 401 ||
              error?.status === 403 ||
              error?.status === 404 ||
              error?.code === "ACCESS_CONTEXT_CHANGED",
          }),
        );

        throw error;
      } finally {
        if (requests.get(key)?.requestId === requestId) {
          requests.delete(key);
        }
      }
    })();

    requests.set(key, {
      requestId,
      promise,
    });

    return promise;
  }, [store, userId, familyId]);

  useEffect(() => {
    if (!userId || !familyId || !accessToken) {
      return;
    }

    void refresh().catch(() => {});
  }, [userId, familyId, accessToken, refresh]);

  return {
    entitlements: entry?.data ?? null,

    status: entry?.status ?? "idle",

    isLoading:
      Boolean(userId && familyId) && (!entry || entry.status === "loading"),

    isRefreshing: entry?.status === "refreshing",

    error: entry?.error ?? null,

    receivedAt: entry?.receivedAt ?? null,

    refresh,
  };
}
