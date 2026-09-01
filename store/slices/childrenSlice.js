import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import {
  createChild as createChildApi,
  deleteChildAvatar as deleteChildAvatarApi,
  getAccessibleChildren,
  updateChild as updateChildApi,
  updateChildPreferences as updateChildPreferencesApi,
  uploadChildAvatar as uploadChildAvatarApi,
} from "../../api/childrenApi.js";

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

  async ({ accessToken, refreshSession }, { signal, rejectWithValue }) => {
    try {
      const storedSelectedChildIdPromise = readStoredSelection();

      const response = await executeWithRefreshedAccessToken({
        accessToken,
        refreshSession,

        request: (currentAccessToken) =>
          getAccessibleChildren({
            accessToken: currentAccessToken,
            signal,
          }),
      });

      const children = Array.isArray(response?.children)
        ? response.children
        : [];

      const storedSelectedChildId = await storedSelectedChildIdPromise;

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
    { childId, childData, accessToken, refreshSession },
    { signal, rejectWithValue },
  ) => {
    try {
      const response = await executeWithRefreshedAccessToken({
        accessToken,
        refreshSession,

        request: (currentAccessToken) =>
          updateChildApi({
            childId,
            childData,
            accessToken: currentAccessToken,
            signal,
          }),
      });

      if (!response?.child?.id) {
        const responseError = new Error(
          "The server did not return the updated child.",
        );

        responseError.code = "INVALID_CHILD_RESPONSE";

        throw responseError;
      }

      return {
        child: response.child,
      };
    } catch (error) {
      return rejectWithValue({
        code: error.code || "CHILD_UPDATE_FAILED",

        message: error.message || "Unable to update the child.",
      });
    }
  },
);

export const updateChildPreferences = createAsyncThunk(
  "children/updateChildPreferences",

  async (
    { childId, preferences, accessToken, refreshSession },
    { signal, getState, rejectWithValue },
  ) => {
    try {
      const response = await executeWithRefreshedAccessToken({
        accessToken,
        refreshSession,

        request: (currentAccessToken) =>
          updateChildPreferencesApi({
            childId,
            preferences,
            accessToken: currentAccessToken,
            signal,
          }),
      });

      if (!response?.preferences) {
        const responseError = new Error(
          "The server did not return the updated child preferences.",
        );

        responseError.code = "INVALID_CHILD_PREFERENCES_RESPONSE";

        throw responseError;
      }

      return {
        childId,
        preferences: response.preferences,

        isSelected: getState().children.selectedChildId === childId,
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
        const updatedChild = action.payload.child;

        const childIndex = state.children.findIndex(
          (child) => child.id === updatedChild.id,
        );

        if (childIndex === -1) {
          return;
        }

        state.children[childIndex] = updatedChild;
        state.lastSyncAt = new Date().toISOString();
      })

      .addCase(updateChildPreferences.fulfilled, (state, action) => {
        const child = state.children.find(
          (currentChild) => currentChild.id === action.payload.childId,
        );

        if (!child) {
          return;
        }

        child.themeMode = action.payload.preferences.themeMode;

        child.visibleTrackingTypes =
          action.payload.preferences.visibleTrackingTypes;

        child.visibleFeedingMethods =
          action.payload.preferences.visibleFeedingMethods;

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
