import { useMemo } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { TRACKING_TYPE_CONFIG } from "../../../data/mockTrackingData";
import { useThemeColors } from "../../../theme/useThemeColors.js";

const MOOD_LABELS = {
  happy: "Happy",
  calm: "Calm",
  fussy: "Fussy",
  crying: "Crying",
  unwell: "Unwell",
};

const CONTENT_LABELS = {
  dry: "Dry",
  wet: "Wet",
  dirty: "Dirty",
  wetAndDirty: "Wet and dirty",
  pee: "Pee",
  poop: "Poop",
  peeAndPoop: "Pee and poop",
};

const SYMPTOM_LABELS = {
  irritability: "Irritability",
  skinRash: "Skin rash",
  runnyNose: "Runny nose",
  cough: "Cough",
  fever: "Fever",
  unusualBreathing: "Unusual breathing",
  lowEnergy: "Low energy",
  lackOfAppetite: "Lack of appetite",
  regurgitation: "Regurgitation",
  vomiting: "Vomiting",
  diarrhea: "Diarrhea",
  constipation: "Constipation",
};

const MEDICATION_UNIT_LABELS = {
  ml: "ml",
  drops: "drops",
  tablet: "tablet(s)",
  suppository: "suppository/suppositories",
  dose: "dose(s)",
};

function isNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function getDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isFinite(date.getTime()) ? date : null;
}

