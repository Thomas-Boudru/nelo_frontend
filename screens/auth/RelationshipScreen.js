import { useMemo, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";

import BackButton from "../../components/ui/BackButton.js";
import PrimaryButton from "../../components/ui/PrimaryButton.js";
import OnboardingProgressBar from "../../components/onboarding/OnboardingProgressBar.js";

import { setRelationship } from "../../store/slices/onboardingSlice.js";

import { onboardingColors, radius, spacing } from "../../theme/index.js";

const colors = onboardingColors;

const PINK_STAR_IMAGE = require("../../assets/illustrations/onboarding/starPink.png");

export default function RelationshipScreen({ navigation }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();

  const childFirstName = useSelector(
    (state) => state.onboarding.childFirstName,
  );

  const [selectedRelationship, setSelectedRelationship] = useState(null);

  const childName = childFirstName?.trim() || t("this child");

  const relationshipOptions = useMemo(
    () => [
      {
        value: "mother",
        label: t("Mother"),
      },
      {
        value: "father",
        label: t("Father"),
      },
      {
        value: "parent",
        label: t("Parent"),
      },
      {
        value: "grandparent",
        label: t("Grandparent"),
      },
      {
        value: "family_or_friend",
        label: t("Family or close friend"),
      },
      {
        value: "caregiver",
        label: t("Caregiver"),
      },
      {
        value: "other",
        label: t("Other"),
      },
    ],
    [t],
  );

  const canSubmit = selectedRelationship !== null;

  function handleRelationshipSelection(value) {
    setSelectedRelationship(value);
  }

  function handleContinue() {
    if (!selectedRelationship) {
      return;
    }

    dispatch(setRelationship(selectedRelationship));
    navigation.replace("OnboardingComplete");
  }

  function handleGoBack() {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.screen}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.topSection}>
            <BackButton onPress={handleGoBack} />

            <OnboardingProgressBar
              currentStep={5}
              totalSteps={6}
              style={styles.progressBar}
            />
          </View>

          <View style={styles.header}>
            <Image
              source={PINK_STAR_IMAGE}
              resizeMode="contain"
              pointerEvents="none"
              style={styles.pinkStar}
            />

            <Text style={styles.title}>
              {t("What is your relationship with {{childName}}?", {
                childName,
              })}
            </Text>

            <Text style={styles.description}>
              {t(
                "This helps Nelo personalize your experience and how it speaks to you.",
              )}
            </Text>
          </View>

          <View style={styles.form}>
            <View
              accessibilityRole="radiogroup"
              style={styles.relationshipOptions}
            >
              {relationshipOptions.map((option) => {
                const isSelected = selectedRelationship === option.value;

                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="radio"
                    accessibilityLabel={option.label}
                    accessibilityState={{
                      selected: isSelected,
                    }}
                    onPress={() => handleRelationshipSelection(option.value)}
                    style={({ pressed }) => [
                      styles.relationshipPill,
                      isSelected && styles.relationshipPillSelected,
                      pressed && styles.relationshipPillPressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.relationshipPillText,
                        isSelected && styles.relationshipPillTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </ScrollView>

        <View
          style={[
            styles.footer,
            {
              paddingBottom: Math.max(insets.bottom, spacing.sm),
            },
          ]}
        >
          <PrimaryButton
            title={t("Continue")}
            onPress={handleContinue}
            disabled={!canSubmit}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
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
    marginTop: spacing.xxl,
    paddingHorizontal: spacing.md,
  },

  pinkStar: {
    position: "absolute",
    top: -12,
    right: 18,
    width: 21,
    height: 21,
    transform: [{ rotate: "10deg" }],
  },

  title: {
    width: "100%",
    maxWidth: 360,
    color: colors.textPrimary,
    fontFamily: "Lora_700Bold",
    fontSize: 29,
    lineHeight: 40,
    textAlign: "center",
    letterSpacing: -0.5,
  },

  description: {
    width: "100%",
    maxWidth: 365,
    marginTop: 10,
    color: colors.textSecondary,
    fontFamily: "PlusJakartaSans_500Regular",
    fontSize: 15,
    lineHeight: 24,
    textAlign: "center",
  },

  form: {
    marginTop: spacing.xxl,
  },

  relationshipOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.sm,
  },

  relationshipPill: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: spacing.lg,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    backgroundColor: colors.white,
  },

  relationshipPillSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },

  relationshipPillPressed: {
    opacity: 0.7,
  },

  relationshipPillText: {
    color: colors.textPrimary,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 15,
    lineHeight: 21,
    textAlign: "center",
  },

  relationshipPillTextSelected: {
    color: colors.primary,
    fontFamily: "PlusJakartaSans_700Bold",
  },

  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    backgroundColor: colors.background,
  },
});
