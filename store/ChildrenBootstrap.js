import { useEffect } from "react";
import { useDispatch } from "react-redux";

import { useAuth } from "../auth/AuthProvider.js";
import {
  clearChildrenAndSelection,
  loadChildren,
} from "./slices/childrenSlice.js";

export default function ChildrenBootstrap() {
  const dispatch = useDispatch();
  const {
    accessToken,
    isAuthenticated,
    isInitializing,
    refreshSession,
    user,
  } = useAuth();

  useEffect(() => {
    if (isInitializing) {
      return undefined;
    }

    if (!isAuthenticated || !accessToken) {
      dispatch(clearChildrenAndSelection());
      return undefined;
    }

    const request = dispatch(
      loadChildren({
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

  return null;
}
