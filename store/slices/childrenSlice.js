import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import {
  createChild as createChildApi,
  deleteChildAvatar as deleteChildAvatarApi,
  getAccessibleChildren,
  updateChild as updateChildApi,
  uploadChildAvatar as uploadChildAvatarApi,
} from "../../api/childrenApi.js";

import { setThemeMode } from "./themeSlice.js";

import { saveChildPreferencesLocally } from "../../database/childPreferencesRepository.js";

import {
  getLocalChildProfiles,
  saveChildProfileLocally,
} from "../../database/childProfileRepository.js";

import {
  getLocalChildRelationships,
  saveChildRelationshipLocally,
} from "../../database/childRelationshipRepository.js";

import { enqueueSyncOperation } from "../../sync/syncQueueRepository.js";

import { processSyncQueue } from "../../sync/processSyncQueue.js";

import {
  getSelectedChildId,
  removeSelectedChildId,
  saveSelectedChildId,
} from "../childrenSelectionStorage.js";

function createInitialState() {
  return {
    children: [],
    selectedChildId: null,
    status: "idle",
    error: null,
    lastSyncAt: null,
    activeRequestId: null,
  };
}

async function readStoredSelection() {
  try {
    return await getSelectedChildId();
  } catch (error) {
    console.error("Unable to restore the selected child:", error);

    return null;
  }
}

async function persistSelection(childId) {
  try {
    if (childId) {
      await saveSelectedChildId(childId);
    } else {
      await removeSelectedChildId();
    }
  } catch (error) {
    console.error("Unable to persist the selected child:", error);
  }
}

async function executeWithRefreshedAccessToken({
  accessToken,
  refreshSession,
  request,
}) {
  try {
    return await request(accessToken);
  } catch (error) {
    if (error.code !== "ACCESS_TOKEN_EXPIRED") {
      throw error;
    }

    const refreshedAccessToken = await refreshSession();

    if (!refreshedAccessToken) {
      const sessionError = new Error(
        "Unable to restore the authentication session.",
      );

      sessionError.code = "AUTHENTICATION_SESSION_EXPIRED";

      throw sessionError;
    }

    return request(refreshedAccessToken);
  }
}

export const loadChildren = createAsyncThunk(
  "children/loadChildren",

  async (
    { userId, accessToken, refreshSession },
    { signal, rejectWithValue },
  ) => {
    try {
      if (!userId) {
        const error = new Error("Missing user ID.");
        error.code = "MISSING_USER_ID";
        throw error;
      }

      /*
       * On lance en parallèle :
       * - la lecture de l'enfant sélectionné ;
       * - la lecture des modifications locales.
       */
      const storedSelectedChildIdPromise = readStoredSelection();
      const localProfilesPromise = getLocalChildProfiles(userId);
      const localRelationshipsPromise = getLocalChildRelationships(userId);

      /*
       * On récupère les enfants depuis le backend.
       */
      const response = await executeWithRefreshedAccessToken({
        accessToken,
        refreshSession,

        request: (currentAccessToken) =>
          getAccessibleChildren({
            accessToken: currentAccessToken,
            signal,
          }),
      });

      const serverChildren = Array.isArray(response?.children)
        ? response.children
        : [];

      const [storedSelectedChildId, localProfiles, localRelationships] =
        await Promise.all([
          storedSelectedChildIdPromise,
          localProfilesPromise,
          localRelationshipsPromise,
        ]);

      /*
       * Si un profil local est encore "pending",
       * ses informations passent devant celles du serveur.
       */
      const children = serverChildren.map((serverChild) => {
        const localProfile = localProfiles.find(
          (currentLocalChild) =>
            currentLocalChild.id === serverChild.id &&
            currentLocalChild.profileSyncStatus === "pending",
        );

        const localRelationship = localRelationships.find(
          (currentRelationship) =>
            currentRelationship.childId === serverChild.id &&
            currentRelationship.syncStatus === "pending",
        );

        return {
          ...serverChild,

          ...(localProfile || {}),

          ...(localRelationship
            ? {
                currentUserRelationship: localRelationship.relationship,

                currentUserRelationshipLabel:
                  localRelationship.relationshipLabel,

                relationshipSyncStatus: localRelationship.syncStatus,
              }
            : {}),
        };
      });

      const selectedChildId = children.some(
        (child) => child.id === storedSelectedChildId,
      )
        ? storedSelectedChildId
        : children[0]?.id || null;

      await persistSelection(selectedChildId);

      return {
        children,
        selectedChildId,
        lastSyncAt: new Date().toISOString(),
      };
    } catch (error) {
      return rejectWithValue({
        code: error.code || "CHILDREN_LOAD_FAILED",
        message: error.message || "Unable to load children.",
      });
    }
  },
);

