import { useSelector } from "react-redux";

import { useAuth } from "../auth/AuthProvider.js";

import AppNavigator from "./AppNavigator.js";
import OnboardingNavigator from "./OnboardingNavigator.js";

export default function RootNavigator() {
  const { isInitializing, isAuthenticated, user } = useAuth();

  const localOnboardingCompleted = useSelector(
    (state) => state.onboarding.completed,
  );

  /*
   * Valeurs possibles en développement :
   * "app"        → afficher directement l'application
   * "onboarding" → afficher directement l'onboarding
   * "auto"       → utiliser le véritable état utilisateur
   */
  const developmentNavigationMode = __DEV__ ? "onboarding" : "auto";

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
