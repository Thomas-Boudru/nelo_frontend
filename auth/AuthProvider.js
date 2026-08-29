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
      refreshSession,
      logout,
      updateAuthenticatedUser,
    }),
    [
      state,
      requestLoginCode,
      verifyLoginCode,
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
