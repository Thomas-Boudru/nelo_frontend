import { useMemo } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { TRACKING_TYPE_CONFIG } from "../../../data/mockTrackingData";
import { useThemeColors } from "../../../theme/useThemeColors.js";

function formatTime(dateValue, language) {
  if (!dateValue) {
    return "";
  }

  const date = new Date(dateValue);

  return new Intl.DateTimeFormat(language, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function getTimeLabel(entry, language) {
  const startTime = formatTime(entry.startedAt, language);

  if (!entry.endedAt) {
    return startTime;
  }

  const endTime = formatTime(entry.endedAt, language);

  return `${startTime}–${endTime}`;
}

export default function TrackingTimelineItem({
  entry,
  isFirst = false,
  isLast = false,
  onPress,
}) {
  const { t, i18n } = useTranslation();

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  /*
   * Si un type n’est pas encore configuré, on utilise temporairement
   * l’apparence du biberon, comme convenu.
   */
  const visual =
    TRACKING_TYPE_CONFIG[entry?.type] ?? TRACKING_TYPE_CONFIG.bottle;

  const timeLabel = useMemo(
    () => getTimeLabel(entry, i18n.language),
    [entry, i18n.language],
  );

  const title = t(visual.titleKey);

  const displayValue = entry?.displayValueKey
    ? t(entry.displayValueKey)
    : entry?.displayValue;

  const accessibilityLabel = displayValue
    ? `${timeLabel}, ${title}, ${displayValue}`
    : `${timeLabel}, ${title}`;

  return (
    <View style={styles.container}>
      <View style={styles.timeContainer}>
        <Text style={styles.timeText}>{timeLabel}</Text>
      </View>

      <View style={styles.timelineColumn}>
        {!isFirst ? <View style={styles.lineTop} /> : null}

        <View style={styles.timelineDot} />

        {!isLast ? <View style={styles.lineBottom} /> : null}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={t("Opens this entry for editing")}
        onPress={() => onPress?.(entry)}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      >
        <View
          style={[
            styles.imageContainer,
            {
              backgroundColor: visual.backgroundColor,
            },
          ]}
        >
          <Image
            source={visual.image}
            resizeMode="contain"
            style={styles.image}
          />
        </View>

        <View style={styles.content}>
          <Text numberOfLines={1} style={styles.title}>
            {title}
          </Text>

          {displayValue ? (
            <Text numberOfLines={1} style={styles.value}>
              {displayValue}
            </Text>
          ) : null}
        </View>

        <Ionicons
          name="chevron-forward"
          size={21}
          color={colors.textSecondary}
        />
      </Pressable>
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      minHeight: 80,

      flexDirection: "row",

      paddingHorizontal: 20,
    },

    timeContainer: {
      width: 70,

      alignItems: "flex-start",

      paddingTop: 33,
      paddingRight: 8,
    },

    timeText: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 12,
      lineHeight: 17,

      color: colors.textPrimary,
    },

    timelineColumn: {
      position: "relative",

      width: 18,

      alignItems: "center",
    },

    lineTop: {
      position: "absolute",

      top: 0,

      width: 2,
      height: 42,

      backgroundColor: colors.primaryLight ?? "#CFE0FF",
    },

    timelineDot: {
      position: "absolute",

      top: 39,

      width: 9,
      height: 9,

      borderRadius: 5,
      borderWidth: 2,
      borderColor: colors.background,

      backgroundColor: colors.primary ?? "#4F7DF3",

      zIndex: 2,
    },

    lineBottom: {
      position: "absolute",

      top: 46,
      bottom: 0,

      width: 2,

      backgroundColor: colors.primaryLight ?? "#CFE0FF",
    },

    card: {
      flex: 1,
      minWidth: 0,
      minHeight: 70,

      flexDirection: "row",
      alignItems: "center",

      gap: 12,

      marginBottom: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,

      borderRadius: 18,

      backgroundColor: colors.white,

      shadowColor: colors.textPrimary,
      shadowOffset: {
        width: 0,
        height: 5,
      },
      shadowOpacity: 0.045,
      shadowRadius: 14,

      elevation: 2,
    },

    cardPressed: {
      opacity: 0.75,
      transform: [{ scale: 0.985 }],
    },

    imageContainer: {
      width: 50,
      height: 50,

      alignItems: "center",
      justifyContent: "center",

      borderRadius: 16,
    },

    image: {
      width: 40,
      height: 40,
    },

    content: {
      flex: 1,
      minWidth: 0,
    },

    title: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 15,
      lineHeight: 21,

      color: colors.textPrimary,
    },

    value: {
      marginTop: 2,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 12,
      lineHeight: 17,

      color: colors.textSecondary,
    },
  });
