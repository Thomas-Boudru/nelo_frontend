import { useCallback, useEffect } from "react";
import { AppState } from "react-native";
import * as Network from "expo-network";

import { useAuth } from "../auth/AuthProvider.js";
import { processSyncQueue } from "./processSyncQueue.js";

export default function SyncManager() {
  const { isAuthenticated, user, accessToken, refreshSession } = useAuth();

  const synchronize = useCallback(() => {
    if (!isAuthenticated || !user?.id || !accessToken) {
      return;
    }

    processSyncQueue({
      userId: user.id,
      accessToken,
      refreshSession,
    }).catch((error) => {
      console.error("Unable to process the synchronization queue:", error);
    });
  }, [accessToken, isAuthenticated, refreshSession, user?.id]);

  /*
   * Synchronisation lors de la connexion
   * ou du démarrage de l'application.
   */
  useEffect(() => {
    synchronize();
  }, [synchronize]);

  /*
   * Synchronisation lorsque la connexion revient.
   */
  useEffect(() => {
    const networkSubscription = Network.addNetworkStateListener(
      (networkState) => {
        if (
          networkState.isConnected &&
          networkState.isInternetReachable !== false
        ) {
          synchronize();
        }
      },
    );

    return () => {
      networkSubscription.remove();
    };
  }, [synchronize]);

  /*
   * Synchronisation lorsque Nelo revient
   * au premier plan.
   */
  useEffect(() => {
    const appStateSubscription = AppState.addEventListener(
      "change",
      (nextAppState) => {
        if (nextAppState === "active") {
          synchronize();
        }
      },
    );

    return () => {
      appStateSubscription.remove();
    };
  }, [synchronize]);

  return null;
}
