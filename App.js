import "react-native-gesture-handler";
import "react-native-reanimated";
import "intl-pluralrules";
import "./i18n/index.js";

import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { NavigationContainer } from "@react-navigation/native";
import { Provider } from "react-redux";
import { StatusBar } from "expo-status-bar";
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import SyncManager from "./sync/SyncManager.js";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AuthProvider } from "./auth/AuthProvider.js";
import { initializeLocalDatabase } from "./database/localDatabase.js";
import RootNavigator from "./navigation/RootNavigator.js";
import { store } from "./store/store.js";
import ChildrenBootstrap from "./store/ChildrenBootstrap.js";
import { useAppFonts } from "./theme/fonts.js";
import ToastProvider from "./components/ui/toast/ToastProvider.js";

export default function App() {
  const [fontsLoaded] = useAppFonts();

  const [isLocalDatabaseReady, setIsLocalDatabaseReady] = useState(false);

  const [localDatabaseError, setLocalDatabaseError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function initializeApplication() {
      try {
        await initializeLocalDatabase();

        if (isMounted) {
          setIsLocalDatabaseReady(true);
        }
      } catch (error) {
        console.error("Unable to initialize the local database:", error);

        if (isMounted) {
          setLocalDatabaseError(error);
        }
      }
    }

    initializeApplication();

    return () => {
      isMounted = false;
    };
  }, []);

  /*
   * Les retours conditionnels doivent venir après tous les hooks.
   */
  if (localDatabaseError) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 24,
        }}
      >
        {/* Nous améliorerons ensuite cet écran d’erreur. */}
      </View>
    );
  }

  if (!fontsLoaded || !isLocalDatabaseReady) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <AuthProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>
          <Provider store={store}>
            <ChildrenBootstrap />
            <SyncManager />

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
