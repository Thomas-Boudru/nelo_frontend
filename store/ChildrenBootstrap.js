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

  useEffect(() => {
    if (isInitializing) {
      return undefined;
    }

    if (!isAuthenticated || !accessToken || !user?.id) {
      dispatch(clearChildrenAndSelection());
      return undefined;
    }

    const request = dispatch(
      loadChildren({
        userId: user.id,
        accessToken,
        refreshSession,
      }),
    );

    return () => {
      request.abort();
    };
  }, [
    accessToken,
    dispatch,
    isAuthenticated,
    isInitializing,
    refreshSession,
    user?.onboardingCompletedAt,
  ]);

  useEffect(() => {
    if (isInitializing || !isAuthenticated || !accessToken || !user?.id) {
      return undefined;
    }

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState !== "active") {
        return;
      }

      dispatch(
        loadChildren({
          userId: user.id,
          accessToken,
          refreshSession,
        }),
      );
    });

    return () => {
      subscription.remove();
    };
  }, [
    accessToken,
    dispatch,
    isAuthenticated,
    isInitializing,
    refreshSession,
    user?.id,
  ]);

  return null;
}
