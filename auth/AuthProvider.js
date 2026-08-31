import { Platform } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";

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
  removeRefreshToken,
  saveRefreshToken,
} from "./tokenStorage";

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

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  const clearSession = useCallback(async () => {
    await removeRefreshToken();

    dispatch({
      type: "UNAUTHENTICATED",
    });
  }, []);

  const restoreSession = useCallback(async () => {
    try {
      const storedRefreshToken = await getRefreshToken();

      if (!storedRefreshToken) {
        dispatch({
          type: "UNAUTHENTICATED",
        });

        return;
      }

      const refreshedSession = await refreshAuthSession(storedRefreshToken);

      await saveRefreshToken(refreshedSession.refreshToken);

      const currentUserResponse = await getCurrentUser(
        refreshedSession.accessToken,
      );

      dispatch({
        type: "AUTHENTICATED",
        payload: {
          accessToken: refreshedSession.accessToken,
          user: currentUserResponse.user,
        },
      });
    } catch (error) {
      console.error("Unable to restore authentication session:", error);

      await clearSession();
    }
  }, [clearSession]);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  const requestLoginCode = useCallback(async (email, locale) => {
    return requestLoginCodeApi(email.trim().toLowerCase(), locale);
  }, []);

  const verifyLoginCode = useCallback(async (parameters) => {
    const result = await verifyLoginCodeApi({
      ...parameters,
      email: parameters.email.trim().toLowerCase(),
    });

    await saveRefreshToken(result.refreshToken);

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

      await saveRefreshToken(result.refreshToken);

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

      await saveRefreshToken(result.refreshToken);

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
    const storedRefreshToken = await getRefreshToken();

    if (!storedRefreshToken) {
      await clearSession();
      return null;
    }

    try {
      const result = await refreshAuthSession(storedRefreshToken);

      await saveRefreshToken(result.refreshToken);

      dispatch({
        type: "AUTHENTICATED",
        payload: {
          accessToken: result.accessToken,
          user: state.user,
        },
      });

      return result.accessToken;
    } catch (error) {
      await clearSession();
      throw error;
    }
  }, [clearSession, state.user]);

  const logout = useCallback(async () => {
    const storedRefreshToken = await getRefreshToken();

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
      isAuthenticated: state.status === "authenticated",
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
