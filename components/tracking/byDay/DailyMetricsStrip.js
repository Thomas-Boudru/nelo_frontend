import { useMemo } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { TRACKING_TYPE_CONFIG } from "../../../data/mockTrackingData";
import { useThemeColors } from "../../../theme/useThemeColors.js";

function formatSleepDuration(totalMinutes) {
  const safeMinutes = Number(totalMinutes) || 0;

  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;

  if (hours === 0) {
    return `${minutes} min`;
  }

  if (minutes === 0) {
    return `${hours} h`;
  }

  return `${hours} h ${minutes}`;
}

function MetricIcon({ metric, styles, colors }) {
  if (metric.image) {
    return (
      <Image
        source={metric.image}
        resizeMode="contain"
        style={styles.metricImage}
      />
    );
  }

  return (
    <Ionicons
      name={metric.icon}
      size={22}
      color={colors.primary ?? "#4F7DF3"}
    />
  );
}

export default function DailyMetricsStrip({ summary }) {
  const { t } = useTranslation();

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const metrics = useMemo(
    () => [
      {
        id: "entries",
        value: summary?.entryCount ?? 0,
        label: t("Entries"),
        icon: "list-outline",
        backgroundColor: "#EDF5FF",
      },
      {
        id: "feeding",
        value: summary?.feedingCount ?? 0,
        label: t("Feedings"),
        image: TRACKING_TYPE_CONFIG.bottle.image,
        backgroundColor: TRACKING_TYPE_CONFIG.bottle.backgroundColor,
      },
      {
        id: "sleep",
        value: formatSleepDuration(summary?.sleepDurationMinutes),
        label: t("Sleep"),
        image: TRACKING_TYPE_CONFIG.sleep.image,
        backgroundColor: TRACKING_TYPE_CONFIG.sleep.backgroundColor,
      },
      {
        id: "diaper",
        value: summary?.diaperCount ?? 0,
        label: t("Diapers"),
        image: TRACKING_TYPE_CONFIG.diaper.image,
        backgroundColor: TRACKING_TYPE_CONFIG.diaper.backgroundColor,
      },
    ],
    [summary, t],
  );

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {metrics.map((metric, index) => (
          <View key={metric.id} style={styles.metricWrapper}>
            {index > 0 ? <View style={styles.separator} /> : null}

            <View style={styles.metric}>
              <View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor: metric.backgroundColor,
                  },
                ]}
              >
                <MetricIcon metric={metric} styles={styles} colors={colors} />
              </View>

              <View style={styles.metricTextContainer}>
                <Text numberOfLines={1} style={styles.metricValue}>
                  {metric.value}
                </Text>

                <Text numberOfLines={1} style={styles.metricLabel}>
                  {metric.label}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      marginHorizontal: 20,
      marginTop: 14,

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

    scrollContent: {
      alignItems: "center",

      paddingHorizontal: 14,
      paddingVertical: 12,
    },

    metricWrapper: {
      flexDirection: "row",
      alignItems: "center",
    },

    metric: {
      minWidth: 108,

      flexDirection: "row",
      alignItems: "center",

      gap: 9,

      paddingHorizontal: 8,
    },

    separator: {
      width: 1,
      height: 38,

      marginHorizontal: 2,

      backgroundColor: colors.border ?? "#E4EAF3",
    },

    iconContainer: {
      width: 38,
      height: 38,

      alignItems: "center",
      justifyContent: "center",

      borderRadius: 12,
    },

    metricImage: {
      width: 27,
      height: 27,
    },

    metricTextContainer: {
      flexShrink: 1,
    },

    metricValue: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 15,
      lineHeight: 20,

      color: colors.textPrimary,
    },

    metricLabel: {
      marginTop: 1,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 10,
      lineHeight: 14,

      color: colors.textSecondary,
    },
  });
