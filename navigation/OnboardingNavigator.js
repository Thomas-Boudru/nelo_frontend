import { createNativeStackNavigator } from "@react-navigation/native-stack";

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

const Stack = createNativeStackNavigator();

export default function OnboardingNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Welcome"
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