function formatTime(value, language) {
  const date = getDate(value);

  if (!date) {
    return "";
  }

  return new Intl.DateTimeFormat(language, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function isSameLocalDay(first, second) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function getTimeLabel(entry, language) {
  if (entry.type === "growth" || entry.type === "teething") {
    return "—";
  }

  const start = getDate(entry.startedAt);

  if (!start) {
    return "";
  }

  const startTime = formatTime(entry.startedAt, language);
  const end = getDate(entry.endedAt);

  if (!end) {
    return startTime;
  }

  if (isSameLocalDay(start, end)) {
    return `${startTime}–${formatTime(entry.endedAt, language)}`;
  }

  // Les dates évitent qu'une nuit passant minuit semble
  // se terminer avant son début.
  const formatter = new Intl.DateTimeFormat(language, {
    day: "numeric",
    month: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return `${formatter.format(start)}\n– ${formatter.format(end)}`;
}

function formatDuration(seconds, t) {
  if (!isNumber(seconds) || seconds < 0) {
    return "";
  }

  if (seconds < 60) {
    return t("Less than a minute");
  }

  const totalMinutes = Math.floor(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return hours > 0
    ? t("{{hours}} h {{minutes}} min", { hours, minutes })
    : t("{{minutes}} min", { minutes });
}

function getDisplayValue(entry, { units, language, t }) {
  const number = (value, maximumFractionDigits = 1) =>
    new Intl.NumberFormat(language, {
      maximumFractionDigits,
    }).format(value);

  const volume = (value) => {
    if (!isNumber(value)) {
      return "";
    }

    return units.volume === "fl_oz"
      ? `${number(value / 29.5735295625, 2)} fl oz`
      : `${number(value, 2)} ml`;
  };

  const length = (value) => {
    if (!isNumber(value)) {
      return "";
    }

    return units.length === "in"
      ? `${number(value / 2.54, 2)} in`
      : `${number(value)} cm`;
  };

  switch (entry.type) {
    case "bottle":
      return volume(entry.amountMl);

    case "pumping": {
      const total = isNumber(entry.totalAmountMl)
        ? entry.totalAmountMl
        : isNumber(entry.leftAmountMl) && isNumber(entry.rightAmountMl)
          ? entry.leftAmountMl + entry.rightAmountMl
          : null;

      return volume(total);
    }

    case "breastfeeding": {
      const left = entry.leftDurationSeconds ?? 0;
      const right = entry.rightDurationSeconds ?? 0;

      return isNumber(left) && isNumber(right)
        ? formatDuration(left + right, t)
        : "";
    }

    case "sleep": {
      if (!entry.endedAt) {
        return t("Sleep in progress");
      }

      const start = getDate(entry.startedAt);
      const end = getDate(entry.endedAt);

      return start && end
        ? formatDuration((end.getTime() - start.getTime()) / 1000, t)
        : "";
    }

    case "diaper":
    case "potty": {
      const label = CONTENT_LABELS[entry.content];

      return [label ? t(label) : "", entry.isAccident ? t("Accident") : ""]
        .filter(Boolean)
        .join(" · ");
    }

    case "mood":
      return MOOD_LABELS[entry.mood] ? t(MOOD_LABELS[entry.mood]) : "";

    case "temperature": {
      if (!isNumber(entry.temperatureCelsius)) {
        return "";
      }

      return units.temperature === "fahrenheit"
        ? `${number(entry.temperatureCelsius * 1.8 + 32)} °F`
        : `${number(entry.temperatureCelsius)} °C`;
    }

    case "growth": {
      const values = [];

      if (isNumber(entry.weightKg)) {
        values.push(
          units.weight === "lb"
            ? `${number(entry.weightKg / 0.45359237, 2)} lb`
            : `${number(entry.weightKg, 2)} kg`,
        );
      }

      if (isNumber(entry.heightCm)) {
        values.push(length(entry.heightCm));
      }

      if (isNumber(entry.headCircumferenceCm)) {
        values.push(
          t("Head circumference: {{value}}", {
            value: length(entry.headCircumferenceCm),
          }),
        );
      }

      return values.join(" · ");
    }

    case "medication": {
      const unitLabel = MEDICATION_UNIT_LABELS[entry.unit];

      // Conserver ici l'unité de la dose enregistrée.
      const amount =
        isNumber(entry.amount) && unitLabel
          ? `${number(entry.amount, 3)} ${t(unitLabel)}`
          : "";

      return [entry.medicationName, amount].filter(Boolean).join(" · ");
    }

    case "vaccine": {
      const dose =
        entry.dose === "booster"
          ? t("Booster")
          : isNumber(entry.dose)
            ? t("Dose {{number}}", { number: entry.dose })
            : "";

      return [entry.vaccineName, dose].filter(Boolean).join(" · ");
    }

    case "symptoms":
      return (entry.symptoms ?? [])
        .map((code) =>
          SYMPTOM_LABELS[code] ? t(SYMPTOM_LABELS[code]) : t("Symptom"),
        )
        .join(" · ");

    case "teething":
      return t("Teeth recorded: {{number}}", {
        number: new Set(entry.toothCodes ?? []).size,
      });

    case "solids":
      return (entry.foods ?? [])
        .map((food) =>
          food.translationKey
            ? t(food.translationKey)
            : food.nameSnapshot || food.name || t("Food"),
        )
        .join(" · ");

    case "note": {
      const text =
        typeof entry.note === "string"
          ? entry.note.replace(/\s+/g, " ").trim()
          : "";

      return (
        text ||
        (entry.photos?.length
          ? t("Photos attached: {{number}}", {
              number: entry.photos.length,
            })
          : "")
      );
    }

    default:
      return "";
  }
}

export default function TrackingTimelineItem({
  entry,
  isFirst = false,
  isLast = false,
  onPress,
}) {
  const { t, i18n } = useTranslation();
  const units = useSelector((state) => state.measurementUnits);

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const visual = TRACKING_TYPE_CONFIG[entry.type] ?? TRACKING_TYPE_CONFIG.note;

  const title = TRACKING_TYPE_CONFIG[entry.type]
    ? t(visual.titleKey)
    : t("Tracking entry");

  const timeLabel = getTimeLabel(entry, i18n.language);

  const displayValue = getDisplayValue(entry, {
    units,
    language: i18n.language,
    t,
  });

  const canOpen = typeof onPress === "function";

  const accessibilityLabel = [
    timeLabel === "—" ? "" : timeLabel,
    title,
    displayValue,
  ]
    .filter(Boolean)
    .join(", ");

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
        accessibilityRole={canOpen ? "button" : undefined}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={canOpen ? t("Opens this entry") : undefined}
        disabled={!canOpen}
        onPress={() => onPress?.(entry)}
        style={({ pressed }) => [
          styles.card,
          pressed && canOpen && styles.cardPressed,
        ]}
      >
        <View
          style={[
            styles.imageContainer,
            { backgroundColor: visual.backgroundColor },
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
            <Text numberOfLines={2} style={styles.value}>
              {displayValue}
            </Text>
          ) : null}
        </View>

        {canOpen ? (
          <Ionicons
            name="chevron-forward"
            size={21}
            color={colors.textSecondary}
          />
        ) : null}
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
