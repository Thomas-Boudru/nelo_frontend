import "react-native-gesture-handler";
import "react-native-reanimated";
import "intl-pluralrules";
import "./i18n/index.js";

import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { NavigationContainer } from "@react-navigation/native";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
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
import { persistor, store } from "./store/store.js";
import ChildrenBootstrap from "./store/ChildrenBootstrap.js";
import { useAppFonts } from "./theme/fonts.js";
import ToastProvider from "./components/ui/toast/ToastProvider.js";

function LoadingScreen() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#EDF1FA",
      }}
    >
      <ActivityIndicator />
    </View>
  );
}

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
    return <LoadingScreen />;
  }

  return (
    <AuthProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>
          <Provider store={store}>
            {/*
             * PersistGate retarde le montage de RootNavigator jusqu'à la
             * réhydratation du slice onboarding. C'est indispensable :
             * OnboardingNavigator calcule sa route de reprise au montage,
             * à partir de onboarding.step. Sans cette attente, il
             * démarrerait toujours sur WelcomeScreen.
             */}
            <PersistGate loading={<LoadingScreen />} persistor={persistor}>
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
            </PersistGate>
          </Provider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </AuthProvider>
  );
}
