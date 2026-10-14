import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  userId: null,
  families: {},
};

const entitlementsSlice = createSlice({
  name: "entitlements",
  initialState,

  reducers: {
    setEntitlementsUser(state, action) {
      const userId = action.payload ?? null;

      if (state.userId !== userId) {
        state.userId = userId;
        state.families = {};
      }
    },

    clearEntitlements() {
      return {
        userId: null,
        families: {},
      };
    },

    entitlementsRequested(state, action) {
      const { userId, familyId, requestId } = action.payload;

      if (!userId || state.userId !== userId) {
        return;
      }

      const previous = state.families[familyId];

      state.families[familyId] = {
        // Conserver les droits pendant leur actualisation.
        data: previous?.data ?? null,
        receivedAt: previous?.receivedAt ?? null,

        status: previous?.data ? "refreshing" : "loading",
        error: null,
        requestId,
      };
    },

    entitlementsReceived(state, action) {
      const { userId, familyId, requestId, entitlements, receivedAt } =
        action.payload;

      const entry = state.families[familyId];

      // Ignorer une réponse d'un ancien compte ou d'une ancienne requête.
      if (
        state.userId !== userId ||
        !entry ||
        entry.requestId !== requestId ||
        entitlements?.familyId !== familyId
      ) {
        return;
      }

      entry.data = entitlements;
      entry.receivedAt = receivedAt;
      entry.status = "ready";
      entry.error = null;
      entry.requestId = null;
    },

    entitlementsFailed(state, action) {
      const {
        userId,
        familyId,
        requestId,
        error,
        discardCachedData = false,
      } = action.payload;

      const entry = state.families[familyId];

      if (state.userId !== userId || !entry || entry.requestId !== requestId) {
        return;
      }

      // À utiliser notamment si le serveur confirme que l'utilisateur
      // n'a plus accès à cette famille.
      if (discardCachedData) {
        entry.data = null;
        entry.receivedAt = null;
      }

      // Une erreur réseau ne transforme pas les droits en formule Free.
      // Le hook décidera si les données conservées sont encore utilisables.
      entry.status = "error";
      entry.error = {
        code: error?.code ?? "ENTITLEMENTS_REQUEST_FAILED",
        message: error?.message ?? "Unable to verify your access.",
        status: error?.status ?? null,
      };

      entry.requestId = null;
    },
  },
});

export const {
  setEntitlementsUser,
  clearEntitlements,
  entitlementsRequested,
  entitlementsReceived,
  entitlementsFailed,
} = entitlementsSlice.actions;

export function selectFamilyEntitlementsEntry(state, userId, familyId) {
  if (!userId || !familyId || state.entitlements.userId !== userId) {
    return null;
  }

  return state.entitlements.families[familyId] ?? null;
}

export default entitlementsSlice.reducer;
