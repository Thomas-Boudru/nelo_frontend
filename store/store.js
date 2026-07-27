import { configureStore } from "@reduxjs/toolkit";

import onboardingReducer from "./slices/onboardingSlice";

export const store = configureStore({
  reducer: {
    onboarding: onboardingReducer,
  },
});
