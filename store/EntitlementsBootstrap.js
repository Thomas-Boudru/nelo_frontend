import { useEffect } from "react";
import { useDispatch } from "react-redux";

import { useAuth } from "../auth/AuthProvider.js";
import { setEntitlementsUser } from "./slices/entitlementsSlice.js";

export default function EntitlementsBootstrap() {
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useAuth();

  const userId = isAuthenticated ? (user?.id ?? null) : null;

  useEffect(() => {
    dispatch(setEntitlementsUser(userId));
  }, [dispatch, userId]);

  return null;
}
