import { useEffect, useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import DateTimeRow from "../DateTimeRow.js";
import { useThemeColors } from "../../../theme/useThemeColors.js";

// À remplacer plus tard par tes illustrations dédiées.
const LEFT_BREAST_IMAGE = require("../../../assets/illustrations/tracking/leftBreast.png");
const RIGHT_BREAST_IMAGE = require("../../../assets/illustrations/tracking/rightBreast.png");

const SIDES = {
  left: "left",
  right: "right",
};

function formatDuration(totalSeconds = 0) {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0",
  )}`;
}

export function getCurrentBreastfeedingDurations(value) {
  const leftDurationSeconds = value?.leftDurationSeconds ?? 0;
  const rightDurationSeconds = value?.rightDurationSeconds ?? 0;

  if (!value?.activeSide || !value?.activeStartedAt) {
    return {
      leftDurationSeconds,
      rightDurationSeconds,
    };
  }

  const elapsedSeconds = Math.max(
    0,
    Math.floor((Date.now() - value.activeStartedAt) / 1000),
  );

  if (value.activeSide === SIDES.left) {
    return {
      leftDurationSeconds: leftDurationSeconds + elapsedSeconds,
      rightDurationSeconds,
    };
  }

  return {
    leftDurationSeconds,
    rightDurationSeconds: rightDurationSeconds + elapsedSeconds,
  };
}

export default function BreastfeedingForm({
  value,
  onChange,
  onPressNote,
  onPressAddManually,
}) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Cette valeur force le rafraîchissement visuel du chrono chaque seconde.
  const [, setCurrentTime] = useState(Date.now());

  const activeSide = value?.activeSide ?? null;
  const activeStartedAt = value?.activeStartedAt ?? null;
  const durations = getCurrentBreastfeedingDurations(value);

  const hasDuration =
    durations.leftDurationSeconds > 0 || durations.rightDurationSeconds > 0;

  useEffect(() => {
    if (!activeSide || !activeStartedAt) {
      return undefined;
    }

    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSide, activeStartedAt]);

  const updateValue = (nextValue) => {
    onChange?.({
      ...value,
      ...nextValue,
    });
  };

  const stopTimer = () => {
    const currentDurations = getCurrentBreastfeedingDurations(value);

    updateValue({
      ...currentDurations,
      activeSide: null,
      activeStartedAt: null,
    });
  };

  const startTimer = (side) => {
    const currentDurations = getCurrentBreastfeedingDurations(value);

    updateValue({
      ...currentDurations,
      activeSide: side,
      activeStartedAt: Date.now(),
    });
  };

  const handleSidePress = (side) => {
    if (activeSide === side) {
      stopTimer();
      return;
    }

    startTimer(side);
  };

  const handleReset = () => {
    updateValue({
      leftDurationSeconds: 0,
      rightDurationSeconds: 0,
      activeSide: null,
      activeStartedAt: null,
    });
  };

  const handleSideReset = (side) => {
    const currentDurations = getCurrentBreastfeedingDurations(value);
    const isResettingActiveSide = activeSide === side;

    updateValue({
      ...currentDurations,
      [side === SIDES.left ? "leftDurationSeconds" : "rightDurationSeconds"]: 0,
      activeSide: isResettingActiveSide ? null : activeSide,
      activeStartedAt: isResettingActiveSide
        ? null
        : activeSide
          ? Date.now()
          : null,
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Pressable
          disabled={!hasDuration}
          onPress={handleReset}
          style={({ pressed }) => [
            styles.resetActionButton,
            !hasDuration && styles.resetActionButtonDisabled,
            pressed && hasDuration && styles.pressed,
          ]}
        >
          <Ionicons
            name="refresh-outline"
            size={15}
            color={hasDuration ? colors.textSecondary : colors.border}
          />
          <Text
            style={[
              styles.resetActionLabel,
              !hasDuration && styles.resetActionLabelDisabled,
            ]}
          >
            {t("Reset")}
          </Text>
        </Pressable>

        <Pressable
          onPress={onPressNote}
          style={({ pressed }) => [
            styles.noteActionButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.noteActionLabel}>
            {value?.note?.trim() ? t("Edit note") : t("Add a note")}
          </Text>

          {value?.note?.trim() ? <View style={styles.noteIndicator} /> : null}
        </Pressable>
      </View>

      <Text style={styles.helperText}>
        {t("Tap a side to start or pause the timer")}
      </Text>

      <View style={styles.sidesRow}>
        <BreastSideCard
          title={t("Left")}
          image={LEFT_BREAST_IMAGE}
          duration={durations.leftDurationSeconds}
          isActive={activeSide === SIDES.left}
          onPress={() => handleSidePress(SIDES.left)}
          onReset={() => handleSideReset(SIDES.left)}
          colors={colors}
          styles={styles}
        />

        <BreastSideCard
          title={t("Right")}
          image={RIGHT_BREAST_IMAGE}
          duration={durations.rightDurationSeconds}
          isActive={activeSide === SIDES.right}
          onPress={() => handleSidePress(SIDES.right)}
          onReset={() => handleSideReset(SIDES.right)}
          colors={colors}
          styles={styles}
        />
      </View>

      <View style={styles.dateTimeSection}>
        <DateTimeRow
          value={value?.feedingDate ?? new Date()}
          isNow={!value?.isDateEdited}
          onChange={(feedingDate) =>
            updateValue({
              feedingDate,
              isDateEdited: true,
            })
          }
        />
      </View>

      <Pressable
        onPress={onPressAddManually}
        style={({ pressed }) => [
          styles.manualAction,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.manualActionLabel}>{t("Add manually")}</Text>
      </Pressable>
    </View>
  );
}

function BreastSideCard({
  title,
  image,
  duration,
  isActive,
  onPress,
  onReset,
  colors,
  styles,
}) {
  const hasDuration = duration > 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.sideCard,
        isActive && styles.sideCardActive,
        pressed && styles.pressed,
      ]}
    >
      <Pressable
        disabled={!hasDuration}
        hitSlop={8}
        onPress={(event) => {
          event.stopPropagation();
          onReset?.();
        }}
        style={({ pressed }) => [
          styles.sideResetButton,
          !hasDuration && styles.sideResetButtonDisabled,
          pressed && hasDuration && styles.pressed,
        ]}
      >
        <Ionicons
          name="refresh-outline"
          size={14}
          color={hasDuration ? colors.primary : colors.border}
        />
      </Pressable>

      <Image source={image} resizeMode="contain" style={styles.illustration} />

      <Text style={styles.sideTitle}>{title}</Text>

      <Text style={styles.duration}>{formatDuration(duration)}</Text>

      <View style={[styles.playIcon, isActive && styles.playIconActive]}>
        <Ionicons
          name={isActive ? "pause" : "play"}
          size={17}
          color={colors.primary}
        />
      </View>
    </Pressable>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      // Le conteneur de scroll est en flexGrow, donc ce flex prend toute la
      // hauteur visible : c'est ce qui permet au `marginTop: "auto"` de
      // « Add manually » de le coller en bas.
      flex: 1,
      paddingTop: 4,
    },
    topRow: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 16,
    },
    resetActionButton: {
      alignItems: "center",
      flexDirection: "row",
      gap: 5,
      minHeight: 32,
      paddingHorizontal: 4,
    },
    resetActionButtonDisabled: {
      opacity: 0.55,
    },
    resetActionLabel: {
      color: colors.textSecondary,
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 12,
    },
    resetActionLabelDisabled: {
      color: colors.border,
    },
    noteActionButton: {
      alignItems: "center",
      backgroundColor: colors.white,
      borderColor: colors.border,
      borderRadius: 10,
      borderWidth: 1,
      justifyContent: "center",
      minHeight: 32,
      paddingHorizontal: 10,
      position: "relative",
    },
    noteActionLabel: {
      color: colors.textPrimary,
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 12,
    },
    noteIndicator: {
      backgroundColor: colors.primary,
      borderRadius: 999,
      height: 8,
      position: "absolute",
      right: -3,
      top: -3,
      width: 8,
    },
    helperText: {
      color: colors.textSecondary,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 12,
      lineHeight: 18,
      marginBottom: 16,
      textAlign: "center",
    },
    sidesRow: {
      flexDirection: "row",
      gap: 12,
    },
    sideCard: {
      alignItems: "center",
      backgroundColor: colors.lightBlue,
      borderColor: colors.border,
      borderRadius: 24,
      borderWidth: 1,
      flex: 1,
      paddingBottom: 16,
      paddingHorizontal: 12,
      paddingTop: 18,
      position: "relative",
    },

    sideResetButton: {
      alignItems: "center",
      backgroundColor: colors.white,
      borderColor: colors.border,
      borderRadius: 999,
      borderWidth: 1,
      height: 26,
      justifyContent: "center",
      position: "absolute",
      right: 9,
      top: 9,
      width: 26,
    },

    sideResetButtonDisabled: {
      backgroundColor: colors.lightBlue,
      opacity: 0.65,
    },

    playIcon: {
      alignItems: "center",
      backgroundColor: `${colors.primary}12`,
      borderRadius: 999,
      height: 38,
      justifyContent: "center",
      width: 38,
    },

    playIconActive: {
      backgroundColor: `${colors.primary}20`,
    },
    sideCardActive: {
      backgroundColor: `${colors.primary}0A`,
      borderColor: `${colors.primary}75`,
    },
    illustration: {
      height: 64,
      marginBottom: 9,
      width: 64,
    },
    sideTitle: {
      color: colors.primary,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 20,
    },
    duration: {
      color: colors.textPrimary,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 27,
      letterSpacing: -0.9,
      marginBottom: 14,
      marginTop: 6,
    },
    timerAction: {
      alignItems: "center",
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: 999,
      borderWidth: 20,
      flexDirection: "row",
      gap: 6,
      justifyContent: "center",
      minHeight: 32,
      paddingHorizontal: 12,
    },
    timerActionActive: {
      backgroundColor: `${colors.primary}10`,
      borderColor: `${colors.primary}`,
    },
    timerActionLabel: {
      color: colors.textSecondary,
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 11,
    },
    timerActionLabelActive: {
      color: colors.primary,
    },
    dateTimeSection: {
      marginTop: 20,
    },
    manualAction: {
      alignItems: "center",
      alignSelf: "center",
      flexDirection: "row",
      gap: 6,
      marginTop: "auto",
      paddingHorizontal: 8,
      paddingTop: 18,
      paddingBottom: 0,
    },

    manualActionLabel: {
      color: colors.primary,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 16,
    },
    pressed: {
      opacity: 0.72,
    },
  });