export const createChild = createAsyncThunk(
  "children/createChild",

  async (
    { childData, accessToken, refreshSession },
    { signal, rejectWithValue },
  ) => {
    try {
      const response = await executeWithRefreshedAccessToken({
        accessToken,
        refreshSession,

        request: (currentAccessToken) =>
          createChildApi({
            childData,
            accessToken: currentAccessToken,
            signal,
          }),
      });

      if (!response?.child?.id) {
        const responseError = new Error(
          "The server did not return the created child.",
        );

        responseError.code = "INVALID_CHILD_RESPONSE";

        throw responseError;
      }

      await persistSelection(response.child.id);

      return {
        child: response.child,
      };
    } catch (error) {
      return rejectWithValue({
        code: error.code || "CHILD_CREATION_FAILED",

        message: error.message || "Unable to create the child.",
      });
    }
  },
);

export const updateChildProfile = createAsyncThunk(
  "children/updateChildProfile",

  async (
    { userId, childId, childData, accessToken, refreshSession },
    { rejectWithValue },
  ) => {
    try {
      if (!userId) {
        const error = new Error("Missing user ID.");
        error.code = "MISSING_USER_ID";
        throw error;
      }

      const localChild = await saveChildProfileLocally({
        userId,
        childId,
        childData,
        syncStatus: "pending",
      });

      await enqueueSyncOperation({
        userId,
        entityType: "child_profile",
        entityId: childId,
        operation: "update",
        endpoint: `/api/children/${encodeURIComponent(childId)}`,
        method: "PATCH",
        payload: childData,
      });

      processSyncQueue({
        userId,
        accessToken,
        refreshSession,
      }).catch((error) => {
        console.error("Unable to synchronize child profile:", error);
      });

      return {
        childId,
        childData: localChild,
        syncStatus: "pending",
      };
    } catch (error) {
      return rejectWithValue({
        code: error.code || "CHILD_UPDATE_FAILED",
        message: error.message || "Unable to update the child.",
      });
    }
  },
);

export const updateCurrentUserRelationship = createAsyncThunk(
  "children/updateCurrentUserRelationship",

  async (
    { userId, childId, relationship, accessToken, refreshSession },
    { rejectWithValue },
  ) => {
    try {
      if (!userId) {
        const error = new Error("Missing user ID.");
        error.code = "MISSING_USER_ID";
        throw error;
      }

      if (!childId) {
        const error = new Error("Missing child ID.");
        error.code = "MISSING_CHILD_ID";
        throw error;
      }

      if (!relationship) {
        const error = new Error("Missing relationship.");
        error.code = "MISSING_RELATIONSHIP";
        throw error;
      }

      await saveChildRelationshipLocally({
        userId,
        childId,
        relationship,
        relationshipLabel: null,
        syncStatus: "pending",
      });

      await enqueueSyncOperation({
        userId,
        entityType: "child_relationship",
        entityId: childId,
        operation: "update",
        endpoint: `/api/children/${encodeURIComponent(childId)}/members/me`,
        method: "PATCH",
        payload: {
          relationship,
        },
      });

      processSyncQueue({
        userId,
        accessToken,
        refreshSession,
      }).catch((error) => {
        console.error("Unable to synchronize child relationship:", error);
      });

      return {
        childId,
        relationship,
        relationshipLabel: null,
        syncStatus: "pending",
      };
    } catch (error) {
      return rejectWithValue({
        code: error.code || "CHILD_RELATIONSHIP_UPDATE_FAILED",
        message: error.message || "Unable to update the child relationship.",
      });
    }
  },
);

