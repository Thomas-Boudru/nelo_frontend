import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { BottomSheetBackdrop, BottomSheetModal } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import PrimaryButton from "../../../components/ui/PrimaryButton.js";
import { useThemeColors } from "../../../theme/useThemeColors.js";

const awakeIllustration = require("../../../assets/illustrations/tracking/sleep/wake.png");

const sleepingIllustration = require("../../../assets/illustrations/tracking/sleep/sleep.png");

const SleepEntrySheet = forwardRef(function SleepEntrySheet(
  { childName, lastSleep = null, onStartSleep, onWakeUp },
  ref,
) {
  const { t } = useTranslation();

  const modalRef = useRef(null);

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const snapPoints = useMemo(() => ["92%"], []);

  const [sleepType, setSleepType] = useState("nap");
  const [activeSleep, setActiveSleep] = useState(null);
  const [currentTime, setCurrentTime] = useState(Date.now());

  /*
   * Le chronomètre ne stocke pas chaque seconde.
   * Il recalcule la durée depuis startedAt.
   */
  useEffect(() => {
    if (!activeSleep?.startedAt) {
      return undefined;
    }

    setCurrentTime(Date.now());

    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [activeSleep?.startedAt]);

  useImperativeHandle(ref, () => ({
    present(currentActiveSleep = null) {
      if (currentActiveSleep?.startedAt) {
        setActiveSleep({
          ...currentActiveSleep,
          startedAt: new Date(currentActiveSleep.startedAt),
        });

        setSleepType(currentActiveSleep.type ?? "nap");
        setCurrentTime(Date.now());
      }

      modalRef.current?.present();
    },

    dismiss() {
      modalRef.current?.dismiss();
    },

    setActiveSleep(currentActiveSleep) {
      if (!currentActiveSleep?.startedAt) {
        setActiveSleep(null);
        setCurrentTime(Date.now());
        return;
      }

      setActiveSleep({
        ...currentActiveSleep,
        startedAt: new Date(currentActiveSleep.startedAt),
      });

      setSleepType(currentActiveSleep.type ?? "nap");
      setCurrentTime(Date.now());
    },
  }));

  const renderBackdrop = useCallback(
    (props) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
        opacity={0.42}
      />
    ),
    [],
  );

  const handleStartSleep = () => {
    const sleep = {
      type: sleepType,
      startedAt: new Date(),
      note: "",
    };

    setActiveSleep(sleep);
    setCurrentTime(Date.now());

    onStartSleep?.(sleep);
  };

  const handleWakeUp = () => {
    if (!activeSleep?.startedAt) {
      return;
    }

    const endedAt = new Date();
    const startedAt = new Date(activeSleep.startedAt);

    const completedSleep = {
      ...activeSleep,
      startedAt,
      endedAt,
      durationSeconds: Math.max(
        0,
        Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000),
      ),
    };

    onWakeUp?.(completedSleep);

    setActiveSleep(null);
    setCurrentTime(Date.now());

    modalRef.current?.dismiss();
  };

  const durationSeconds = activeSleep?.startedAt
    ? Math.max(
        0,
        Math.floor(
          (currentTime - new Date(activeSleep.startedAt).getTime()) / 1000,
        ),
      )
    : 0;

  return (
    <BottomSheetModal
      ref={modalRef}
      index={0}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      enablePanDownToClose
      enableHandlePanningGesture
      enableContentPanningGesture
      enableOverDrag
      overDragResistanceFactor={1.8}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBackground}
      handleStyle={styles.handleContainer}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{t("Track sleep")}</Text>

          <Text style={styles.subtitle}>
            {activeSleep
              ? t("Sleep tracking is currently running")
              : t("Record a nap or a night sleep")}
          </Text>
        </View>

        <View style={styles.stateContainer}>
          {activeSleep ? (
            <SleepActiveState
              childName={childName}
              activeSleep={activeSleep}
              durationSeconds={durationSeconds}
              onWakeUp={handleWakeUp}
              styles={styles}
              t={t}
            />
          ) : (
            <SleepIdleState
              childName={childName}
              sleepType={sleepType}
              lastSleep={lastSleep}
              onChangeSleepType={setSleepType}
              onStartSleep={handleStartSleep}
              colors={colors}
              styles={styles}
              t={t}
            />
          )}
        </View>
      </View>
    </BottomSheetModal>
  );
});

export default SleepEntrySheet;

function SleepIdleState({
  childName,
  sleepType,
  lastSleep,
  onChangeSleepType,
  onStartSleep,
  colors,
  styles,
  t,
}) {
  return (
    <View style={styles.stateContent}>
      <View style={styles.awakeIllustrationContainer}>
        <Image
          source={awakeIllustration}
          resizeMode="contain"
          style={styles.awakeIllustration}
        />
      </View>

      <View style={styles.stateTextContainer}>
        <Text style={styles.stateTitle}>
          {childName ? t("child is awake", { childName }) : t("Baby is awake")}
        </Text>

        <Text style={styles.stateDescription}>
          {t("Choose the type of sleep before starting the timer")}
        </Text>
      </View>

      <SleepTypeToggle
        value={sleepType}
        onChange={onChangeSleepType}
        colors={colors}
        styles={styles}
        t={t}
      />

      {lastSleep ? (
        <LastSleepCard sleep={lastSleep} styles={styles} t={t} />
      ) : null}

      <View style={styles.idleActions}>
        <PrimaryButton
          variant="wake"
          title={
            sleepType === "night" ? t("Start night sleep") : t("Start nap")
          }
          onPress={onStartSleep}
        />
      </View>
    </View>
  );
}

