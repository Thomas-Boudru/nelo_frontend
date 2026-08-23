import { useMemo } from "react";
import {
  Image,
  Pressable,
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

const SUPPORTED_TRACKING_TYPES = [
  "temperature",
  "medication",
  "vaccine",
  "teething",
  "note",
];

const MEASUREMENT_LOCATION_LABELS = {
  forehead: "Forehead",
  armpit: "Armpit",
  rectal: "Rectal",
  ear: "Ear",
};

function getEntryData(entry) {
  return entry?.data ?? entry ?? {};
}

function parseDate(value) {
  if (!value) {
    return null;
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate;
}

function getEntryDate(entry) {
  const data = getEntryData(entry);

  const dateValue =
    data.measuredAt ??
    data.medicationDate ??
    data.vaccineDate ??
    data.teethingDate ??
    data.notedAt ??
    entry?.occurredAt ??
    entry?.startedAt ??
    entry?.date;

  return parseDate(dateValue) ?? new Date();
}

function getDateKey(date) {
  const year = date.getFullYear();

  const month = String(date.getMonth() + 1).padStart(2, "0");

  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isSameCalendarDay(firstDate, secondDate) {
  return (
    firstDate.getFullYear() === secondDate.getFullYear() &&
    firstDate.getMonth() === secondDate.getMonth() &&
    firstDate.getDate() === secondDate.getDate()
  );
}

function formatSectionDate(date, language, t) {
  const today = new Date();

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (isSameCalendarDay(date, today)) {
    return t("Today");
  }

  if (isSameCalendarDay(date, yesterday)) {
    return t("Yesterday");
  }

  return new Intl.DateTimeFormat(language, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatEntryTime(entry, language) {
  return new Intl.DateTimeFormat(language, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(getEntryDate(entry));
}

function formatLatestEntryDate(entry, language) {
  return new Intl.DateTimeFormat(language, {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(getEntryDate(entry));
}

function getTemperatureStatus(temperature) {
  if (temperature >= 38) {
    return "Fever";
  }

  if (temperature < 36) {
    return "Low temperature";
  }

  return "Normal temperature";
}

function getEntryPresentation(entry, t) {
  const data = getEntryData(entry);

  if (entry.type === "temperature") {
    const rawValue =
      data.value ?? data.temperature ?? entry?.value ?? entry?.temperature;

    const numericValue = Number(rawValue);

    const hasValidValue = Number.isFinite(numericValue);

    const location =
      data.measurementLocation ??
      data.location ??
      entry?.measurementLocation ??
      entry?.location;

    return {
      title: hasValidValue
        ? `${numericValue.toFixed(1)} °C`
        : (entry?.displayValue ?? t("Temperature")),

      description: location
        ? t(MEASUREMENT_LOCATION_LABELS[location] ?? location)
        : null,

      badge: hasValidValue ? t(getTemperatureStatus(numericValue)) : null,
    };
  }

  if (entry.type === "medication") {
    const medicationName =
      data.medicationName ?? entry?.medicationName ?? t("Medication");

    const dose = data.dose ?? data.amount ?? entry?.dose ?? entry?.amount;

    const unit = data.doseUnit ?? data.unit ?? entry?.doseUnit ?? entry?.unit;

    const hasDose = dose !== null && dose !== undefined && dose !== "";

    return {
      title: medicationName,

      description: hasDose ? `${dose}${unit ? ` ${unit}` : ""}` : null,

      badge: null,
    };
  }

  if (entry.type === "vaccine") {
    const vaccineName = data.vaccineName ?? entry?.vaccineName ?? t("Vaccine");

    const doseNumber =
      data.doseNumber ?? data.dose ?? entry?.doseNumber ?? entry?.dose;

    const hasDose =
      doseNumber !== null && doseNumber !== undefined && doseNumber !== "";

    return {
      title: vaccineName,

      description: hasDose
        ? t("Dose {{doseNumber}}", {
            doseNumber,
          })
        : null,

      badge: null,
    };
  }

  if (entry.type === "teething") {
    const toothLabel = entry?.displayValueKey
      ? t(entry.displayValueKey)
      : (entry?.displayValue ?? t("New tooth"));

    return {
      title: toothLabel,

      description: data.note ?? entry?.note ?? null,

      badge: null,
    };
  }

  if (entry.type === "note") {
    const note =
      data.note ?? data.content ?? entry?.note ?? entry?.content ?? "";

    const photos = Array.isArray(data.photos)
      ? data.photos
      : Array.isArray(entry?.photos)
        ? entry.photos
        : [];

    return {
      title: note || t("Note"),

      description:
        photos.length > 0
          ? t("{{count}} photos", {
              count: photos.length,
            })
          : null,

      badge: null,
    };
  }

  return {
    title:
      entry?.displayValue ??
      (entry?.displayValueKey ? t(entry.displayValueKey) : t("Tracking entry")),

    description: null,
    badge: null,
  };
}

function createHistorySections(entries, language, t) {
  const groups = new Map();

  entries.forEach((entry) => {
    const entryDate = getEntryDate(entry);
    const dateKey = getDateKey(entryDate);

    if (!groups.has(dateKey)) {
      groups.set(dateKey, {
        date: entryDate,
        entries: [],
      });
    }

    groups.get(dateKey).entries.push(entry);
  });

  return [...groups.values()]
    .sort(
      (firstGroup, secondGroup) =>
        secondGroup.date.getTime() - firstGroup.date.getTime(),
    )
    .map((group) => ({
      title: formatSectionDate(group.date, language, t),

      data: group.entries.sort(
        (firstEntry, secondEntry) =>
          getEntryDate(secondEntry).getTime() -
          getEntryDate(firstEntry).getTime(),
      ),
    }));
}

function HistoryEntryCard({ entry, language, onPress, t, colors, styles }) {
  const presentation = getEntryPresentation(entry, t);

  const visual = TRACKING_TYPE_CONFIG[entry.type] ?? TRACKING_TYPE_CONFIG.note;

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
        <Text
          numberOfLines={entry.type === "note" ? 2 : 1}
          style={styles.entryTitle}
        >
          {presentation.title}
        </Text>

        <View style={styles.entryMetadata}>
          <Text style={styles.entryTime}>
            {formatEntryTime(entry, language)}
          </Text>

          {presentation.description ? (
            <>
              <View style={styles.metadataDot} />

              <Text numberOfLines={1} style={styles.entryDescription}>
                {presentation.description}
              </Text>
            </>
          ) : null}
        </View>

        {presentation.badge ? (
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{presentation.badge}</Text>
          </View>
        ) : null}
      </View>

      <Ionicons name="chevron-forward" size={19} color={colors.textSecondary} />
    </Pressable>
  );
}

export default function TrackingTypeHistoryScreen({
  navigation,
  route,
  onEditTrackingEntry,
}) {
  const { t, i18n } = useTranslation();

  const colors = useThemeColors();

  const styles = useMemo(() => createStyles(colors), [colors]);

  const trackingType = route?.params?.trackingType ?? "temperature";

  const titleKey = route?.params?.titleKey ?? null;

  const visual =
    TRACKING_TYPE_CONFIG[trackingType] ?? TRACKING_TYPE_CONFIG.note;

  const entries = useMemo(() => {
    if (!SUPPORTED_TRACKING_TYPES.includes(trackingType)) {
      return [];
    }

    return mockTrackingDay.entries
      .filter((entry) => entry.type === trackingType)
      .sort(
        (firstEntry, secondEntry) =>
          getEntryDate(secondEntry).getTime() -
          getEntryDate(firstEntry).getTime(),
      );
  }, [trackingType]);

  const sections = useMemo(
    () => createHistorySections(entries, i18n.language, t),
    [entries, i18n.language, t],
  );

  const latestEntry = entries[0] ?? null;

  const latestPresentation = latestEntry
    ? getEntryPresentation(latestEntry, t)
    : null;

  const screenTitle = titleKey ?? visual.titleKey ?? "Tracking";

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("Go back")}
          hitSlop={10}
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="chevron-back" size={23} color={colors.textPrimary} />
        </Pressable>

        <View style={styles.headerText}>
          <Text style={styles.title}>{t(screenTitle)}</Text>

          <Text style={styles.subtitle}>{t("Complete tracking history")}</Text>
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
          latestEntry && latestPresentation ? (
            <View style={styles.summaryCard}>
              <View
                style={[
                  styles.summaryImageContainer,
                  {
                    backgroundColor: visual.backgroundColor,
                  },
                ]}
              >
                <Image
                  source={visual.image}
                  resizeMode="contain"
                  style={styles.summaryImage}
                />
              </View>

              <View style={styles.summaryContent}>
                <Text style={styles.summaryLabel}>{t("Latest entry")}</Text>

                <Text numberOfLines={2} style={styles.summaryValue}>
                  {latestPresentation.title}
                </Text>

                <Text style={styles.summaryDate}>
                  {formatLatestEntryDate(latestEntry, i18n.language)}
                </Text>
              </View>
            </View>
          ) : null
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

            <Text style={styles.emptyTitle}>{t("No entries yet")}</Text>

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

function createStyles(colors) {
  return StyleSheet.create({
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

    summaryCard: {
      minHeight: 104,

      flexDirection: "row",
      alignItems: "center",

      padding: 15,

      borderRadius: 21,

      backgroundColor: colors.white,

      shadowColor: colors.textPrimary,
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.04,
      shadowRadius: 12,

      elevation: 2,
    },

    summaryImageContainer: {
      width: 68,
      height: 68,

      alignItems: "center",
      justifyContent: "center",

      borderRadius: 20,
    },

    summaryImage: {
      width: 48,
      height: 48,
    },

    summaryContent: {
      flex: 1,

      minWidth: 0,

      marginLeft: 14,
    },

    summaryLabel: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 11,

      color: colors.textSecondary,
    },

    summaryValue: {
      marginTop: 3,

      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 17,
      lineHeight: 23,

      color: colors.textPrimary,
    },

    summaryDate: {
      marginTop: 4,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 11,

      color: colors.textSecondary,
    },

    sectionTitle: {
      marginTop: 24,
      marginBottom: 10,

      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 15,

      color: colors.textPrimary,

      textTransform: "capitalize",
    },

    entryCard: {
      minHeight: 82,

      flexDirection: "row",
      alignItems: "center",

      marginBottom: 10,

      paddingHorizontal: 13,
      paddingVertical: 12,

      borderRadius: 18,

      backgroundColor: colors.white,

      shadowColor: colors.textPrimary,
      shadowOffset: {
        width: 0,
        height: 3,
      },
      shadowOpacity: 0.035,
      shadowRadius: 10,

      elevation: 1,
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

    statusBadge: {
      alignSelf: "flex-start",

      marginTop: 6,

      paddingHorizontal: 8,
      paddingVertical: 3,

      borderRadius: 999,

      backgroundColor: colors.lightBackground ?? "#F2F6FC",
    },

    statusText: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 9,

      color: colors.textSecondary,
    },

    emptyState: {
      flex: 1,

      alignItems: "center",
      justifyContent: "center",

      paddingHorizontal: 30,
      paddingBottom: 70,
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

      transform: [
        {
          scale: 0.985,
        },
      ],
    },
  });
}
