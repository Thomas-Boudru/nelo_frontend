import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Image,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import BackButton from "../../components/ui/BackButton.js";
import PrimaryButton from "../../components/ui/PrimaryButton.js";

import FormField from "../../components/onboarding/FormField.js";
import OnboardingProgressBar from "../../components/onboarding/OnboardingProgressBar.js";

import { onboardingColors, radius, spacing } from "../../theme/index.js";
const PINK_STAR_IMAGE = require("../../assets/illustrations/onboarding/starPink.png");
const colors = onboardingColors;

export default function RelationshipScreen({ navigation, route }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [relationship, setRelationship] = useState(null);
  const [customRelationship, setCustomRelationship] = useState("");
  const [submissionError, setSubmissionError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const childProfile = route.params?.childProfile;
  const displayName = route.params?.displayName;
  const email = route.params?.email;
  const verificationCode = route.params?.verificationCode;
  const invitation = route.params?.invitation;
  const onboardingMode = route.params?.onboardingMode;

  const childName =
    childProfile?.firstName || invitation?.childName || t("this child");

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

  const trimmedCustomRelationship = customRelationship.trim();

  const canSubmit = relationship !== null && !isSubmitting;

  function handleRelationshipSelection(value) {
    setRelationship(value);
    setSubmissionError("");

    if (value !== "other") {
      setCustomRelationship("");
    }
  }

  function handleCustomRelationshipChange(value) {
    setCustomRelationship(value);
  }

  async function handleContinue() {
    if (!relationship || isSubmitting) {
      return;
    }

    const relationshipData = {
      type: relationship,
      customLabel:
        relationship === "other" && trimmedCustomRelationship
          ? trimmedCustomRelationship
          : null,
    };

    const registrationData = {
      email,
      verificationCode,
      displayName,
      childProfile: onboardingMode === "invitation" ? null : childProfile,
      relationship: relationshipData,
      invitationToken: invitation?.token || null,
    };

    try {
      setIsSubmitting(true);
      setSubmissionError("");

      console.log("Complete registration", registrationData);

      /*
        La création définitive du compte sera effectuée ici.

        Pour un utilisateur qui crée un enfant :

        await authService.completeRegistration({
          email,
          verificationCode,
          displayName,
          childProfile,
          relationship: relationshipData,
        });

        Pour un utilisateur invité :

        await authService.completeRegistration({
          email,
          verificationCode,
          displayName,
          relationship: relationshipData,
          invitationToken: invitation?.token,
        });
      */

      const nextParams = {
        ...route.params,
        relationship: relationshipData,
      };

      if (onboardingMode === "invitation") {
        navigation.replace("Invitation", nextParams);
        return;
      }

      navigation.replace("OnboardingComplete", nextParams);
    } catch (error) {
      console.error("Unable to complete registration", error);

      setSubmissionError(
        t("Unable to complete your registration. Please try again."),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleGoBack() {
    if (isSubmitting) {
      return;
    }

    if (navigation.canGoBack()) {
      navigation.goBack();
    }
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
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={
              Platform.OS === "ios" ? "interactive" : "on-drag"
            }
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
              <View style={styles.relationshipOptions}>
                {relationshipOptions.map((option) => {
                  const isSelected = relationship === option.value;

                  return (
                    <Pressable
                      key={option.value}
                      accessibilityRole="radio"
                      accessibilityState={{
                        selected: isSelected,
                      }}
                      accessibilityLabel={option.label}
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

              {relationship === "other" ? (
                <View style={styles.customRelationshipField}>
                  <FormField
                    label={t("Specify your relationship")}
                    value={customRelationship}
                    onChangeText={handleCustomRelationshipChange}
                    placeholder={t("For example: godparent, aunt or uncle")}
                    helperText={t("This information is optional.")}
                    autoCapitalize="sentences"
                    autoCorrect
                    returnKeyType="done"
                    maxLength={40}
                    onSubmitEditing={handleContinue}
                  />
                </View>
              ) : null}

              {submissionError ? (
                <Text style={styles.errorText}>{submissionError}</Text>
              ) : null}
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

  customRelationshipField: {
    marginTop: spacing.xl,
  },

  errorText: {
    marginTop: spacing.md,
    color: colors.error,
    fontFamily: "PlusJakartaSans_500Regular",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },

  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    backgroundColor: colors.background,
  },

  pinkStar: {
    position: "absolute",
    top: -12,
    right: 18,
    width: 21,
    height: 21,
    transform: [{ rotate: "10deg" }],
  },
});
