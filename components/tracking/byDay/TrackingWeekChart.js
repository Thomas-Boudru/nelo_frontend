import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { TRACKING_TYPE_CONFIG } from "../../../data/mockTrackingData.js";
import { useThemeColors } from "../../../theme/useThemeColors.js";

const DAY_LABEL_WIDTH = 48;
const HOURS_IN_DAY = 24;

const CATEGORY_COLORS = {
  feeding: "#668EF5",
  sleep: "#9387E8",
  diaper: "#63C9A1",
  health: "#EF8D88",
  mood: "#E8B65E",
  growth: "#73A8DC",
  note: "#C09363",
};

function normalizeDate(date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    0,
    0,
    0,
    0,
  );
}

function addDays(date, numberOfDays) {
  const result = new Date(date);

  result.setDate(result.getDate() + numberOfDays);

  return result;
}

function getDayRange(date) {
  const start = normalizeDate(date);
  const end = addDays(start, 1);

  return {
    start,
    end,
  };
}

function getEntryCategory(entry) {
  const visual =
    TRACKING_TYPE_CONFIG[entry.type] ?? TRACKING_TYPE_CONFIG.bottle;

  return visual.category;
}

function getEntryInterval(entry) {
  const start = new Date(entry.startedAt);
  const end = entry.endedAt ? new Date(entry.endedAt) : null;

  return {
    start,
    end,
  };
}

function isEntryVisibleOnDay(entry, day) {
  const { start: dayStart, end: dayEnd } = getDayRange(day);
  const { start, end } = getEntryInterval(entry);

  if (end) {
    return start < dayEnd && end > dayStart;
  }

  return start >= dayStart && start < dayEnd;
}

function getMinutesFromDayStart(date, dayStart) {
  return (date.getTime() - dayStart.getTime()) / 60000;
}

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function getEntryPosition(entry, day) {
  const { start: dayStart, end: dayEnd } = getDayRange(day);
  const { start, end } = getEntryInterval(entry);

  const clippedStart = start < dayStart ? dayStart : start;

  const clippedEnd = end ? (end > dayEnd ? dayEnd : end) : null;

  const startMinutes = clamp(
    getMinutesFromDayStart(clippedStart, dayStart),
    0,
    1440,
  );

  const leftPercentage = (startMinutes / 1440) * 100;

  if (!clippedEnd) {
    return {
      type: "point",
      leftPercentage,
    };
  }

  const endMinutes = clamp(
    getMinutesFromDayStart(clippedEnd, dayStart),
    0,
    1440,
  );

  const durationMinutes = Math.max(endMinutes - startMinutes, 1);

  return {
    type: "duration",
    leftPercentage,
    widthPercentage: (durationMinutes / 1440) * 100,
  };
}

function formatDayLabel(date, language) {
  const weekday = new Intl.DateTimeFormat(language, {
    weekday: "short",
  })
    .format(date)
    .replace(".", "");

  const dayNumber = new Intl.DateTimeFormat(language, {
    day: "numeric",
  }).format(date);

  return {
    weekday,
    dayNumber,
  };
}

function createChartDays(endDate) {
  const normalizedEndDate = normalizeDate(endDate);

  return Array.from({ length: 7 }, (_, index) =>
    addDays(normalizedEndDate, index - 6),
  );
}

function TrackingChartEntry({ entry, day, chartWidth, onPress, styles }) {
  const position = getEntryPosition(entry, day);
  const category = getEntryCategory(entry);

  const color = CATEGORY_COLORS[category] ?? "#92A0B5";

  if (position.type === "duration") {
    const left = (position.leftPercentage / 100) * chartWidth;

    const calculatedWidth = (position.widthPercentage / 100) * chartWidth;

    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => onPress?.(entry)}
        hitSlop={4}
        style={({ pressed }) => [
          styles.durationEntry,
          {
            left,
            width: Math.max(calculatedWidth, 7),
            backgroundColor: color,
          },
          pressed && styles.entryPressed,
        ]}
      />
    );
  }

  const left = (position.leftPercentage / 100) * chartWidth;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onPress?.(entry)}
      hitSlop={5}
      style={({ pressed }) => [
        styles.pointEntry,
        {
          left: clamp(left - 4, 0, chartWidth - 8),
          backgroundColor: color,
        },
        pressed && styles.entryPressed,
      ]}
    />
  );
}

