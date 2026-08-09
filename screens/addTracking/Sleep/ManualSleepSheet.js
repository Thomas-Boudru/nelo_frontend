import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import PrimaryButton from "../../../components/ui/PrimaryButton.js";
import { useThemeColors } from "../../../theme/useThemeColors.js";

const MAX_NOTE_LENGTH = 300;

const ManualSleepSheet = forwardRef(function ManualSleepSheet({ onSave }, ref) {
  const { t } = useTranslation();

  const modalRef = useRef(null);

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  /*
   * Plus petite que la précédente sheet à 92 %.
   * Le contenu reste scrollable sur les petits écrans.
   */
  const snapPoints = useMemo(() => ["86%"], []);

  const [sleepType, setSleepType] = useState("nap");

  const [startedAt, setStartedAt] = useState(
    () => createDefaultDates("nap").startedAt,
  );

  const [endedAt, setEndedAt] = useState(
    () => createDefaultDates("nap").endedAt,
  );

  const [note, setNote] = useState("");

  /*
   * pickerTarget : "start" | "end"
   * pickerMode   : "date" | "time"
   */
  const [pickerTarget, setPickerTarget] = useState(null);
  const [pickerMode, setPickerMode] = useState("date");

  useImperativeHandle(ref, () => ({
    present(initialSleepType = "nap") {
      const safeType = initialSleepType === "night" ? "night" : "nap";

      const defaultDates = createDefaultDates(safeType);

      setSleepType(safeType);
      setStartedAt(defaultDates.startedAt);
      setEndedAt(defaultDates.endedAt);
      setNote("");
      setPickerTarget(null);
      setPickerMode("date");

      modalRef.current?.present();
    },

    dismiss() {
      setPickerTarget(null);
      modalRef.current?.dismiss();
    },
  }));

  const renderBackdrop = useCallback(
    (props) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
        opacity={0.42}
      />
    ),
    [],
  );

  const durationSeconds = useMemo(() => {
    if (!(startedAt instanceof Date) || !(endedAt instanceof Date)) {
      return 0;
    }

    return Math.max(
      0,
      Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000),
    );
  }, [startedAt, endedAt]);

  const validationMessage = useMemo(() => {
    const now = Date.now();

    if (endedAt.getTime() <= startedAt.getTime()) {
      return t("End time must be after start time");
    }

    if (startedAt.getTime() > now) {
      return t("Start time cannot be in the future");
    }

    if (endedAt.getTime() > now) {
      return t("End time cannot be in the future");
    }

    return "";
  }, [endedAt, startedAt, t]);

  const canSave = durationSeconds > 0 && validationMessage.length === 0;

  const selectedPickerValue = pickerTarget === "start" ? startedAt : endedAt;

  const handleChangeSleepType = (nextType) => {
    if (nextType === sleepType) {
      return;
    }

    const defaultDates = createDefaultDates(nextType);

    setSleepType(nextType);
    setStartedAt(defaultDates.startedAt);
    setEndedAt(defaultDates.endedAt);
    setPickerTarget(null);
  };

  const handleOpenPicker = (target, mode) => {
    setPickerTarget(target);
    setPickerMode(mode);
  };

  const handleClosePicker = () => {
    setPickerTarget(null);
  };

  const handleConfirmPicker = (selectedValue) => {
    if (!pickerTarget || !selectedValue) {
      handleClosePicker();
      return;
    }

    const currentValue = pickerTarget === "start" ? startedAt : endedAt;

    const nextValue =
      pickerMode === "date"
        ? mergeDate(currentValue, selectedValue)
        : mergeTime(currentValue, selectedValue);

    if (pickerTarget === "start") {
      setStartedAt(nextValue);
    } else {
      setEndedAt(nextValue);
    }

    handleClosePicker();
  };

  const handleSave = () => {
    if (!canSave) {
      return;
    }

    const sleep = {
      type: sleepType,
      startedAt,
      endedAt,
      durationSeconds,
      note: note.trim(),
      entryMode: "manual",
    };

    onSave?.(sleep);

    setPickerTarget(null);
    modalRef.current?.dismiss();
  };

  return (
    <>
      <BottomSheetModal
        ref={modalRef}
        index={0}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        enablePanDownToClose
        stackBehavior="push"
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBackground}
        handleStyle={styles.handleContainer}
        handleIndicatorStyle={styles.handleIndicator}
        onDismiss={() => setPickerTarget(null)}
      >
        <View style={styles.container}>
          <BottomSheetScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text style={styles.title}>{t("Add sleep manually")}</Text>

                <Text style={styles.subtitle}>
                  {t("Enter when the sleep started and ended")}
                </Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>{t("Sleep type")}</Text>

              <View style={styles.typeSelector}>
                <SleepTypeOption
                  icon="cloud-outline"
                  label={t("Nap")}
                  selected={sleepType === "nap"}
                  onPress={() => handleChangeSleepType("nap")}
                  colors={colors}
                  styles={styles}
                />

                <SleepTypeOption
                  icon="moon-outline"
                  label={t("Night")}
                  selected={sleepType === "night"}
                  onPress={() => handleChangeSleepType("night")}
                  colors={colors}
                  styles={styles}
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>{t("Sleep period")}</Text>

              <SleepDateTimeCard
                label={t("Started")}
                icon="play-outline"
                value={startedAt}
                onPressDate={() => handleOpenPicker("start", "date")}
                onPressTime={() => handleOpenPicker("start", "time")}
                colors={colors}
                styles={styles}
                t={t}
              />

              <View style={styles.periodConnector}>
                <View style={styles.connectorLine} />
              </View>

              <SleepDateTimeCard
                label={t("Ended")}
                icon="stop-outline"
                value={endedAt}
                onPressDate={() => handleOpenPicker("end", "date")}
                onPressTime={() => handleOpenPicker("end", "time")}
                colors={colors}
                styles={styles}
                t={t}
              />
            </View>

            <View style={styles.durationCard}>
              <View style={styles.durationIconContainer}>
                <Ionicons
                  name="time-outline"
                  size={22}
                  color={colors.primary}
                />
              </View>

              <View style={styles.durationTextContainer}>
                <Text style={styles.durationLabel}>{t("Duration")}</Text>

                <Text style={styles.durationValue}>
                  {formatSleepDuration(durationSeconds, t)}
                </Text>
              </View>
            </View>

            {validationMessage ? (
              <View style={styles.errorContainer}>
                <Ionicons
                  name="alert-circle-outline"
                  size={17}
                  color={colors.error}
                />

                <Text style={styles.errorText}>{validationMessage}</Text>
              </View>
            ) : null}

            <View style={styles.noteSection}>
              <View style={styles.noteHeader}>
                <Text style={styles.sectionLabel}>{t("Note")}</Text>

                <Text
                  style={[
                    styles.noteCounter,
                    note.length >= MAX_NOTE_LENGTH && styles.noteCounterLimit,
                  ]}
                >
                  {note.length}/{MAX_NOTE_LENGTH}
                </Text>
              </View>

              <View style={styles.noteInputContainer}>
                <Ionicons
                  name="document-text-outline"
                  size={19}
                  color={colors.textSecondary}
                  style={styles.noteIcon}
                />

                <TextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder={t("Add an optional note")}
                  placeholderTextColor={`${colors.textSecondary}90`}
                  multiline
                  maxLength={MAX_NOTE_LENGTH}
                  textAlignVertical="top"
                  returnKeyType="default"
                  style={styles.noteInput}
                />
              </View>
            </View>
          </BottomSheetScrollView>

          <View style={styles.footer}>
            <PrimaryButton
              title={t("Save sleep")}
              disabled={!canSave}
              onPress={handleSave}
            />
          </View>
        </View>
      </BottomSheetModal>

      <DateTimePickerModal
        isVisible={pickerTarget !== null}
        mode={pickerMode}
        date={selectedPickerValue}
        maximumDate={new Date()}
        display={Platform.OS === "ios" ? "spinner" : "default"}
        is24Hour
        confirmTextIOS={t("Confirm")}
        cancelTextIOS={t("Cancel")}
        onConfirm={handleConfirmPicker}
        onCancel={handleClosePicker}
      />
    </>
  );
});