function SleepActiveState({
  childName,
  activeSleep,
  durationSeconds,
  onWakeUp,
  styles,
  t,
}) {
  const isNight = activeSleep.type === "night";

  return (
    <View style={styles.stateContent}>
      <View style={styles.sleepingIllustrationContainer}>
        <Image
          source={sleepingIllustration}
          resizeMode="contain"
          style={styles.sleepingIllustration}
        />
      </View>

      <View style={styles.progressBadge}>
        <View style={styles.progressDot} />

        <Text style={styles.progressBadgeText}>
          {isNight ? t("Night sleep in progress") : t("Nap in progress")}
        </Text>
      </View>

      <View style={styles.activeStateTextContainer}>
        <Text style={styles.stateTitle}>
          {childName
            ? t("child is sleeping", { childName })
            : t("Baby is sleeping")}
        </Text>

        <Text style={styles.startedAtText}>
          {t("Started at time", {
            time: formatTime(activeSleep.startedAt),
          })}
        </Text>
      </View>

      <View style={styles.timerCard}>
        <Text style={styles.timerValue}>{formatDuration(durationSeconds)}</Text>
      </View>

      <View style={styles.activeActions}>
        <PrimaryButton title={t("Wake up")} onPress={onWakeUp} />
      </View>
    </View>
  );
}

function SleepTypeToggle({ value, onChange, colors, styles, t }) {
  return (
    <View style={styles.typeSection}>
      <Text style={styles.typeSectionTitle}>{t("Sleep type")}</Text>

      <View style={styles.typeToggle}>
        <SleepTypeOption
          icon="cloud-outline"
          label={t("Nap")}
          selected={value === "nap"}
          onPress={() => onChange("nap")}
          colors={colors}
          styles={styles}
        />

        <SleepTypeOption
          icon="moon-outline"
          label={t("Night")}
          selected={value === "night"}
          onPress={() => onChange("night")}
          colors={colors}
          styles={styles}
        />
      </View>
    </View>
  );
}

function SleepTypeOption({ icon, label, selected, onPress, colors, styles }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.typeOption,
        selected && styles.typeOptionSelected,
        pressed && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.typeIconContainer,
          selected && styles.typeIconContainerSelected,
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={selected ? colors.primary : colors.textSecondary}
        />
      </View>

      <Text
        style={[
          styles.typeOptionLabel,
          selected && styles.typeOptionLabelSelected,
        ]}
      >
        {label}
      </Text>

      {selected ? (
        <View style={styles.selectedCheck}>
          <Ionicons name="checkmark" size={12} color="#FFFFFF" />
        </View>
      ) : null}
    </Pressable>
  );
}

function LastSleepCard({ sleep, styles, t }) {
  const isNight = sleep.type === "night";

  const durationSeconds =
    sleep.durationSeconds ??
    calculateDurationSeconds(sleep.startedAt, sleep.endedAt);

  return (
    <View style={styles.lastSleepCard}>
      <View style={styles.lastSleepHeader}>
        <View style={styles.lastSleepIconContainer}>
          <Ionicons
            name={isNight ? "moon-outline" : "cloud-outline"}
            size={18}
            color="#756BD8"
          />
        </View>

        <View style={styles.lastSleepTitleContainer}>
          <Text style={styles.lastSleepTitle}>
            {isNight ? t("Last night") : t("Last nap")}
          </Text>

          <Text style={styles.lastSleepTimes}>
            {formatTime(sleep.startedAt)}
            {" – "}
            {formatTime(sleep.endedAt)}
          </Text>
        </View>

        <Text style={styles.lastSleepDuration}>
          {formatShortDuration(durationSeconds, t)}
        </Text>
      </View>
    </View>
  );
}

