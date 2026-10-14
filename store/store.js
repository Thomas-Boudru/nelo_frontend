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
import measurementUnitsReducer from "./slices/measurementUnitsSlice.js";
import entitlementsReducer from "./slices/entitlementsSlice.js";

const onboardingPersistConfig = {
  key: "onboarding",
  version: 1,
  storage: AsyncStorage,
  blacklist: ["completed"],
};

const rootReducer = combineReducers({
  children: childrenReducer,
  invitations: invitationsReducer,
  measurementUnits: measurementUnitsReducer,
  onboarding: persistReducer(onboardingPersistConfig, onboardingReducer),
  theme: themeReducer,
  entitlements: entitlementsReducer,
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
