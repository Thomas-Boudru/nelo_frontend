import "react-native-reanimated";
import "intl-pluralrules";
import "./i18n/index.js";

import { NavigationContainer } from "@react-navigation/native";
import { Provider } from "react-redux";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";

import HomeScreen from "./screens/HomeScreen.js";
import RootNavigator from "./navigation/RootNavigator.js";
import { store } from "./store/store.js";
import { useAppFonts } from "./theme/fonts.js";

const Stack = createNativeStackNavigator();

export default function App() {
  const [fontsLoaded] = useAppFonts();

  if (!fontsLoaded) {
    return null;
  }

  return (
    <Provider store={store}>
      <NavigationContainer>
        <StatusBar style="dark" />

        <RootNavigator />
      </NavigationContainer>
    </Provider>
  );
}
