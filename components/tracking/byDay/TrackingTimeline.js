import { useMemo } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import TrackingTimelineItem from "./TrackingTimelineItem.js";

import { TRACKING_TYPE_CONFIG } from "../../../data/mockTrackingData";
import { useThemeColors } from "../../../theme/useThemeColors.js";

function sortEntriesByDate(entries) {
  return [...entries].sort(
    (firstEntry, secondEntry) =>
      new Date(secondEntry.startedAt).getTime() -
      new Date(firstEntry.startedAt).getTime(),
  );
}

export default function TrackingTimeline({
  entries = [],
  selectedFilterId = "all",
  onPressEntry,
}) {
  const { t } = useTranslation();

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const filteredEntries = useMemo(() => {
    const sortedEntries = sortEntriesByDate(entries);

    if (selectedFilterId === "all") {
      return sortedEntries;
    }

    return sortedEntries.filter((entry) => {
      const visual =
        TRACKING_TYPE_CONFIG[entry.type] ?? TRACKING_TYPE_CONFIG.bottle;

      return visual.category === selectedFilterId;
    });
  }, [entries, selectedFilterId]);

  if (filteredEntries.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyImageContainer}>
          <Image
            source={TRACKING_TYPE_CONFIG.bottle.image}
            resizeMode="contain"
            style={styles.emptyImage}
          />
        </View>

        <Text style={styles.emptyTitle}>{t("No entries for this day")}</Text>

        <Text style={styles.emptyDescription}>
          {selectedFilterId === "all"
            ? t("The entries added for this day will appear here.")
            : t("No entries match the selected filter.")}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {filteredEntries.map((entry, index) => (
        <TrackingTimelineItem
          key={entry.id}
          entry={entry}
          isFirst={index === 0}
          isLast={index === filteredEntries.length - 1}
          onPress={onPressEntry}
        />
      ))}
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      marginTop: 18,
    },

    emptyContainer: {
      alignItems: "center",

      marginHorizontal: 20,
      marginTop: 28,

      paddingHorizontal: 24,
      paddingVertical: 30,

      borderRadius: 20,

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

    emptyImageContainer: {
      width: 58,
      height: 58,

      alignItems: "center",
      justifyContent: "center",

      borderRadius: 18,

      backgroundColor: TRACKING_TYPE_CONFIG.bottle.backgroundColor,
    },

    emptyImage: {
      width: 40,
      height: 40,
    },

    emptyTitle: {
      marginTop: 14,

      textAlign: "center",

      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 15,
      lineHeight: 21,

      color: colors.textPrimary,
    },

    emptyDescription: {
      maxWidth: 260,
      marginTop: 5,

      textAlign: "center",

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 12,
      lineHeight: 18,

      color: colors.textSecondary,
    },
  });
