import { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useSelector } from "react-redux";

import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useThemeColors } from "../../theme/useThemeColors.js";

import { useAuth } from "../../auth/AuthProvider.js";
import useTrackingPeriod from "../../hooks/useTrackingPeriod.js";

const NIGHT_SLEEP_IMAGE = require("../../assets/illustrations/tracking/night.png");

const NAP_SLEEP_IMAGE = require("../../assets/illustrations/tracking/nap.png");

const MINUTES_PER_DAY = 24 * 60;
const NUMBER_OF_VISIBLE_DAYS = 7;

const SLEEP_COLORS = {
  night: "#8170E5",
  nightSoft: "#F0EDFF",
  nightTrack: "#8A78E8",

  nap: "#F2B235",
  napSoft: "#FFF5DD",
  napTrack: "#F4BD4F",

  bedtime: "#E98D60",
  bedtimeSoft: "#FFF0E9",
};

function getSleepData(entry) {
  return entry?.data ?? entry ?? {};
}

function isNapEntry(entry) {
  return getSleepData(entry).sleepType === "nap";
}

function parseDate(value) {
  const date = value ? new Date(value) : null;

  if (!date || Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, dayCount) {
  const nextDate = new Date(date);

  nextDate.setDate(nextDate.getDate() + dayCount);

  return nextDate;
}

function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDurationMinutes(entry) {
  const startedAt = parseDate(entry?.startedAt);
  const endedAt = parseDate(entry?.endedAt);

  if (!startedAt || !endedAt) {
    return 0;
  }

  return Math.max(
    0,
    Math.round((endedAt.getTime() - startedAt.getTime()) / 60000),
  );
}

function formatDuration(totalMinutes) {
  const safeMinutes = Math.max(0, Math.round(totalMinutes));

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

function formatDecimal(value, language) {
  return new Intl.NumberFormat(language, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

function getSleepSegmentsForDay(entries, day, now = Date.now()) {
  const dayStart = startOfDay(day);
  const dayEnd = addDays(dayStart, 1);

  // Position sur l'axe des heures locales.
  // Les durées sont calculées séparément en temps réellement écoulé.
  function clockMinutes(timestamp) {
    if (timestamp <= dayStart.getTime()) return 0;
    if (timestamp >= dayEnd.getTime()) return MINUTES_PER_DAY;

    const date = new Date(timestamp);

    return date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
  }

  return entries
    .map((entry) => {
      const startedAt = parseDate(entry.startedAt);
      const endedAt = entry.endedAt ? parseDate(entry.endedAt) : new Date(now);

      if (!startedAt || !endedAt) {
        return null;
      }

      const start = Math.max(startedAt.getTime(), dayStart.getTime());

      const end = Math.min(endedAt.getTime(), dayEnd.getTime(), now);

      if (end <= start) {
        return null;
      }

      const startMinutes = clockMinutes(start);
      const endMinutes = clockMinutes(end);

      return {
        id: `${entry.id}-${getDateKey(day)}`,
        entryId: entry.id,
        sleepType: isNapEntry(entry) ? "nap" : "night",
        start,
        end,
        durationMinutes: (end - start) / 60000,
        left: (startMinutes / MINUTES_PER_DAY) * 100,
        width: (Math.max(0, endMinutes - startMinutes) / MINUTES_PER_DAY) * 100,
      };
    })
    .filter(Boolean);
}

function getCircularAverageMinutes(values) {
  if (values.length === 0) {
    return null;
  }

  const vectors = values.reduce(
    (result, minutes) => {
      const angle = (minutes / MINUTES_PER_DAY) * Math.PI * 2;

      return {
        x: result.x + Math.cos(angle),
        y: result.y + Math.sin(angle),
      };
    },
    {
      x: 0,
      y: 0,
    },
  );

  let angle = Math.atan2(vectors.y, vectors.x);

  if (angle < 0) {
    angle += Math.PI * 2;
  }

  return (angle / (Math.PI * 2)) * MINUTES_PER_DAY;
}
function getMergedDurationMinutes(segments) {
  const intervals = segments
    .map(({ start, end }) => ({ start, end }))
    .sort((first, second) => first.start - second.start);

  let total = 0;
  let current = null;

  for (const interval of intervals) {
    if (!current) {
      current = { ...interval };
    } else if (interval.start <= current.end) {
      current.end = Math.max(current.end, interval.end);
    } else {
      total += current.end - current.start;
      current = { ...interval };
    }
  }

  if (current) {
    total += current.end - current.start;
  }

  return total / 60000;
}

function calculateStatistics(entries, visibleDays, now) {
  const visibleDateKeys = new Set(visibleDays.map(getDateKey));

  const dailyData = visibleDays.map((day) => {
    const segments = getSleepSegmentsForDay(entries, day, now);

    return {
      totalMinutes: getMergedDurationMinutes(segments),
      napCount: entries.filter((entry) => {
        const startedAt = parseDate(entry.startedAt);

        return (
          isNapEntry(entry) &&
          startedAt &&
          startedAt.getTime() <= now &&
          getDateKey(startedAt) === getDateKey(day)
        );
      }).length,
    };
  });

  const recordedDays = dailyData.filter((day) => day.totalMinutes > 0);

  const nightEntries = entries.filter((entry) => {
    const startedAt = parseDate(entry.startedAt);

    return (
      startedAt &&
      startedAt.getTime() <= now &&
      !isNapEntry(entry) &&
      visibleDateKeys.has(getDateKey(startedAt))
    );
  });

  // Un sommeil en cours ne compte pas comme une nuit terminée.
  const completedNights = nightEntries.filter((entry) => {
    const startedAt = parseDate(entry.startedAt);
    const endedAt = parseDate(entry.endedAt);

    return (
      startedAt && endedAt && endedAt > startedAt && endedAt.getTime() <= now
    );
  });

  const bedtimeMinutes = nightEntries.map((entry) => {
    const date = parseDate(entry.startedAt);

    return date.getHours() * 60 + date.getMinutes();
  });

  return {
    averageDailyMinutes: recordedDays.length
      ? recordedDays.reduce((sum, day) => sum + day.totalMinutes, 0) /
        recordedDays.length
      : null,

    averageNightMinutes: completedNights.length
      ? completedNights.reduce(
          (sum, entry) => sum + getDurationMinutes(entry),
          0,
        ) / completedNights.length
      : null,

    averageNapCount: recordedDays.length
      ? recordedDays.reduce((sum, day) => sum + day.napCount, 0) /
        recordedDays.length
      : null,

    averageBedtimeMinutes: getCircularAverageMinutes(bedtimeMinutes),
    recordedDayCount: recordedDays.length,
  };
}

function formatClockMinutes(totalMinutes, language) {
  if (totalMinutes === null) {
    return "—";
  }

  const date = new Date(2000, 0, 1, 0, Math.round(totalMinutes));

  return new Intl.DateTimeFormat(language, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function createHistoryGroups(entries) {
  const groups = new Map();

  entries.forEach((entry) => {
    const startedAt = parseDate(entry.startedAt);

    if (!startedAt) {
      return;
    }

    const key = getDateKey(startedAt);

    if (!groups.has(key)) {
      groups.set(key, {
        date: startOfDay(startedAt),
        entries: [],
      });
    }

    groups.get(key).entries.push(entry);
  });

  return [...groups.values()]
    .sort(
      (firstGroup, secondGroup) =>
        secondGroup.date.getTime() - firstGroup.date.getTime(),
    )
    .map((group) => ({
      ...group,

      entries: group.entries.sort(
        (firstEntry, secondEntry) =>
          new Date(secondEntry.startedAt).getTime() -
          new Date(firstEntry.startedAt).getTime(),
      ),
    }));
}

function formatDayLabel(date, language) {
  return new Intl.DateTimeFormat(language, {
    weekday: "short",
  }).format(date);
}

function formatFullDate(date, language) {
  return new Intl.DateTimeFormat(language, {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

function formatTime(value, language) {
  const date = parseDate(value);

  if (!date) {
    return "";
  }

  return new Intl.DateTimeFormat(language, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function SummaryCard({
  label,
  value,
  icon,
  iconColor,
  iconBackground,
  styles,
}) {
  return (
    <View style={styles.summaryCard}>
      <View
        style={[
          styles.summaryIcon,
          {
            backgroundColor: iconBackground,
          },
        ]}
      >
        <Ionicons name={icon} size={19} color={iconColor} />
      </View>

      <Text style={styles.summaryValue}>{value}</Text>

      <Text numberOfLines={2} style={styles.summaryLabel}>
        {label}
      </Text>
    </View>
  );
}

function SleepRhythmRow({ day, entries, language, styles, now }) {
  const segments = getSleepSegmentsForDay(entries, day, now);

  return (
    <View style={styles.rhythmRow}>
      <Text style={styles.rhythmDay}>{formatDayLabel(day, language)}</Text>

      <View style={styles.rhythmTrack}>
        {[25, 50, 75].map((left) => (
          <View
            key={left}
            style={[
              styles.hourGuide,
              {
                left: `${left}%`,
              },
            ]}
          />
        ))}

        {segments.map((segment) => (
          <View
            key={segment.id}
            style={[
              styles.sleepSegment,

              segment.sleepType === "nap"
                ? styles.napSegment
                : styles.nightSegment,

              {
                left: `${segment.left}%`,
                width: `${Math.max(segment.width, 1.2)}%`,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

function SleepHistoryCard({ entry, language, onPress, t, styles }) {
  const isNap = isNapEntry(entry);
  const isOngoing = !entry.endedAt;
  const canOpen = typeof onPress === "function";

  const start = parseDate(entry.startedAt);
  const end = parseDate(entry.endedAt);

  const endLabel = isOngoing
    ? t("In progress")
    : start && end && getDateKey(start) !== getDateKey(end)
      ? new Intl.DateTimeFormat(language, {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        }).format(end)
      : formatTime(entry.endedAt, language);

  return (
    <Pressable
      accessibilityRole={canOpen ? "button" : undefined}
      accessibilityHint={canOpen ? t("Opens this entry") : undefined}
      disabled={!canOpen}
      onPress={() => onPress?.(entry)}
      style={({ pressed }) => [
        styles.historyCard,
        pressed && canOpen && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.historyImageContainer,
          isNap ? styles.napImageContainer : styles.nightImageContainer,
        ]}
      >
        <Image
          source={isNap ? NAP_SLEEP_IMAGE : NIGHT_SLEEP_IMAGE}
          resizeMode="contain"
          style={styles.historyImage}
        />
      </View>

      <View style={styles.historyContent}>
        <Text style={styles.historyCardTitle}>
          {isNap ? t("Nap") : t("Night sleep")}
        </Text>

        <Text style={styles.historyTime}>
          {formatTime(entry.startedAt, language)}
          {" – "}
          {endLabel}
        </Text>
      </View>

      {!isOngoing ? (
        <Text style={styles.historyDuration}>
          {formatDuration(getDurationMinutes(entry))}
        </Text>
      ) : null}

      {canOpen ? (
        <Ionicons name="chevron-forward" size={18} color="#91A0B5" />
      ) : null}
    </Pressable>
  );
}

export default function SleepHistoryScreen({
  navigation,
  route,
  onEditTrackingEntry,
}) {
  const { t, i18n } = useTranslation();
  const { user, accessToken, refreshSession } = useAuth();

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const selectedChildId = useSelector(
    (state) => state.children.selectedChildId,
  );

  const childId = route?.params?.childId ?? selectedChildId;

  const [weekOffset, setWeekOffset] = useState(0);
  const [now, setNow] = useState(Date.now());

  // Actualise les sommeils en cours et le jour courant
  // uniquement lorsque cet écran est visible.
  useFocusEffect(
    useCallback(() => {
      setNow(Date.now());

      const interval = setInterval(() => {
        setNow(Date.now());
      }, 60000);

      return () => clearInterval(interval);
    }, []),
  );

  const todayKey = getDateKey(new Date(now));

  const periodEndDay = useMemo(() => {
    const [year, month, day] = todayKey.split("-").map(Number);

    return addDays(
      new Date(year, month - 1, day),
      weekOffset * NUMBER_OF_VISIBLE_DAYS,
    );
  }, [todayKey, weekOffset]);

  const dateKey = getDateKey(periodEndDay);

  const visibleDays = useMemo(
    () =>
      Array.from({ length: NUMBER_OF_VISIBLE_DAYS }, (_, index) =>
        addDays(periodEndDay, index - NUMBER_OF_VISIBLE_DAYS + 1),
      ),
    [periodEndDay],
  );

  const { weekEntries, loading, error, syncError, isRefreshing, refresh } =
    useTrackingPeriod({
      userId: user?.id,
      childId,
      dateKey,
      accessToken,
      refreshSession,
    });

  const entries = useMemo(
    () => weekEntries.filter((entry) => entry.type === "sleep"),
    [weekEntries],
  );

  const historyGroups = useMemo(() => createHistoryGroups(entries), [entries]);

  const statistics = useMemo(
    () => calculateStatistics(entries, visibleDays, now),
    [entries, visibleDays, now],
  );

  const periodLabel = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(i18n.language, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    return (
      `${formatter.format(visibleDays[0])} – ` + formatter.format(periodEndDay)
    );
  }, [i18n.language, visibleDays, periodEndDay]);

  const durationLabel = (value) =>
    value === null ? "—" : formatDuration(value);

  const canDisplay = Boolean(user?.id && childId);
  const showContent = canDisplay && !loading && !error;

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
          <Text style={styles.title}>{t("Sleep")}</Text>
          <Text style={styles.subtitle}>
            {t("Rhythm, duration and history")}
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.sectionHeader}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("Previous 7 days")}
            onPress={() => setWeekOffset((value) => value - 1)}
            style={styles.backButton}
          >
            <Ionicons
              name="chevron-back"
              size={20}
              color={colors.textPrimary}
            />
          </Pressable>

          <Text
            style={[
              styles.sectionMetadata,
              { flex: 1, textAlign: "center", marginHorizontal: 8 },
            ]}
          >
            {periodLabel}
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("Next 7 days")}
            disabled={weekOffset >= 0}
            onPress={() => setWeekOffset((value) => Math.min(0, value + 1))}
            style={[styles.backButton, weekOffset >= 0 && { opacity: 0.3 }]}
          >
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.textPrimary}
            />
          </Pressable>
        </View>

        {!canDisplay ? (
          <Text style={styles.heroDescription}>
            {t("Unable to identify the child. Go back and try again.")}
          </Text>
        ) : loading ? (
          <ActivityIndicator
            color={colors.primary}
            style={{ marginVertical: 24 }}
          />
        ) : error ? (
          <Text style={styles.heroDescription}>
            {t("Unable to load tracking data. Pull down to try again.")}
          </Text>
        ) : null}

        {canDisplay && syncError ? (
          <Text style={styles.heroDescription}>
            {t("Synchronization failed. Showing data saved on this device.")}
          </Text>
        ) : null}

        {showContent ? (
          <>
            <View style={styles.heroCard}>
              <View style={styles.heroContent}>
                <Text style={styles.heroLabel}>
                  {t("Average sleep per recorded day")}
                </Text>

                <Text style={styles.heroValue}>
                  {durationLabel(statistics.averageDailyMinutes)}
                </Text>

                <Text style={styles.heroDescription}>
                  {t("Days with recorded sleep: {{number}}", {
                    number: statistics.recordedDayCount,
                  })}
                </Text>

                <Text style={styles.heroDescription}>
                  {t(
                    "Includes ongoing sleep. Unrecorded sleep is not counted.",
                  )}
                </Text>
              </View>

              <View style={styles.heroImageContainer}>
                <Image
                  source={NIGHT_SLEEP_IMAGE}
                  resizeMode="contain"
                  style={styles.heroImage}
                />
              </View>
            </View>

            <View style={styles.summaryGrid}>
              <SummaryCard
                label={t("Average completed night session")}
                value={durationLabel(statistics.averageNightMinutes)}
                icon="moon-outline"
                iconColor={SLEEP_COLORS.night}
                iconBackground={SLEEP_COLORS.nightSoft}
                styles={styles}
              />

              <SummaryCard
                label={t("Naps per recorded day")}
                value={
                  statistics.averageNapCount === null
                    ? "—"
                    : formatDecimal(statistics.averageNapCount, i18n.language)
                }
                icon="partly-sunny-outline"
                iconColor={SLEEP_COLORS.nap}
                iconBackground={SLEEP_COLORS.napSoft}
                styles={styles}
              />

              <SummaryCard
                label={t("Average bedtime")}
                value={formatClockMinutes(
                  statistics.averageBedtimeMinutes,
                  i18n.language,
                )}
                icon="time-outline"
                iconColor={SLEEP_COLORS.bedtime}
                iconBackground={SLEEP_COLORS.bedtimeSoft}
                styles={styles}
              />
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t("Sleep rhythm")}</Text>
              <Text style={styles.sectionMetadata}>
                {t("Displayed 7 days")}
              </Text>
            </View>

            <View style={styles.rhythmCard}>
              <View style={styles.rhythmHours}>
                {["0h", "6h", "12h", "18h", "24h"].map((hour) => (
                  <Text key={hour} style={styles.rhythmHour}>
                    {hour}
                  </Text>
                ))}
              </View>

              {visibleDays.map((day) => (
                <SleepRhythmRow
                  key={getDateKey(day)}
                  day={day}
                  entries={entries}
                  language={i18n.language}
                  styles={styles}
                  now={now}
                />
              ))}

              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, styles.nightSegment]} />
                  <Text style={styles.legendText}>{t("Night")}</Text>
                </View>

                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, styles.napSegment]} />
                  <Text style={styles.legendText}>{t("Nap")}</Text>
                </View>
              </View>
            </View>

            <Text style={styles.historyTitle}>
              {t("Sleep sessions in this period")}
            </Text>

            {historyGroups.length === 0 ? (
              <Text style={styles.heroDescription}>
                {t("No sleep recorded for this period on this device.")}
              </Text>
            ) : (
              historyGroups.map((group) => (
                <View key={getDateKey(group.date)} style={styles.historyGroup}>
                  <Text style={styles.historyDate}>
                    {formatFullDate(group.date, i18n.language)}
                  </Text>

                  {group.entries.map((entry) => (
                    <SleepHistoryCard
                      key={entry.id}
                      entry={entry}
                      language={i18n.language}
                      onPress={onEditTrackingEntry}
                      t={t}
                      styles={styles}
                    />
                  ))}
                </View>
              ))
            )}
          </>
        ) : null}
      </ScrollView>
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
      color: colors.textPrimary,
    },

    subtitle: {
      marginTop: 2,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 12,
      color: colors.textSecondary,
    },

    content: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 130,
    },

    heroCard: {
      minHeight: 106,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 21,
      backgroundColor: colors.white,
    },

    heroContent: {
      flex: 1,
    },

    heroLabel: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 12,
      color: colors.textSecondary,
    },

    heroValue: {
      marginTop: 4,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 28,
      color: colors.textPrimary,
    },

    heroDescription: {
      marginTop: 4,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 11,
      color: colors.textSecondary,
    },

    heroImageContainer: {
      width: 72,
      height: 72,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 20,
      backgroundColor: SLEEP_COLORS.nightSoft,
    },

    heroImage: {
      width: 59,
      height: 59,
    },
    summaryGrid: {
      flexDirection: "row",
      gap: 9,
      marginTop: 12,
    },

    summaryCard: {
      flex: 1,
      minWidth: 0,
      minHeight: 96,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 6,
      paddingVertical: 9,
      borderRadius: 18,
      backgroundColor: colors.white,
    },

    summaryIcon: {
      width: 34,
      height: 34,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 12,
    },

    summaryValue: {
      marginTop: 5,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 14,
      color: colors.textPrimary,
    },

    summaryLabel: {
      marginTop: 2,
      textAlign: "center",
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 9,
      lineHeight: 12,
      color: colors.textSecondary,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 26,
      marginBottom: 11,
    },

    sectionTitle: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 16,
      color: colors.textPrimary,
    },

    sectionMetadata: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 10,
      color: colors.textSecondary,
    },

    rhythmCard: {
      paddingHorizontal: 13,
      paddingTop: 14,
      paddingBottom: 13,
      borderRadius: 21,
      backgroundColor: colors.white,
    },

    rhythmHours: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginLeft: 34,
      marginBottom: 8,
    },

    rhythmHour: {
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 8,
      color: colors.textSecondary,
    },

    rhythmRow: {
      minHeight: 30,
      flexDirection: "row",
      alignItems: "center",
    },

    rhythmDay: {
      width: 34,
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 9,
      color: colors.textSecondary,
      textTransform: "capitalize",
    },

    rhythmTrack: {
      position: "relative",
      flex: 1,
      height: 17,
      overflow: "hidden",
      borderRadius: 7,
      backgroundColor: "#F5F3FA",
    },

    hourGuide: {
      position: "absolute",
      top: 0,
      bottom: 0,
      width: 1,
      backgroundColor: "#E8E3F0",
    },

    sleepSegment: {
      position: "absolute",
      top: 2,
      bottom: 2,
      borderRadius: 5,
    },

    nightSegment: {
      backgroundColor: SLEEP_COLORS.nightTrack,
    },

    napSegment: {
      backgroundColor: SLEEP_COLORS.napTrack,
    },

    legend: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 14,
      marginTop: 11,
    },

    legendItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },

    legendDot: {
      width: 9,
      height: 9,
      borderRadius: 3,
    },

    legendText: {
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 9,
      color: colors.textSecondary,
    },

    historyTitle: {
      marginTop: 28,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 16,
      color: colors.textPrimary,
    },

    historyGroup: {
      marginTop: 18,
    },

    historyDate: {
      marginBottom: 9,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 13,
      color: colors.textPrimary,
      textTransform: "capitalize",
    },
    historyCard: {
      minHeight: 66,
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 17,
      backgroundColor: colors.white,
    },
    historyImageContainer: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 13,
    },

    historyImage: {
      width: 35,
      height: 35,
    },

    nightImageContainer: {
      backgroundColor: SLEEP_COLORS.nightSoft,
    },

    napImageContainer: {
      backgroundColor: SLEEP_COLORS.napSoft,
    },

    historyContent: {
      flex: 1,
      minWidth: 0,
      marginLeft: 11,
    },

    historyCardTitle: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 13,
      color: colors.textPrimary,
    },

    historyTime: {
      marginTop: 3,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 10,
      color: colors.textSecondary,
    },

    historyDuration: {
      marginRight: 8,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 11,
      color: colors.textPrimary,
    },

    pressed: {
      opacity: 0.7,
      transform: [{ scale: 0.985 }],
    },
  });