export default ManualSleepSheet;

function SleepTypeOption({ icon, label, selected, onPress, colors, styles }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.typeOption,
        selected && styles.typeOptionSelected,
        pressed && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.typeIconContainer,
          selected && styles.typeIconContainerSelected,
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={selected ? colors.primary : colors.textSecondary}
        />
      </View>

      <Text
        style={[
          styles.typeOptionText,
          selected && styles.typeOptionTextSelected,
        ]}
      >
        {label}
      </Text>

      {selected ? (
        <View style={styles.selectedCheck}>
          <Ionicons name="checkmark" size={12} color="#FFFFFF" />
        </View>
      ) : null}
    </Pressable>
  );
}

function SleepDateTimeCard({
  label,
  icon,
  value,
  onPressDate,
  onPressTime,
  colors,
  styles,
  t,
}) {
  return (
    <View style={styles.dateTimeCard}>
      <View style={styles.dateTimeHeader}>
        <View style={styles.dateTimeIconContainer}>
          <Ionicons name={icon} size={17} color={colors.primary} />
        </View>

        <Text style={styles.dateTimeLabel}>{label}</Text>
      </View>

      <View style={styles.dateTimeValues}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}, ${t("Date")}`}
          onPress={onPressDate}
          style={({ pressed }) => [
            styles.dateTimeValueButton,
            styles.dateButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons
            name="calendar-outline"
            size={17}
            color={colors.textSecondary}
          />

          <Text numberOfLines={1} style={styles.dateTimeValueText}>
            {formatDate(value, t)}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}, ${t("Time")}`}
          onPress={onPressTime}
          style={({ pressed }) => [
            styles.dateTimeValueButton,
            styles.timeButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons
            name="time-outline"
            size={17}
            color={colors.textSecondary}
          />

          <Text style={styles.dateTimeValueText}>{formatTime(value)}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function createDefaultDates(type) {
  const now = new Date();

  if (type === "night") {
    const endedAt = new Date(now);
    const startedAt = new Date(now);

    startedAt.setDate(startedAt.getDate() - 1);
    startedAt.setHours(20, 0, 0, 0);

    endedAt.setHours(7, 0, 0, 0);

    /*
     * Si 7 h n’est pas encore passée, la fin devient
     * simplement l’heure actuelle.
     */
    if (endedAt.getTime() > now.getTime()) {
      endedAt.setTime(now.getTime());
    }

    return {
      startedAt,
      endedAt,
    };
  }

  const endedAt = new Date(now);
  const startedAt = new Date(endedAt.getTime() - 60 * 60 * 1000);

  return {
    startedAt,
    endedAt,
  };
}

function mergeDate(currentValue, selectedDate) {
  const result = new Date(currentValue);

  result.setFullYear(
    selectedDate.getFullYear(),
    selectedDate.getMonth(),
    selectedDate.getDate(),
  );

  return result;
}

function mergeTime(currentValue, selectedTime) {
  const result = new Date(currentValue);

  result.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);

  return result;
}

function formatDate(date, t) {
  const value = new Date(date);
  const today = new Date();
  const yesterday = new Date();

  yesterday.setDate(today.getDate() - 1);

  if (isSameCalendarDay(value, today)) {
    return t("Today");
  }

  if (isSameCalendarDay(value, yesterday)) {
    return t("Yesterday");
  }

  return value.toLocaleDateString([], {
    day: "numeric",
    month: "short",
    year: value.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}

function isSameCalendarDay(firstDate, secondDate) {
  return (
    firstDate.getFullYear() === secondDate.getFullYear() &&
    firstDate.getMonth() === secondDate.getMonth() &&
    firstDate.getDate() === secondDate.getDate()
  );
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatSleepDuration(totalSeconds, t) {
  const safeSeconds = Math.max(0, totalSeconds ?? 0);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);

  if (hours > 0) {
    return t("hours and minutes short", {
      hours,
      minutes,
    });
  }

  return t("minutes short", {
    minutes,
  });
}

function createStyles(colors) {
  return StyleSheet.create({
    sheetBackground: {
      backgroundColor: colors.white,
      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,
    },

    handleContainer: {
      paddingTop: 10,
      paddingBottom: 7,
    },

    handleIndicator: {
      width: 46,
      height: 5,
      borderRadius: 3,
      backgroundColor: colors.textSecondary,
      opacity: 0.24,
    },

    container: {
      flex: 1,
    },

    scrollContent: {
      paddingHorizontal: 20,
      paddingBottom: 24,
    },

    header: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 16,
      marginBottom: 18,
    },

    headerText: {
      flex: 1,
    },

    title: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 22,
      lineHeight: 30,
      letterSpacing: -0.4,
      color: colors.textPrimary,
    },

    subtitle: {
      marginTop: 3,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 13,
      lineHeight: 19,
      color: colors.textSecondary,
    },

    closeButton: {
      width: 38,
      height: 38,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 14,
      backgroundColor: colors.lightBackground,
    },

    section: {
      marginBottom: 16,
    },

    sectionLabel: {
      marginBottom: 9,
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 13,
      lineHeight: 18,
      color: colors.textPrimary,
    },

    typeSelector: {
      flexDirection: "row",
      gap: 10,
    },

    typeOption: {
      position: "relative",
      flex: 1,
      minHeight: 62,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 13,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      backgroundColor: colors.white,
    },

    typeOptionSelected: {
      borderColor: `${colors.primary}70`,
      backgroundColor: colors.selectedBackground,
    },

    typeIconContainer: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 12,
      backgroundColor: colors.lightBackground,
    },

    typeIconContainerSelected: {
      backgroundColor: `${colors.primary}14`,
    },

    typeOptionText: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 14,
      color: colors.textSecondary,
    },

    typeOptionTextSelected: {
      color: colors.primary,
    },

    selectedCheck: {
      position: "absolute",
      top: 7,
      right: 7,
      width: 18,
      height: 18,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 9,
      backgroundColor: colors.primary,
    },

    dateTimeCard: {
      padding: 13,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      backgroundColor: colors.white,
    },

    dateTimeHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
      marginBottom: 10,
    },

    dateTimeIconContainer: {
      width: 29,
      height: 29,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 10,
      backgroundColor: `${colors.primary}12`,
    },

    dateTimeLabel: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 14,
      color: colors.textPrimary,
    },

    dateTimeValues: {
      flexDirection: "row",
      gap: 9,
    },

    dateTimeValueButton: {
      minHeight: 44,
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      paddingHorizontal: 11,
      borderRadius: 13,
      backgroundColor: colors.lightBackground,
    },

    dateButton: {
      flex: 1,
    },

    timeButton: {
      minWidth: 110,
    },

    dateTimeValueText: {
      flexShrink: 1,
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 13,
      color: colors.textPrimary,
    },

    periodConnector: {
      height: 12,
      paddingLeft: 27,
    },

    connectorLine: {
      width: 2,
      height: "100%",
      borderRadius: 1,
      backgroundColor: `${colors.primary}25`,
    },

    durationCard: {
      flexDirection: "row",
      alignItems: "center",
      padding: 13,
      borderWidth: 1,
      borderColor: `${colors.primary}30`,
      borderRadius: 18,
      backgroundColor: `${colors.primary}08`,
    },

    durationIconContainer: {
      width: 42,
      height: 42,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 14,
      backgroundColor: `${colors.primary}14`,
    },

    durationTextContainer: {
      marginLeft: 12,
    },

    durationLabel: {
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 12,
      lineHeight: 17,
      color: colors.textSecondary,
    },

    durationValue: {
      marginTop: 1,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 18,
      lineHeight: 24,
      color: colors.primary,
    },

    errorContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      marginTop: 9,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 14,
      backgroundColor: `${colors.error}10`,
    },

    errorText: {
      flex: 1,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 12,
      lineHeight: 17,
      color: colors.error,
    },

    noteSection: {
      marginTop: 15,
    },

    noteHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    noteCounter: {
      marginBottom: 9,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 11,
      color: colors.textSecondary,
    },

    noteCounterLimit: {
      color: colors.error,
    },

    noteInputContainer: {
      minHeight: 96,
      flexDirection: "row",
      alignItems: "flex-start",
      paddingHorizontal: 13,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      backgroundColor: colors.white,
    },

    noteIcon: {
      marginTop: 1,
      marginRight: 9,
    },

    noteInput: {
      flex: 1,
      minHeight: 70,
      padding: 0,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 13,
      lineHeight: 19,
      color: colors.textPrimary,
    },

    footer: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: Platform.OS === "ios" ? 18 : 14,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.white,
    },

    pressed: {
      opacity: 0.68,
      transform: [{ scale: 0.98 }],
    },
  });
}
