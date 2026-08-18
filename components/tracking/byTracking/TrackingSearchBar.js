import { useMemo, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useThemeColors } from "../../../theme/useThemeColors.js";

export default function TrackingSearchBar({
  value,
  onChangeText,
  onSubmitEditing,
}) {
  const { t } = useTranslation();

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [isFocused, setIsFocused] = useState(false);

  const handleClear = () => {
    onChangeText?.("");
  };

  return (
    <View style={[styles.container, isFocused && styles.containerFocused]}>
      <Ionicons
        name="search-outline"
        size={21}
        color={isFocused ? (colors.primary ?? "#4F7DF3") : colors.textSecondary}
      />

      <TextInput
        accessibilityLabel={t("Search tracking entries and notes")}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmitEditing}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={t("Search tracking or notes")}
        placeholderTextColor={colors.textSecondary}
        returnKeyType="search"
        clearButtonMode="never"
        autoCapitalize="sentences"
        autoCorrect
        style={styles.input}
      />

      {value?.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("Clear search")}
          onPress={handleClear}
          hitSlop={8}
          style={({ pressed }) => [
            styles.clearButton,
            pressed && styles.clearButtonPressed,
          ]}
        >
          <Ionicons
            name="close-circle"
            size={20}
            color={colors.textSecondary}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      height: 48,

      flexDirection: "row",
      alignItems: "center",

      gap: 10,

      marginHorizontal: 20,
      marginTop: 14,
      paddingHorizontal: 14,

      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border ?? "#DCE5F2",

      backgroundColor: colors.white,
    },

    containerFocused: {
      borderColor: colors.primary ?? "#4F7DF3",
    },

    input: {
      flex: 1,
      height: "100%",

      paddingVertical: 0,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 13,
      lineHeight: 18,

      color: colors.textPrimary,
    },

    clearButton: {
      width: 28,
      height: 28,

      alignItems: "center",
      justifyContent: "center",

      borderRadius: 14,
    },

    clearButtonPressed: {
      opacity: 0.65,
      transform: [{ scale: 0.94 }],
    },
  });
