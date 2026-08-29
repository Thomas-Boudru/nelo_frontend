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

const EMPTY_CHILD = {
  id: null,
  status: "born",
  firstName: "",
  displayName: "",
  gender: null,
  birthDate: null,
  expectedDueDate: null,
  isPremature: null,
  gestationalAgeWeeks: null,
};

export default function ChildProfileFormScreen({ navigation, route }) {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();

  const routeMode = route?.params?.mode;
  const receivedChild = route?.params?.child ?? null;

  /*
   * Si aucun enfant n’est transmis, on utilise automatiquement
   * le mode création afin d’éviter un écran d’édition vide.
   */
  const isCreateMode = routeMode === "create" || !receivedChild?.id;

  const child = useMemo(
    () =>
      isCreateMode
        ? {
            ...EMPTY_CHILD,

            status:
              route?.params?.initialStatus === "expected" ? "expected" : "born",
          }
        : {
            ...EMPTY_CHILD,
            ...receivedChild,
          },
    [isCreateMode, receivedChild, route?.params?.initialStatus],
  );

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

  const [childName, setChildName] = useState(
    initialStatus === "expected"
      ? (child.displayName ?? "")
      : (child.firstName ?? child.displayName ?? ""),
  );
  const [gender, setGender] = useState(child.gender ?? null);

  const [birthDate, setBirthDate] = useState(initialBirthDate);

  const [expectedDueDate, setExpectedDueDate] = useState(
    initialExpectedDueDate,
  );

  const [isPremature, setIsPremature] = useState(child.isPremature ?? null);

  const [gestationalAgeWeeks, setGestationalAgeWeeks] = useState(
    child.gestationalAgeWeeks ? String(child.gestationalAgeWeeks) : "",
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

  const wasInitiallyExpected = !isCreateMode && initialStatus === "expected";

  const isDeclaringBirth = !isCreateMode && wasInitiallyExpected && isBorn;

  const showStatusSelector = isCreateMode || wasInitiallyExpected;

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
  const gestationalAgeWeeksNumber = Number(gestationalAgeWeeks);

  const hasValidGestationalAge =
    !isBorn ||
    isPremature !== true ||
    (gestationalAgeWeeks !== "" &&
      Number.isInteger(gestationalAgeWeeksNumber) &&
      gestationalAgeWeeksNumber >= 20 &&
      gestationalAgeWeeksNumber <= 36);

  const childNameError =
    hasSubmitted && isBorn && !trimmedChildName
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

  const gestationalAgeError =
    hasSubmitted && isBorn && isPremature === true && !hasValidGestationalAge
      ? t("Please enter a number between 20 and 36 weeks.")
      : "";
  const isFormValid = isBorn
    ? trimmedChildName.length > 0 &&
      birthDate !== null &&
      isPremature !== null &&
      hasValidGestationalAge
    : expectedDueDate !== null;

  function handleStatusChange(nextStatus) {
    setProfileStatus(nextStatus);
    setHasSubmitted(false);

    if (nextStatus === "expected") {
      setBirthDate(null);
      setIsPremature(null);
      setGestationalAgeWeeks("");
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
      setGestationalAgeWeeks("");
    }
  }

  function handleGestationalAgeChange(value) {
    const numericValue = value.replace(/[^0-9]/g, "").slice(0, 2);

    setGestationalAgeWeeks(numericValue);
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

    Keyboard.dismiss();
    setIsSaving(true);

    try {
      const childPayload = {
        status: profileStatus,

        firstName: isBorn && trimmedChildName ? trimmedChildName : null,

        displayName: trimmedChildName || null,

        gender,

        birthDate: isBorn && birthDate ? birthDate.toISOString() : null,

        expectedDueDate:
          !isBorn && expectedDueDate ? expectedDueDate.toISOString() : null,

        isPremature: isBorn ? isPremature : null,

        gestationalAgeWeeks:
          isBorn && isPremature === true ? gestationalAgeWeeksNumber : null,
      };

      let savedChild;

      if (isCreateMode) {
        /*
         * Plus tard :
         *
         * savedChild = await api.post(
         *   "/children",
         *   childPayload,
         * );
         *
         * Le store global devra ensuite :
         * - ajouter savedChild ;
         * - sélectionner savedChild.id ;
         * - rafraîchir les données de l’accueil.
         */

        savedChild = {
          id: `child-${Date.now()}`,
          themeMode: "blue",
          profilePicture: null,
          ...childPayload,
        };

        console.log("Created child profile:", savedChild);
      } else {
        /*
         * Plus tard :
         *
         * savedChild = await api.patch(
         *   `/children/${child.id}`,
         *   childPayload,
         * );
         *
         * Le store global devra remplacer l’enfant
         * correspondant par savedChild.
         */

        savedChild = {
          ...child,
          ...childPayload,
          id: child.id,
        };

        console.log("Updated child profile:", savedChild);
      }

      showToast({
        type: "success",

        title: isCreateMode
          ? t("Child added")
          : isDeclaringBirth
            ? t("Birth declared")
            : t("Child profile updated"),

        message: isCreateMode
          ? t("Child profile has been created", {
              childName:
                savedChild.displayName ||
                savedChild.firstName ||
                t("your baby"),
            })
          : isDeclaringBirth
            ? t("Child birth information has been saved", {
                childName:
                  savedChild.displayName ||
                  savedChild.firstName ||
                  t("your baby"),
              })
            : t("Child profile information has been saved", {
                childName:
                  savedChild.displayName ||
                  savedChild.firstName ||
                  t("your baby"),
              }),
      });

      navigation.goBack();
    } catch (error) {
      showToast({
        type: "error",

        title: isCreateMode
          ? t("Unable to add child")
          : t("Unable to update child profile"),

        message: error?.message ?? t("Please try again in a moment."),
      });
    } finally {
      setIsSaving(false);
    }
  }

  const headerTitle = isCreateMode
    ? t("Add a child")
    : isDeclaringBirth
      ? t("Declare child birth", {
          childName:
            trimmedChildName ||
            child.displayName ||
            child.firstName ||
            t("your baby"),
        })
      : t("Edit child profile");

  const submitButtonTitle = isCreateMode
    ? t("Add child")
    : isDeclaringBirth
      ? t("Confirm birth")
      : t("Save changes");

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
              {headerTitle}
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
            {showStatusSelector ? (
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
                label={
                  isBorn
                    ? t("Your child's first name")
                    : t("What should Nelo call your baby?")
                }
                optionalLabel={!isBorn ? t("Optional") : undefined}
                value={childName}
                onChangeText={setChildName}
                placeholder={
                  isBorn
                    ? t("First name")
                    : t("For example: Emma or Little Bean")
                }
                helperText={
                  isBorn
                    ? t("You can change this later.")
                    : t("You can change this after your baby is born.")
                }
                error={childNameError}
                iconName="person-outline"
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="done"
                maxLength={40}
                editable={!isSaving}
                required={isBorn}
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
                    onPress={() => handleGenderSelection("male")}
                    style={styles.genderSelection}
                  />

                  <SelectionCard
                    label={t("Girl")}
                    iconName="female-outline"
                    selected={gender === "female"}
                    onPress={() => handleGenderSelection("female")}
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
                        label={t(
                          "At how many weeks of pregnancy was your child born?",
                        )}
                        value={gestationalAgeWeeks}
                        onChangeText={handleGestationalAgeChange}
                        placeholder={t("Weeks of pregnancy")}
                        helperText={t(
                          "For example: 32 weeks. This helps Nelo adapt developmental information.",
                        )}
                        error={gestationalAgeError}
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
              title={submitButtonTitle}
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

    fontFamily: "PlusJakartaSans_500Medium",

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

    fontFamily: "PlusJakartaSans_500Medium",

    fontSize: 13,
    lineHeight: 20,
  },

  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,

    borderTopWidth: 1,
    borderTopColor: "rgba(117, 139, 181, 0.12)",

    backgroundColor: colors.background,
  },

  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",

    backgroundColor: "rgba(29, 42, 71, 0.32)",
  },

  dateModal: {
    overflow: "hidden",

    paddingBottom: spacing.xl,

    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,

    backgroundColor: "#FFFFFF",
  },

  modalHeader: {
    minHeight: 62,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",

    paddingHorizontal: spacing.lg,

    borderBottomWidth: 1,
    borderBottomColor: "#E8ECF4",
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
