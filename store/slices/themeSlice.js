import { createSlice } from "@reduxjs/toolkit";

import {
  childSelected,
  clearChildren,
  createChild,
  loadChildren,
  updateChildPreferences,
} from "./childrenSlice.js";

const ALLOWED_THEME_MODES = new Set(["blue", "pink", "green"]);

const initialState = {
  mode: "blue",
};

function getValidThemeMode(themeMode) {
  return ALLOWED_THEME_MODES.has(themeMode) ? themeMode : "blue";
}

const themeSlice = createSlice({
  name: "theme",
  initialState,

  reducers: {
    setThemeMode(state, action) {
      state.mode = getValidThemeMode(action.payload);
    },
  },

  extraReducers: (builder) => {
    builder
      /*
       * Appliquer le thème de l’enfant restauré
       * après la connexion ou le démarrage.
       */
      .addCase(loadChildren.fulfilled, (state, action) => {
        const selectedChild = action.payload.children.find(
          (child) => child.id === action.payload.selectedChildId,
        );

        state.mode = getValidThemeMode(selectedChild?.themeMode);
      })

      /*
       * Appliquer le thème du nouvel enfant.
       * createChild le sélectionne automatiquement.
       */
      .addCase(createChild.fulfilled, (state, action) => {
        state.mode = getValidThemeMode(action.payload.child?.themeMode);
      })

      /*
       * Appliquer le thème lors d’un changement
       * d’enfant dans le sélecteur.
       */
      .addCase(childSelected, (state, action) => {
        state.mode = getValidThemeMode(action.payload.themeMode);
      })

      /*
       * Appliquer immédiatement un changement de thème
       * si les préférences concernent l’enfant sélectionné.
       */
      .addCase(updateChildPreferences.fulfilled, (state, action) => {
        if (!action.payload.isSelected) {
          return;
        }

        state.mode = getValidThemeMode(action.payload.preferences.themeMode);
      })

      /*
       * Revenir au bleu lors de la déconnexion.
       */
      .addCase(clearChildren, (state) => {
        state.mode = "blue";
      });
  },
});

export const { setThemeMode } = themeSlice.actions;

export default themeSlice.reducer;
