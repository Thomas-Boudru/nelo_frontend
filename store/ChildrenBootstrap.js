import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { AppState } from "react-native";

import { useAuth } from "../auth/AuthProvider.js";

import {
  clearChildrenAndSelection,
  loadChildren,
} from "./slices/childrenSlice.js";

export default function ChildrenBootstrap() {
  const dispatch = useDispatch();

  const { accessToken, isAuthenticated, isInitializing, refreshSession, user } =
    useAuth();

  const userId = user?.id ?? null;

  useEffect(() => {
    if (isInitializing) {
      return undefined;
    }

    if (!isAuthenticated || !userId) {
      dispatch(clearChildrenAndSelection());
      return undefined;
    }

    let currentRequest = null;
    let disposed = false;

    const reload = () => {
      if (disposed) return;

      currentRequest?.abort();

      currentRequest = dispatch(
        loadChildren({
          userId,
          accessToken,
          refreshSession,
        }),
      );
    };

    // Sans token, loadChildren lit uniquement SQLite.
    reload();

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        reload();
      }
    });

    return () => {
      disposed = true;
      currentRequest?.abort();
      subscription.remove();
    };
  }, [
    accessToken,
    dispatch,
    isAuthenticated,
    isInitializing,
    refreshSession,
    userId,
    user?.onboardingCompletedAt,
  ]);

  return null;
}
