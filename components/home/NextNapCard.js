import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useThemeColors } from "../../theme/useThemeColors.js";

const CARD_CONFIG = {
  nap: {
    eyebrow: "Next nap",
    icon: "moon",
    accessibilityLabel: "Open next nap details",
  },

  bedtime: {
    eyebrow: "Bedtime",
    icon: "bed",
    accessibilityLabel: "Open bedtime details",
  },
};

export default function NextNapCard({ nextNap, onPress }) {
  const { t } = useTranslation();

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const cardContent = useMemo(() => getCardContent(nextNap, t), [nextNap, t]);

  if (!nextNap || !cardContent) {
    return null;
  }

  const showStars =
    nextNap.status === undefined || nextNap.status === "prediction";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={cardContent.accessibilityLabel}
      accessibilityHint={cardContent.accessibilityHint}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.illustration}>
        <View style={styles.iconCircle}>
          <Ionicons name={cardContent.icon} size={46} color={colors.primary} />
        </View>

        {showStars && (
          <>
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
          </>
        )}
      </View>

      <View style={styles.content}>
        <Text numberOfLines={1} style={styles.eyebrow}>
          {cardContent.eyebrow}
        </Text>

        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
          style={styles.title}
        >
          {cardContent.title}
        </Text>

        {cardContent.subtitle ? (
          <Text numberOfLines={1} style={styles.subtitle}>
            {cardContent.subtitle}
          </Text>
        ) : null}

        {cardContent.detail ? (
          <Text numberOfLines={1} style={styles.detail}>
            {cardContent.detail}
          </Text>
        ) : null}
      </View>

      <View style={styles.arrowButton}>
        <Ionicons name="chevron-forward" size={21} color={colors.primary} />
      </View>
    </Pressable>
  );
}

function getCardContent(nextNap, t) {
  if (!nextNap) {
    return null;
  }

  if (nextNap.status === "sleeping") {
    return {
      eyebrow: t("Sleep in progress"),
      title: formatDuration(nextNap.elapsedMinutes, t),
      subtitle: nextNap.startedAt
        ? t("Started at {{time}}", {
            time: nextNap.startedAt,
          })
        : null,
      detail: t("View sleep timer"),
      icon: "moon",
      accessibilityLabel: t("Open current sleep"),
      accessibilityHint: t("View or stop the current sleep timer"),
    };
  }

  if (nextNap.status === "learning") {
    return {
      eyebrow: t("Sleep prediction"),
      title: t("Nelo is learning"),
      subtitle: t("Keep tracking sleep"),
      detail: t("A prediction will appear soon"),
      icon: "sparkles",
      accessibilityLabel: t("Open sleep prediction information"),
      accessibilityHint: t("Learn how sleep predictions work"),
    };
  }

  const sleepType = nextNap.type ?? "nap";
  const config = CARD_CONFIG[sleepType] ?? CARD_CONFIG.nap;

  const minutesUntil = Math.max(0, Number(nextNap.minutesUntil) || 0);

  const timeWindow =
    nextNap.idealWindowStart && nextNap.idealWindowEnd
      ? `${nextNap.idealWindowStart} – ${nextNap.idealWindowEnd}`
      : null;

  return {
    eyebrow: t(config.eyebrow),

    title:
      minutesUntil === 0
        ? t("Now")
        : t("In minutes", {
            count: minutesUntil,
          }),

    subtitle: timeWindow ? t("Ideal window") : null,
    detail: timeWindow,

    icon: config.icon,

    accessibilityLabel: t(config.accessibilityLabel),
    accessibilityHint: t("Open the sleep recommendation details"),
  };
}

function formatDuration(totalMinutes, t) {
  const safeMinutes = Math.max(0, Math.floor(Number(totalMinutes) || 0));

  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;

  if (hours === 0) {
    return t("{{count}} min", {
      count: minutes,
    });
  }

  if (minutes === 0) {
    return t("{{count}} h", {
      count: hours,
    });
  }

  return t("{{hours}} h {{minutes}} min", {
    hours,
    minutes,
  });
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

    iconCircle: {
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

    detail: {
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
