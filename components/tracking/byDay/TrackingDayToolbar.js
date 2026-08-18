import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import TrackingFilterChips from "./TrackingFilterChips.js";

import { useThemeColors } from "../../../theme/useThemeColors.js";

export default function TrackingDayToolbar({
  dateLabel,
  isNextDayDisabled = false,

  filterValues = {},
  selectedFilterId = "all",

  onPressDate,
  onPressPreviousDay,
  onPressNextDay,
  onSelectFilter,
}) {
  const { t } = useTranslation();

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <View style={styles.dateSelector}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("Previous day")}
          onPress={onPressPreviousDay}
          hitSlop={6}
          style={({ pressed }) => [
            styles.dateArrowButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="chevron-back" size={17} color={colors.textPrimary} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("Choose a date")}
          onPress={onPressDate}
          style={({ pressed }) => [
            styles.dateButton,
            pressed && styles.pressed,
          ]}
        >
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.82}
            style={styles.dateText}
          >
            {dateLabel}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("Next day")}
          accessibilityState={{
            disabled: isNextDayDisabled,
          }}
          disabled={isNextDayDisabled}
          onPress={onPressNextDay}
          hitSlop={6}
          style={({ pressed }) => [
            styles.dateArrowButton,
            isNextDayDisabled && styles.dateArrowButtonDisabled,
            pressed && !isNextDayDisabled && styles.pressed,
          ]}
        >
          <Ionicons
            name="chevron-forward"
            size={17}
            color={
              isNextDayDisabled ? colors.textSecondary : colors.textPrimary
            }
          />
        </Pressable>
      </View>

      <View style={styles.separator} />

      <TrackingFilterChips
        values={filterValues}
        selectedFilterId={selectedFilterId}
        onSelectFilter={onSelectFilter}
      />
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      minHeight: 46,

      flexDirection: "row",
      alignItems: "center",

      gap: 8,

      marginTop: 12,
      paddingHorizontal: 20,
    },

    dateSelector: {
      width: 142,
      height: 44,

      flexDirection: "row",
      alignItems: "center",

      borderRadius: 15,
      borderWidth: 1,
      borderColor: colors.border ?? "#DCE5F2",

      backgroundColor: colors.white,

      overflow: "hidden",
    },

    dateArrowButton: {
      width: 32,
      height: "100%",

      alignItems: "center",
      justifyContent: "center",
    },

    dateArrowButtonDisabled: {
      opacity: 0.32,
    },

    dateButton: {
      flex: 1,
      height: "100%",

      alignItems: "center",
      justifyContent: "center",

      paddingHorizontal: 1,
    },

    dateText: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 10,
      lineHeight: 15,

      color: colors.textPrimary,
    },

    separator: {
      width: 1,
      height: 28,

      backgroundColor: colors.border ?? "#DCE5F2",
    },

    pressed: {
      opacity: 0.68,
      transform: [{ scale: 0.96 }],
    },
  });
