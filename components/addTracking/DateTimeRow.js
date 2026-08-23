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

import { useThemeColors } from "../../theme/useThemeColors.js";

export default function DateTimeRow({
  value = new Date(),
  isNow = true,
  onChange,
  onClear,
  minimumDate,
  maximumDate = new Date(),
  title = "Time",
  mode = "datetime",
  emptyLabel = "Now",
}) {
  const { t, i18n } = useTranslation();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [isIosPickerVisible, setIsIosPickerVisible] = useState(false);
  const [androidPickerMode, setAndroidPickerMode] = useState(null);
  const [draftDate, setDraftDate] = useState(value);

  const isDateOnly = mode === "date";

  const formattedDateTime = useMemo(
    () =>
      new Intl.DateTimeFormat(
        i18n.language,
        isDateOnly
          ? {
              weekday: "short",
              day: "numeric",
              month: "short",
              year: "numeric",
            }
          : {
              weekday: "short",
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            },
      ).format(value),
    [i18n.language, isDateOnly, value],
  );

  const openPicker = () => {
    setDraftDate(value);

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
      const nextDate = new Date(value);

      nextDate.setFullYear(
        selectedValue.getFullYear(),
        selectedValue.getMonth(),
        selectedValue.getDate(),
      );

      /*
       * En mode date seule, on ne chaîne pas le sélecteur d’heure.
       */
      if (isDateOnly) {
        onChange?.(nextDate);
        setAndroidPickerMode(null);
        return;
      }

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

    onChange?.(nextDate);
    setAndroidPickerMode(null);
  };

  const handleConfirmIos = () => {
    onChange?.(draftDate);
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
          <View style={styles.iconContainer}>
            <Ionicons
              name="calendar-outline"
              size={18}
              color={colors.primary}
            />
          </View>

          <View style={styles.textContent}>
            <Text style={styles.title}>{t(title)}</Text>
            <Text numberOfLines={1} style={styles.value}>
              {isNow ? t(emptyLabel) : formattedDateTime}
            </Text>
          </View>
        </View>

        <View style={styles.changeAction}>
          {onClear && !isNow ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("Clear")}
              hitSlop={10}
              onPress={(event) => {
                event.stopPropagation();
                onClear();
              }}
              style={({ pressed }) => [
                styles.clearButton,
                pressed && styles.containerPressed,
              ]}
            >
              <Ionicons name="close" size={16} color={colors.textSecondary} />
            </Pressable>
          ) : null}

          <Ionicons name="chevron-forward" size={18} color="#91A0B5" />
        </View>
      </Pressable>

      {androidPickerMode ? (
        <DateTimePicker
          value={androidPickerMode === "date" ? value : draftDate}
          mode={androidPickerMode}
          display="default"
          minimumDate={minimumDate}
          maximumDate={maximumDate ?? undefined}
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

              <Text style={styles.pickerTitle}>
                {isDateOnly ? t(title) : t("Date and time")}
              </Text>

              <Pressable onPress={handleConfirmIos}>
                <Text style={styles.confirmLabel}>{t("Done")}</Text>
              </Pressable>
            </View>

            <DateTimePicker
              value={draftDate}
              mode={mode}
              display="spinner"
              minimumDate={minimumDate}
              maximumDate={maximumDate ?? undefined}
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

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      alignItems: "center",
      backgroundColor: colors.white,
      borderColor: colors.border,
      borderRadius: 18,
      borderWidth: 1,
      flexDirection: "row",
      justifyContent: "space-between",
      minHeight: 68,
      paddingHorizontal: 14,
    },
    containerPressed: {
      opacity: 0.72,
    },
    left: {
      alignItems: "center",
      flex: 1,
      flexDirection: "row",
      gap: 11,
    },
    iconContainer: {
      alignItems: "center",
      backgroundColor: `${colors.primary}12`,
      borderRadius: 13,
      height: 40,
      justifyContent: "center",
      width: 40,
    },
    textContent: {
      flex: 1,
    },
    title: {
      color: colors.textSecondary,
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 11,
      marginBottom: 3,
    },
    value: {
      color: colors.textSecondary,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 13,
    },
    changeAction: {
      alignItems: "center",
      flexDirection: "row",
      gap: 8,
      paddingLeft: 10,
      paddingVertical: 8,
    },
    clearButton: {
      alignItems: "center",
      backgroundColor: colors.white,
      borderRadius: 14,
      height: 28,
      justifyContent: "center",
      width: 28,
    },
    changeActionLabel: {
      color: colors.primary,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 12,
    },
    modalBackdrop: {
      flex: 1,
      justifyContent: "flex-end",
    },
    pickerSheet: {
      backgroundColor: colors.white,
      borderColor: colors.border,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      borderWidth: 1,
      elevation: 10,
      paddingBottom: 28,
      paddingTop: 16,
      shadowColor: colors.textPrimary,
      shadowOffset: { width: 0, height: -5 },
      shadowOpacity: 0.1,
      shadowRadius: 16,
    },
    pickerHeader: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      paddingBottom: 7,
      paddingHorizontal: 20,
    },
    pickerTitle: {
      color: colors.textPrimary,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 15,
    },
    cancelLabel: {
      color: colors.textSecondary,
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 14,
    },
    confirmLabel: {
      color: colors.primary,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 14,
    },
    iosPicker: {
      height: 190,
    },
  });
