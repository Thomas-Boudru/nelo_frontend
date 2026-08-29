import { useEffect, useRef, useState } from "react";
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import Constants from "expo-constants";
import { useAuth } from "../../auth/AuthProvider.js";

import BackButton from "../../components/ui/BackButton.js";
import PrimaryButton from "../../components/ui/PrimaryButton.js";
import OnboardingProgressBar from "../../components/onboarding/OnboardingProgressBar.js";

import { onboardingColors, radius, spacing } from "../../theme/index.js";
const colors = onboardingColors;

const STAR_IMAGE = require("../../assets/illustrations/onboarding/starPink.png");
const HEART_IMAGE = require("../../assets/illustrations/onboarding/heart.png");
const LANDSCAPE_IMAGE = require("../../assets/illustrations/onboarding/landscape.png");

const CODE_LENGTH = 6;
const RESEND_DELAY = 30;

export default function VerificationCodeScreen({ navigation, route }) {
  const { t, i18n } = useTranslation();
  const { requestLoginCode, verifyLoginCode } = useAuth();

  const inputRef = useRef(null);

  const email = route.params?.email || "";
  const childProfile = route.params?.childProfile;

  const mode = route.params?.mode || "signUp";
  const isSignIn = mode === "signIn";

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [secondsRemaining, setSecondsRemaining] = useState(RESEND_DELAY);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const insets = useSafeAreaInsets();

  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const isCodeComplete = code.length === CODE_LENGTH;
  const canSubmit = isCodeComplete && !isSubmitting;
  const canResend = secondsRemaining === 0 && !isResending;

  useEffect(() => {
    if (secondsRemaining <= 0) {
      return undefined;
    }

    const timer = setInterval(() => {
      setSecondsRemaining((currentSeconds) => Math.max(currentSeconds - 1, 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsRemaining]);

  useEffect(() => {
    const keyboardShowEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";

    const keyboardHideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSubscription = Keyboard.addListener(keyboardShowEvent, () => {
      setIsKeyboardVisible(true);
    });

    const hideSubscription = Keyboard.addListener(keyboardHideEvent, () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    const focusTimer = setTimeout(() => {
      inputRef.current?.focus();
    }, 350);

    return () => clearTimeout(focusTimer);
  }, []);

  function handleCodeChange(value) {
    const numericCode = value.replace(/\D/g, "").slice(0, CODE_LENGTH);

    setCode(numericCode);

    if (error) {
      setError("");
    }
  }

  async function handleContinue() {
    if (!isCodeComplete || isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");

      const locale = i18n.resolvedLanguage?.split("-")[0] || "en";

      const result = await verifyLoginCode({
        email,
        code,
        locale,
        platform: Platform.OS,
        appVersion: Constants.expoConfig?.version || "unknown",
      });

      Keyboard.dismiss();

      /*
       * Si l'utilisateur a déjà terminé l'onboarding,
       * RootNavigator affichera automatiquement l'application principale.
       */
      if (result.user.onboardingCompletedAt) {
        return;
      }

      /*
       * Pour un nouvel utilisateur ou un onboarding interrompu,
       * on continue le parcours existant.
       */
      navigation.navigate("ParentName", {
        email,
        childProfile,
      });
    } catch (requestError) {
      console.error("Unable to verify code", requestError);

      if (requestError.code === "LOGIN_CODE_ATTEMPTS_EXCEEDED") {
        setError(
          t("Too many incorrect attempts. Request a new verification code."),
        );
      } else if (
        requestError.code === "INVALID_LOGIN_CODE" ||
        requestError.code === "LOGIN_CODE_EXPIRED"
      ) {
        setError(t("The verification code is incorrect or has expired."));
      } else if (requestError.code === "NETWORK_ERROR") {
        setError(
          t("Unable to contact the server. Check your internet connection."),
        );
      } else {
        setError(t("Unable to verify the code. Please try again."));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResendCode() {
    if (!canResend) {
      return;
    }

    try {
      setIsResending(true);
      setError("");

      const locale = i18n.resolvedLanguage?.split("-")[0] || "en";

      await requestLoginCode(email, locale);

      setCode("");
      setSecondsRemaining(RESEND_DELAY);

      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } catch (requestError) {
      console.error("Unable to resend code", requestError);

      if (requestError.code === "TOO_MANY_AUTH_REQUESTS") {
        setError(t("Too many requests. Please wait before trying again."));
      } else if (requestError.code === "NETWORK_ERROR") {
        setError(
          t("Unable to contact the server. Check your internet connection."),
        );
      } else {
        setError(
          t("Unable to resend the verification code. Please try again."),
        );
      }
    } finally {
      setIsResending(false);
    }
  }

  function handleFocusCodeInput() {
    inputRef.current?.focus();
  }

  function handleGoBack() {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }

  function formatTimer(seconds) {
    return `00:${String(seconds).padStart(2, "0")}`;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.screen}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollContent,
              isKeyboardVisible && styles.scrollContentWithKeyboard,
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={
              Platform.OS === "ios" ? "interactive" : "on-drag"
            }
            bounces={false}
          >
            <View
              style={[styles.topSection, isSignIn && styles.topSectionSignIn]}
            >
              <BackButton onPress={handleGoBack} />

              {!isSignIn ? (
                <OnboardingProgressBar
                  currentStep={4}
                  totalSteps={5}
                  style={styles.progressBar}
                />
              ) : null}
            </View>

            <View style={styles.header}>
              <Image
                source={STAR_IMAGE}
                resizeMode="contain"
                pointerEvents="none"
                style={styles.star}
              />

              <Image
                source={HEART_IMAGE}
                resizeMode="contain"
                pointerEvents="none"
                style={styles.heart}
              />

              <Text style={styles.title}>{t("Enter the code")}</Text>

              <Text style={styles.description}>
                {t("We sent a verification code to")}
              </Text>

              <Text
                numberOfLines={1}
                ellipsizeMode="middle"
                style={styles.email}
              >
                {email}
              </Text>
            </View>

            <View style={styles.codeSection}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("Enter your six-digit verification code")}
                onPress={handleFocusCodeInput}
                style={styles.codeBoxes}
              >
                {Array.from({ length: CODE_LENGTH }).map((_, index) => {
                  const digit = code[index] || "";

                  const isActive =
                    isFocused &&
                    (index === code.length ||
                      (code.length === CODE_LENGTH &&
                        index === CODE_LENGTH - 1));

                  return (
                    <View
                      key={index}
                      style={[
                        styles.codeBox,
                        isActive && styles.codeBoxFocused,
                        error && styles.codeBoxError,
                      ]}
                    >
                      <Text style={styles.codeDigit}>{digit}</Text>
                    </View>
                  );
                })}
              </Pressable>

              <TextInput
                ref={inputRef}
                value={code}
                onChangeText={handleCodeChange}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onSubmitEditing={handleContinue}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
                maxLength={CODE_LENGTH}
                caretHidden
                style={styles.hiddenInput}
              />

              {error ? (
                <View style={styles.errorRow}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={18}
                    color={colors.error || "#E97878"}
                  />

                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : (
                <View style={styles.expirationRow}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={18}
                    color={colors.textSecondary}
                  />

                  <Text style={styles.expirationText}>
                    {t("The verification code expires in 10 minutes.")}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.helpCard}>
              <View style={styles.helpIconContainer}>
                <Ionicons
                  name="mail-outline"
                  size={23}
                  color={colors.primary}
                />
              </View>

              <View style={styles.helpContent}>
                <Text style={styles.helpTitle}>
                  {t("Didn't receive the email?")}
                </Text>

                <Text style={styles.helpDescription}>
                  {t("Check your Spam or Promotions folder.")}
                </Text>
              </View>
            </View>

            <View style={styles.resendSection}>
              {canResend ? (
                <Pressable
                  accessibilityRole="button"
                  disabled={isResending}
                  onPress={handleResendCode}
                  hitSlop={10}
                  style={({ pressed }) => [
                    styles.resendButton,
                    pressed && styles.resendButtonPressed,
                  ]}
                >
                  <Text style={styles.resendLink}>
                    {isResending ? t("Sending...") : t("Resend the code")}
                  </Text>
                </Pressable>
              ) : (
                <Text style={styles.resendText}>
                  {t("Resend the code in")}{" "}
                  <Text style={styles.timerText}>
                    {formatTimer(secondsRemaining)}
                  </Text>
                </Text>
              )}
            </View>
          </ScrollView>

          <View
            style={[
              styles.footer,
              {
                paddingBottom: isKeyboardVisible
                  ? spacing.xs
                  : Math.max(insets.bottom, spacing.sm),
              },
            ]}
          >
            <PrimaryButton
              title={t("Continue")}
              onPress={handleContinue}
              loading={isSubmitting}
              disabled={!canSubmit}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },

  keyboardAvoidingView: {
    flex: 1,
  },

  keyboardView: {
    flex: 1,
  },

  screen: {
    flex: 1,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },

  scrollContentWithKeyboard: {
    paddingBottom: spacing.md,
  },

  content: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
  },

  mainContent: {
    width: "100%",
  },

  topSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },

  progressBar: {
    flex: 1,
    marginTop: spacing.sm,
  },

  header: {
    position: "relative",
    alignItems: "center",
    marginTop: spacing.xl,
    paddingHorizontal: spacing.md,
  },

  star: {
    position: "absolute",
    top: -4,
    left: 18,
    width: 22,
    height: 22,
    transform: [{ rotate: "-8deg" }],
  },

  heart: {
    position: "absolute",
    top: 0,
    right: 18,
    width: 21,
    height: 21,
    transform: [{ rotate: "8deg" }],
  },

  title: {
    width: "100%",
    color: colors.textPrimary,
    fontFamily: "Lora_700Bold",
    fontSize: 30,
    lineHeight: 41,
    textAlign: "center",
    letterSpacing: -0.5,
  },

  description: {
    width: "100%",
    marginTop: spacing.sm,
    color: colors.textSecondary,
    fontFamily: "PlusJakartaSans_500Regular",
    fontSize: 15,
    lineHeight: 23,
    textAlign: "center",
  },

  email: {
    width: "100%",
    marginTop: 3,
    color: colors.textPrimary,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },

  codeSection: {
    position: "relative",
    marginTop: spacing.xxl,
  },

  codeBoxes: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },

  codeBox: {
    height: 58,
    flex: 1,
    maxWidth: 54,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#DCE3F1",
    borderRadius: radius.lg,
    backgroundColor: "#FFFFFF",
  },

  codeBoxFocused: {
    borderColor: colors.primary,
  },

  codeBoxError: {
    borderColor: colors.error || "#E97878",
  },

  codeDigit: {
    color: colors.textPrimary,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 22,
    lineHeight: 28,
    textAlign: "center",
  },

  hiddenInput: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0,
  },

  expirationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingHorizontal: 2,
  },

  expirationText: {
    flex: 1,
    color: colors.textSecondary,
    fontFamily: "PlusJakartaSans_500Regular",
    fontSize: 13,
    lineHeight: 20,
  },

  errorRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingHorizontal: 2,
  },

  errorText: {
    flex: 1,
    color: colors.error || "#E97878",
    fontFamily: "PlusJakartaSans_500Regular",
    fontSize: 13,
    lineHeight: 20,
  },

  helpCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.xl,
    borderRadius: radius.xl,
    backgroundColor: "rgba(255, 255, 255, 0.55)",
    padding: spacing.md,
  },

  helpIconContainer: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: "rgba(93, 143, 247, 0.1)",
  },

  helpContent: {
    flex: 1,
  },

  helpTitle: {
    color: colors.textPrimary,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 13,
    lineHeight: 19,
  },

  helpDescription: {
    marginTop: 2,
    color: colors.textSecondary,
    fontFamily: "PlusJakartaSans_500Regular",
    fontSize: 12,
    lineHeight: 18,
  },

  resendSection: {
    alignItems: "center",
    marginTop: spacing.xl,
  },

  resendText: {
    color: colors.textSecondary,
    fontFamily: "PlusJakartaSans_500Regular",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },

  timerText: {
    color: colors.primary,
    fontFamily: "PlusJakartaSans_700Bold",
  },

  resendButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },

  resendButtonPressed: {
    opacity: 0.6,
  },

  resendLink: {
    color: colors.primary,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },

  landscape: {
    width: "100%",
    height: 120,
    marginTop: spacing.sm,
    marginBottom: -20,
    opacity: 0.9,
  },

  footer: {
    borderTopWidth: 1,
    borderTopColor: "rgba(117, 139, 181, 0.12)",
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },

  topSectionSignIn: {
    justifyContent: "flex-start",
  },
});
