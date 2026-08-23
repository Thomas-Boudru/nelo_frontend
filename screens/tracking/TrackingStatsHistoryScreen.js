import { useMemo, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import {
  mockTrackingDay,
  TRACKING_TYPE_CONFIG,
} from "../../data/mockTrackingData.js";

import { useThemeColors } from "../../theme/useThemeColors.js";

const EMPTY_ENTRY_TYPES = [];

const TRACKING_ENTRY_TYPES = {
  symptoms: ["symptoms"],

  feeding: ["bottle", "breastfeeding", "solids", "pumping"],

  diaper: ["diaper", "potty"],

  mood: ["mood"],
};

const LABELS = {
  bottle: "Bottle",
  breastfeeding: "Breastfeeding",
  solids: "Solid food",
  pumping: "Pumping",

  pee: "Pee",
  poop: "Poop",
  peeAndPoop: "Pee & Poop",
  "pee-and-poop": "Pee & Poop",
  potty: "Potty",

  happy: "Happy",
  calm: "Calm",
  fussy: "Fussy",
  crying: "Crying",
  unwell: "Unwell",

  irritability: "Irritability",
  skinRash: "Skin rash",
  "skin-rash": "Skin rash",
  runnyNose: "Runny nose",
  "runny-nose": "Runny nose",
  cough: "Cough",
  fever: "Fever",
  unusualBreathing: "Unusual breathing",
  "unusual-breathing": "Unusual breathing",
  lowEnergy: "Low energy",
  "low-energy": "Low energy",
  lackOfAppetite: "Lack of appetite",
  "lack-of-appetite": "Lack of appetite",
  regurgitation: "Regurgitation",
  vomiting: "Vomiting",
  diarrhea: "Diarrhea",
  constipation: "Constipation",
};

function getEntryData(entry) {
  return entry?.data ?? entry ?? {};
}

function getEntryDate(entry) {
  const data = getEntryData(entry);

  const dateValue =
    data.observedAt ??
    data.feedingDate ??
    data.diaperDate ??
    data.moodDate ??
    entry?.occurredAt ??
    entry?.startedAt ??
    entry?.date;

  const parsedDate = dateValue ? new Date(dateValue) : null;

  if (!parsedDate || Number.isNaN(parsedDate.getTime())) {
    return new Date();
  }

  return parsedDate;
}

function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatSectionDate(date, language, t) {
  const today = new Date();
  const yesterday = new Date();

  yesterday.setDate(yesterday.getDate() - 1);

  if (getDateKey(date) === getDateKey(today)) {
    return t("Today");
  }

  if (getDateKey(date) === getDateKey(yesterday)) {
    return t("Yesterday");
  }

  return new Intl.DateTimeFormat(language, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatTime(entry, language) {
  return new Intl.DateTimeFormat(language, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(getEntryDate(entry));
}

function createSections(entries, language, t) {
  const groups = new Map();

  entries.forEach((entry) => {
    const date = getEntryDate(entry);
    const key = getDateKey(date);

    if (!groups.has(key)) {
      groups.set(key, {
        date,
        entries: [],
      });
    }

    groups.get(key).entries.push(entry);
  });

  return [...groups.values()]
    .sort((first, second) => second.date.getTime() - first.date.getTime())
    .map((group) => ({
      title: formatSectionDate(group.date, language, t),

      data: group.entries.sort(
        (first, second) =>
          getEntryDate(second).getTime() - getEntryDate(first).getTime(),
      ),
    }));
}

function getSymptomIds(entry) {
  const data = getEntryData(entry);

  return Array.isArray(data.symptoms) ? data.symptoms : [];
}

function getDiaperValue(entry) {
  const data = getEntryData(entry);

  if (entry.type === "potty") {
    return "potty";
  }

  return data.content ?? data.diaperContent ?? entry.content ?? "diaper";
}

function getMoodValue(entry) {
  const data = getEntryData(entry);

  if (data.mood) {
    return data.mood;
  }

  if (Array.isArray(data.moods)) {
    return data.moods[0];
  }

  return entry.mood ?? entry.value ?? "mood";
}

function incrementCounter(counter, id) {
  if (!id) {
    return;
  }

  counter[id] = (counter[id] ?? 0) + 1;
}

function createStatistics(trackingType, entries) {
  const counter = {};

  entries.forEach((entry) => {
    if (trackingType === "symptoms") {
      getSymptomIds(entry).forEach((symptomId) => {
        incrementCounter(counter, symptomId);
      });

      return;
    }

    if (trackingType === "feeding") {
      incrementCounter(counter, entry.type);
      return;
    }

    if (trackingType === "diaper") {
      incrementCounter(counter, getDiaperValue(entry));
      return;
    }

    if (trackingType === "mood") {
      incrementCounter(counter, getMoodValue(entry));
    }
  });

  return Object.entries(counter)
    .map(([id, count]) => ({
      id,
      count,
      label: LABELS[id] ?? id,
    }))
    .sort((first, second) => {
      if (second.count !== first.count) {
        return second.count - first.count;
      }

      return first.label.localeCompare(second.label);
    });
}

function entryMatchesFilter(entry, trackingType, selectedFilter) {
  if (selectedFilter === "all") {
    return true;
  }

  if (trackingType === "symptoms") {
    return getSymptomIds(entry).includes(selectedFilter);
  }

  if (trackingType === "feeding") {
    return entry.type === selectedFilter;
  }

  if (trackingType === "diaper") {
    return getDiaperValue(entry) === selectedFilter;
  }

  if (trackingType === "mood") {
    return getMoodValue(entry) === selectedFilter;
  }

  return true;
}

function getEntryPresentation(entry, trackingType, t) {
  const data = getEntryData(entry);

  if (trackingType === "symptoms") {
    const symptoms = getSymptomIds(entry);

    return {
      title: symptoms.map((id) => t(LABELS[id] ?? id)).join(", "),

      description: data.note ?? null,
    };
  }

  if (trackingType === "feeding") {
    return {
      title: t(
        TRACKING_TYPE_CONFIG[entry.type]?.titleKey ??
          LABELS[entry.type] ??
          "Feeding",
      ),

      description:
        entry.displayValue ??
        (entry.displayValueKey ? t(entry.displayValueKey) : null),
    };
  }

  if (trackingType === "diaper") {
    const content = getDiaperValue(entry);

    return {
      title: t(LABELS[content] ?? "Diaper"),
      description: entry.type === "potty" ? t("Potty") : t("Diaper"),
    };
  }

  if (trackingType === "mood") {
    const mood = getMoodValue(entry);

    return {
      title: t(LABELS[mood] ?? mood),
      description: data.note ?? null,
    };
  }

  return {
    title: t("Tracking entry"),
    description: null,
  };
}

function getEntryVisual(entry, trackingType) {
  if (trackingType === "feeding") {
    return TRACKING_TYPE_CONFIG[entry.type] ?? TRACKING_TYPE_CONFIG.bottle;
  }

  return TRACKING_TYPE_CONFIG[trackingType] ?? TRACKING_TYPE_CONFIG.note;
}

function FilterChip({ statistic, selected, onPress, t, styles }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => onPress(statistic.id)}
      style={({ pressed }) => [
        styles.filterChip,
        selected && styles.filterChipSelected,
        pressed && styles.pressed,
      ]}
    >
      <Text
        numberOfLines={1}
        style={[
          styles.filterChipLabel,
          selected && styles.filterChipLabelSelected,
        ]}
      >
        {t(statistic.label)}
      </Text>

      <Text
        style={[
          styles.filterChipCount,
          selected && styles.filterChipCountSelected,
        ]}
      >
        · {statistic.count}
      </Text>
    </Pressable>
  );
}

function HistoryEntryCard({
  entry,
  trackingType,
  language,
  onPress,
  t,
  colors,
  styles,
}) {
  const presentation = getEntryPresentation(entry, trackingType, t);

  const visual = getEntryVisual(entry, trackingType);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={presentation.title}
      accessibilityHint={t("Opens this entry for editing")}
      onPress={() => onPress?.(entry)}
      style={({ pressed }) => [styles.entryCard, pressed && styles.pressed]}
    >
      <View
        style={[
          styles.entryImageContainer,
          {
            backgroundColor: visual.backgroundColor,
          },
        ]}
      >
        <Image
          source={visual.image}
          resizeMode="contain"
          style={styles.entryImage}
        />
      </View>

      <View style={styles.entryContent}>
        <Text numberOfLines={2} style={styles.entryTitle}>
          {presentation.title}
        </Text>

        <View style={styles.entryMetadata}>
          <Text style={styles.entryTime}>{formatTime(entry, language)}</Text>

          {presentation.description ? (
            <>
              <View style={styles.metadataDot} />

              <Text numberOfLines={1} style={styles.entryDescription}>
                {presentation.description}
              </Text>
            </>
          ) : null}
        </View>
      </View>

      <Ionicons name="chevron-forward" size={19} color={colors.textSecondary} />
    </Pressable>
  );
}

export default function TrackingStatsHistoryScreen({
  navigation,
  route,
  onEditTrackingEntry,
}) {
  const { t, i18n } = useTranslation();

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const trackingType = route?.params?.trackingType ?? "symptoms";

  const [selectedFilter, setSelectedFilter] = useState("all");

  const allowedEntryTypes = TRACKING_ENTRY_TYPES[trackingType] ?? [];

  const entries = useMemo(
    () =>
      mockTrackingDay.entries.filter((entry) =>
        allowedEntryTypes.includes(entry.type),
      ),
    [allowedEntryTypes],
  );

  const statistics = useMemo(
    () => createStatistics(trackingType, entries),
    [entries, trackingType],
  );

  const filteredEntries = useMemo(
    () =>
      entries.filter((entry) =>
        entryMatchesFilter(entry, trackingType, selectedFilter),
      ),
    [entries, selectedFilter, trackingType],
  );

  const sections = useMemo(
    () => createSections(filteredEntries, i18n.language, t),
    [filteredEntries, i18n.language, t],
  );

  const visual =
    trackingType === "feeding"
      ? TRACKING_TYPE_CONFIG.bottle
      : (TRACKING_TYPE_CONFIG[trackingType] ?? TRACKING_TYPE_CONFIG.note);

  const titleKey = route?.params?.titleKey ?? visual.titleKey ?? "Tracking";

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("Go back")}
          hitSlop={10}
          onPress={navigation.goBack}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="chevron-back" size={23} color={colors.textPrimary} />
        </Pressable>

        <View style={styles.headerText}>
          <Text style={styles.title}>{t(titleKey)}</Text>

          <Text style={styles.subtitle}>
            {t("Statistics and complete history")}
          </Text>
        </View>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(entry) => entry.id}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={[
          styles.listContent,
          sections.length === 0 && styles.emptyListContent,
        ]}
        ListHeaderComponent={
          <>
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>{t("History")}</Text>

              <Text style={styles.totalCount}>
                {entries.length === 1
                  ? t("1 entry")
                  : t("{{count}} entries", {
                      count: entries.length,
                    })}
              </Text>
            </View>

            {statistics.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filtersList}
              >
                <FilterChip
                  statistic={{
                    id: "all",
                    label: "All",
                    count: entries.length,
                  }}
                  selected={selectedFilter === "all"}
                  onPress={setSelectedFilter}
                  t={t}
                  styles={styles}
                />

                {statistics.map((statistic) => (
                  <FilterChip
                    key={statistic.id}
                    statistic={statistic}
                    selected={selectedFilter === statistic.id}
                    onPress={setSelectedFilter}
                    t={t}
                    styles={styles}
                  />
                ))}
              </ScrollView>
            ) : null}
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View
              style={[
                styles.emptyImageContainer,
                {
                  backgroundColor: visual.backgroundColor,
                },
              ]}
            >
              <Image
                source={visual.image}
                resizeMode="contain"
                style={styles.emptyImage}
              />
            </View>

            <Text style={styles.emptyTitle}>
              {selectedFilter === "all"
                ? t("No entries yet")
                : t("No entries match this filter")}
            </Text>

            <Text style={styles.emptyDescription}>
              {t(
                "The entries recorded for this tracking type will appear here.",
              )}
            </Text>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionTitle}>{section.title}</Text>
        )}
        renderItem={({ item }) => (
          <HistoryEntryCard
            entry={item}
            trackingType={trackingType}
            language={i18n.language}
            onPress={onEditTrackingEntry}
            t={t}
            colors={colors}
            styles={styles}
          />
        )}
      />
    </SafeAreaView>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },

    header: {
      minHeight: 72,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingBottom: 8,
    },

    backButton: {
      width: 42,
      height: 42,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 14,
      backgroundColor: colors.white,
    },

    headerText: {
      flex: 1,
      marginLeft: 13,
    },

    title: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 22,
      lineHeight: 28,
      color: colors.textPrimary,
    },

    subtitle: {
      marginTop: 2,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 12,
      color: colors.textSecondary,
    },

    listContent: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 130,
    },

    emptyListContent: {
      flexGrow: 1,
    },

    totalCount: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 11,
      color: colors.textSecondary,
    },

    entryCard: {
      minHeight: 80,
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 10,
      paddingHorizontal: 13,
      paddingVertical: 12,
      borderRadius: 18,
      backgroundColor: colors.white,
    },

    entryImageContainer: {
      width: 48,
      height: 48,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 15,
    },

    entryImage: {
      width: 34,
      height: 34,
    },

    entryContent: {
      flex: 1,
      minWidth: 0,
      marginLeft: 12,
      marginRight: 8,
    },

    entryTitle: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 13,
      lineHeight: 18,
      color: colors.textPrimary,
    },

    entryMetadata: {
      minWidth: 0,
      flexDirection: "row",
      alignItems: "center",
      marginTop: 4,
    },

    entryTime: {
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 10,
      color: colors.textSecondary,
    },

    metadataDot: {
      width: 3,
      height: 3,
      marginHorizontal: 6,
      borderRadius: 2,
      backgroundColor: colors.textSecondary,
    },

    entryDescription: {
      flex: 1,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 10,
      color: colors.textSecondary,
    },

    emptyState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 30,
      paddingVertical: 60,
    },

    emptyImageContainer: {
      width: 76,
      height: 76,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 23,
    },

    emptyImage: {
      width: 54,
      height: 54,
    },

    emptyTitle: {
      marginTop: 17,
      textAlign: "center",
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 16,
      color: colors.textPrimary,
    },

    emptyDescription: {
      maxWidth: 280,
      marginTop: 7,
      textAlign: "center",
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 12,
      lineHeight: 18,
      color: colors.textSecondary,
    },

    pressed: {
      opacity: 0.7,
      transform: [{ scale: 0.985 }],
    },
    historyHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    historyTitle: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 16,
      lineHeight: 22,
      color: colors.textPrimary,
    },

    totalCount: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 11,
      color: colors.textSecondary,
    },

    filtersList: {
      gap: 8,
      paddingTop: 12,
      paddingRight: 20,
      paddingBottom: 2,
    },

    filterChip: {
      minHeight: 38,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 13,
      borderRadius: 13,
      backgroundColor: colors.white,
    },

    filterChipSelected: {
      backgroundColor: colors.white,
    },

    filterChipLabel: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 11,
      color: colors.textSecondary,
    },

    filterChipLabelSelected: {
      color: colors.primary,
    },

    filterChipCount: {
      marginLeft: 4,
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 10,
      color: colors.textSecondary,
    },

    filterChipCountSelected: {
      color: colors.primary,
    },

    sectionTitle: {
      marginTop: 22,
      marginBottom: 10,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 14,
      color: colors.textPrimary,
      textTransform: "capitalize",
    },
  });