export default function TrackingWeekChart({
  entries = [],
  endDate = new Date(),
  selectedFilterIds = [],
  onPressEntry,
}) {
  const { t, i18n } = useTranslation();

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [chartWidth, setChartWidth] = useState(0);

  const days = useMemo(() => createChartDays(endDate), [endDate]);

  const filteredEntries = useMemo(() => {
    if (selectedFilterIds.length === 0) {
      return entries;
    }

    return entries.filter((entry) =>
      selectedFilterIds.includes(getEntryCategory(entry)),
    );
  }, [entries, selectedFilterIds]);

  const visibleCategories = useMemo(() => {
    const categories = filteredEntries.map(getEntryCategory);

    return [...new Set(categories)];
  }, [filteredEntries]);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{t("Weekly rhythm")}</Text>

          <Text style={styles.subtitle}>{t("Events throughout the day")}</Text>
        </View>
      </View>

      <View style={styles.axisRow}>
        <View style={styles.dayLabelSpace} />

        <View style={styles.axis}>
          <Text style={styles.axisLabel}>0</Text>
          <Text style={styles.axisLabel}>6</Text>
          <Text style={styles.axisLabel}>12</Text>
          <Text style={styles.axisLabel}>18</Text>
          <Text style={styles.axisLabel}>24</Text>
        </View>
      </View>

      <View style={styles.chart}>
        {days.map((day) => {
          const dayLabel = formatDayLabel(day, i18n.language);

          const dayEntries = filteredEntries.filter((entry) =>
            isEntryVisibleOnDay(entry, day),
          );

          return (
            <View key={day.toISOString()} style={styles.dayRow}>
              <View style={styles.dayLabel}>
                <Text style={styles.weekdayText}>{dayLabel.weekday}</Text>

                <Text style={styles.dayNumberText}>{dayLabel.dayNumber}</Text>
              </View>

              <View
                style={styles.plot}
                onLayout={(event) => {
                  const nextWidth = event.nativeEvent.layout.width;

                  if (nextWidth !== chartWidth) {
                    setChartWidth(nextWidth);
                  }
                }}
              >
                <View style={[styles.gridLine, styles.gridLineStart]} />

                <View style={[styles.gridLine, styles.gridLineQuarter]} />

                <View style={[styles.gridLine, styles.gridLineHalf]} />

                <View style={[styles.gridLine, styles.gridLineThreeQuarters]} />

                <View style={[styles.gridLine, styles.gridLineEnd]} />

                {chartWidth > 0
                  ? dayEntries.map((entry) => (
                      <TrackingChartEntry
                        key={`${day.toISOString()}-${entry.id}`}
                        entry={entry}
                        day={day}
                        chartWidth={chartWidth}
                        onPress={onPressEntry}
                        styles={styles}
                      />
                    ))
                  : null}
              </View>
            </View>
          );
        })}
      </View>

      {visibleCategories.length > 0 ? (
        <View style={styles.legend}>
          {visibleCategories.map((category) => (
            <View key={category} style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  {
                    backgroundColor: CATEGORY_COLORS[category] ?? "#92A0B5",
                  },
                ]}
              />

              <Text style={styles.legendText}>
                {t(
                  category === "diaper"
                    ? "Diapers"
                    : category.charAt(0).toUpperCase() + category.slice(1),
                )}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {t("No entries for this period")}
          </Text>
        </View>
      )}
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    card: {
      marginHorizontal: 20,
      marginTop: 18,

      paddingHorizontal: 16,
      paddingTop: 17,
      paddingBottom: 16,

      borderRadius: 22,

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

    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",

      marginBottom: 15,
    },

    title: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 15,
      lineHeight: 21,

      color: colors.textPrimary,
    },

    subtitle: {
      marginTop: 2,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 11,
      lineHeight: 16,

      color: colors.textSecondary,
    },

    axisRow: {
      flexDirection: "row",
      alignItems: "center",

      marginBottom: 5,
    },

    dayLabelSpace: {
      width: DAY_LABEL_WIDTH,
    },

    axis: {
      flex: 1,

      flexDirection: "row",
      justifyContent: "space-between",
    },

    axisLabel: {
      width: 18,

      textAlign: "center",

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 9,
      lineHeight: 13,

      color: colors.textSecondary,
    },

    chart: {
      borderTopWidth: 1,
      borderTopColor: colors.border ?? "#DCE5F2",
    },

    dayRow: {
      minHeight: 42,

      flexDirection: "row",
      alignItems: "stretch",

      borderBottomWidth: 1,
      borderBottomColor: colors.border ?? "#DCE5F2",
    },

    dayLabel: {
      width: DAY_LABEL_WIDTH,

      flexDirection: "row",
      alignItems: "center",

      gap: 4,
    },

    weekdayText: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 9,
      lineHeight: 13,

      color: colors.textSecondary,
    },

    dayNumberText: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 11,
      lineHeight: 15,

      color: colors.textPrimary,
    },

    plot: {
      flex: 1,

      position: "relative",

      justifyContent: "center",
    },

    gridLine: {
      position: "absolute",
      top: 0,
      bottom: 0,

      width: StyleSheet.hairlineWidth,

      backgroundColor: colors.border ?? "#DCE5F2",
    },

    gridLineStart: {
      left: 0,
    },

    gridLineQuarter: {
      left: "25%",
    },

    gridLineHalf: {
      left: "50%",
    },

    gridLineThreeQuarters: {
      left: "75%",
    },

    gridLineEnd: {
      right: 0,
    },

    durationEntry: {
      position: "absolute",
      top: 13,

      height: 16,

      borderRadius: 6,

      opacity: 0.92,
    },

    pointEntry: {
      position: "absolute",
      top: 17,

      width: 8,
      height: 8,

      borderRadius: 4,

      borderWidth: 1.5,
      borderColor: colors.white,
    },

    entryPressed: {
      opacity: 0.58,
      transform: [{ scale: 0.92 }],
    },

    legend: {
      flexDirection: "row",
      flexWrap: "wrap",

      gap: 11,

      marginTop: 14,
    },

    legendItem: {
      flexDirection: "row",
      alignItems: "center",

      gap: 5,
    },

    legendDot: {
      width: 7,
      height: 7,

      borderRadius: 4,
    },

    legendText: {
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 9,
      lineHeight: 13,

      color: colors.textSecondary,
    },

    emptyContainer: {
      alignItems: "center",

      paddingTop: 15,
    },

    emptyText: {
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 11,
      lineHeight: 16,

      color: colors.textSecondary,
    },
  });
