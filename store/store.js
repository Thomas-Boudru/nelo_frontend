import { configureStore } from "@reduxjs/toolkit";

import onboardingReducer from "./slices/onboardingSlice";
import childrenReducer from "./slices/childrenSlice.js";
import themeReducer from "./slices/themeSlice.js";

export const store = configureStore({
  reducer: {
    children: childrenReducer,
    onboarding: onboardingReducer,
    theme: themeReducer,
  },
});