export const updateChildPreferences = createAsyncThunk(
  "children/updateChildPreferences",

  async (
    { userId, childId, preferences, accessToken, refreshSession },
    { rejectWithValue },
  ) => {
    try {
      if (!userId) {
        const userError = new Error("Missing user ID.");

        userError.code = "MISSING_USER_ID";

        throw userError;
      }

      /*
       * 1. Sauvegarde durable sur le téléphone.
       */
      await saveChildPreferencesLocally({
        userId,
        childId,
        preferences,
        syncStatus: "pending",
      });

      /*
       * 2. Préparation de la synchronisation serveur.
       */
      await enqueueSyncOperation({
        userId,
        entityType: "child_preferences",
        entityId: childId,
        operation: "update",
        endpoint: `/api/children/${encodeURIComponent(childId)}/preferences`,
        method: "PATCH",
        payload: preferences,
      });

      processSyncQueue({
        userId,
        accessToken,
        refreshSession,
      }).catch((error) => {
        console.error("Unable to synchronize child preferences:", error);
      });

      /*
       * 3. Redux est mis à jour immédiatement.
       * SyncManager s'occupera du backend.
       */
      return {
        childId,
        preferences,
        syncStatus: "pending",
      };
    } catch (error) {
      return rejectWithValue({
        code: error.code || "CHILD_PREFERENCES_UPDATE_FAILED",

        message: error.message || "Unable to update the child preferences.",
      });
    }
  },
);

export const updateChildAvatar = createAsyncThunk(
  "children/updateChildAvatar",

  async (
    { childId, image, accessToken, refreshSession },
    { signal, rejectWithValue },
  ) => {
    try {
      const response = await executeWithRefreshedAccessToken({
        accessToken,
        refreshSession,

        request: (currentAccessToken) =>
          uploadChildAvatarApi({
            childId,
            image,
            accessToken: currentAccessToken,
            signal,
          }),
      });

      if (!response?.avatar) {
        const responseError = new Error(
          "The server did not return the updated avatar.",
        );

        responseError.code = "INVALID_AVATAR_RESPONSE";

        throw responseError;
      }

      return {
        childId,
        avatar: response.avatar,
      };
    } catch (error) {
      return rejectWithValue({
        code: error.code || "AVATAR_UPDATE_FAILED",

        message: error.message || "Unable to update the child avatar.",
      });
    }
  },
);

export const removeChildAvatar = createAsyncThunk(
  "children/removeChildAvatar",

  async (
    { childId, accessToken, refreshSession },
    { signal, rejectWithValue },
  ) => {
    try {
      await executeWithRefreshedAccessToken({
        accessToken,
        refreshSession,

        request: (currentAccessToken) =>
          deleteChildAvatarApi({
            childId,
            accessToken: currentAccessToken,
            signal,
          }),
      });

      return {
        childId,
      };
    } catch (error) {
      return rejectWithValue({
        code: error.code || "AVATAR_REMOVAL_FAILED",

        message: error.message || "Unable to remove the child avatar.",
      });
    }
  },
);

