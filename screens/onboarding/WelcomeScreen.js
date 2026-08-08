import {
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";

import PrimaryButton from "../../components/ui/PrimaryButton.js";
import { onboardingColors, spacing } from "../../theme/index.js";
const colors = onboardingColors;

export default function WelcomeScreen({ navigation }) {
  const { t } = useTranslation();

  function handleStart() {
    navigation.navigate("ChildStatus");
  }

  function handleLogin() {
    navigation.navigate("SignUp", {
      mode: "signIn",
    });
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <View style={styles.hero}>
            <Image
              source={require("../../assets/illustrations/onboarding/cloud.png")}
              resizeMode="contain"
              style={styles.backgroundCloudLeft}
              pointerEvents="none"
            />

            <Image
              source={require("../../assets/illustrations/onboarding/cloud.png")}
              resizeMode="contain"
              style={styles.backgroundCloudRight}
              pointerEvents="none"
            />

            <Image
              source={require("../../assets/illustrations/onboarding/starYellow.png")}
              resizeMode="contain"
              style={styles.starLeft}
              pointerEvents="none"
            />

            <Image
              source={require("../../assets/illustrations/onboarding/starPink.png")}
              resizeMode="contain"
              style={styles.starRight}
              pointerEvents="none"
            />

            <Image
              source={require("../../assets/illustrations/onboarding/character.png")}
              resizeMode="contain"
              style={styles.heroIllustration}
            />

            <Text style={styles.title}>
              {t("Your companion through every step of parenthood.")}
            </Text>

            <Image
              source={require("../../assets/illustrations/onboarding/heart.png")}
              resizeMode="contain"
              style={styles.heart}
            />

            <Text style={styles.subtitle}>
              {t(
                "Track your child's development, preserve precious memories, and get reliable answers whenever you need them.",
              )}
            </Text>
          </View>

          <View style={styles.features}>
            <FeatureItem
              icon={require("../../assets/illustrations/onboarding/evolution.png")}
              label={t("Development tracking")}
            />

            <FeatureItem
              icon={require("../../assets/illustrations/onboarding/souvenir.png")}
              label={t("Precious memories")}
            />

            <FeatureItem
              icon={require("../../assets/illustrations/onboarding/communication.png")}
              label={t("Personalized guidance")}
            />

            <FeatureItem
              icon={require("../../assets/illustrations/onboarding/notif.png")}
              label={t("Important reminders")}
            />
          </View>

          <View style={styles.footer}>
            <PrimaryButton
              title={t("Get started")}
              onPress={handleStart}
              style={styles.primaryButton}
            />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("I already have an account")}
              hitSlop={10}
              onPress={handleLogin}
              style={({ pressed }) => [
                styles.loginButton,
                pressed && styles.loginButtonPressed,
              ]}
            >
              <Text style={styles.loginText}>
                {t("I already have an account")}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FeatureItem({ icon, label }) {
  return (
    <View style={styles.featureItem}>
      <View style={styles.featureIconContainer}>
        <Image source={icon} resizeMode="contain" style={styles.featureIcon} />
      </View>

      <Text style={styles.featureLabel}>{label}</Text>
    </View>
  );
}

function FeatureDivider() {
  return <View style={styles.featureDivider} />;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },

  scrollContent: {
    flexGrow: 1,
  },

  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 0,
    paddingBottom: 24,
  },

  hero: {
    width: "100%",
    alignItems: "center",
    position: "relative",
    marginTop: -40,
  },

  backgroundCloudLeft: {
    position: "absolute",
    top: 35,
    left: -5,
    width: 105,
    height: 75,
    opacity: 0.7,
    zIndex: 0,
  },

  backgroundCloudRight: {
    position: "absolute",
    top: 85,
    right: -8,
    width: 95,
    height: 68,
    opacity: 0.7,
    zIndex: 0,
  },

  starLeft: {
    position: "absolute",
    top: 195,
    left: 60,
    width: 20,
    height: 20,
    zIndex: 1,
  },

  starRight: {
    position: "absolute",
    top: 220,
    right: 44,
    width: 22,
    height: 22,
    zIndex: 1,
  },

  heroIllustration: {
    width: 280,
    height: 260,
    marginBottom: 12,
    zIndex: 2,
  },

  title: {
    width: "100%",
    maxWidth: 360,
    color: colors.textPrimary,
    fontFamily: "Lora_700Bold",
    fontSize: 30,
    lineHeight: 43,
    textAlign: "center",
    letterSpacing: -0.5,
    marginTop: -30,
  },

  heart: {
    width: 25,
    height: 25,
    marginTop: 6,
  },

  subtitle: {
    width: "100%",
    maxWidth: 365,
    marginTop: 10,
    color: colors.textSecondary,
    fontFamily: "PlusJakartaSans_500Regular",
    fontSize: 16,
    lineHeight: 25,
    textAlign: "center",
  },

  features: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 22,
  },

  featureItem: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
  },

  featureIconContainer: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.55)",
  },

  featureIcon: {
    width: 55,
    height: 55,
  },

  featureLabel: {
    width: "100%",
    minHeight: 44,
    marginTop: 10,
    paddingHorizontal: 3,
    color: colors.textSecondary,
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },

  featureDivider: {
    width: StyleSheet.hairlineWidth,
    height: 70,
    marginHorizontal: 3,
    backgroundColor: "rgba(92, 116, 165, 0.18)",
  },

  footer: {
    width: "100%",
    marginTop: "auto",
    paddingTop: 42,
  },

  primaryButton: {
    width: "100%",
  },

  loginButton: {
    alignSelf: "center",
    marginTop: 18,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },

  loginButtonPressed: {
    opacity: 0.55,
  },

  loginText: {
    color: colors.primary,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 16,
    lineHeight: 22,
    textAlign: "center",
  },
});
