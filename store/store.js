import { configureStore } from "@reduxjs/toolkit";

import onboardingReducer from "./slices/onboardingSlice";
import themeReducer from "./slices/themeSlice.js";

export const store = configureStore({
  reducer: {
    onboarding: onboardingReducer,
    theme: themeReducer,
  },
});
