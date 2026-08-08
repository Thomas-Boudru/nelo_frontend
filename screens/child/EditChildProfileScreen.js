import { useEffect, useMemo, useState } from "react";
import {
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
import SelectionCard from "../../components/onboarding/SelectionCard.js";
import { useToast } from "../../components/ui/toast/useToast.js";

import { onboardingColors, radius, spacing } from "../../theme/index.js";

const colors = onboardingColors;

export default function EditChildProfileScreen({ navigation, route }) {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();

  const child = route?.params?.child ?? {
    id: null,
    status: "born",
    firstName: "",
    gender: null,
    birthDate: null,
    expectedDueDate: null,
    isPremature: null,
    weeksEarly: null,
  };

  const initialStatus = child.status === "expected" ? "expected" : "born";

  const initialBirthDate = useMemo(
    () => parseStoredDate(child.birthDate),
    [child.birthDate],
  );

  const initialExpectedDueDate = useMemo(
    () => parseStoredDate(child.expectedDueDate),
    [child.expectedDueDate],
  );

  const [profileStatus, setProfileStatus] = useState(initialStatus);
  const [childName, setChildName] = useState(child.firstName ?? "");
  const [gender, setGender] = useState(child.gender ?? null);

  const [birthDate, setBirthDate] = useState(initialBirthDate);
  const [expectedDueDate, setExpectedDueDate] = useState(
    initialExpectedDueDate,
  );

  const [isPremature, setIsPremature] = useState(child.isPremature ?? null);

  const [weeksEarly, setWeeksEarly] = useState(
    child.weeksEarly ? String(child.weeksEarly) : "",
  );

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState(null);
  const [temporaryDate, setTemporaryDate] = useState(new Date());

  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const today = useMemo(() => new Date(), []);

  const minimumExpectedDueDate = useMemo(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 1);
    return date;
  }, []);

  const maximumExpectedDueDate = useMemo(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return date;
  }, []);

  const isBorn = profileStatus === "born";
  const wasInitiallyExpected = initialStatus === "expected";
  const isDeclaringBirth = wasInitiallyExpected && isBorn;

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

  const formattedBirthDate = useMemo(
    () => formatDate(birthDate, i18n.language),
    [birthDate, i18n.language],
  );

  const formattedExpectedDueDate = useMemo(
    () => formatDate(expectedDueDate, i18n.language),
    [expectedDueDate, i18n.language],
  );

  const trimmedChildName = childName.trim();
  const weeksEarlyNumber = Number(weeksEarly);

  const hasValidWeeksEarly =
    !isBorn ||
    isPremature !== true ||
    (weeksEarly !== "" &&
      Number.isInteger(weeksEarlyNumber) &&
      weeksEarlyNumber >= 1 &&
      weeksEarlyNumber <= 20);

  const childNameError =
    hasSubmitted && !trimmedChildName
      ? t("Please enter your child's first name.")
      : "";

  const birthDateError =
    hasSubmitted && isBorn && !birthDate
      ? t("Please select your child's date of birth.")
      : "";

  const expectedDueDateError =
    hasSubmitted && !isBorn && !expectedDueDate
      ? t("Please select the expected due date.")
      : "";

  const prematureError =
    hasSubmitted && isBorn && isPremature === null
      ? t("Please select an answer.")
      : "";

  const weeksEarlyError =
    hasSubmitted && isBorn && isPremature === true && !hasValidWeeksEarly
      ? t("Please enter a number between 1 and 20 weeks.")
      : "";

  const isFormValid =
    trimmedChildName.length > 0 &&
    (isBorn
      ? birthDate !== null && isPremature !== null && hasValidWeeksEarly
      : expectedDueDate !== null);

  function handleStatusChange(nextStatus) {
    setProfileStatus(nextStatus);
    setHasSubmitted(false);

    if (nextStatus === "expected") {
      setBirthDate(null);
      setIsPremature(null);
      setWeeksEarly("");
    }
  }

  function handleGenderSelection(nextGender) {
    setGender((currentGender) =>
      currentGender === nextGender ? null : nextGender,
    );
  }

  function handlePrematureSelection(value) {
    setIsPremature(value);

    if (!value) {
      setWeeksEarly("");
    }
  }

  function handleWeeksEarlyChange(value) {
    const numericValue = value.replace(/[^0-9]/g, "").slice(0, 2);

    setWeeksEarly(numericValue);
  }

  function handleOpenDatePicker(mode) {
    Keyboard.dismiss();

    const currentValue =
      mode === "birthDate" ? (birthDate ?? today) : (expectedDueDate ?? today);

    setDatePickerMode(mode);
    setTemporaryDate(currentValue);
    setShowDatePicker(true);
  }

  function handleDateChange(event, selectedDate) {
    if (Platform.OS === "android") {
      setShowDatePicker(false);

      if (event.type === "dismissed" || !selectedDate) {
        return;
      }

      applySelectedDate(selectedDate);
      return;
    }

    if (selectedDate) {
      setTemporaryDate(selectedDate);
    }
  }

  function applySelectedDate(selectedDate) {
    if (datePickerMode === "birthDate") {
      setBirthDate(selectedDate);
      return;
    }

    if (datePickerMode === "expectedDueDate") {
      setExpectedDueDate(selectedDate);
    }
  }

  function handleConfirmDate() {
    applySelectedDate(temporaryDate);
    setShowDatePicker(false);
  }

  function handleCancelDate() {
    setShowDatePicker(false);
  }

  async function handleSave() {
    setHasSubmitted(true);

    if (!isFormValid || isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      const updatedChild = {
        id: child.id,
        status: profileStatus,
        firstName: trimmedChildName,
        gender,

        birthDate: isBorn && birthDate ? birthDate.toISOString() : null,

        expectedDueDate:
          !isBorn && expectedDueDate ? expectedDueDate.toISOString() : null,

        isPremature: isBorn ? isPremature : null,

        weeksEarly: isBorn && isPremature === true ? weeksEarlyNumber : null,
      };

      /*
       * Plus tard :
       *
       * await api.patch(
       *   `/children/${child.id}`,
       *   updatedChild,
       * );
       *
       * Il faudra ensuite mettre à jour le store global
       * ou recharger le profil depuis l’API.
       */

      console.log("Updated child profile:", updatedChild);

      showToast({
        type: "success",
        title: isDeclaringBirth
          ? t("Birth declared")
          : t("Child profile updated"),
        message: isDeclaringBirth
          ? t("Child birth information has been saved", {
              childName: updatedChild.firstName,
            })
          : t("Child profile information has been saved", {
              childName: updatedChild.firstName,
            }),
      });

      navigation.goBack();
    } catch (error) {
      showToast({
        type: "error",
        title: t("Unable to update child profile"),
        message: error?.message ?? t("Please try again in a moment."),
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.screen}>
          <View style={styles.header}>
            <BackButton onPress={() => navigation.goBack()} />

            <Text style={styles.headerTitle} numberOfLines={1}>
              {isDeclaringBirth
                ? t("Declare child birth", {
                    childName: trimmedChildName || child.firstName,
                  })
                : t("Edit child profile")}
            </Text>

            <View style={styles.headerPlaceholder} />
          </View>

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
            {wasInitiallyExpected ? (
              <View style={styles.statusContainer}>
                <Text style={styles.fieldLabel}>
                  {t("Has your child been born?")}
                </Text>

                <View style={styles.selectionRow}>
                  <SelectionCard
                    label={t("Not yet")}
                    iconName="calendar-outline"
                    selected={!isBorn}
                    onPress={() => handleStatusChange("expected")}
                    style={styles.statusSelection}
                  />

                  <SelectionCard
                    label={t("Yes")}
                    iconName="heart-outline"
                    selected={isBorn}
                    onPress={() => handleStatusChange("born")}
                    style={styles.statusSelection}
                  />
                </View>
              </View>
            ) : null}

            <View style={styles.form}>
              <FormField
                label={t("Your child's first name")}
                value={childName}
                onChangeText={setChildName}
                placeholder={t("First name")}
                helperText={
                  isBorn
                    ? undefined
                    : t(
                        "You can leave the name you currently use and change it later.",
                      )
                }
                error={childNameError}
                iconName="person-outline"
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="done"
                maxLength={40}
                editable={!isSaving}
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
                </View>
              </View>

              {isBorn ? (
                <>
                  <DateField
                    label={t("Date of birth")}
                    value={formattedBirthDate}
                    placeholder={t("Select a date")}
                    error={birthDateError}
                    onPress={() => handleOpenDatePicker("birthDate")}
                    disabled={isSaving}
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
                      <ErrorMessage message={prematureError} />
                    ) : null}
                  </View>

                  {isPremature === true ? (
                    <View style={styles.conditionalField}>
                      <FormField
                        label={t("How many weeks early was your child born?")}
                        value={weeksEarly}
                        onChangeText={handleWeeksEarlyChange}
                        placeholder={t("Number of weeks early")}
                        helperText={t(
                          "For example: 6 weeks early. This helps Nelo adapt developmental information.",
                        )}
                        error={weeksEarlyError}
                        iconName="time-outline"
                        keyboardType="number-pad"
                        maxLength={2}
                        editable={!isSaving}
                        required
                      />
                    </View>
                  ) : null}
                </>
              ) : (
                <DateField
                  label={t("Expected due date")}
                  value={formattedExpectedDueDate}
                  placeholder={t("Select a date")}
                  helperText={t(
                    "Nelo will adapt information as the expected date approaches.",
                  )}
                  error={expectedDueDateError}
                  onPress={() => handleOpenDatePicker("expectedDueDate")}
                  disabled={isSaving}
                  required
                />
              )}
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
            <PrimaryButton
              title={isDeclaringBirth ? t("Confirm birth") : t("Save changes")}
              loading={isSaving}
              disabled={isSaving}
              onPress={handleSave}
            />
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
                  {datePickerMode === "birthDate"
                    ? t("Select the date of birth")
                    : t("Select the expected due date")}
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
                value={temporaryDate}
                mode="date"
                display="spinner"
                minimumDate={
                  datePickerMode === "expectedDueDate"
                    ? minimumExpectedDueDate
                    : undefined
                }
                maximumDate={
                  datePickerMode === "birthDate"
                    ? today
                    : maximumExpectedDueDate
                }
                onChange={handleDateChange}
                style={styles.datePicker}
              />
            </View>
          </View>
        </Modal>
      ) : showDatePicker ? (
        <DateTimePicker
          value={temporaryDate}
          mode="date"
          display="default"
          minimumDate={
            datePickerMode === "expectedDueDate"
              ? minimumExpectedDueDate
              : undefined
          }
          maximumDate={
            datePickerMode === "birthDate" ? today : maximumExpectedDueDate
          }
          onChange={handleDateChange}
        />
      ) : null}
    </SafeAreaView>
  );
}

function ErrorMessage({ message }) {
  return (
    <View style={styles.errorRow}>
      <Ionicons
        name="alert-circle-outline"
        size={17}
        color={colors.error || "#E97878"}
      />

      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

function parseStoredDate(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const parsedDate = new Date(value);

  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function formatDate(date, language) {
  if (!date) {
    return "";
  }

  try {
    return new Intl.DateTimeFormat(language, {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  } catch {
    return date.toLocaleDateString();
  }
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

  header: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },

  headerTitle: {
    flex: 1,
    marginHorizontal: spacing.sm,
    color: colors.textPrimary,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 18,
    lineHeight: 25,
    textAlign: "center",
  },

  headerPlaceholder: {
    width: 42,
    height: 42,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },

  scrollContentWithKeyboard: {
    paddingBottom: spacing.md,
  },

  statusContainer: {
    marginBottom: spacing.xl,
  },

  form: {
    gap: spacing.xl,
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

  statusSelection: {
    minHeight: 86,
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
