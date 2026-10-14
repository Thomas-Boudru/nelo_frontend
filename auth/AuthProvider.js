import { AppState, Platform } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { setBillingUser } from "../services/billing/revenuecatService";

import {
  GoogleSignin,
  isSuccessResponse,
  isCancelledResponse,
} from "@react-native-google-signin/google-signin";

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  scopes: ["email", "profile"],
});

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";

import {
  getCurrentUser,
  logoutAuthSession,
  refreshAuthSession,
  requestLoginCode as requestLoginCodeApi,
  signInWithApple as signInWithAppleApi,
  signInWithGoogle as signInWithGoogleApi,
  verifyLoginCode as verifyLoginCodeApi,
} from "../api/authApi";

import {
  getRefreshToken,
  getStoredSession,
  removeRefreshToken,
  saveAuthenticatedSession,
  saveRefreshToken,
  saveStoredUser,
} from "./tokenStorage";

const {
  createRefreshSessionCoordinator,
} = require("./refreshSessionCoordinator");

const AuthContext = createContext(null);

const initialState = {
  status: "initializing",
  user: null,
  accessToken: null,
};

function authReducer(state, action) {
  switch (action.type) {
    case "AUTHENTICATED":
      return {
        status: "authenticated",
        user: action.payload.user,
        accessToken: action.payload.accessToken,
      };

    case "OFFLINE_SESSION":
      return {
        status: "offline",
        user: action.payload.user,
        accessToken: null,
      };

    case "UNAUTHENTICATED":
      return {
        status: "unauthenticated",
        user: null,
        accessToken: null,
      };

    case "UPDATE_USER":
      return {
        ...state,
        user: action.payload,
      };

    default:
      return state;
  }
}

async function createAppleNonce() {
  const randomBytes = await Crypto.getRandomBytesAsync(32);

  const rawNonce = Array.from(randomBytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce,
  );

  return {
    rawNonce,
    hashedNonce,
  };
}

const INVALID_SESSION_CODES = new Set([
  "INVALID_REFRESH_TOKEN",
  "REFRESH_TOKEN_EXPIRED",
  "ACCOUNT_UNAVAILABLE",
  "INVALID_SESSION",
  "INVALID_ACCESS_TOKEN",
  "AUTHENTICATION_REQUIRED",
]);

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

