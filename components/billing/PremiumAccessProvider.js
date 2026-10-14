import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  BackHandler,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import PrimaryButton from "../ui/PrimaryButton.js";

import { useAuth } from "../../auth/AuthProvider.js";
import { useThemeColors } from "../../theme/useThemeColors.js";

const PremiumAccessContext = createContext(null);

export default function PremiumAccessProvider({ children }) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  const { isAuthenticated, user } = useAuth();

  const sheetRef = useRef(null);
  const requestRef = useRef(null);
  const pendingNavigationRef = useRef(null);
  const closingRef = useRef(false);

  const sessionRef = useRef(null);

  sessionRef.current = {
    isAuthenticated,
    userId: user?.id ?? null,
  };

  const [request, setRequest] = useState(null);
  const [isClosing, setIsClosing] = useState(false);

  const closePremium = useCallback(() => {
    // Une fermeture simple annule une éventuelle navigation.
    pendingNavigationRef.current = null;

    if (!requestRef.current) {
      return;
    }

    closingRef.current = true;
    setIsClosing(true);
    sheetRef.current?.dismiss();
  }, []);

  const showPremium = useCallback(
    ({
      familyId,
      message = "This feature is available with Nelo Premium.",
      onViewPlans,
    }) => {
      const session = sessionRef.current;

      if (
        !session.isAuthenticated ||
        !session.userId ||
        !familyId ||
        typeof onViewPlans !== "function"
      ) {
        return;
      }

      // Éviter plusieurs ouvertures pendant une présentation/fermeture.
      if (requestRef.current || closingRef.current) {
        return;
      }

      const nextRequest = {
        userId: session.userId,
        familyId,
        message,
        onViewPlans,
      };

      pendingNavigationRef.current = null;
      requestRef.current = nextRequest;
      setRequest(nextRequest);
    },
    [],
  );

  const visible = Boolean(
    request && isAuthenticated && request.userId === user?.id,
  );

  useEffect(() => {
    if (!request) {
      return;
    }

    if (!visible) {
      closePremium();
      return;
    }

    if (!closingRef.current) {
      sheetRef.current?.present();
    }
  }, [request, visible, closePremium]);

  // Bouton Retour Android : fermer la sheet avant de quitter l'écran.
  useEffect(() => {
    if (!visible) {
      return;
    }

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        closePremium();
        return true;
      },
    );

    return () => {
      subscription.remove();
    };
  }, [visible, closePremium]);

  const handleViewPlans = useCallback(() => {
    const currentRequest = requestRef.current;
    const session = sessionRef.current;

    if (
      !currentRequest ||
      closingRef.current ||
      !session.isAuthenticated ||
      currentRequest.userId !== session.userId
    ) {
      return;
    }

    pendingNavigationRef.current = currentRequest;
    closingRef.current = true;
    setIsClosing(true);

    sheetRef.current?.dismiss();
  }, []);

  const handleDismiss = useCallback(() => {
    const pendingNavigation = pendingNavigationRef.current;

    pendingNavigationRef.current = null;
    requestRef.current = null;
    closingRef.current = false;

    setRequest(null);
    setIsClosing(false);

    const session = sessionRef.current;

    if (
      pendingNavigation &&
      session.isAuthenticated &&
      pendingNavigation.userId === session.userId
    ) {
      pendingNavigation.onViewPlans();
    }
  }, []);

  const renderBackdrop = useCallback(
    (props) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.45}
        pressBehavior="close"
        onPress={closePremium}
      />
    ),
    [closePremium],
  );

  const value = useMemo(
    () => ({
      showPremium,
      closePremium,
    }),
    [showPremium, closePremium],
  );

  return (
    <PremiumAccessContext.Provider value={value}>
      {children}

      <BottomSheetModal
        ref={sheetRef}
        index={0}
        enableDynamicSizing
        enablePanDownToClose
        enableDismissOnClose
        maxDynamicContentSize={Math.max(200, height - insets.top - 24)}
        topInset={insets.top}
        backdropComponent={renderBackdrop}
        onDismiss={handleDismiss}
        stackBehavior="push"
        backgroundStyle={[
          styles.sheetBackground,
          { backgroundColor: colors.background },
        ]}
        handleIndicatorStyle={[
          styles.handleIndicator,
          { backgroundColor: colors.textSecondary },
        ]}
      >
        <BottomSheetScrollView
          bounces={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: Math.max(insets.bottom, 16) + 12 },
          ]}
        >
          <View accessibilityViewIsModal style={styles.innerContent}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: colors.selectedBackground },
              ]}
            >
              <Ionicons
                name="sparkles-outline"
                size={30}
                color={colors.primary}
              />
            </View>

            <Text
              accessibilityRole="header"
              style={[styles.title, { color: colors.textPrimary }]}
            >
              {t("Discover Nelo Premium")}
            </Text>

            <Text style={[styles.message, { color: colors.textSecondary }]}>
              {t(
                request?.message ??
                  "This feature is available with Nelo Premium.",
              )}
            </Text>

            <View style={styles.primaryButtonContainer}>
              <PrimaryButton
                title={t("View subscription plans")}
                onPress={handleViewPlans}
                disabled={!visible || isClosing}
              />
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={closePremium}
              disabled={isClosing}
              style={({ pressed }) => [
                styles.secondaryButton,
                (pressed || isClosing) && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.secondaryButtonText,
                  { color: colors.textSecondary },
                ]}
              >
                {t("Maybe later")}
              </Text>
            </Pressable>
          </View>
        </BottomSheetScrollView>
      </BottomSheetModal>
    </PremiumAccessContext.Provider>
  );
}

export function usePremiumAccessModal() {
  const context = useContext(PremiumAccessContext);

  if (!context) {
    throw new Error(
      "usePremiumAccessModal must be used inside PremiumAccessProvider.",
    );
  }

  return context;
}

const styles = StyleSheet.create({
  sheetBackground: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },

  handleIndicator: {
    width: 38,
    height: 4,
    opacity: 0.3,
  },

  content: {
    paddingTop: 20,
    paddingHorizontal: 24,
  },

  innerContent: {
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    alignItems: "center",
  },

  iconContainer: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },

  title: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 23,
    lineHeight: 31,
    textAlign: "center",
  },

  message: {
    marginTop: 12,
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 14,
    lineHeight: 23,
    textAlign: "center",
  },

  primaryButtonContainer: {
    width: "100%",
    marginTop: 28,
  },

  secondaryButton: {
    alignSelf: "stretch",
    minHeight: 48,
    marginTop: 8,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  secondaryButtonText: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 13,
    lineHeight: 20,
  },

  pressed: {
    opacity: 0.65,
  },
});
