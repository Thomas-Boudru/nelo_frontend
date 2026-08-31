import "react-native-gesture-handler";
import "react-native-reanimated";
import "intl-pluralrules";
import "./i18n/index.js";

import { NavigationContainer } from "@react-navigation/native";
import { Provider } from "react-redux";
import { AuthProvider } from "./auth/AuthProvider.js";
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import RootNavigator from "./navigation/RootNavigator.js";
import { store } from "./store/store.js";
import ChildrenBootstrap from "./store/ChildrenBootstrap.js";
import { useAppFonts } from "./theme/fonts.js";
import ToastProvider from "./components/ui/toast/ToastProvider.js";

export default function App() {
  const [fontsLoaded] = useAppFonts();

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AuthProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>
          <Provider store={store}>
            <ChildrenBootstrap />
            <BottomSheetModalProvider>
              <ToastProvider>
                <NavigationContainer>
                  <StatusBar style="dark" />

                  <RootNavigator />
                </NavigationContainer>
              </ToastProvider>
            </BottomSheetModalProvider>
          </Provider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </AuthProvider>
  );
}
