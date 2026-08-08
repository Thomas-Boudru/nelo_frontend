import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useThemeColors } from "../../theme/useThemeColors.js";

export default function NextNapCard({ nextNap, onPress }) {
  const { t } = useTranslation();

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!nextNap) {
    return null;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("Open next nap details")}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.illustration}>
        <View style={styles.moonCircle}>
          <Ionicons name="moon" size={48} color={colors.primary} />
        </View>

        <Ionicons
          name="star"
          size={13}
          color={colors.primary}
          style={styles.starOne}
        />

        <Ionicons
          name="star"
          size={9}
          color={colors.primary}
          style={styles.starTwo}
        />
      </View>

      <View style={styles.content}>
        <Text style={styles.eyebrow}>{t("Next nap")}</Text>

        <Text style={styles.title}>
          {t("In minutes", {
            count: nextNap.minutesUntil,
          })}
        </Text>

        <Text style={styles.subtitle}>{t("Ideal window")}</Text>

        <Text style={styles.timeWindow}>
          {nextNap.idealWindowStart} – {nextNap.idealWindowEnd}
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
      minHeight: 120,

      flexDirection: "row",
      alignItems: "center",

      marginHorizontal: 20,
      paddingHorizontal: 16,
      paddingVertical: 12,

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

    illustration: {
      width: 106,
      height: 106,

      alignItems: "center",
      justifyContent: "center",
    },

    moonCircle: {
      width: 82,
      height: 82,

      alignItems: "center",
      justifyContent: "center",

      borderRadius: 41,
      backgroundColor: colors.selectedBackground,
    },

    starOne: {
      position: "absolute",

      left: 8,
      top: 27,

      opacity: 0.42,
    },

    starTwo: {
      position: "absolute",

      right: 4,
      top: 17,

      opacity: 0.35,
    },

    content: {
      flex: 1,

      justifyContent: "center",

      paddingLeft: 8,
    },

    eyebrow: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 12,
      lineHeight: 16,

      textTransform: "uppercase",
      letterSpacing: 0.5,

      color: colors.primary,
    },

    title: {
      marginTop: 2,

      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 24,
      lineHeight: 29,

      color: colors.textPrimary,
    },

    subtitle: {
      marginTop: 5,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 13,
      lineHeight: 17,

      color: colors.textSecondary,
    },

    timeWindow: {
      marginTop: 0,

      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 14,
      lineHeight: 18,

      color: colors.textPrimary,
    },

    arrowButton: {
      width: 40,
      height: 40,

      alignItems: "center",
      justifyContent: "center",

      marginLeft: 4,

      borderRadius: 20,
      backgroundColor: colors.selectedBackground,
    },

    pressed: {
      opacity: 0.86,
      transform: [{ scale: 0.99 }],
    },
  });
