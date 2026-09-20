import { useState } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useSelector } from "react-redux";

import { useAuth } from "../auth/AuthProvider.js";

import WelcomeScreen from "../screens/onboarding/WelcomeScreen.js";
import ChildStatusScreen from "../screens/onboarding/ChildStatusScreen.js";
import BornChildProfileScreen from "../screens/onboarding/BornChildProfileScreen.js";
import ExpectedChildProfileScreen from "../screens/onboarding/ExpectedChildProfileScreen.js";
import SignUpScreen from "../screens/auth/SignupScreen.js";
import EmailScreen from "../screens/auth/EmailScreen.js";
import VerificationCodeScreen from "../screens/auth/VerificationCodeScreen.js";
import ParentNameScreen from "../screens/auth/ParentNameScreen.js";
import OnboardingCompleteScreen from "../screens/onboarding/OnboardingCompleteScreen.js";
import RelationshipScreen from "../screens/auth/RelationshipScreen.js";

import { resolveOnboardingRoute } from "./onboardingFlow.js";

import {
  selectChildStatus,
  selectOnboardingStep,
} from "../store/slices/onboardingSlice.js";

const Stack = createNativeStackNavigator();

export default function OnboardingNavigator() {
  const { isAuthenticated, user } = useAuth();

  const step = useSelector(selectOnboardingStep);

  const childStatus = useSelector(selectChildStatus);

  /*
   * La route de reprise est figée au montage : React Navigation n'utilise
   * initialRouteName que pour construire l'état initial de la pile, et le
   * recalculer à chaque rendu n'aurait aucun effet tout en masquant la
   * progression réelle de l'utilisateur.
   *
   * PersistGate (App.js) garantit que le slice onboarding est déjà
   * réhydraté lorsque ce calcul est effectué.
   */
  const [initialRouteName] = useState(() =>
    resolveOnboardingRoute({
      step,
      childStatus,
      isAuthenticated,
      user,
    }),
  );

  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: "#EDF1FA",
        },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />

      <Stack.Screen name="ChildStatus" component={ChildStatusScreen} />

      <Stack.Screen
        name="BornChildProfile"
        component={BornChildProfileScreen}
      />

      <Stack.Screen
        name="ExpectedChildProfile"
        component={ExpectedChildProfileScreen}
      />

      <Stack.Screen name="SignUp" component={SignUpScreen} />

      <Stack.Screen name="Email" component={EmailScreen} />

      <Stack.Screen
        name="VerificationCode"
        component={VerificationCodeScreen}
      />

      <Stack.Screen name="ParentName" component={ParentNameScreen} />

      <Stack.Screen name="Relationship" component={RelationshipScreen} />

      <Stack.Screen
        name="OnboardingComplete"
        component={OnboardingCompleteScreen}
        options={{
          gestureEnabled: false,
          animation: "fade",
        }}
      />
    </Stack.Navigator>
  );
}
