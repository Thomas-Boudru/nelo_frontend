import { useMemo } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import NotificationSettingsScreen from "../screens/child/NotificationSettingsScreen.js";
import PrivacyDataScreen from "../screens/child/PrivacyDataScreen.js";
import SubscriptionScreen from "../screens/child/SubscriptionScreen.js";
import EditChildProfileScreen from "../screens/child/EditChildProfileScreen.js";
import MomentEditorScreen from "../screens/moments/MomentEditorScreen.js";
import MilestonePickerScreen from "../screens/moments/MilestonePickerScreen.js";
import MomentDetailsScreen from "../screens/moments/MomentDetailsScreen.js";
import ShareMomentScreen from "../screens/moments/ShareMomentScreen.js";

import MainTabNavigator from "./MainTabNavigator.js";
import { useThemeColors } from "../theme/useThemeColors.js";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const colors = useThemeColors();

  const screenOptions = useMemo(
    () => ({
      headerShown: false,
      contentStyle: {
        backgroundColor: colors.background,
      },
    }),
    [colors],
  );

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="MainTabs" component={MainTabNavigator} />

      <Stack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
      />

      <Stack.Screen name="PrivacyData" component={PrivacyDataScreen} />

      <Stack.Screen name="Subscription" component={SubscriptionScreen} />
      <Stack.Screen
        name="EditChildProfile"
        component={EditChildProfileScreen}
        options={{
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="MomentEditor"
        component={MomentEditorScreen}
        options={{
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="MilestonePicker"
        component={MilestonePickerScreen}
        options={{
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="MomentDetails"
        component={MomentDetailsScreen}
        options={{
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="ShareMoment"
        component={ShareMomentScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}
