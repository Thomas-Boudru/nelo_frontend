import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useThemeColors } from "../../theme/useThemeColors.js";

export default function DailyMessageCard({ message, onPress }) {
  const { t } = useTranslation();

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!message) {
    return null;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("Open daily message")}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.iconContainer}>
        <Ionicons name="heart" size={28} color={colors.primary} />
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>{t("A little note for today")}</Text>

        <Text style={styles.description} numberOfLines={3}>
          {message.summary}
        </Text>
      </View>

      <View style={styles.arrowButton}>
        <Ionicons name="chevron-forward" size={21} color={colors.primary} />
      </View>
    </Pressable>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    card: {
      minHeight: 106,

      flexDirection: "row",
      alignItems: "center",
      gap: 12,

      marginHorizontal: 20,
      paddingHorizontal: 16,
      paddingVertical: 14,

      borderRadius: 28,
      backgroundColor: colors.white,

      shadowColor: colors.textPrimary,
      shadowOffset: {
        width: 0,
        height: 8,
      },
      shadowOpacity: 0.055,
      shadowRadius: 22,

      elevation: 3,
    },

    iconContainer: {
      width: 56,
      height: 56,

      alignItems: "center",
      justifyContent: "center",

      borderRadius: 28,
      backgroundColor: colors.selectedBackground,
    },

    content: {
      flex: 1,
      justifyContent: "center",
    },

    title: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 16,
      lineHeight: 22,

      color: colors.textPrimary,
    },

    description: {
      marginTop: 4,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 13,
      lineHeight: 18,

      color: colors.textSecondary,
    },

    arrowButton: {
      width: 38,
      height: 38,

      alignItems: "center",
      justifyContent: "center",

      marginLeft: 2,

      borderRadius: 19,
      backgroundColor: colors.selectedBackground,
    },

    pressed: {
      opacity: 0.86,
      transform: [{ scale: 0.99 }],
    },
  });
