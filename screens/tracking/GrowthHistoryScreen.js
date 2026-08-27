import { Fragment, useEffect, useMemo, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Svg, {
  Circle,
  Line,
  Polyline,
  Rect,
  Text as SvgText,
} from "react-native-svg";
import { useTranslation } from "react-i18next";

import {
  mockGrowthHistoryEntries,
  TRACKING_TYPE_CONFIG,
} from "../../data/mockTrackingData.js";

import {
  getWhoCurves,
  getWhoPercentileEstimate,
} from "../../data/whoGrowthStandards.js";

import { useThemeColors } from "../../theme/useThemeColors.js";

const CHART_HEIGHT = 286;
const CHART_PADDING_LEFT = 42;
const CHART_PADDING_RIGHT = 16;
const CHART_PADDING_TOP = 20;
const CHART_PADDING_BOTTOM = 34;

const MAX_REFERENCE_MONTHS = 18;

/*
 * Date temporaire pour les données mockées.
 * Plus tard, la véritable date viendra de child.birthDate.
 */
const MOCK_BIRTH_DATE = "2026-03-19";

const MEASUREMENT_CONFIG = {
  weight: {
    id: "weight",
    title: "Weight",
    dataKey: "weightKg",
    unit: "kg",
    decimals: 2,
    image: require("../../assets/illustrations/tracking/weightBlue.png"),
    backgroundColor: "#EDF3FF",
  },

  height: {
    id: "height",
    title: "Height",
    dataKey: "heightCm",
    unit: "cm",
    decimals: 1,
    image: require("../../assets/illustrations/tracking/height.png"),
    backgroundColor: "#EDF3FF",
  },

  headCircumference: {
    id: "headCircumference",
    title: "Head circumference",
    dataKey: "headCircumferenceCm",
    unit: "cm",
    decimals: 1,
    image: require("../../assets/illustrations/tracking/headBlue.png"),
    backgroundColor: "#EDF3FF",
  },
};

function getEntryData(entry) {
  return entry?.data ?? entry ?? {};
}

function getGrowthDate(entry) {
  const data = getEntryData(entry);

  const dateValue =
    data.measuredAt ?? entry?.measuredAt ?? entry?.startedAt ?? entry?.date;

  const parsedDate = dateValue ? new Date(dateValue) : null;

  if (!parsedDate || Number.isNaN(parsedDate.getTime())) {
    return new Date();
  }

  return parsedDate;
}

function getMeasurementValue(entry, dataKey) {
  const data = getEntryData(entry);

  const value = data[dataKey] ?? entry?.[dataKey];

  const numericValue = Number(value);

  return Number.isFinite(numericValue) ? numericValue : null;
}

function formatValue(value, config, language) {
  if (value === null || value === undefined) {
    return "—";
  }

  const formattedValue = new Intl.NumberFormat(language, {
    minimumFractionDigits: 0,
    maximumFractionDigits: config.decimals,
  }).format(value);

  return `${formattedValue} ${config.unit}`;
}

function formatDifference(difference, config, language) {
  if (difference === null || difference === undefined) {
    return null;
  }

  const sign = difference > 0 ? "+" : "";

  const formattedDifference = new Intl.NumberFormat(language, {
    minimumFractionDigits: 0,
    maximumFractionDigits: config.decimals,
  }).format(difference);

  return `${sign}${formattedDifference} ${config.unit}`;
}

function formatShortDate(date, language) {
  return new Intl.DateTimeFormat(language, {
    day: "numeric",
    month: "short",
  }).format(date);
}

function formatLongDate(date, language) {
  return new Intl.DateTimeFormat(language, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function getAgeInMonths(date, birthDate) {
  const birth = birthDate ? new Date(birthDate) : null;

  if (!birth || Number.isNaN(birth.getTime()) || date < birth) {
    return null;
  }

  return (date.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 30.4375);
}

/*
 * La période visible s’adapte automatiquement :
 *
 * dernière mesure à 5 mois  → 0 à 6 mois
 * dernière mesure à 8 mois  → 0 à 9 mois
 * dernière mesure à 11 mois → 0 à 12 mois
 */
function getDisplayEndMonth(values) {
  const maximumAge = Math.max(0, ...values.map((item) => item.ageMonths ?? 0));

  const availablePeriods = [3, 6, 9, 12, 15, 18];

  return (
    availablePeriods.find((month) => maximumAge <= month) ??
    MAX_REFERENCE_MONTHS
  );
}

function getAxisMonths(endMonth) {
  const step = endMonth <= 6 ? 2 : 3;

  const months = [];

  for (let month = 0; month <= endMonth; month += step) {
    months.push(month);
  }

  if (months[months.length - 1] !== endMonth) {
    months.push(endMonth);
  }

  return months;
}

function getChartData({ entries, config, width, birthDate, sex }) {
  const values = entries
    .map((entry) => {
      const date = getGrowthDate(entry);

      return {
        id: entry.id,
        date,
        value: getMeasurementValue(entry, config.dataKey),
        ageMonths: getAgeInMonths(date, birthDate),
      };
    })
    .filter(
      (item) =>
        item.value !== null &&
        item.ageMonths !== null &&
        item.ageMonths >= 0 &&
        item.ageMonths <= MAX_REFERENCE_MONTHS,
    )
    .sort((first, second) => first.date.getTime() - second.date.getTime());

  const displayEndMonth = getDisplayEndMonth(values);

  const whoCurves = getWhoCurves(sex, config.id).map((curve) => ({
    ...curve,

    points: curve.points.filter((point) => point.month <= displayEndMonth),
  }));

  if (values.length === 0 || whoCurves.length === 0) {
    return {
      points: [],
      polyline: "",
      gridValues: [],
      whoCurves: [],
      displayEndMonth,
      axisMonths: getAxisMonths(displayEndMonth),
    };
  }

  const numericValues = [
    ...values.map((item) => item.value),

    ...whoCurves.flatMap((curve) => curve.points.map((point) => point.value)),
  ];

  const rawMinimum = Math.min(...numericValues);

  const rawMaximum = Math.max(...numericValues);

  const rawRange = rawMaximum - rawMinimum;

  const verticalPadding =
    rawRange > 0 ? rawRange * 0.12 : config.id === "weight" ? 0.5 : 2;

  const minimum = Math.max(0, rawMinimum - verticalPadding);

  const maximum = rawMaximum + verticalPadding;

  const range = Math.max(maximum - minimum, 1);

  const usableWidth = width - CHART_PADDING_LEFT - CHART_PADDING_RIGHT;

  const usableHeight = CHART_HEIGHT - CHART_PADDING_TOP - CHART_PADDING_BOTTOM;

  const getX = (ageMonths) =>
    CHART_PADDING_LEFT + (ageMonths / displayEndMonth) * usableWidth;

  const getY = (value) =>
    CHART_PADDING_TOP + ((maximum - value) / range) * usableHeight;

  const points = values.map((item) => ({
    ...item,
    x: getX(item.ageMonths),
    y: getY(item.value),
  }));

  const positionedWhoCurves = whoCurves.map((curve) => ({
    ...curve,

    polyline: curve.points
      .map((point) => `${getX(point.month)},${getY(point.value)}`)
      .join(" "),

    labelY: getY(curve.points[curve.points.length - 1].value),
  }));

  return {
    points,

    polyline: points.map((point) => `${point.x},${point.y}`).join(" "),

    gridValues: [maximum, minimum + range / 2, minimum],

    whoCurves: positionedWhoCurves,

    displayEndMonth,

    axisMonths: getAxisMonths(displayEndMonth),
  };
}

function MeasurementTabs({ selectedMeasurement, onSelect, t, styles }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.tabs}
    >
      {Object.values(MEASUREMENT_CONFIG).map((option) => {
        const isSelected = selectedMeasurement === option.id;

        return (
          <Pressable
            key={option.id}
            accessibilityRole="tab"
            accessibilityState={{
              selected: isSelected,
            }}
            onPress={() => onSelect(option.id)}
            style={({ pressed }) => [
              styles.tab,
              isSelected && styles.tabSelected,
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={[styles.tabLabel, isSelected && styles.tabLabelSelected]}
            >
              {t(option.title)}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function GrowthChart({
  entries,
  config,
  language,
  width,
  birthDate,
  sex,
  colors,
  styles,
  t,
}) {
  const [selectedPointId, setSelectedPointId] = useState(null);

  const chartData = useMemo(
    () =>
      getChartData({
        entries,
        config,
        width,
        birthDate,
        sex,
      }),
    [birthDate, config, entries, sex, width],
  );

  const selectedPoint =
    chartData.points.find((point) => point.id === selectedPointId) ?? null;

  const usableHeight = CHART_HEIGHT - CHART_PADDING_TOP - CHART_PADDING_BOTTOM;

  const usableWidth = width - CHART_PADDING_LEFT - CHART_PADDING_RIGHT;

  const toggleSelectedPoint = (pointId) => {
    setSelectedPointId((currentId) => (currentId === pointId ? null : pointId));
  };

  if (chartData.points.length === 0) {
    return (
      <View style={styles.emptyChart}>
        <Text style={styles.emptyChartText}>
          {t("Add the birth date to display the WHO growth curve.")}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.chartContainer}>
      <Svg width={width} height={CHART_HEIGHT}>
        {chartData.gridValues.map((gridValue, index) => {
          const y = CHART_PADDING_TOP + (index / 2) * usableHeight;

          return (
            <Fragment key={`grid-${index}`}>
              <Line
                x1={CHART_PADDING_LEFT}
                y1={y}
                x2={width - CHART_PADDING_RIGHT}
                y2={y}
                stroke={colors.border ?? "#DCE5F2"}
                strokeWidth={1}
                strokeDasharray="4 5"
              />

              <SvgText
                x={CHART_PADDING_LEFT - 7}
                y={y + 3}
                textAnchor="end"
                fill={colors.textSecondary}
                fontSize={9}
              >
                {new Intl.NumberFormat(language, {
                  maximumFractionDigits: config.decimals,
                }).format(gridValue)}
              </SvgText>
            </Fragment>
          );
        })}

        {chartData.whoCurves.map((curve) => {
          const isMedian = curve.percentile === 50;

          return (
            <Fragment key={curve.id}>
              <Polyline
                points={curve.polyline}
                fill="none"
                stroke={
                  isMedian ? colors.textSecondary : (colors.border ?? "#DCE5F2")
                }
                strokeWidth={isMedian ? 1.6 : 1}
                strokeOpacity={isMedian ? 0.55 : 0.72}
                strokeLinecap="round"
              />

              <SvgText
                x={width - CHART_PADDING_RIGHT - 2}
                y={curve.labelY - 2}
                textAnchor="end"
                fill={colors.textSecondary}
                fontSize={7.5}
              >
                {`P${curve.percentile}`}
              </SvgText>
            </Fragment>
          );
        })}

        {chartData.points.length > 1 ? (
          <Polyline
            points={chartData.polyline}
            fill="none"
            stroke={colors.primary}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}

        {chartData.points.map((point) => {
          const isSelected = selectedPointId === point.id;

          return (
            <Fragment key={point.id}>
              <Circle
                cx={point.x}
                cy={point.y}
                r={15}
                fill="transparent"
                onPress={() => toggleSelectedPoint(point.id)}
              />

              <Circle
                cx={point.x}
                cy={point.y}
                r={isSelected ? 7 : 5}
                fill={isSelected ? colors.primary : colors.white}
                stroke={colors.primary}
                strokeWidth={3}
                onPress={() => toggleSelectedPoint(point.id)}
              />
            </Fragment>
          );
        })}

        {chartData.axisMonths.map((month) => {
          const x =
            CHART_PADDING_LEFT +
            (month / chartData.displayEndMonth) * usableWidth;

          return (
            <SvgText
              key={`month-${month}`}
              x={x}
              y={CHART_HEIGHT - 10}
              textAnchor={
                month === 0
                  ? "start"
                  : month === chartData.displayEndMonth
                    ? "end"
                    : "middle"
              }
              fill={colors.textSecondary}
              fontSize={8}
            >
              {month}
            </SvgText>
          );
        })}

        {selectedPoint ? (
          <Fragment>
            <Line
              x1={selectedPoint.x}
              y1={CHART_PADDING_TOP}
              x2={selectedPoint.x}
              y2={CHART_HEIGHT - CHART_PADDING_BOTTOM}
              stroke={colors.primary}
              strokeWidth={1}
              strokeOpacity={0.25}
            />

            <Rect
              x={Math.max(8, Math.min(selectedPoint.x - 48, width - 104))}
              y={Math.max(8, selectedPoint.y - 50)}
              width={96}
              height={35}
              rx={10}
              fill={colors.textPrimary}
            />

            <SvgText
              x={Math.max(16, Math.min(selectedPoint.x - 40, width - 96))}
              y={Math.max(22, selectedPoint.y - 36)}
              fill={colors.white}
              fontSize={10}
              fontWeight="700"
            >
              {formatValue(selectedPoint.value, config, language)}
            </SvgText>

            <SvgText
              x={Math.max(16, Math.min(selectedPoint.x - 40, width - 96))}
              y={Math.max(34, selectedPoint.y - 24)}
              fill={colors.white}
              fillOpacity={0.76}
              fontSize={8}
            >
              {formatShortDate(selectedPoint.date, language)}
            </SvgText>
          </Fragment>
        ) : null}
      </Svg>

      <Text style={styles.chartAxisCaption}>{t("Age in months")}</Text>
    </View>
  );
}

function GrowthHistoryCard({
  entry,
  language,
  onPress,
  t,
  colors,
  styles,
  selectedMeasurement,
}) {
  const activeConfig = MEASUREMENT_CONFIG[selectedMeasurement];

  const activeValue = getMeasurementValue(entry, activeConfig.dataKey);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={t("Opens this entry for editing")}
      onPress={() => onPress?.(entry)}
      style={({ pressed }) => [styles.historyCard, pressed && styles.pressed]}
    >
      <View
        style={[
          styles.historyImageContainer,
          {
            backgroundColor: activeConfig.backgroundColor,
          },
        ]}
      >
        <Image
          source={activeConfig.image}
          resizeMode="contain"
          style={styles.historyImage}
        />
      </View>

      <View style={styles.historyContent}>
        <Text style={styles.historyDate}>
          {formatLongDate(getGrowthDate(entry), language)}
        </Text>

        <Text style={styles.historyPrimaryValue}>
          {formatValue(activeValue, activeConfig, language)}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={19} color={colors.textSecondary} />
    </Pressable>
  );
}

export default function GrowthHistoryScreen({
  navigation,
  route,
  onEditTrackingEntry,
  child,
}) {
  const { t, i18n } = useTranslation();

  const colors = useThemeColors();

  const { width: screenWidth } = useWindowDimensions();

  const styles = useMemo(() => createStyles(colors), [colors]);

  /*
   * L'appelant (carte « Dernières mesures » du profil enfant) peut demander
   * l'onglet à ouvrir ; on retombe sur le poids si la mesure est inconnue.
   */
  const requestedMeasurement = route?.params?.measurement;

  const [selectedMeasurement, setSelectedMeasurement] = useState(() =>
    MEASUREMENT_CONFIG[requestedMeasurement] ? requestedMeasurement : "weight",
  );

  /*
   * L'écran reste monté dans la pile : sans cette synchronisation, un second
   * passage depuis une autre mesure rouvrirait l'onglet précédent.
   */
  useEffect(() => {
    if (MEASUREMENT_CONFIG[requestedMeasurement]) {
      setSelectedMeasurement(requestedMeasurement);
    }
  }, [requestedMeasurement]);

  const measurementConfig = MEASUREMENT_CONFIG[selectedMeasurement];

  const childBirthDate = child?.birthDate ?? MOCK_BIRTH_DATE;

  /*
   * Adapte cette ligne si tes données utilisent
   * "boy"/"girl" au lieu de "male"/"female".
   */
  const childSex = child?.sex === "male" ? "male" : "female";

  const entries = useMemo(
    () =>
      [...mockGrowthHistoryEntries].sort(
        (first, second) =>
          getGrowthDate(second).getTime() - getGrowthDate(first).getTime(),
      ),
    [],
  );

  const selectedEntries = useMemo(
    () =>
      entries.filter(
        (entry) =>
          getMeasurementValue(entry, measurementConfig.dataKey) !== null,
      ),
    [entries, measurementConfig.dataKey],
  );

  const latestEntry = selectedEntries[0] ?? null;

  const previousEntry = selectedEntries[1] ?? null;

  const latestValue = latestEntry
    ? getMeasurementValue(latestEntry, measurementConfig.dataKey)
    : null;

  const previousValue = previousEntry
    ? getMeasurementValue(previousEntry, measurementConfig.dataKey)
    : null;

  const difference =
    latestValue !== null && previousValue !== null
      ? latestValue - previousValue
      : null;

  const latestAgeMonths = latestEntry
    ? getAgeInMonths(getGrowthDate(latestEntry), childBirthDate)
    : null;

  const latestPercentile = getWhoPercentileEstimate(
    childSex,
    selectedMeasurement,
    latestAgeMonths,
    latestValue,
  );

  const chartWidth = Math.max(screenWidth - 66, 260);

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
          <Text style={styles.title}>{t("Growth")}</Text>

          <Text style={styles.subtitle}>
            {t("Measurements, progress and history")}
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <MeasurementTabs
          selectedMeasurement={selectedMeasurement}
          onSelect={setSelectedMeasurement}
          t={t}
          styles={styles}
        />

        <View style={styles.latestCard}>
          <View style={styles.latestContent}>
            <Text style={styles.latestLabel}>{t("Latest measurement")}</Text>

            <Text style={styles.latestValue}>
              {formatValue(latestValue, measurementConfig, i18n.language)}
            </Text>

            {latestEntry ? (
              <Text style={styles.latestDate}>
                {formatLongDate(getGrowthDate(latestEntry), i18n.language)}
              </Text>
            ) : null}

            {difference !== null ? (
              <View style={styles.badgesRow}>
                <View style={styles.progressBadge}>
                  <Ionicons
                    name={difference >= 0 ? "trending-up" : "trending-down"}
                    size={14}
                    color={colors.primary}
                  />

                  <Text style={styles.progressText}>
                    {formatDifference(
                      difference,
                      measurementConfig,
                      i18n.language,
                    )}{" "}
                    {t("since last measurement")}
                  </Text>
                </View>

                {latestPercentile ? (
                  <View style={styles.percentileBadge}>
                    <Text style={styles.percentileText}>
                      {t("WHO percentile {{percentile}}", {
                        percentile: latestPercentile,
                      })}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>

          <View
            style={[
              styles.latestImageContainer,
              {
                backgroundColor: measurementConfig.backgroundColor,
              },
            ]}
          >
            <Image
              source={measurementConfig.image}
              resizeMode="contain"
              style={styles.latestImage}
            />
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>{t("Growth curve")}</Text>

            <Text style={styles.referenceLabel}>
              {t("WHO reference • {{sex}}", {
                sex: t(childSex === "male" ? "Boys" : "Girls"),
              })}
            </Text>
          </View>

          <Text style={styles.sectionMetadata}>
            {selectedEntries.length === 1
              ? t("1 measurement")
              : t("{{count}} measurements", {
                  count: selectedEntries.length,
                })}
          </Text>
        </View>

        <View style={styles.chartCard}>
          <GrowthChart
            /*
             * Force la fermeture de l’infobulle
             * lorsque l’utilisateur change d’onglet.
             */
            key={selectedMeasurement}
            entries={selectedEntries}
            config={measurementConfig}
            language={i18n.language}
            width={chartWidth}
            birthDate={childBirthDate}
            sex={childSex}
            colors={colors}
            styles={styles}
            t={t}
          />
        </View>

        <View style={styles.referenceNote}>
          <Ionicons
            name="information-circle-outline"
            size={14}
            color={colors.textSecondary}
          />

          <Text style={styles.referenceNoteText}>
            {t(
              "Growth curves are a reference and do not replace medical advice.",
            )}
          </Text>
        </View>

        <Text style={styles.historyTitle}>{t("Measurement history")}</Text>

        {selectedEntries.map((entry) => (
          <GrowthHistoryCard
            key={entry.id}
            entry={entry}
            language={i18n.language}
            onPress={onEditTrackingEntry}
            t={t}
            colors={colors}
            styles={styles}
            selectedMeasurement={selectedMeasurement}
          />
        ))}
      </ScrollView>
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

    tabs: {
      gap: 8,

      paddingRight: 20,
    },

    tab: {
      minHeight: 42,

      justifyContent: "center",

      paddingHorizontal: 15,

      borderWidth: 1,
      borderColor: colors.border ?? "#DCE5F2",
      borderRadius: 14,

      backgroundColor: colors.white,
    },

    tabSelected: {
      borderColor: colors.primary,

      backgroundColor: colors.selectedBackground ?? colors.lightBlue,
    },

    tabLabel: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 11,

      color: colors.textSecondary,
    },

    tabLabelSelected: {
      color: colors.primary,
    },

    latestCard: {
      minHeight: 138,

      flexDirection: "row",
      alignItems: "center",

      marginTop: 14,
      padding: 17,

      borderRadius: 22,

      backgroundColor: colors.white,
    },

    latestContent: {
      flex: 1,
      minWidth: 0,
    },

    latestLabel: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 11,

      color: colors.textSecondary,
    },

    latestValue: {
      marginTop: 4,

      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 25,

      color: colors.textPrimary,
    },

    latestDate: {
      marginTop: 3,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 10,

      color: colors.textSecondary,
    },

    badgesRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",

      gap: 6,

      marginTop: 9,
    },

    progressBadge: {
      alignSelf: "flex-start",

      flexDirection: "row",
      alignItems: "center",

      gap: 5,

      paddingHorizontal: 9,
      paddingVertical: 5,

      borderRadius: 999,

      backgroundColor: colors.lightBlue ?? "#EDF3FF",
    },

    progressText: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 9,

      color: colors.primary,
    },

    percentileBadge: {
      paddingHorizontal: 9,
      paddingVertical: 5,

      borderRadius: 999,

      backgroundColor: colors.selectedBackground ?? colors.lightBlue,
    },

    percentileText: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 9,

      color: colors.primary,
    },

    latestImageContainer: {
      width: 78,
      height: 78,

      alignItems: "center",
      justifyContent: "center",

      marginLeft: 12,

      borderRadius: 22,

      backgroundColor: TRACKING_TYPE_CONFIG.growth.backgroundColor,
    },

    latestImage: {
      width: 68,
      height: 68,
    },

    historyImage: {
      width: 42,
      height: 42,
    },

    sectionHeader: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",

      gap: 12,

      marginTop: 26,
      marginBottom: 11,
    },

    sectionHeading: {
      flex: 1,
      minWidth: 0,
    },

    sectionTitle: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 16,

      color: colors.textPrimary,
    },

    referenceLabel: {
      marginTop: 2,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 9,

      color: colors.textSecondary,
    },

    sectionMetadata: {
      flexShrink: 0,

      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 10,

      color: colors.textSecondary,
    },

    chartCard: {
      overflow: "hidden",

      alignItems: "center",

      paddingTop: 6,

      borderRadius: 22,

      backgroundColor: colors.white,
    },

    chartContainer: {
      alignItems: "center",
    },

    chartAxisCaption: {
      marginTop: -12,
      marginBottom: 12,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 8,

      color: colors.textSecondary,
    },

    emptyChart: {
      width: "100%",
      height: CHART_HEIGHT,

      alignItems: "center",
      justifyContent: "center",

      paddingHorizontal: 24,
    },

    emptyChartText: {
      textAlign: "center",

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 12,
      lineHeight: 18,

      color: colors.textSecondary,
    },

    referenceNote: {
      flexDirection: "row",
      alignItems: "flex-start",

      gap: 5,

      marginTop: 8,
      paddingHorizontal: 2,
    },

    referenceNoteText: {
      flex: 1,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 8,
      lineHeight: 12,

      color: colors.textSecondary,
    },

    historyTitle: {
      marginTop: 24,
      marginBottom: 10,

      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 16,

      color: colors.textPrimary,
    },

    historyCard: {
      minHeight: 72,

      flexDirection: "row",
      alignItems: "center",

      marginBottom: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,

      borderRadius: 17,

      backgroundColor: colors.white,
    },

    historyImageContainer: {
      width: 44,
      height: 44,

      alignItems: "center",
      justifyContent: "center",

      borderRadius: 14,
    },

    historyContent: {
      flex: 1,
      minWidth: 0,

      marginLeft: 11,
      marginRight: 8,
    },

    historyDate: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 11,

      color: colors.textPrimary,
    },

    historyPrimaryValue: {
      marginTop: 2,

      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 14,

      color: colors.primary,
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