const {
  assertCurrentGeneration,
  beginSessionTransition,
  getSessionGeneration,
  refreshStoredSession,
} = createRefreshSessionCoordinator({
  getRefreshToken,
  refreshAuthSession,
  saveRefreshToken,
});

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const restoreInFlightRef = useRef(null);

  useEffect(() => {
    setBillingUser(state.status === "authenticated" ? state.user?.id : null);
  }, [state.status, state.user?.id]);

  const clearSession = useCallback(async () => {
    beginSessionTransition();

    // Bloque immédiatement les nouvelles opérations de paiement.
    setBillingUser(null);

    try {
      await removeRefreshToken();
    } finally {
      dispatch({
        type: "UNAUTHENTICATED",
      });
    }
  }, []);

  const restoreSession = useCallback(() => {
    if (restoreInFlightRef.current) {
      return restoreInFlightRef.current;
    }

    const generation = getSessionGeneration();

    const operation = (async () => {
      let storedSession;

      try {
        storedSession = await getStoredSession();
        assertCurrentGeneration(generation);

        if (!storedSession?.refreshToken) {
          dispatch({ type: "UNAUTHENTICATED" });
          return;
        }

        for (let attempt = 0; attempt < 2; attempt += 1) {
          try {
            const refreshedSession = await refreshStoredSession();

            assertCurrentGeneration(generation);

            if (!refreshedSession) {
              dispatch({ type: "UNAUTHENTICATED" });
              return;
            }

            const currentUserResponse = await getCurrentUser(
              refreshedSession.accessToken,
            );

            assertCurrentGeneration(generation);

            const currentUser = currentUserResponse?.user;

            if (!currentUser?.id) {
              const error = new Error("Invalid user response.");
              error.code = "INVALID_USER_RESPONSE";
              throw error;
            }

            // Ajouter ou actualiser le profil de la session persistée.
            // Un changement de token concurrent ne doit pas être écrasé.
            try {
              await saveStoredUser({
                user: currentUser,
                expectedRefreshToken: refreshedSession.refreshToken,
              });
            } catch {
              // Une erreur de stockage ne doit pas annuler
              // une authentification confirmée par le serveur.
              console.warn("[Auth] Unable to cache the user profile.");
            }

            assertCurrentGeneration(generation);

            dispatch({
              type: "AUTHENTICATED",
              payload: {
                accessToken: refreshedSession.accessToken,
                user: currentUser,
              },
            });

            return;
          } catch (error) {
            // Vérifier aussi la génération sur les réponses en erreur :
            // une ancienne requête ne doit pas effacer un nouveau compte.
            assertCurrentGeneration(generation);

            if (error?.code === "AUTH_SESSION_CHANGED") {
              return;
            }

            if (INVALID_SESSION_CODES.has(error?.code)) {
              await clearSession();
              return;
            }

            const isTemporaryError =
              error?.code === "NETWORK_ERROR" ||
              error?.code === "REQUEST_TIMEOUT" ||
              error?.status === 0 ||
              error?.status === 429 ||
              error?.status >= 500;

            if (!isTemporaryError) {
              throw error;
            }

            if (attempt === 0) {
              await wait(750);
              assertCurrentGeneration(generation);
              continue;
            }

            // Le compte a déjà été connecté sur cet appareil.
            // Autoriser uniquement la session locale :
            // aucun access token n'est fabriqué ou réutilisé.
            if (storedSession.user?.id) {
              dispatch({
                type: "OFFLINE_SESSION",
                payload: {
                  user: storedSession.user,
                },
              });
            } else {
              // Ancienne session sans profil sauvegardé :
              // une connexion réseau reste nécessaire une première fois.
              dispatch({ type: "UNAUTHENTICATED" });
            }

            return;
          }
        }
      } catch (error) {
        if (
          error?.code === "AUTH_SESSION_CHANGED" ||
          generation !== getSessionGeneration()
        ) {
          return;
        }

        console.warn("[Auth] Unable to restore session", {
          code: error?.code,
          status: error?.status,
        });

        dispatch({ type: "UNAUTHENTICATED" });
      }
    })();

    const trackedOperation = operation.finally(() => {
      if (restoreInFlightRef.current === trackedOperation) {
        restoreInFlightRef.current = null;
      }
    });

    restoreInFlightRef.current = trackedOperation;

    return trackedOperation;
  }, [clearSession]);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    if (state.status !== "offline") {
      return;
    }

    const retry = () => {
      if (AppState.currentState === "active") {
        void restoreSession();
      }
    };

    // Réessayer au retour dans l'application.
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        retry();
      }
    });

    // Couvre aussi le retour du réseau pendant que l'app reste ouverte.
    const timer = setInterval(retry, 30_000);

    return () => {
      subscription.remove();
      clearInterval(timer);
    };
  }, [state.status, restoreSession]);

  const requestLoginCode = useCallback(async (email, locale) => {
    return requestLoginCodeApi(email.trim().toLowerCase(), locale);
  }, []);

  const verifyLoginCode = useCallback(async (parameters) => {
    const result = await verifyLoginCodeApi({
      ...parameters,
      email: parameters.email.trim().toLowerCase(),
    });

    beginSessionTransition();

    await saveAuthenticatedSession({
      refreshToken: result.refreshToken,
      user: result.user,
    });

    dispatch({
      type: "AUTHENTICATED",
      payload: {
        accessToken: result.accessToken,
        user: result.user,
      },
    });

    return result;
  }, []);

  const signInWithApple = useCallback(
    async ({
      locale = "en",
      deviceName,
      platform = Platform.OS,
      appVersion,
    } = {}) => {
      const isAvailable = await AppleAuthentication.isAvailableAsync();

      if (!isAvailable) {
        const error = new Error(
          "Sign in with Apple is not available on this device.",
        );

        error.code = "APPLE_AUTHENTICATION_UNAVAILABLE";

        throw error;
      }

      const { rawNonce, hashedNonce } = await createAppleNonce();

      let credential;

      try {
        credential = await AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
          ],

          nonce: hashedNonce,
        });
      } catch (error) {
        if (error.code === "ERR_REQUEST_CANCELED") {
          return {
            cancelled: true,
          };
        }

        throw error;
      }

      if (!credential.identityToken || !credential.authorizationCode) {
        const error = new Error(
          "Apple did not return the required authentication information.",
        );

        error.code = "INCOMPLETE_APPLE_AUTHENTICATION";

        throw error;
      }

      const result = await signInWithAppleApi({
        identityToken: credential.identityToken,
        authorizationCode: credential.authorizationCode,
        nonce: rawNonce,
        locale,
        deviceName,
        platform,
        appVersion,
      });

      beginSessionTransition();

      await saveAuthenticatedSession({
        refreshToken: result.refreshToken,
        user: result.user,
      });

      dispatch({
        type: "AUTHENTICATED",
        payload: {
          accessToken: result.accessToken,
          user: result.user,
        },
      });

      return {
        ...result,
        cancelled: false,
      };
    },
    [],
  );

  const signInWithGoogle = useCallback(
    async ({
      locale = "en",
      deviceName,
      platform = Platform.OS,
      appVersion,
    } = {}) => {
      if (Platform.OS === "android") {
        await GoogleSignin.hasPlayServices({
          showPlayServicesUpdateDialog: true,
        });
      }

      const googleResponse = await GoogleSignin.signIn();

      if (isCancelledResponse(googleResponse)) {
        return {
          cancelled: true,
        };
      }

      if (!isSuccessResponse(googleResponse) || !googleResponse.data.idToken) {
        const error = new Error(
          "Google did not return the required authentication information.",
        );

        error.code = "INCOMPLETE_GOOGLE_AUTHENTICATION";

        throw error;
      }

      const result = await signInWithGoogleApi({
        idToken: googleResponse.data.idToken,
        locale,
        deviceName,
        platform,
        appVersion,
      });

      if (result.verificationRequired) {
        return {
          ...result,
          googleIdToken: googleResponse.data.idToken,
          cancelled: false,
        };
      }

      beginSessionTransition();

      await saveAuthenticatedSession({
        refreshToken: result.refreshToken,
        user: result.user,
      });

      dispatch({
        type: "AUTHENTICATED",
        payload: {
          accessToken: result.accessToken,
          user: result.user,
        },
      });

      return {
        ...result,
        cancelled: false,
      };
    },
    [],
  );

  const refreshSession = useCallback(async () => {
    try {
      const result = await refreshStoredSession();

      if (!result) {
        await clearSession();
        return null;
      }

      dispatch({
        type: "AUTHENTICATED",
        payload: {
          accessToken: result.accessToken,
          user: state.user,
        },
      });

      return result.accessToken;
    } catch (error) {
      console.warn("[Auth] Refresh failed", {
        code: error?.code,
        status: error?.status,
      });

      // Une panne réseau ou serveur ne doit pas effacer la session.
      if (INVALID_SESSION_CODES.has(error?.code)) {
        await clearSession();
      }

      throw error;
    }
  }, [clearSession, state.user]);

  const logout = useCallback(async () => {
    const storedRefreshToken = await getRefreshToken();

    beginSessionTransition();
    setBillingUser(null);

    try {
      if (storedRefreshToken) {
        await logoutAuthSession(storedRefreshToken);
      }
    } catch (error) {
      console.error("Unable to revoke the remote session:", error);
    } finally {
      await clearSession();
    }
  }, [clearSession]);

  const updateAuthenticatedUser = useCallback((user) => {
    dispatch({
      type: "UPDATE_USER",
      payload: user,
    });
  }, []);

  const value = useMemo(
    () => ({
      status: state.status,
      isInitializing: state.status === "initializing",
      // Signifie ici : un compte est ouvert dans l'application,
      // y compris pour consulter ses données locales.
      isAuthenticated:
        state.status === "authenticated" || state.status === "offline",

      isOfflineSession: state.status === "offline",

      // Nécessaire pour les traitements qui doivent contacter le backend.
      canCallAuthenticatedApi:
        state.status === "authenticated" && Boolean(state.accessToken),
      user: state.user,
      accessToken: state.accessToken,
      requestLoginCode,
      verifyLoginCode,
      signInWithApple,
      signInWithGoogle,
      refreshSession,
      logout,
      updateAuthenticatedUser,
    }),
    [
      state,
      requestLoginCode,
      verifyLoginCode,
      signInWithApple,
      signInWithGoogle,
      refreshSession,
      logout,
      updateAuthenticatedUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}
