import { useCallback, useEffect } from "react";
import { AppState } from "react-native";
import * as Network from "expo-network";
import { getLocales } from "expo-localization";
import { useTranslation } from "react-i18next";

import { useAuth } from "../auth/AuthProvider.js";
import { getUserPreferences } from "../api/user/userPreferencesApi.js";
import {
  getLocalUserPreferences,
  saveServerUserPreferencesLocally,
} from "../database/user/userPreferencesRepository.js";
import { processSyncQueue } from "./processSyncQueue.js";

const SUPPORTED_LANGUAGES = new Set(["en", "fr", "de", "es", "it", "nl", "pt"]);

function getDeviceLanguage() {
  const languageCode = getLocales()[0]?.languageCode?.toLowerCase();

  return SUPPORTED_LANGUAGES.has(languageCode) ? languageCode : "en";
}

async function fetchUserPreferences(accessToken, refreshSession) {
  try {
    return await getUserPreferences({ accessToken });
  } catch (error) {
    if (error?.code !== "ACCESS_TOKEN_EXPIRED") {
      throw error;
    }

    const refreshedAccessToken = await refreshSession();

    if (!refreshedAccessToken) {
      throw error;
    }

    return getUserPreferences({
      accessToken: refreshedAccessToken,
    });
  }
}

export default function SyncManager() {
  const { i18n } = useTranslation();

  const { isAuthenticated, user, accessToken, refreshSession } = useAuth();

  console.log("[Language] SyncManager", {
    isAuthenticated,
    userId: user?.id,
    hasAccessToken: Boolean(accessToken),
  });

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
   * Charge la langue enregistrée localement, puis récupère
   * celle du compte si aucune modification locale n'attend.
   */
  useEffect(() => {
    let cancelled = false;

    if (!isAuthenticated || !user?.id) {
      i18n.changeLanguage(getDeviceLanguage()).catch((error) => {
        console.error("Unable to restore device language:", error);
      });

      return undefined;
    }

    async function loadLanguage() {
      try {
        const localPreferences = await getLocalUserPreferences(user.id);

        if (cancelled) {
          return;
        }

        await i18n.changeLanguage(
          localPreferences?.languageCode ?? getDeviceLanguage(),
        );

        if (!accessToken || cancelled) {
          return;
        }

        // Une modification locale en attente a priorité sur le serveur.
        if (localPreferences?.syncStatus === "pending") {
          return;
        }

        const response = await fetchUserPreferences(
          accessToken,
          refreshSession,
        );

        if (cancelled) {
          return;
        }

        /*
         * Si l'utilisateur a changé sa langue pendant l'appel réseau,
         * on ignore la réponse devenue ancienne.
         */
        const latestLocalPreferences = await getLocalUserPreferences(user.id);

        if (cancelled) {
          return;
        }

        if (
          latestLocalPreferences?.syncStatus === "pending" ||
          latestLocalPreferences?.updatedAt !== localPreferences?.updatedAt
        ) {
          return;
        }

        const preferences = await saveServerUserPreferencesLocally({
          userId: user.id,
          preferences: response.preferences,
        });

        if (cancelled) {
          return;
        }

        await i18n.changeLanguage(
          preferences.languageCode ?? getDeviceLanguage(),
        );
      } catch (error) {
        console.error("Unable to load user language:", error);
      }
    }

    loadLanguage();

    return () => {
      cancelled = true;
    };
  }, [accessToken, i18n, isAuthenticated, refreshSession, user?.id]);

  /*
   * Synchronisation lors de la connexion ou du démarrage.
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
   * Synchronisation lorsque Nelo revient au premier plan.
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
