import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";

import { getLocalTrackingPeriod } from "../database/tracking/trackingReadRepository.js";

import { synchronizeTracking } from "../sync/tracking/synchronizeTracking.js";

import { subscribeToTrackingChanges } from "../database/tracking/trackingEvents.js";

function getBounds(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);

  const dayStart = new Date(year, month - 1, day);
  const weekStart = new Date(year, month - 1, day - 6);
  const end = new Date(year, month - 1, day + 1);

  return { dayStart, weekStart, end };
}

export default function useTrackingPeriod({
  userId,
  childId,
  dateKey,
  accessToken,
  refreshSession,
}) {
  const key = JSON.stringify([userId, childId, dateKey]);

  const [state, setState] = useState({
    key: null,
    dayEntries: [],
    weekEntries: [],
    loading: true,
    error: null,
  });

  const [refreshingKey, setRefreshingKey] = useState(null);
  const [syncError, setSyncError] = useState(null);

  const mounted = useRef(false);
  const requestId = useRef(0);
  const refreshLock = useRef(false);
  const currentKey = useRef(key);

  currentKey.current = key;

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
      requestId.current += 1;
    };
  }, []);

  const reload = useCallback(async () => {
    const request = ++requestId.current;
    const requestedKey = key;

    if (!userId || !childId) {
      if (mounted.current && currentKey.current === requestedKey) {
        setState({
          key: requestedKey,
          dayEntries: [],
          weekEntries: [],
          loading: false,
          error: null,
        });
      }

      return;
    }

    const { dayStart, weekStart, end } = getBounds(dateKey);

    try {
      const weekEntries = await getLocalTrackingPeriod({
        userId,
        childId,
        from: weekStart,
        to: end,
      });

      const dayEntries = weekEntries.filter((entry) => {
        if (entry.type === "growth") {
          return entry.measurementDate === dateKey;
        }

        if (entry.type === "teething") {
          return entry.eruptionDate === dateKey;
        }

        const start = Date.parse(entry.startedAt);

        if (entry.type === "sleep") {
          const finish = entry.endedAt ? Date.parse(entry.endedAt) : Date.now();

          return start < end.getTime() && finish > dayStart.getTime();
        }

        return start >= dayStart.getTime() && start < end.getTime();
      });

      if (
        mounted.current &&
        request === requestId.current &&
        currentKey.current === requestedKey
      ) {
        setState({
          key: requestedKey,
          dayEntries,
          weekEntries,
          loading: false,
          error: null,
        });
      }
    } catch (error) {
      if (
        mounted.current &&
        request === requestId.current &&
        currentKey.current === requestedKey
      ) {
        setState((previous) => ({
          key: requestedKey,
          dayEntries: previous.key === requestedKey ? previous.dayEntries : [],
          weekEntries:
            previous.key === requestedKey ? previous.weekEntries : [],
          loading: false,
          error,
        }));
      }
    }
  }, [key, userId, childId, dateKey]);

  const reloadRef = useRef(reload);
  reloadRef.current = reload;

  // Recharge SQLite après une sauvegarde ou une suppression locale.
  // Aucun appel réseau n'est nécessaire.
  useEffect(() => {
    const unsubscribe = subscribeToTrackingChanges((change) => {
      if (change.userId !== userId || change.childId !== childId) {
        return;
      }

      void reloadRef.current();
    });

    // Couvre également les changements survenus avant l'abonnement.
    void reloadRef.current();

    return unsubscribe;
  }, [userId, childId]);

  // Recharge au focus et lorsque la période change.
  useFocusEffect(
    useCallback(() => {
      void reload();

      return () => {
        requestId.current += 1;
      };
    }, [reload]),
  );

  // Synchronise au focus ou au changement de compte/enfant.
  useFocusEffect(
    useCallback(() => {
      let active = true;

      setSyncError(null);

      if (!userId || !childId || !accessToken) {
        return undefined;
      }

      async function synchronize() {
        try {
          await synchronizeTracking({
            userId,
            childId,
            accessToken,
            refreshSession,
          });
        } catch (error) {
          if (active) {
            setSyncError(error);
          }
        } finally {
          if (active) {
            await reloadRef.current();
          }
        }
      }

      void synchronize();

      return () => {
        active = false;
      };
    }, [userId, childId, accessToken, refreshSession]),
  );

  const refresh = useCallback(async () => {
    if (!userId || !childId || refreshLock.current) {
      return;
    }

    const requestedKey = key;

    refreshLock.current = true;
    setRefreshingKey(requestedKey);
    setSyncError(null);

    try {
      await reload();

      if (accessToken) {
        await synchronizeTracking({
          userId,
          childId,
          accessToken,
          refreshSession,
        });
      }
    } catch (error) {
      if (mounted.current && currentKey.current === requestedKey) {
        setSyncError(error);
      }
    } finally {
      if (mounted.current) {
        await reloadRef.current();
        setRefreshingKey(null);
      }

      refreshLock.current = false;
    }
  }, [key, userId, childId, accessToken, refreshSession, reload]);

  const matches = state.key === key;

  return {
    dayEntries: matches ? state.dayEntries : [],
    weekEntries: matches ? state.weekEntries : [],
    loading: !matches || state.loading,
    error: matches ? state.error : null,
    syncError,
    isRefreshing: refreshingKey === key,
    refresh,
  };
}
