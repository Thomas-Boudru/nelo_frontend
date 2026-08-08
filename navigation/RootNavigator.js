import { useSelector } from "react-redux";

import AppNavigator from "./AppNavigator.js";
import OnboardingNavigator from "./OnboardingNavigator.js";

export default function RootNavigator() {
  const onboardingCompleted = useSelector(
    (state) => state.onboarding.completed,
  );

  const showAppDirectly = true;

  if (showAppDirectly) {
    return <AppNavigator />;
  }

  if (!onboardingCompleted) {
    return <OnboardingNavigator />;
  }

  return <AppNavigator />;
}
