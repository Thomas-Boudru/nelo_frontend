import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
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
import NoteSheet from "../Feeding/NoteSheet.js";

function getSleepTypeFromEntry(entry) {
  const storedType =
    entry?.sleepType ??
    entry?.details?.sleepType ??
    entry?.sleepKind ??
    entry?.details?.sleepKind;

  if (storedType === "nap" || storedType === "night") {
    return storedType;
  }

  /*
   * Compatibilité avec les anciennes entrées qui
   * utilisaient directement type: "nap" ou "night".
   */
  if (entry?.type === "nap" || entry?.type === "night") {
    return entry.type;
  }

  return "nap";
}

function createManualSleepFromTrackingEntry(entry) {
  const sleepType = getSleepTypeFromEntry(entry);

  const parsedStartedAt = new Date(
    entry?.startedAt ?? entry?.details?.startedAt ?? Date.now(),
  );

  const parsedEndedAt = new Date(
    entry?.endedAt ?? entry?.details?.endedAt ?? Date.now(),
  );

  const startedAt = Number.isNaN(parsedStartedAt.getTime())
    ? createDefaultDates(sleepType).startedAt
    : parsedStartedAt;

  const endedAt = Number.isNaN(parsedEndedAt.getTime())
    ? createDefaultDates(sleepType).endedAt
    : parsedEndedAt;

  return {
    sleepType,
    startedAt,
    endedAt,

    note: entry?.note ?? entry?.details?.note ?? "",
  };
}

