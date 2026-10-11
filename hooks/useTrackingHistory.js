import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";

import { useAuth } from "../auth/AuthProvider.js";
import { getLocalTrackingHistory } from "../database/tracking/trackingHistoryRepository.js";
import { synchronizeTracking } from "../sync/tracking/synchronizeTracking.js";

export function useTrackingHistory(childId, trackingType) {
  const { user, accessToken, refreshSession } = useAuth();
  const userId = user?.id;

  const key = JSON.stringify([userId ?? null, childId ?? null, trackingType]);

  const currentKey = useRef(key);
  currentKey.current = key;

  const requestId = useRef(0);
  const active = useRef(false);

  const [state, setState] = useState({
    key: null,
    entries: [],
    loading: true,
    refreshing: false,
    error: null,
    syncError: null,
  });

  const load = useCallback(
    async (manual = false) => {
      const id = ++requestId.current;

      const isCurrent = () =>
        active.current &&
        requestId.current === id &&
        currentKey.current === key;

      if (!isCurrent()) return;

      setState((previous) => ({
        key,
        entries: previous.key === key ? previous.entries : [],
        loading: previous.key !== key || previous.loading,
        refreshing: manual,
        error: null,
        syncError: null,
      }));

      if (!userId || !childId) {
        if (isCurrent()) {
          setState({
            key,
            entries: [],
            loading: false,
            refreshing: false,
            error: new Error("Missing user ID or child ID."),
            syncError: null,
          });
        }

        return;
      }

      async function readLocal() {
        const entries = await getLocalTrackingHistory({
          userId,
          childId,
          trackingType,
        });

        if (isCurrent()) {
          setState((previous) => ({
            ...previous,
            entries,
            loading: false,
            error: null,
          }));
        }
      }

      try {
        await readLocal();
      } catch (error) {
        if (isCurrent()) {
          setState((previous) => ({
            ...previous,
            loading: false,
            refreshing: false,
            error,
          }));
        }

        return;
      }

      if (!isCurrent()) return;

      try {
        if (accessToken) {
          try {
            await synchronizeTracking({
              userId,
              childId,
              accessToken,
              refreshSession,
            });
          } catch (syncError) {
            if (isCurrent()) {
              setState((previous) => ({
                ...previous,
                syncError,
              }));
            }
          }

          // Une synchronisation partiellement réussie peut déjà
          // avoir ajouté des mesures dans SQLite.
          if (isCurrent()) {
            await readLocal();
          }
        }
      } catch (error) {
        if (isCurrent()) {
          setState((previous) => ({
            ...previous,
            error,
          }));
        }
      } finally {
        if (isCurrent()) {
          setState((previous) => ({
            ...previous,
            refreshing: false,
          }));
        }
      }
    },
    [key, userId, childId, trackingType, accessToken, refreshSession],
  );

  useFocusEffect(
    useCallback(() => {
      active.current = true;
      void load();

      return () => {
        active.current = false;
        requestId.current += 1;
      };
    }, [load]),
  );

  const refresh = useCallback(() => load(true), [load]);

  const matches = state.key === key;

  return {
    entries: matches ? state.entries : [],
    loading: !matches || state.loading,
    error: matches ? state.error : null,
    syncError: matches ? state.syncError : null,
    isRefreshing: matches && state.refreshing,
    refresh,
  };
}
