import {
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";

import PrimaryButton from "../../components/ui/PrimaryButton.js";
import { colors, spacing } from "../../theme/index.js";

export default function WelcomeScreen({ navigation }) {
  const { t } = useTranslation();

  function handleStart() {
    navigation.navigate("ChildStatus");
  }

  function handleLogin() {
    navigation.navigate("Login");
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.content}>
          <Image
            source={require("../../assets/icons/logo.png")}
            resizeMode="contain"
            style={styles.logo}
          />

          <Text style={styles.title}>
            {t("Your companion through every step of parenthood.")}
          </Text>

          <Text style={styles.subtitle}>
            {t(
              "Track your child's development, preserve precious memories, and get personalized guidance whenever you need it.",
            )}
          </Text>

          <View style={styles.features}>
            <FeatureItem emoji="📈" label={t("Development tracking")} />

            <FeatureItem emoji="💙" label={t("Precious memories")} />

            <FeatureItem emoji="✨" label={t("Personalized guidance")} />

            <FeatureItem emoji="🔔" label={t("Important reminders")} />
          </View>
        </View>

        <View style={styles.footer}>
          <PrimaryButton title={t("Get started")} onPress={handleStart} />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("I already have an account")}
            hitSlop={8}
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
    </SafeAreaView>
  );
}

function FeatureItem({ emoji, label }) {
  return (
    <View style={styles.featureItem}>
      <View style={styles.featureIcon}>
        <Text style={styles.featureEmoji}>{emoji}</Text>
      </View>

      <Text style={styles.featureLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },

  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },

  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  logo: {
    width: 170,
    height: 140,
    marginBottom: spacing.xl,
  },

  title: {
    maxWidth: 350,
    color: colors.textPrimary,
    fontFamily: "Lora_700Bold",
    fontSize: 34,
    lineHeight: 41,
    textAlign: "center",
  },

  subtitle: {
    maxWidth: 350,
    marginTop: spacing.md,
    color: colors.textSecondary,
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
  },

  features: {
    width: "100%",
    marginTop: spacing.xxl,
    gap: spacing.lg,
  },

  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },

  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },

  featureEmoji: {
    fontSize: 21,
  },

  featureLabel: {
    flex: 1,
    color: colors.textPrimary,
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 16,
    lineHeight: 22,
  },

  footer: {
    width: "100%",
    paddingTop: spacing.lg,
    gap: spacing.md,
  },

  loginButton: {
    alignSelf: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },

  loginButtonPressed: {
    opacity: 0.55,
  },

  loginText: {
    color: colors.textPrimary,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 15,
    lineHeight: 21,
    textAlign: "center",
  },
});