function calculateDurationSeconds(startedAt, endedAt) {
  if (!startedAt || !endedAt) {
    return 0;
  }

  return Math.max(
    0,
    Math.floor(
      (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000,
    ),
  );
}

function formatTime(dateValue) {
  if (!dateValue) {
    return "--:--";
  }

  return new Date(dateValue).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(totalSeconds) {
  const safeSeconds = Math.max(0, totalSeconds ?? 0);

  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0",
    )}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0",
  )}`;
}

function formatShortDuration(totalSeconds, t) {
  const safeSeconds = Math.max(0, totalSeconds ?? 0);

  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);

  if (hours > 0) {
    return t("hours and minutes short", {
      hours,
      minutes,
    });
  }

  return t("minutes short", {
    minutes,
  });
}

function createStyles(colors) {
  return StyleSheet.create({
    sheetBackground: {
      backgroundColor: colors.white,
      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,
    },

    handleContainer: {
      paddingTop: 10,
      paddingBottom: 7,
    },

    handleIndicator: {
      width: 46,
      height: 5,
      borderRadius: 3,
      backgroundColor: colors.textSecondary,
      opacity: 0.24,
    },

    content: {
      flex: 1,
    },

    header: {
      paddingHorizontal: 20,
      paddingTop: 2,
      paddingBottom: 14,
    },

    title: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 22,
      lineHeight: 30,
      letterSpacing: -0.4,
      color: colors.textPrimary,
    },

    subtitle: {
      marginTop: 3,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 13,
      lineHeight: 18,
      color: colors.textSecondary,
    },

    stateContainer: {
      flex: 1,
      paddingHorizontal: 20,
      paddingBottom: 16,
    },

    stateContent: {
      flex: 1,
      alignItems: "center",
    },

    awakeIllustrationContainer: {
      width: "100%",
      height: 170,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 4,
      overflow: "hidden",
    },

    awakeIllustration: {
      width: 205,
      height: 165,
    },

    sleepingIllustrationContainer: {
      width: "100%",
      height: 160,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 4,
      overflow: "hidden",
    },

    sleepingIllustration: {
      width: 200,
      height: 155,
    },

    stateTextContainer: {
      alignItems: "center",
      marginTop: 12,
    },

    activeStateTextContainer: {
      alignItems: "center",
      marginTop: 13,
    },

    stateTitle: {
      textAlign: "center",
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 21,
      lineHeight: 28,
      color: colors.textPrimary,
    },

    stateDescription: {
      maxWidth: 290,
      marginTop: 6,
      textAlign: "center",
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 13,
      lineHeight: 19,
      color: colors.textSecondary,
    },

    startedAtText: {
      marginTop: 5,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 13,
      lineHeight: 19,
      color: colors.textSecondary,
    },

    typeSection: {
      width: "100%",
      marginTop: 20,
    },

    typeSectionTitle: {
      marginBottom: 9,
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 13,
      color: colors.textPrimary,
    },

    typeToggle: {
      flexDirection: "row",
      gap: 10,
    },

    typeOption: {
      position: "relative",
      flex: 1,
      minHeight: 68,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 13,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      backgroundColor: colors.white,
    },

    typeOptionSelected: {
      borderColor: `${colors.primary}70`,
      backgroundColor: colors.selectedBackground,
    },

    typeIconContainer: {
      width: 38,
      height: 38,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 13,
      backgroundColor: colors.lightBackground,
    },

    typeIconContainerSelected: {
      backgroundColor: `${colors.primary}12`,
    },

    typeOptionLabel: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 14,
      color: colors.textSecondary,
    },

    typeOptionLabelSelected: {
      color: colors.primary,
    },

    selectedCheck: {
      position: "absolute",
      top: 8,
      right: 8,
      width: 18,
      height: 18,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 9,
      backgroundColor: colors.primary,
    },

    lastSleepCard: {
      width: "100%",
      marginTop: 16,
      paddingHorizontal: 14,
      paddingVertical: 13,
      borderWidth: 1,
      borderColor: "#E5E1FA",
      borderRadius: 20,
      backgroundColor: "#FAF9FF",
    },

    lastSleepHeader: {
      flexDirection: "row",
      alignItems: "center",
    },

    lastSleepIconContainer: {
      width: 38,
      height: 38,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 13,
      backgroundColor: "#EFEDFF",
    },

    lastSleepTitleContainer: {
      flex: 1,
      marginLeft: 11,
    },

    lastSleepTitle: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 13,
      lineHeight: 18,
      color: colors.textPrimary,
    },

    lastSleepTimes: {
      marginTop: 2,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 11,
      lineHeight: 16,
      color: colors.textSecondary,
    },

    lastSleepDuration: {
      marginLeft: 10,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 13,
      color: "#645BBB",
    },

    idleActions: {
      width: "100%",
      marginTop: "auto",
      paddingTop: 16,
    },

    progressBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      marginTop: 10,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: "#F1F0FF",
    },

    progressDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: "#756BD8",
    },

    progressBadgeText: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 11,
      color: "#645BBB",
    },

    timerCard: {
      width: "100%",
      alignItems: "center",
      justifyContent: "center",
      marginTop: 20,
      paddingVertical: 20,
      borderWidth: 1,
      borderColor: "#DED9FA",
      borderRadius: 24,
      backgroundColor: "#F8F7FF",
    },

    timerValue: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 38,
      lineHeight: 48,
      letterSpacing: 1,
      color: colors.textPrimary,
    },

    activeActions: {
      width: "100%",
      marginTop: "auto",
      paddingTop: 20,
    },

    pressed: {
      opacity: 0.68,
      transform: [{ scale: 0.98 }],
    },
  });
}
