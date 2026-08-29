import { useSelector } from "react-redux";

import { useAuth } from "../auth/AuthProvider.js";

import AppNavigator from "./AppNavigator.js";
import OnboardingNavigator from "./OnboardingNavigator.js";

export default function RootNavigator() {
  const { isInitializing, isAuthenticated, user } = useAuth();

  const localOnboardingCompleted = useSelector(
    (state) => state.onboarding.completed,
  );

  //const developmentNavigationMode = __DEV__ ? "onboarding" : "auto";

  const developmentNavigationMode = "auto";

  if (developmentNavigationMode === "app") {
    return <AppNavigator />;
  }

  if (developmentNavigationMode === "onboarding") {
    return <OnboardingNavigator />;
  }

  if (isInitializing) {
    return null;
  }

  if (!isAuthenticated) {
    return <OnboardingNavigator />;
  }

  const onboardingCompleted =
    Boolean(user?.onboardingCompletedAt) || localOnboardingCompleted;

  if (!onboardingCompleted) {
    return <OnboardingNavigator />;
  }

  return <AppNavigator />;
}