const childrenSlice = createSlice({
  name: "children",
  initialState: createInitialState(),

  reducers: {
    childSelected(state, action) {
      const childId = action.payload.childId;

      const isAccessible = state.children.some((child) => child.id === childId);

      if (isAccessible) {
        state.selectedChildId = childId;
      }
    },

    clearChildren() {
      return createInitialState();
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(loadChildren.pending, (state, action) => {
        state.status = "loading";
        state.error = null;
        state.activeRequestId = action.meta.requestId;
      })

      .addCase(loadChildren.fulfilled, (state, action) => {
        if (state.activeRequestId !== action.meta.requestId) {
          return;
        }

        state.children = action.payload.children;

        state.selectedChildId = action.payload.selectedChildId;

        state.status = "succeeded";
        state.error = null;

        state.lastSyncAt = action.payload.lastSyncAt;

        state.activeRequestId = null;
      })

      .addCase(loadChildren.rejected, (state, action) => {
        if (state.activeRequestId !== action.meta.requestId) {
          return;
        }

        state.status = action.meta.aborted ? "idle" : "failed";

        state.error = action.meta.aborted
          ? null
          : action.payload || {
              code: action.error.code || "CHILDREN_LOAD_FAILED",

              message: action.error.message || "Unable to load children.",
            };

        state.activeRequestId = null;
      })

      .addCase(createChild.fulfilled, (state, action) => {
        const createdChild = action.payload.child;

        const alreadyExists = state.children.some(
          (child) => child.id === createdChild.id,
        );

        if (alreadyExists) {
          return;
        }

        state.children.push(createdChild);
        state.selectedChildId = createdChild.id;
        state.lastSyncAt = new Date().toISOString();
      })

      .addCase(updateChildProfile.fulfilled, (state, action) => {
        const childIndex = state.children.findIndex(
          (child) => child.id === action.payload.childId,
        );

        if (childIndex === -1) {
          return;
        }

        state.children[childIndex] = {
          ...state.children[childIndex],
          ...action.payload.childData,
          profileSyncStatus: action.payload.syncStatus,
        };
      })

      .addCase(updateCurrentUserRelationship.fulfilled, (state, action) => {
        const child = state.children.find(
          (currentChild) => currentChild.id === action.payload.childId,
        );

        if (!child) {
          return;
        }

        child.currentUserRelationship = action.payload.relationship;

        child.currentUserRelationshipLabel = action.payload.relationshipLabel;

        child.relationshipSyncStatus = action.payload.syncStatus;

        child.updatedAt = new Date().toISOString();
      })

      .addCase(updateChildPreferences.fulfilled, (state, action) => {
        const child = state.children.find(
          (currentChild) => currentChild.id === action.payload.childId,
        );

        if (!child) {
          return;
        }

        const preferences = action.payload.preferences;

        if (preferences.themeMode !== undefined) {
          child.themeMode = preferences.themeMode;
        }

        if (preferences.visibleTrackingTypes !== undefined) {
          child.visibleTrackingTypes = preferences.visibleTrackingTypes;
        }

        if (preferences.visibleFeedingMethods !== undefined) {
          child.visibleFeedingMethods = preferences.visibleFeedingMethods;
        }

        child.preferencesSyncStatus = action.payload.syncStatus;

        child.updatedAt = new Date().toISOString();
      })

      .addCase(updateChildAvatar.fulfilled, (state, action) => {
        const child = state.children.find(
          (currentChild) => currentChild.id === action.payload.childId,
        );

        if (!child) {
          return;
        }

        child.avatar = action.payload.avatar;
        child.updatedAt = new Date().toISOString();
      })

      .addCase(removeChildAvatar.fulfilled, (state, action) => {
        const child = state.children.find(
          (currentChild) => currentChild.id === action.payload.childId,
        );

        if (!child) {
          return;
        }

        child.avatar = null;
        child.updatedAt = new Date().toISOString();
      });
  },
});

export const { childSelected, clearChildren } = childrenSlice.actions;

export function selectChild(childId) {
  return async (dispatch, getState) => {
    const child = getState().children.children.find(
      (currentChild) => currentChild.id === childId,
    );

    if (!child) {
      return false;
    }

    dispatch(
      childSelected({
        childId,
        themeMode: child.themeMode ?? "blue",
      }),
    );

    dispatch(setThemeMode(child.themeMode ?? "blue"));

    await persistSelection(childId);

    return true;
  };
}

export function clearChildrenAndSelection() {
  return async (dispatch) => {
    dispatch(clearChildren());
    await persistSelection(null);
  };
}

export default childrenSlice.reducer;
