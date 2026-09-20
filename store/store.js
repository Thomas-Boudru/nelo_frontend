import AsyncStorage from "@react-native-async-storage/async-storage";
import { combineReducers, configureStore } from "@reduxjs/toolkit";

import {
  FLUSH,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
  REHYDRATE,
  persistReducer,
  persistStore,
} from "redux-persist";

import childrenReducer from "./slices/childrenSlice.js";
import invitationsReducer from "./slices/invitationsSlice.js";
import onboardingReducer from "./slices/onboardingSlice.js";
import themeReducer from "./slices/themeSlice.js";

/*
 * Seul le slice onboarding est persisté.
 *
 * Le parcours d’onboarding enjambe l’authentification, qui survit déjà
 * dans expo-secure-store. Sans persistance, tout rechargement produisait
 * un état incohérent « utilisateur authentifié + onboarding vide » et
 * renvoyait l’utilisateur sur WelcomeScreen.
 *
 * `completed` est exclu : il est recalculé au démarrage depuis
 * user.onboardingCompletedAt. Le persister ferait sauter l’onboarding du
 * prochain compte utilisé sur l’appareil.
 *
 * children, invitations et theme restent volatils : ils sont rechargés
 * depuis le backend ou la base locale.
 */
const onboardingPersistConfig = {
  key: "onboarding",
  version: 1,
  storage: AsyncStorage,
  blacklist: ["completed"],
};

const rootReducer = combineReducers({
  children: childrenReducer,
  invitations: invitationsReducer,
  onboarding: persistReducer(onboardingPersistConfig, onboardingReducer),
  theme: themeReducer,
});

export const store = configureStore({
  reducer: rootReducer,

  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        /*
         * Les actions internes de redux-persist transportent des
         * fonctions de rappel non sérialisables.
         */
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);