const ManualSleepSheet = forwardRef(function ManualSleepSheet(
  { onSave, onRequestDelete },
  ref,
) {
  const { t } = useTranslation();

  const modalRef = useRef(null);
  const noteSheetRef = useRef(null);

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

  const handleOpenNote = () => {
    noteSheetRef.current?.present(note);
  };
  const [endedAt, setEndedAt] = useState(
    () => createDefaultDates("nap").endedAt,
  );

  const [note, setNote] = useState("");

  const [sheetMode, setSheetMode] = useState("create");

  const [editingEntry, setEditingEntry] = useState(null);

  const isEditMode = sheetMode === "edit";

  const [pickerTarget, setPickerTarget] = useState(null);
  const [pickerMode, setPickerMode] = useState("date");

  useImperativeHandle(ref, () => ({
    present(options = {}) {
      /*
       * Compatibilité avec l’ancien appel :
       * present("nap")
       * present("night")
       */
      if (typeof options === "string") {
        const safeType = options === "night" ? "night" : "nap";

        const defaultDates = createDefaultDates(safeType);

        setSheetMode("create");
        setEditingEntry(null);

        setSleepType(safeType);
        setStartedAt(defaultDates.startedAt);
        setEndedAt(defaultDates.endedAt);
        setNote("");

        setPickerTarget(null);
        setPickerMode("date");

        modalRef.current?.present();
        return;
      }

      const {
        mode = "create",
        sleepType: initialSleepType = "nap",
        entry = null,
      } = options;

      setSheetMode(mode);
      setPickerTarget(null);
      setPickerMode("date");

      if (mode === "edit" && entry) {
        const existingSleep = createManualSleepFromTrackingEntry(entry);

        setEditingEntry(entry);

        setSleepType(existingSleep.sleepType);
        setStartedAt(existingSleep.startedAt);
        setEndedAt(existingSleep.endedAt);
        setNote(existingSleep.note);

        modalRef.current?.present();
        return;
      }

      const safeType = initialSleepType === "night" ? "night" : "nap";

      const defaultDates = createDefaultDates(safeType);

      setEditingEntry(null);

      setSleepType(safeType);
      setStartedAt(defaultDates.startedAt);
      setEndedAt(defaultDates.endedAt);
      setNote("");

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

    setSleepType(nextType);

    /*
     * En édition, changer Nap/Night ne doit pas
     * effacer les heures enregistrées.
     */
    if (isEditMode) {
      return;
    }

    const defaultDates = createDefaultDates(nextType);

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

  const handleRequestDelete = () => {
    if (!isEditMode || !editingEntry) {
      return;
    }

    onRequestDelete?.(editingEntry);
  };

  const handleSave = async () => {
    if (!canSave) {
      return;
    }

    const sleep = {
      ...editingEntry,

      id: editingEntry?.id,

      /*
       * On conserve le contrat actuel de tes formulaires :
       * type contient nap ou night.
       * sleepType est aussi ajouté explicitement pour que
       * la timeline puisse le retrouver sans ambiguïté.
       */
      type: sleepType,
      sleepType,

      startedAt,
      endedAt,
      durationSeconds,

      note: note.trim(),

      entryMode: editingEntry?.entryMode ?? "manual",

      mode: sheetMode,
    };

    await onSave?.(sleep);

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
                <Text style={styles.title}>
                  {isEditMode ? t("Edit sleep") : t("Add sleep manually")}
                </Text>

                <Text style={styles.subtitle}>
                  {isEditMode
                    ? t("Update the sleep period and details")
                    : t("Enter when the sleep started and ended")}
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

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={note ? t("Edit note") : t("Add a note")}
              onPress={handleOpenNote}
              style={({ pressed }) => [
                styles.noteButton,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.noteIconContainer}>
                <Ionicons
                  name="document-text-outline"
                  size={20}
                  color={colors.primary}
                />
              </View>

              <View style={styles.noteButtonContent}>
                <Text style={styles.noteButtonTitle}>{t("Note")}</Text>

                <Text
                  numberOfLines={1}
                  style={[
                    styles.noteButtonDescription,
                    note && styles.noteButtonDescriptionAdded,
                  ]}
                >
                  {note ? note : t("Add an optional note")}
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={19}
                color={colors.textSecondary}
              />
            </Pressable>
          </BottomSheetScrollView>

          <View style={styles.footer}>
            {isEditMode ? (
              <View style={styles.editFooterRow}>
                <View style={styles.footerButton}>
                  <PrimaryButton
                    title={t("Delete")}
                    variant="destructive"
                    onPress={handleRequestDelete}
                  />
                </View>

                <View style={styles.footerButton}>
                  <PrimaryButton
                    title={t("Save changes")}
                    disabled={!canSave}
                    onPress={handleSave}
                  />
                </View>
              </View>
            ) : (
              <PrimaryButton
                title={t("Save sleep")}
                disabled={!canSave}
                onPress={handleSave}
              />
            )}
          </View>
        </View>
      </BottomSheetModal>

      <NoteSheet
        ref={noteSheetRef}
        title="Sleep note"
        description="Add an optional detail about this sleep"
        placeholder="For example, wake-ups, restlessness or unusual sleep"
        onSave={(savedNote) => {
          setNote(savedNote);
        }}
      />

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

    editFooterRow: {
      width: "100%",

      flexDirection: "row",
      alignItems: "center",

      gap: 10,
    },

    footerButton: {
      flex: 1,
      minWidth: 0,
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

    noteButton: {
      minHeight: 64,

      flexDirection: "row",
      alignItems: "center",

      gap: 11,

      marginTop: 16,
      paddingHorizontal: 13,
      paddingVertical: 10,

      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,

      backgroundColor: colors.white,
    },

    noteIconContainer: {
      width: 38,
      height: 38,

      alignItems: "center",
      justifyContent: "center",

      borderRadius: 13,

      backgroundColor: `${colors.primary}12`,
    },

    noteButtonContent: {
      flex: 1,
      minWidth: 0,
    },

    noteButtonTitle: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 13,
      lineHeight: 18,

      color: colors.textPrimary,
    },

    noteButtonDescription: {
      marginTop: 2,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 11,
      lineHeight: 16,

      color: colors.textSecondary,
    },

    noteButtonDescriptionAdded: {
      color: colors.textPrimary,
    },
  });
}
