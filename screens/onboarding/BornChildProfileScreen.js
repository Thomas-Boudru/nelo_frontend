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
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import BackButton from "../../components/ui/BackButton.js";
import PrimaryButton from "../../components/ui/PrimaryButton.js";

import DateField from "../../components/onboarding/DateField.js";
import FormField from "../../components/onboarding/FormField.js";
import OnboardingProgressBar from "../../components/onboarding/OnboardingProgressBar.js";
import SelectionCard from "../../components/onboarding/SelectionCard.js";

import { useDispatch } from "react-redux";
import { setBornChildProfile } from "../../store/slices/onboardingSlice.js";

import { onboardingColors, radius, spacing } from "../../theme/index.js";
const colors = onboardingColors;

export default function BornChildProfileScreen({ navigation }) {
  const { t, i18n } = useTranslation();

  const dispatch = useDispatch();

  const [childName, setChildName] = useState("");
  const [gender, setGender] = useState(null);
  const [birthDate, setBirthDate] = useState(null);
  const [isPremature, setIsPremature] = useState(null);
  const [gestationalAgeWeeks, setGestationalAgeWeeks] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [temporaryBirthDate, setTemporaryBirthDate] = useState(new Date());
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const insets = useSafeAreaInsets();
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const maximumBirthDate = useMemo(() => new Date(), []);

  const HEART_IMAGE = require("../../assets/illustrations/onboarding/heart.png");

  const PINK_STAR_IMAGE = require("../../assets/illustrations/onboarding/starPink.png");

  const YELLOW_STAR_IMAGE = require("../../assets/illustrations/onboarding/starYellow.png");

  const formattedBirthDate = useMemo(() => {
    if (!birthDate) {
      return "";
    }

    try {
      return new Intl.DateTimeFormat(i18n.language, {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(birthDate);
    } catch {
      return birthDate.toLocaleDateString();
    }
  }, [birthDate, i18n.language]);

  const trimmedChildName = childName.trim();
  const gestationalAgeWeeksNumber = Number(gestationalAgeWeeks);

  const hasValidGestationalAgeWeeks =
    isPremature !== true ||
    (gestationalAgeWeeks !== "" &&
      Number.isInteger(gestationalAgeWeeksNumber) &&
      gestationalAgeWeeksNumber >= 20 &&
      gestationalAgeWeeksNumber <= 36);

  const childNameError =
    hasSubmitted && !trimmedChildName
      ? t("Please enter your child's first name.")
      : "";

  const birthDateError =
    hasSubmitted && !birthDate
      ? t("Please select your child's date of birth.")
      : "";

  const prematureError =
    hasSubmitted && isPremature === null ? t("Please select an answer.") : "";

  const gestationalAgeWeeksError =
    hasSubmitted && isPremature === true && !hasValidGestationalAgeWeeks
      ? t("Please enter a number between 20 and 36 weeks.")
      : "";

  const isFormValid =
    trimmedChildName.length > 0 &&
    birthDate !== null &&
    isPremature !== null &&
    hasValidGestationalAgeWeeks;

  function handleOpenDatePicker() {
    setTemporaryBirthDate(birthDate || maximumBirthDate);
    setShowDatePicker(true);
  }

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

  function handleDateChange(event, selectedDate) {
    if (Platform.OS === "android") {
      setShowDatePicker(false);

      if (event.type === "dismissed" || !selectedDate) {
        return;
      }

      setBirthDate(selectedDate);
      return;
    }

    if (selectedDate) {
      setTemporaryBirthDate(selectedDate);
    }
  }

  function handleConfirmDate() {
    setBirthDate(temporaryBirthDate);
    setShowDatePicker(false);
  }

  function handleCancelDate() {
    setShowDatePicker(false);
  }

  function handlePrematureSelection(value) {
    setIsPremature(value);

    if (!value) {
      setGestationalAgeWeeks("");
    }
  }

  function handleGestationalAgeWeeksChange(value) {
    const numericValue = value.replace(/[^0-9]/g, "").slice(0, 2);

    setGestationalAgeWeeks(numericValue);
  }

  function handleContinue() {
    setHasSubmitted(true);

    if (!isFormValid) {
      return;
    }

    dispatch(
      setBornChildProfile({
        firstName: trimmedChildName,
        gender,
        birthDate: birthDate.toISOString().slice(0, 10),
        birthTime: null,
        isPremature,
        gestationalAgeWeeks:
          isPremature === true ? gestationalAgeWeeksNumber : null,
        gestationalAgeDays: null,
      }),
    );

    navigation.navigate("SignUp", {
      onboardingMode: "signUp",
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
                {t("Create your child's profile")}
              </Text>

              <Text style={styles.description}>
                {t("A few details will help Nelo personalize your experience.")}
              </Text>
            </View>

            <View style={styles.form}>
              <FormField
                label={t("What should Nelo call your baby?")}
                value={childName}
                onChangeText={setChildName}
                placeholder={t("For example: Emma or Little Bean")}
                helperText={t("You can change this later.")}
                error={childNameError}
                iconName="person-outline"
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="done"
                maxLength={40}
                required
              />

              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.fieldLabel}>{t("Gender")}</Text>

                  <Text style={styles.optionalLabel}>{t("Optional")}</Text>
                </View>

                <View style={styles.selectionRow}>
                  <SelectionCard
                    label={t("Boy")}
                    iconName="male-outline"
                    selected={gender === "male"}
                    onPress={() =>
                      setGender((currentGender) =>
                        currentGender === "male" ? null : "male",
                      )
                    }
                    style={styles.genderSelection}
                  />

                  <SelectionCard
                    label={t("Girl")}
                    iconName="female-outline"
                    selected={gender === "female"}
                    onPress={() =>
                      setGender((currentGender) =>
                        currentGender === "female" ? null : "female",
                      )
                    }
                    style={styles.genderSelection}
                  />
                </View>
              </View>

              <DateField
                label={t("Date of birth")}
                value={formattedBirthDate}
                placeholder={t("Select a date")}
                error={birthDateError}
                onPress={handleOpenDatePicker}
                required
              />

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>
                  {t("Was your child born prematurely?")}
                  <Text style={styles.required}> *</Text>
                </Text>

                <View style={styles.selectionRow}>
                  <SelectionCard
                    label={t("Yes")}
                    selected={isPremature === true}
                    onPress={() => handlePrematureSelection(true)}
                    style={styles.compactSelection}
                  />

                  <SelectionCard
                    label={t("No")}
                    selected={isPremature === false}
                    onPress={() => handlePrematureSelection(false)}
                    style={styles.compactSelection}
                  />
                </View>

                {prematureError ? (
                  <View style={styles.errorRow}>
                    <Ionicons
                      name="alert-circle-outline"
                      size={17}
                      color={colors.error || "#E97878"}
                    />

                    <Text style={styles.errorText}>{prematureError}</Text>
                  </View>
                ) : null}
              </View>

              {isPremature === true ? (
                <View style={styles.conditionalField}>
                  <FormField
                    label={t(
                      "At how many weeks of pregnancy was your child born?",
                    )}
                    value={gestationalAgeWeeks}
                    onChangeText={handleGestationalAgeWeeksChange}
                    placeholder={t("Number of weeks of pregnancy")}
                    helperText={t(
                      "For example: 32 weeks. This helps Nelo adapt developmental information.",
                    )}
                    error={gestationalAgeWeeksError}
                    iconName="time-outline"
                    keyboardType="number-pad"
                    maxLength={2}
                    required
                  />
                </View>
              ) : null}
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
                  {t("Select the date of birth")}
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
                maximumDate={maximumBirthDate}
                onChange={handleDateChange}
                style={styles.datePicker}
              />
            </View>
          </View>
        </Modal>
      ) : showDatePicker ? (
        <DateTimePicker
          value={birthDate || maximumBirthDate}
          mode="date"
          display="default"
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
    top: 39,
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

  conditionalField: {
    width: "100%",
    marginTop: -spacing.sm,
  },

  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },

  fieldLabel: {
    marginBottom: spacing.sm,
    color: colors.textPrimary,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 16,
    lineHeight: 23,
  },

  optionalLabel: {
    marginBottom: spacing.sm,
    color: colors.textSecondary,
    fontFamily: "PlusJakartaSans_500Regular",
    fontSize: 12,
    lineHeight: 18,
  },

  required: {
    color: colors.primary,
  },

  selectionRow: {
    flexDirection: "row",
    gap: spacing.md,
  },

  genderSelection: {
    minHeight: 94,
  },

  compactSelection: {
    minHeight: 62,
    paddingVertical: spacing.sm,
  },

  errorRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    marginTop: spacing.sm,
    paddingHorizontal: 2,
  },

  errorText: {
    flex: 1,
    color: colors.error || "#E97878",
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

  scrollContentWithKeyboard: {
    paddingBottom: spacing.md,
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
