import { createSlice } from "@reduxjs/toolkit";
import { getPendingInvitations } from "../../api/invitationsApi.js";

const initialState = {
  items: [],
  selectedInvitationId: null,
  status: "idle",
  error: null,
  hasChecked: false,
  dismissedIds: [],
};

const invitationsSlice = createSlice({
  name: "invitations",

  initialState,

  reducers: {
    startInvitationsCheck(state) {
      state.status = "loading";
      state.error = null;
    },

    completeInvitationsCheck(state, action) {
      state.items = action.payload ?? [];
      state.status = "succeeded";
      state.error = null;
      state.hasChecked = true;
    },

    failInvitationsCheck(state, action) {
      state.status = "failed";
      state.error = action.payload ?? null;
      state.hasChecked = true;
    },

    dismissInvitation(state, action) {
      const invitationId = action.payload;

      if (!state.dismissedIds.includes(invitationId)) {
        state.dismissedIds.push(invitationId);
      }
    },

    removeInvitation(state, action) {
      const invitationId = action.payload;

      state.items = state.items.filter(
        (invitation) => invitation.id !== invitationId,
      );

      state.dismissedIds = state.dismissedIds.filter(
        (id) => id !== invitationId,
      );

      if (state.selectedInvitationId === invitationId) {
        state.selectedInvitationId = null;
      }
    },

    selectInvitation(state, action) {
      state.selectedInvitationId = action.payload;
    },

    clearSelectedInvitation(state) {
      state.selectedInvitationId = null;
    },

    clearInvitations(state) {
      state.items = [];
      state.status = "idle";
      state.error = null;
      state.hasChecked = false;
      state.dismissedIds = [];
      state.selectedInvitationId = null;
    },
  },
});

export const {
  startInvitationsCheck,
  completeInvitationsCheck,
  failInvitationsCheck,
  dismissInvitation,
  selectInvitation,
  clearSelectedInvitation,
  removeInvitation,
  clearInvitations,
} = invitationsSlice.actions;

export const selectSelectedInvitation = (state) => {
  const selectedInvitationId = state.invitations.selectedInvitationId;

  if (!selectedInvitationId) {
    return null;
  }

  return (
    state.invitations.items.find(
      (invitation) => invitation.id === selectedInvitationId,
    ) ?? null
  );
};

export function checkPendingInvitations({ accessToken, refreshSession }) {
  return async (dispatch) => {
    dispatch(startInvitationsCheck());

    try {
      let response;

      try {
        response = await getPendingInvitations({
          accessToken,
        });
      } catch (error) {
        if (error?.code !== "ACCESS_TOKEN_EXPIRED") {
          throw error;
        }

        const refreshedAccessToken = await refreshSession();

        if (!refreshedAccessToken) {
          const authenticationError = new Error("Your session has expired.");

          authenticationError.code = "AUTHENTICATION_REQUIRED";

          throw authenticationError;
        }

        response = await getPendingInvitations({
          accessToken: refreshedAccessToken,
        });
      }

      const invitations = response.invitations ?? [];

      dispatch(completeInvitationsCheck(invitations));

      return invitations;
    } catch (error) {
      dispatch(
        failInvitationsCheck({
          code: error?.code ?? "UNKNOWN_ERROR",
          message: error?.message ?? "Unable to load pending invitations.",
        }),
      );

      throw error;
    }
  };
}

export const selectPendingInvitations = (state) => state.invitations.items;

export const selectVisiblePendingInvitations = (state) =>
  state.invitations.items.filter(
    (invitation) => !state.invitations.dismissedIds.includes(invitation.id),
  );

export const selectInvitationsStatus = (state) => state.invitations.status;

export const selectHasCheckedInvitations = (state) =>
  state.invitations.hasChecked;

export default invitationsSlice.reducer;
