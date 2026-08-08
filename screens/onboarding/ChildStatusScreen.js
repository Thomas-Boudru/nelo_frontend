import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import BackButton from "../../components/ui/BackButton.js";
import ChoiceCard from "../../components/onboarding/ChoiceCard.js";
import OnboardingProgressBar from "../../components/onboarding/OnboardingProgressBar.js";

import { onboardingColors, spacing } from "../../theme/index.js";
const colors = onboardingColors;
const BABY_BOTTLE_IMAGE = require("../../assets/illustrations/onboarding/bottle.png");
const BABY_CALENDAR_IMAGE = require("../../assets/illustrations/onboarding/calendar.png");

export default function ChildStatusScreen({ navigation }) {
  const { t } = useTranslation();

  function handleBornChild() {
    navigation.navigate("BornChildProfile");
  }

  function handleExpectedChild() {
    navigation.navigate("ExpectedChildProfile");
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.topSection}>
          <BackButton onPress={() => navigation.goBack()} />

          <OnboardingProgressBar
            currentStep={1}
            totalSteps={6}
            style={styles.progressBar}
          />
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>{t("Votre enfant est-il déjà né ?")}</Text>

          <Text style={styles.description}>
            {t("Cela nous permet de personnaliser votre expérience.")}
          </Text>
        </View>

        <View style={styles.cards}>
          <ChoiceCard
            imageSource={BABY_BOTTLE_IMAGE}
            title={t("Mon enfant est déjà né")}
            description={t(
              "Je souhaite suivre son développement dès maintenant.",
            )}
            onPress={handleBornChild}
          />

          <ChoiceCard
            imageSource={BABY_CALENDAR_IMAGE}
            title={t("Nous attendons un enfant")}
            description={t("Je souhaite me préparer à son arrivée.")}
            onPress={handleExpectedChild}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },

  topSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },

  progressBar: {
    marginTop: spacing.sm,
    flex: 1,
  },

  header: {
    alignItems: "center",
    marginTop: spacing.xxl,
    paddingHorizontal: spacing.md,
  },

  title: {
    maxWidth: 340,
    color: colors.textPrimary,
    fontFamily: "Lora_700Bold",
    fontSize: 30,
    lineHeight: 43,
    textAlign: "center",
    letterSpacing: -0.5,
  },

  description: {
    width: "100%",
    maxWidth: 365,
    marginTop: 10,
    color: colors.textSecondary,
    fontFamily: "PlusJakartaSans_500Regular",
    fontSize: 16,
    lineHeight: 25,
    textAlign: "center",
  },

  cards: {
    gap: spacing.md,
    marginTop: spacing.xxl,
  },
});
