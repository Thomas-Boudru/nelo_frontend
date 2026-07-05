import "react-native-reanimated";
import "intl-pluralrules";

import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";

import DocumentsScreen from "./screens/DocumentsScreen";
import ScannerScreen from "./screens/ScannerScreen";
import DocumentDetailScreen from "./screens/DocumentDetailScreen";
import ProfileScreen from "./screens/ProfileScreen";

import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  useFonts,
} from "@expo-google-fonts/outfit";

const Stack = createNativeStackNavigator();

export default function App() {
  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <NavigationContainer>
      <StatusBar style="dark" />

      <Stack.Navigator
        initialRouteName="Documents"
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: "#E699F5",
          },
        }}
      >
        <Stack.Screen name="Documents" component={DocumentsScreen} />
        <Stack.Screen name="Scanner" component={ScannerScreen} />
        <Stack.Screen name="DocumentDetail" component={DocumentDetailScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
