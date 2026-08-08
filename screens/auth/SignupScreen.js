import {
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import BackButton from "../../components/ui/BackButton.js";
import AuthMethodButton from "../../components/auth/AuthMethodButton.js";
import OnboardingProgressBar from "../../components/onboarding/OnboardingProgressBar.js";

import { onboardingColors, spacing } from "../../theme/index.js";
const colors = onboardingColors;

const HEART_IMAGE = require("../../assets/illustrations/onboarding/heart.png");

const LANDSCAPE_IMAGE = require("../../assets/illustrations/onboarding/landscape.png");

const GOOGLE_ICON = require("../../assets/icons/google.png");
const APPLE_ICON = require("../../assets/icons/apple.png");

const BENEFITS = [
  {
    id: "secure",
    iconName: "lock-closed",
    title: "Secure",
    description: "Your data is protected",
    iconColor: "#7C8CF7",
    backgroundColor: "rgba(124, 140, 247, 0.12)",
  },
  {
    id: "synchronized",
    iconName: "sync",
    title: "Synchronized",
    description: "Available on all your devices",
    iconColor: "#67C8B3",
    backgroundColor: "rgba(103, 200, 179, 0.13)",
  },
  {
    id: "personalized",
    iconName: "heart",
    title: "Personalized",
    description: "An experience tailored to your family",
    iconColor: "#F18FA3",
    backgroundColor: "rgba(241, 143, 163, 0.13)",
  },
];

export default function SignUpScreen({ navigation, route }) {
  const { t } = useTranslation();

  const childProfile = route.params?.childProfile;

  const mode = route.params?.mode || "signUp";
  const isSignIn = mode === "signIn";

  function handleGoogleSignIn() {
    console.log(isSignIn ? "Sign in with Google" : "Sign up with Google", {
      mode,
      childProfile,
    });

    /*
    La connexion Google sera ajoutée plus tard.

    Si l'utilisateur existe :
    - enregistrer les tokens ;
    - ouvrir directement l'application.

    Si l'utilisateur n'existe pas et que mode === "signUp" :
    - créer son compte ;
    - ouvrir OnboardingComplete.
  */
  }

  function handleAppleSignIn() {
    console.log(isSignIn ? "Sign in with Apple" : "Sign up with Apple", {
      mode,
      childProfile,
    });

    /*
    La connexion Apple sera ajoutée plus tard.
  */
  }

  function handleEmailSignIn() {
    navigation.navigate("Email", {
      mode,
      childProfile,
    });
  }

  function handleOpenTerms() {
    Linking.openURL("https://ton-domaine.com/terms");
  }

  function handleOpenPrivacyPolicy() {
    Linking.openURL("https://ton-domaine.com/privacy");
  }

  function handleGoBack() {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        <View style={styles.content}>
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
              source={HEART_IMAGE}
              resizeMode="contain"
              style={styles.headerHeart}
            />

            <Text style={styles.title}>
              {isSignIn ? t("Welcome back") : t("Create your account")}
            </Text>

            <Text style={styles.description}>
              {isSignIn
                ? t("Sign in to continue your journey with Nelo.")
                : t("A secure account to support you every day.")}
            </Text>
          </View>

          <View style={styles.benefits}>
            {BENEFITS.map((benefit) => (
              <View key={benefit.id} style={styles.benefitWrapper}>
                <View style={styles.benefit}>
                  <View
                    style={[
                      styles.benefitIconContainer,
                      {
                        backgroundColor: benefit.backgroundColor,
                      },
                    ]}
                  >
                    <Ionicons
                      name={benefit.iconName}
                      size={23}
                      color={benefit.iconColor}
                    />
                  </View>

                  <Text style={styles.benefitTitle}>{t(benefit.title)}</Text>

                  <Text style={styles.benefitDescription}>
                    {t(benefit.description)}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.authMethods}>
            <AuthMethodButton
              title={
                isSignIn ? t("Sign in with Google") : t("Continue with Google")
              }
              imageSource={GOOGLE_ICON}
              onPress={handleGoogleSignIn}
            />

            <AuthMethodButton
              title={
                isSignIn ? t("Sign in with Apple") : t("Continue with Apple")
              }
              imageSource={APPLE_ICON}
              onPress={handleAppleSignIn}
            />

            <View style={styles.separator}>
              <View style={styles.separatorLine} />

              <Text style={styles.separatorText}>{t("or")}</Text>

              <View style={styles.separatorLine} />
            </View>

            <AuthMethodButton
              title={
                isSignIn
                  ? t("Sign in with my email")
                  : t("Continue with my email")
              }
              iconName="mail-outline"
              iconSize={23}
              onPress={handleEmailSignIn}
            />
          </View>

          <View style={styles.legalNotice}>
            <Ionicons
              name="lock-closed"
              size={18}
              color={colors.primary}
              style={styles.legalIcon}
            />

            <Text style={styles.legalText}>
              {t("By continuing, you agree to our")}{" "}
              <Text
                accessibilityRole="link"
                onPress={handleOpenTerms}
                style={styles.legalLink}
              >
                {t("Terms of Use")}
              </Text>{" "}
              {t("and our")}{" "}
              <Text
                accessibilityRole="link"
                onPress={handleOpenPrivacyPolicy}
                style={styles.legalLink}
              >
                {t("Privacy Policy")}
              </Text>
              {"."}
            </Text>
          </View>
        </View>

        <Image
          source={LANDSCAPE_IMAGE}
          resizeMode="contain"
          pointerEvents="none"
          style={styles.landscape}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    paddingTop: spacing.sm,
  },

  topSectionSignIn: {
    justifyContent: "flex-start",
  },

  content: {
    paddingHorizontal: spacing.lg,
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

  headerHeart: {
    position: "absolute",
    top: 0,
    right: 6,
    width: 22,
    height: 22,
    transform: [{ rotate: "8deg" }],
  },

  title: {
    width: "100%",
    maxWidth: 350,
    color: colors.textPrimary,
    fontFamily: "Lora_700Bold",
    fontSize: 30,
    lineHeight: 41,
    textAlign: "center",
    letterSpacing: -0.5,
  },

  description: {
    width: "100%",
    maxWidth: 330,
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontFamily: "PlusJakartaSans_500Regular",
    fontSize: 15,
    lineHeight: 24,
    textAlign: "center",
  },

  benefits: {
    flexDirection: "row",
    marginTop: spacing.xxl,
  },

  benefitWrapper: {
    minWidth: 0,
    flex: 1,
  },

  benefit: {
    minWidth: 0,
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 6,
  },

  benefitIconContainer: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
    borderRadius: 21,
  },

  benefitTitle: {
    color: colors.textPrimary,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },

  benefitDescription: {
    marginTop: 4,
    color: colors.textSecondary,
    fontFamily: "PlusJakartaSans_500Regular",
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
  },

  authMethods: {
    gap: spacing.md,
    marginTop: spacing.xxl,
  },

  separator: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },

  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(117, 139, 181, 0.2)",
  },

  separatorText: {
    color: colors.textSecondary,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 14,
    lineHeight: 20,
  },

  legalNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
  },

  legalIcon: {
    marginTop: 2,
  },

  legalText: {
    flex: 1,
    color: colors.textSecondary,
    fontFamily: "PlusJakartaSans_500Regular",
    fontSize: 11,
    lineHeight: 18,
  },

  legalLink: {
    color: colors.primary,
    fontFamily: "PlusJakartaSans_600SemiBold",
  },

  landscape: {
    width: "100%",
    height: 120,
    marginTop: spacing.lg,
    marginBottom: -20,
    opacity: 0.9,
  },
});
