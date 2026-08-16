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

export default function VaccineNextDoseRow({
  value,
  onChange,
  onClear,
  minimumDate = new Date(),
}) {
  const { t, i18n } = useTranslation();

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [isIosPickerVisible, setIsIosPickerVisible] = useState(false);

  const [isAndroidPickerVisible, setIsAndroidPickerVisible] = useState(false);

  const [draftDate, setDraftDate] = useState(
    value instanceof Date ? value : new Date(),
  );

  const hasDate = value instanceof Date;

  const formattedDate = useMemo(() => {
    if (!hasDate) {
      return t("Choose a date");
    }

    return new Intl.DateTimeFormat(i18n.language, {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(value);
  }, [hasDate, i18n.language, t, value]);

  const openPicker = () => {
    const initialDate = hasDate ? value : new Date();

    setDraftDate(initialDate);

    if (Platform.OS === "ios") {
      setIsIosPickerVisible(true);
      return;
    }

    setIsAndroidPickerVisible(true);
  };

  const handleAndroidChange = (event, selectedDate) => {
    setIsAndroidPickerVisible(false);

    if (event.type === "set" && selectedDate) {
      onChange?.(selectedDate);
    }
  };

  const handleConfirmIosDate = () => {
    onChange?.(draftDate);
    setIsIosPickerVisible(false);
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          hasDate ? t("Change next dose date") : t("Choose next dose date")
        }
        onPress={openPicker}
        style={({ pressed }) => [
          styles.container,
          hasDate && styles.containerActive,
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.iconContainer}>
          <Ionicons
            name="calendar-outline"
            size={19}
            color={hasDate ? colors.primary : colors.textSecondary}
          />
        </View>

        <View style={styles.textContent}>
          <Text style={styles.title}>{t("Next dose")}</Text>

          <Text
            numberOfLines={1}
            style={[styles.value, !hasDate && styles.placeholder]}
          >
            {formattedDate}
          </Text>
        </View>

        <View style={styles.actions}>
          {hasDate ? (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("Remove next dose date")}
                hitSlop={10}
                onPress={(event) => {
                  event.stopPropagation();
                  onClear?.();
                }}
                style={({ pressed }) => [
                  styles.clearButton,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons name="close" size={16} color={colors.textSecondary} />
              </Pressable>

              <View style={styles.dateIndicator} />
            </>
          ) : (
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.textSecondary}
            />
          )}
        </View>
      </Pressable>

      {Platform.OS === "android" && isAndroidPickerVisible ? (
        <DateTimePicker
          value={draftDate}
          mode="date"
          display="default"
          minimumDate={minimumDate}
          onChange={handleAndroidChange}
        />
      ) : null}

      <Modal
        visible={isIosPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsIosPickerVisible(false)}
      >
        <Pressable
          onPress={() => setIsIosPickerVisible(false)}
          style={styles.modalBackdrop}
        >
          <Pressable onPress={() => {}} style={styles.pickerSheet}>
            <View style={styles.pickerHeader}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setIsIosPickerVisible(false)}
                style={({ pressed }) => [
                  styles.headerButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.cancelLabel}>{t("Cancel")}</Text>
              </Pressable>

              <Text style={styles.pickerTitle}>{t("Next dose")}</Text>

              <Pressable
                accessibilityRole="button"
                onPress={handleConfirmIosDate}
                style={({ pressed }) => [
                  styles.headerButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.confirmLabel}>{t("Done")}</Text>
              </Pressable>
            </View>

            <View style={styles.pickerFrame}>
              <DateTimePicker
                value={draftDate}
                mode="date"
                display="spinner"
                minimumDate={minimumDate}
                onChange={(_, selectedDate) => {
                  if (selectedDate) {
                    setDraftDate(selectedDate);
                  }
                }}
                style={styles.iosPicker}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: {
      alignItems: "center",
      backgroundColor: colors.lightBlue,
      borderColor: colors.border,
      borderRadius: 18,
      borderWidth: 1,
      flexDirection: "row",
      gap: 11,
      minHeight: 66,
      paddingHorizontal: 13,
      paddingVertical: 10,
    },

    containerActive: {
      borderColor: `${colors.primary}20`,
    },

    iconContainer: {
      alignItems: "center",
      backgroundColor: colors.white,
      borderRadius: 13,
      height: 40,
      justifyContent: "center",
      width: 40,
    },

    textContent: {
      flex: 1,
      minWidth: 0,
    },

    title: {
      color: colors.textPrimary,
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 13,
    },

    value: {
      color: colors.textPrimary,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 11,
      marginTop: 3,
    },

    placeholder: {
      color: colors.textSecondary,
    },

    actions: {
      alignItems: "center",
      flexDirection: "row",
      gap: 8,
    },

    clearButton: {
      alignItems: "center",
      backgroundColor: colors.white,
      borderRadius: 14,
      height: 28,
      justifyContent: "center",
      width: 28,
    },

    dateIndicator: {
      backgroundColor: colors.primary,
      borderRadius: 999,
      height: 7,
      width: 7,
    },

    modalBackdrop: {
      backgroundColor: "rgba(20, 24, 35, 0.34)",
      flex: 1,
      justifyContent: "flex-end",
      paddingHorizontal: 14,
      paddingBottom: 14,
    },

    pickerSheet: {
      backgroundColor: colors.white,
      borderColor: colors.border,
      borderRadius: 26,
      borderWidth: 1,
      paddingBottom: 20,
      paddingHorizontal: 14,
      paddingTop: 14,

      shadowColor: "#000000",
      shadowOffset: {
        width: 0,
        height: -3,
      },
      shadowOpacity: 0.1,
      shadowRadius: 12,

      elevation: 8,
    },

    pickerHeader: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 10,
      paddingHorizontal: 4,
    },

    headerButton: {
      alignItems: "center",
      justifyContent: "center",
      minHeight: 36,
      minWidth: 54,
    },

    pickerTitle: {
      color: colors.textPrimary,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 15,
    },

    cancelLabel: {
      color: colors.textSecondary,
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 13,
    },

    confirmLabel: {
      color: colors.primary,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 13,
    },

    pickerFrame: {
      backgroundColor: colors.lightBlue,
      borderColor: colors.border,
      borderRadius: 20,
      borderWidth: 1,
      overflow: "hidden",

      shadowColor: "#000000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.07,
      shadowRadius: 8,

      elevation: 3,
    },

    iosPicker: {
      height: 190,
      width: "100%",
    },

    pressed: {
      opacity: 0.78,
    },
  });
}
