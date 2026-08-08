import { useMemo, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import BackButton from "../../components/ui/BackButton.js";
import PrimaryButton from "../../components/ui/PrimaryButton.js";
import FormField from "../../components/onboarding/FormField.js";
import OnboardingProgressBar from "../../components/onboarding/OnboardingProgressBar.js";

import { onboardingColors, spacing } from "../../theme/index.js";
const colors = onboardingColors;
const HEART_IMAGE = require("../../assets/illustrations/onboarding/heart.png");
const STAR_IMAGE = require("../../assets/illustrations/onboarding/starYellow.png");
const LANDSCAPE_IMAGE = require("../../assets/illustrations/onboarding/landscape.png");

export default function EmailScreen({ navigation, route }) {
  const { t } = useTranslation();

  const childProfile = route.params?.childProfile;
  const mode = route.params?.mode || "signUp";
  const isSignIn = mode === "signIn";

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  const isEmailValid = useMemo(() => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return emailPattern.test(normalizedEmail);
  }, [normalizedEmail]);

  const canSubmit = normalizedEmail.length > 0 && isEmailValid && !isSubmitting;

  function handleEmailChange(value) {
    setEmail(value);

    if (emailError) {
      setEmailError("");
    }
  }

  function validateEmail() {
    if (!normalizedEmail) {
      setEmailError(t("Email address is required."));
      return false;
    }

    if (!isEmailValid) {
      setEmailError(t("Please enter a valid email address."));
      return false;
    }

    setEmailError("");
    return true;
  }

  async function handleSendCode() {
    const isValid = validateEmail();

    if (!isValid || isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);

      /*
        Appel API à ajouter ici.

        Exemple :

        await authService.sendVerificationCode({
          email: normalizedEmail,
        });
      */

      console.log("Send verification code", {
        email: normalizedEmail,
        childProfile,
      });

      navigation.navigate("VerificationCode", {
        mode,
        email: normalizedEmail,
        childProfile,
      });
    } catch (error) {
      console.error("Unable to send verification code", error);

      setEmailError(
        t("Unable to send the verification code. Please try again."),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleGoBack() {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <View style={styles.content}>
            <View>
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

                <Text style={styles.title}>
                  {isSignIn
                    ? t("Enter your email address")
                    : t("What is your email address?")}
                </Text>

                <Text style={styles.description}>
                  {isSignIn
                    ? t("We will send you a code to sign in.")
                    : t(
                        "We will send you a verification code to secure your account.",
                      )}
                </Text>
              </View>

              <View style={styles.form}>
                <FormField
                  value={email}
                  onChangeText={handleEmailChange}
                  placeholder={t("Your email address")}
                  iconName="mail-outline"
                  showLabel={false}
                  helperText={t("We will never share your email address.")}
                  helperIconName="lock-closed-outline"
                  error={emailError}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  textContentType="emailAddress"
                  returnKeyType="send"
                  onSubmitEditing={handleSendCode}
                />
              </View>
            </View>

            <View style={styles.bottomSection}>
              <PrimaryButton
                title={isSignIn ? t("Continue") : t("Send the code")}
                onPress={handleSendCode}
                loading={isSubmitting}
                disabled={!canSubmit}
                icon={
                  <Ionicons
                    name="paper-plane-outline"
                    size={22}
                    color="#FFFFFF"
                  />
                }
              />

              {!isSignIn ? (
                <Text style={styles.signInText}>
                  {t("Already have an account?")}{" "}
                  <Text
                    accessibilityRole="link"
                    onPress={() =>
                      navigation.replace("SignUp", {
                        mode: "signIn",
                      })
                    }
                    style={styles.signInLink}
                  >
                    {t("Sign in")}
                  </Text>
                </Text>
              ) : null}
            </View>
          </View>

          <Image
            source={LANDSCAPE_IMAGE}
            resizeMode="contain"
            pointerEvents="none"
            style={styles.landscape}
          />
        </ScrollView>
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

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    paddingTop: spacing.sm,
  },

  content: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
  },

  header: {
    position: "relative",
    alignItems: "center",
    marginTop: spacing.xl,
    paddingHorizontal: spacing.md,
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

  hero: {
    alignItems: "center",
    marginTop: spacing.xl,
    paddingHorizontal: spacing.sm,
  },

  illustrationContainer: {
    position: "relative",
    width: "100%",
    height: 125,
    alignItems: "center",
    justifyContent: "center",
  },

  cloud: {
    width: 130,
    height: 100,
  },

  star: {
    position: "absolute",
    top: -6,
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

  decorativeDotLeft: {
    position: "absolute",
    left: 3,
    bottom: 24,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "rgba(93, 143, 247, 0.34)",
  },

  decorativeDotRight: {
    position: "absolute",
    right: 2,
    bottom: 18,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "rgba(93, 143, 247, 0.34)",
  },

  title: {
    width: "100%",
    maxWidth: 350,
    marginTop: spacing.md,
    color: colors.textPrimary,
    fontFamily: "Lora_700Bold",
    fontSize: 30,
    lineHeight: 41,
    textAlign: "center",
    letterSpacing: -0.5,
  },

  description: {
    width: "100%",
    maxWidth: 345,
    marginTop: spacing.sm,
    color: colors.textSecondary,
    fontFamily: "PlusJakartaSans_500Regular",
    fontSize: 15,
    lineHeight: 24,
    textAlign: "center",
  },

  form: {
    marginTop: spacing.xxl,
  },

  submitButton: {
    width: "100%",
    marginTop: spacing.xl,
  },

  bottomSection: {
    marginTop: spacing.xxl,
    paddingBottom: spacing.lg,
  },

  signInText: {
    marginTop: spacing.lg,
    color: colors.textSecondary,
    fontFamily: "PlusJakartaSans_500Regular",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },

  signInLink: {
    color: colors.primary,
    fontFamily: "PlusJakartaSans_700Bold",
  },

  landscapeContainer: {
    flex: 1,
    minHeight: 170,
    justifyContent: "flex-end",
    marginTop: spacing.xl,
  },

  landscape: {
    width: "100%",
    height: 120,
    marginTop: spacing.md,
    marginBottom: -20,
    opacity: 0.9,
  },

  topSectionSignIn: {
    justifyContent: "flex-start",
  },
});
