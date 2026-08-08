import { useMemo, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useThemeColors } from "../../../theme/useThemeColors.js";

export default function FeedingTimeRow({
  isNow = true,
  date = new Date(),
  onDateChange,
}) {
  const { t } = useTranslation();

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [isIosPickerVisible, setIsIosPickerVisible] = useState(false);
  const [androidPickerMode, setAndroidPickerMode] = useState(null);
  const [draftDate, setDraftDate] = useState(date);

  const formattedDateTime = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date),
    [date],
  );

  const openPicker = () => {
    setDraftDate(date);

    if (Platform.OS === "ios") {
      setIsIosPickerVisible(true);
      return;
    }

    setAndroidPickerMode("date");
  };

  const handleAndroidChange = (event, selectedValue) => {
    if (event.type !== "set" || !selectedValue) {
      setAndroidPickerMode(null);
      return;
    }

    if (androidPickerMode === "date") {
      const nextDate = new Date(date);

      nextDate.setFullYear(
        selectedValue.getFullYear(),
        selectedValue.getMonth(),
        selectedValue.getDate(),
      );

      setDraftDate(nextDate);
      setAndroidPickerMode("time");
      return;
    }

    const nextDate = new Date(draftDate);

    nextDate.setHours(
      selectedValue.getHours(),
      selectedValue.getMinutes(),
      0,
      0,
    );

    onDateChange?.(nextDate);
    setAndroidPickerMode(null);
  };

  const handleConfirmIosDate = () => {
    onDateChange?.(draftDate);
    setIsIosPickerVisible(false);
  };

  return (
    <>
      <Pressable
        onPress={openPicker}
        style={({ pressed }) => [
          styles.container,
          pressed && styles.containerPressed,
        ]}
      >
        <View style={styles.left}>
          <Ionicons
            name="time-outline"
            size={17}
            color={colors.textSecondary}
          />

          <Text style={styles.label}>
            {isNow ? t("Now") : formattedDateTime}
          </Text>
        </View>

        <View style={styles.editAction}>
          <Text style={styles.editActionLabel}>{t("Change time")}</Text>

          <Ionicons name="chevron-forward" size={17} color={colors.primary} />
        </View>
      </Pressable>

      {androidPickerMode ? (
        <DateTimePicker
          value={androidPickerMode === "date" ? date : draftDate}
          mode={androidPickerMode}
          display="default"
          maximumDate={new Date()}
          onChange={handleAndroidChange}
        />
      ) : null}

      <Modal
        visible={isIosPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsIosPickerVisible(false)}
      >
        <Pressable
          onPress={() => setIsIosPickerVisible(false)}
          style={styles.modalBackdrop}
        >
          <Pressable style={styles.pickerSheet} onPress={() => {}}>
            <View style={styles.pickerHeader}>
              <Pressable onPress={() => setIsIosPickerVisible(false)}>
                <Text style={styles.cancelLabel}>{t("Cancel")}</Text>
              </Pressable>

              <Text style={styles.pickerTitle}>{t("Date and time")}</Text>

              <Pressable onPress={handleConfirmIosDate}>
                <Text style={styles.confirmLabel}>{t("Done")}</Text>
              </Pressable>
            </View>

            <DateTimePicker
              value={draftDate}
              mode="datetime"
              display="spinner"
              maximumDate={new Date()}
              onChange={(_, selectedValue) => {
                if (selectedValue) {
                  setDraftDate(selectedValue);
                }
              }}
              style={styles.iosPicker}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      minHeight: 34,
      marginTop: -10,
    },

    containerPressed: {
      opacity: 0.72,
    },

    left: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      gap: 8,
    },

    label: {
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 13,
      color: colors.textSecondary,
    },

    editAction: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      paddingVertical: 5,
      paddingLeft: 12,
    },

    editActionLabel: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 12,
      color: colors.primary,
    },

    modalBackdrop: {
      flex: 1,
      justifyContent: "flex-end",
    },

    pickerSheet: {
      paddingTop: 16,
      paddingBottom: 28,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      backgroundColor: colors.white,

      borderWidth: 1,
      borderColor: colors.border,

      shadowColor: colors.textPrimary,
      shadowOffset: { width: 0, height: -5 },
      shadowOpacity: 0.1,
      shadowRadius: 16,
      elevation: 10,
    },

    pickerHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingBottom: 7,
    },

    pickerTitle: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 15,
      color: colors.textPrimary,
    },

    cancelLabel: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 14,
      color: colors.textSecondary,
    },

    confirmLabel: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 14,
      color: colors.primary,
    },

    iosPicker: {
      height: 190,
    },
  });
}
