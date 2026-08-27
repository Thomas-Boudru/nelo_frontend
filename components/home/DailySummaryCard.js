import { useMemo } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useThemeColors } from "../../theme/useThemeColors.js";

const TRACKING_IMAGES = {
  bottle: require("../../assets/illustrations/tracking/bottle.png"),
  breastfeeding: require("../../assets/illustrations/tracking/breath.png"),
  mixed: require("../../assets/illustrations/tracking/milk.png"),

  sleep: require("../../assets/illustrations/tracking/night.png"),
  diapers: require("../../assets/illustrations/tracking/diaper.png"),
  meals: require("../../assets/illustrations/tracking/meals.png"),
  mood: require("../../assets/illustrations/tracking/mood.png"),
};

const CATEGORY_STYLES = {
  feeding: {
    backgroundColor: "#F1F3FF",
  },

  sleep: {
    backgroundColor: "#F3F1FF",
  },

  diapers: {
    backgroundColor: "#ECF9F4",
  },

  meals: {
    backgroundColor: "#FFF7E9",
  },

  mood: {
    backgroundColor: "#FFF1F6",
  },
};

function getFeedingConfiguration(summary, t) {
  const feedingMode = summary.feedingMode ?? "bottle";

  if (feedingMode === "breastfeeding") {
    return {
      image: TRACKING_IMAGES.breastfeeding,

      value: String(
        summary.breastfeeding?.count ?? summary.bottles?.count ?? 0,
      ),

      label: t("Breastfeedings"),
      trackingType: "breastfeeding",
    };
  }

  if (feedingMode === "mixed") {
    const total =
      summary.mixedFeeding?.total ??
      (summary.bottles?.count ?? 0) + (summary.breastfeeding?.count ?? 0);

    return {
      image: TRACKING_IMAGES.mixed,
      value: String(total),
      label: t("Feedings"),
      trackingType: "feeding",
    };
  }

  return {
    image: TRACKING_IMAGES.bottle,

    value: `${summary.bottles.amount} ${summary.bottles.unit}`,

    label: t("Bottles"),
    trackingType: "bottle",
  };
}

function SummaryItem({ item, value, label, showSeparator, styles, onPress }) {
  return (
    <View style={styles.itemColumn}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value}`}
        onPress={onPress}
        style={({ pressed }) => [
          styles.itemPressable,
          pressed && styles.itemPressed,
        ]}
      >
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: item.backgroundColor,
            },
          ]}
        >
          <Image
            source={item.image}
            resizeMode="contain"
            style={styles.itemImage}
          />
        </View>

        <Text
          style={styles.itemValue}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.78}
        >
          {value}
        </Text>

        <Text
          style={styles.itemLabel}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {label}
        </Text>
      </Pressable>

      {showSeparator ? (
        <View pointerEvents="none" style={styles.separator} />
      ) : null}
    </View>
  );
}

export default function DailySummaryCard({ summary, onPressItem }) {
  const { t } = useTranslation();

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const feeding = getFeedingConfiguration(summary, t);

  const summaryItems = [
    {
      id: "feeding",
      trackingType: feeding.trackingType,
      image: feeding.image,
      backgroundColor: CATEGORY_STYLES.feeding.backgroundColor,
      value: feeding.value,
      label: feeding.label,
    },

    {
      id: "sleep",
      trackingType: "sleep",
      image: TRACKING_IMAGES.sleep,
      backgroundColor: CATEGORY_STYLES.sleep.backgroundColor,

      value: t("Sleep duration", {
        hours: summary.sleep.hours,
        minutes: summary.sleep.minutes,
      }),

      label: t("Sleep"),
    },

    {
      id: "diapers",
      trackingType: "diaper",
      image: TRACKING_IMAGES.diapers,
      backgroundColor: CATEGORY_STYLES.diapers.backgroundColor,
      value: String(summary.diapers.count),
      label: t("Diapers"),
    },

    {
      id: "meals",
      trackingType: "solids",
      image: TRACKING_IMAGES.meals,
      backgroundColor: CATEGORY_STYLES.meals.backgroundColor,
      value: String(summary.meals.count),
      label: t("Meals"),
    },

    {
      id: "mood",
      trackingType: "mood",
      image: TRACKING_IMAGES.mood,
      backgroundColor: CATEGORY_STYLES.mood.backgroundColor,
      value: t(`Mood ${summary.mood.value}`),
      label: t("Mood"),
    },
  ];

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{t("Daily summary")}</Text>

        {summary.syncedAt ? (
          <Text style={styles.updatedText}>
            {t("Synced at {{time}}", {
              time: summary.syncedAt,
            })}
          </Text>
        ) : null}
      </View>

      <View style={styles.items}>
        {summaryItems.map((item, index) => (
          <SummaryItem
            key={item.id}
            item={item}
            value={item.value}
            label={item.label}
            showSeparator={index < summaryItems.length - 1}
            onPress={() =>
              onPressItem?.({
                id: item.id,
                trackingType: item.trackingType,
              })
            }
            styles={styles}
          />
        ))}
      </View>
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    card: {
      marginHorizontal: 20,

      paddingHorizontal: 14,
      paddingTop: 20,
      paddingBottom: 0,

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

    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",

      gap: 10,
      marginBottom: 20,
      paddingHorizontal: 4,
    },

    title: {
      flexShrink: 1,

      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 17,
      lineHeight: 23,

      color: colors.textPrimary,
    },

    updatedContainer: {
      flexDirection: "row",
      alignItems: "center",

      gap: 6,
    },

    updatedText: {
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 11,
      lineHeight: 16,

      color: colors.textSecondary,
    },

    refreshButton: {
      width: 28,
      height: 28,

      alignItems: "center",
      justifyContent: "center",

      borderRadius: 14,
      backgroundColor: colors.selectedBackground,
    },

    refreshButtonPressed: {
      opacity: 0.65,
      transform: [{ scale: 0.94 }],
    },

    items: {
      flexDirection: "row",
      alignItems: "stretch",
    },

    itemColumn: {
      position: "relative",
      flex: 1,
    },

    itemPressable: {
      minHeight: 126,

      alignItems: "center",
      justifyContent: "flex-start",

      paddingHorizontal: 3,
    },

    itemPressed: {
      opacity: 0.8,
      transform: [{ scale: 0.97 }],
    },

    iconContainer: {
      width: 54,
      height: 54,

      alignItems: "center",
      justifyContent: "center",

      marginBottom: 11,

      borderRadius: 27,
    },

    itemImage: {
      width: 45,
      height: 45,
    },

    itemValue: {
      width: "100%",

      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 15,
      lineHeight: 20,
      textAlign: "center",

      color: colors.textPrimary,
    },

    itemLabel: {
      width: "100%",

      marginTop: 4,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 10,
      lineHeight: 14,
      textAlign: "center",

      color: colors.textSecondary,
    },

    separator: {
      position: "absolute",

      top: 20,
      right: 0,

      width: StyleSheet.hairlineWidth,
      height: 82,

      backgroundColor: colors.border,

      opacity: 0.62,
    },
  });
