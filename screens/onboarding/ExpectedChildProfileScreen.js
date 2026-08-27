import { useEffect, useMemo, useState } from "react";
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
import DateTimePicker from "@react-native-community/datetimepicker";
import { useTranslation } from "react-i18next";

import BackButton from "../../components/ui/BackButton.js";
import PrimaryButton from "../../components/ui/PrimaryButton.js";

import DateField from "../../components/onboarding/DateField.js";
import FormField from "../../components/onboarding/FormField.js";
import OnboardingProgressBar from "../../components/onboarding/OnboardingProgressBar.js";
import SelectionCard from "../../components/onboarding/SelectionCard.js";

import { onboardingColors, radius, spacing } from "../../theme/index.js";
const colors = onboardingColors;

const HEART_IMAGE = require("../../assets/illustrations/onboarding/heart.png");

const PINK_STAR_IMAGE = require("../../assets/illustrations/onboarding/starPink.png");

const YELLOW_STAR_IMAGE = require("../../assets/illustrations/onboarding/starYellow.png");

export default function ExpectedChildProfileScreen({ navigation }) {
  const { t, i18n } = useTranslation();

  const insets = useSafeAreaInsets();

  const [childName, setChildName] = useState("");
  const [expectedBirthDate, setExpectedBirthDate] = useState(null);
  const [gender, setGender] = useState(null);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [temporaryBirthDate, setTemporaryBirthDate] = useState(new Date());
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const minimumBirthDate = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);

    return date;
  }, []);

  const maximumBirthDate = useMemo(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);

    return date;
  }, []);

  const formattedExpectedBirthDate = useMemo(() => {
    if (!expectedBirthDate) {
      return "";
    }

    try {
      return new Intl.DateTimeFormat(i18n.language, {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(expectedBirthDate);
    } catch {
      return expectedBirthDate.toLocaleDateString();
    }
  }, [expectedBirthDate, i18n.language]);

  const expectedBirthDateError =
    hasSubmitted && !expectedBirthDate
      ? t("Please select the expected date of birth.")
      : "";

  const isFormValid = expectedBirthDate !== null;

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

  function handleOpenDatePicker() {
    setTemporaryBirthDate(expectedBirthDate || minimumBirthDate);

    setShowDatePicker(true);
  }

  function handleDateChange(event, selectedDate) {
    if (Platform.OS === "android") {
      setShowDatePicker(false);

      if (event.type === "dismissed" || !selectedDate) {
        return;
      }

      setExpectedBirthDate(selectedDate);
      return;
    }

    if (selectedDate) {
      setTemporaryBirthDate(selectedDate);
    }
  }

  function handleConfirmDate() {
    setExpectedBirthDate(temporaryBirthDate);
    setShowDatePicker(false);
  }

  function handleCancelDate() {
    setShowDatePicker(false);
  }

  function handleGenderSelection(value) {
    setGender((currentGender) => (currentGender === value ? null : value));
  }

  function handleContinue() {
    setHasSubmitted(true);

    if (!isFormValid) {
      return;
    }

    const childProfile = {
      firstName: childName.trim() || null,
      expectedBirthDate: expectedBirthDate.toISOString(),
      gender,
      childStatus: "expected",
    };

    console.log("Expected child profile:", childProfile);

    navigation.navigate("SignUp", {
      mode: "signUp",
      childProfile,
    });
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
            <View style={styles.topSection}>
              <BackButton onPress={() => navigation.goBack()} />

              <OnboardingProgressBar
                currentStep={2}
                totalSteps={6}
                style={styles.progressBar}
              />
            </View>

            <View style={styles.header}>
              <Image
                source={HEART_IMAGE}
                resizeMode="contain"
                style={styles.blueHeart}
              />

              <Image
                source={YELLOW_STAR_IMAGE}
                resizeMode="contain"
                style={styles.yellowStar}
              />

              <Image
                source={PINK_STAR_IMAGE}
                resizeMode="contain"
                style={styles.pinkStar}
              />

              <Text style={styles.title}>
                {t("Let's prepare for your child's arrival")}
              </Text>

              <Text style={styles.description}>
                {t("We will complete their profile after they are born.")}
              </Text>
            </View>

            <View style={styles.form}>
              <FormField
                label={t("What should Nelo call your baby?")}
                optionalLabel={t("Optional")}
                value={childName}
                onChangeText={setChildName}
                placeholder={t("For example: Emma or Little Bean")}
                helperText={t("You can change this later.")}
                iconName="person-outline"
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="done"
                maxLength={40}
              />

              <DateField
                label={t("Expected date of birth")}
                value={formattedExpectedBirthDate}
                placeholder={t("Select a date")}
                error={expectedBirthDateError}
                onPress={handleOpenDatePicker}
                required
              />

              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.fieldLabel}>
                    {t("Do you already know your child's gender?")}
                  </Text>

                  <Text style={styles.optionalLabel}>{t("Optional")}</Text>
                </View>

                <View style={styles.genderGrid}>
                  <SelectionCard
                    label={t("Boy")}
                    iconName="male-outline"
                    selected={gender === "boy"}
                    onPress={() => handleGenderSelection("boy")}
                    style={styles.genderSelection}
                  />

                  <SelectionCard
                    label={t("Girl")}
                    iconName="female-outline"
                    selected={gender === "girl"}
                    onPress={() => handleGenderSelection("girl")}
                    style={styles.genderSelection}
                  />

                  <SelectionCard
                    label={t("We don't know yet")}
                    iconName="help-outline"
                    selected={gender === "unknown"}
                    onPress={() => handleGenderSelection("unknown")}
                    style={[styles.genderSelection, styles.unknownSelection]}
                  />
                </View>
              </View>

              <View style={styles.informationBox}>
                <Image
                  source={PINK_STAR_IMAGE}
                  resizeMode="contain"
                  style={styles.informationIcon}
                />

                <Text style={styles.informationText}>
                  {t(
                    "You can complete or update this information at any time.",
                  )}
                </Text>
              </View>
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
            <PrimaryButton title={t("Continue")} onPress={handleContinue} />
          </View>
        </View>
      </KeyboardAvoidingView>

      {Platform.OS === "ios" ? (
        <Modal
          visible={showDatePicker}
          transparent
          animationType="fade"
          onRequestClose={handleCancelDate}
        >
          <View style={styles.modalOverlay}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={handleCancelDate}
            />

            <View style={styles.dateModal}>
              <View style={styles.modalHeader}>
                <Pressable
                  accessibilityRole="button"
                  onPress={handleCancelDate}
                  hitSlop={10}
                >
                  <Text style={styles.cancelButton}>{t("Cancel")}</Text>
                </Pressable>

                <Text style={styles.modalTitle}>
                  {t("Select the expected date of birth")}
                </Text>

                <Pressable
                  accessibilityRole="button"
                  onPress={handleConfirmDate}
                  hitSlop={10}
                >
                  <Text style={styles.confirmButton}>{t("Confirm")}</Text>
                </Pressable>
              </View>

              <DateTimePicker
                value={temporaryBirthDate}
                mode="date"
                display="spinner"
                minimumDate={minimumBirthDate}
                maximumDate={maximumBirthDate}
                onChange={handleDateChange}
                style={styles.datePicker}
              />
            </View>
          </View>
        </Modal>
      ) : showDatePicker ? (
        <DateTimePicker
          value={expectedBirthDate || minimumBirthDate}
          mode="date"
          display="default"
          minimumDate={minimumBirthDate}
          maximumDate={maximumBirthDate}
          onChange={handleDateChange}
        />
      ) : null}
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

  scrollContentWithKeyboard: {
    paddingBottom: spacing.md,
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

  blueHeart: {
    position: "absolute",
    top: -10,
    left: 10,
    width: 25,
    height: 25,
    transform: [{ rotate: "-12deg" }],
  },

  yellowStar: {
    position: "absolute",
    top: 38,
    right: 8,
    width: 22,
    height: 22,
    transform: [{ rotate: "10deg" }],
  },

  pinkStar: {
    position: "absolute",
    top: -13,
    right: 48,
    width: 20,
    height: 20,
    transform: [{ rotate: "8deg" }],
  },

  title: {
    width: "100%",
    maxWidth: 350,
    color: colors.textPrimary,
    fontFamily: "Lora_700Bold",
    fontSize: 29,
    lineHeight: 40,
    textAlign: "center",
    letterSpacing: -0.5,
  },

  description: {
    width: "100%",
    maxWidth: 360,
    marginTop: 10,
    color: colors.textSecondary,
    fontFamily: "PlusJakartaSans_500Regular",
    fontSize: 15,
    lineHeight: 24,
    textAlign: "center",
  },

  form: {
    gap: spacing.xl,
    marginTop: spacing.xxl,
  },

  fieldGroup: {
    width: "100%",
  },

  labelRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
    marginBottom: spacing.sm,
  },

  fieldLabel: {
    flex: 1,
    color: colors.textPrimary,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 16,
    lineHeight: 23,
  },

  optionalLabel: {
    marginTop: 2,
    color: colors.textSecondary,
    fontFamily: "PlusJakartaSans_500Regular",
    fontSize: 12,
    lineHeight: 18,
  },

  genderGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },

  genderSelection: {
    minWidth: 0,
    flexBasis: "47%",
    flexGrow: 1,
    minHeight: 96,
  },

  unknownSelection: {
    flexBasis: "100%",
    minHeight: 76,
  },

  informationBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: "rgba(130, 151, 246, 0.09)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },

  informationIcon: {
    width: 24,
    height: 24,
  },

  informationText: {
    flex: 1,
    color: colors.textSecondary,
    fontFamily: "PlusJakartaSans_500Regular",
    fontSize: 13,
    lineHeight: 20,
  },

  footer: {
    borderTopWidth: 1,
    borderTopColor: "rgba(117, 139, 181, 0.12)",
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },

  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(29, 42, 71, 0.32)",
  },

  dateModal: {
    overflow: "hidden",
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: "#FFFFFF",
    paddingBottom: spacing.xl,
  },

  modalHeader: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#E8ECF4",
    paddingHorizontal: spacing.lg,
  },

  modalTitle: {
    flex: 1,
    marginHorizontal: spacing.sm,
    color: colors.textPrimary,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 15,
    lineHeight: 21,
    textAlign: "center",
  },

  cancelButton: {
    color: colors.textSecondary,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 15,
  },

  confirmButton: {
    color: colors.primary,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 15,
  },

  datePicker: {
    width: "100%",
    height: 220,
  },
});
