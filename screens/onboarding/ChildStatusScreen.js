import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import BackButton from "../../components/ui/BackButton.js";
import ChoiceCard from "../../components/onboarding/ChoiceCard.js";
import OnboardingProgressBar from "../../components/onboarding/OnboardingProgressBar.js";

import { onboardingColors, spacing } from "../../theme/index.js";
import { useDispatch } from "react-redux";
import { setChildStatus } from "../../store/slices/onboardingSlice.js";

const colors = onboardingColors;

const BABY_BOTTLE_IMAGE = require("../../assets/illustrations/onboarding/bottle.png");

const BABY_CALENDAR_IMAGE = require("../../assets/illustrations/onboarding/calendar.png");

export default function ChildStatusScreen({ navigation }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  function handleBornChild() {
    dispatch(setChildStatus("born"));
    navigation.navigate("BornChildProfile");
  }

  function handleExpectedChild() {
    dispatch(setChildStatus("expected"));
    navigation.navigate("ExpectedChildProfile");
  }

  function handleInvitation() {
    dispatch(setChildStatus("join"));

    navigation.navigate("SignUp", {
      onboardingMode: "invitation",
    });
  }

  function handleGoBack() {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.topSection}>
          <BackButton onPress={handleGoBack} />

          <OnboardingProgressBar
            currentStep={1}
            totalSteps={6}
            style={styles.progressBar}
          />
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>
            {t("Has your child already been born?")}
          </Text>

          <Text style={styles.description}>
            {t("This helps us personalize your experience.")}
          </Text>
        </View>

        <View style={styles.cards}>
          <ChoiceCard
            imageSource={BABY_BOTTLE_IMAGE}
            title={t("My child has already been born")}
            description={t("I want to start tracking their development now.")}
            onPress={handleBornChild}
          />

          <ChoiceCard
            imageSource={BABY_CALENDAR_IMAGE}
            title={t("We are expecting a child")}
            description={t("I want to prepare for their arrival.")}
            onPress={handleExpectedChild}
          />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("Join an existing child profile")}
          onPress={handleInvitation}
          hitSlop={10}
          style={({ pressed }) => [
            styles.invitationLink,
            pressed && styles.invitationLinkPressed,
          ]}
        >
          <Ionicons
            name="mail-outline"
            size={17}
            color={colors.textSecondary}
          />

          <Text style={styles.invitationLinkText}>
            {t("Join an existing child profile")}
          </Text>
        </Pressable>
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
    flex: 1,
    marginTop: spacing.sm,
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

  invitationLink: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },

  invitationLinkPressed: {
    opacity: 0.55,
  },

  invitationLinkText: {
    color: colors.textSecondary,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
});
