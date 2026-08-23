import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import BackButton from "../../components/ui/BackButton.js";
import { useThemeColors } from "../../theme/useThemeColors.js";
import PrimaryButton from "../../components/ui/PrimaryButton.js";

const REASON_CONFIG = {
  awake_duration: {
    icon: "sunny-outline",
  },

  last_nap_duration: {
    icon: "moon-outline",
  },

  usual_wake_window: {
    icon: "time-outline",
  },

  daytime_sleep: {
    icon: "cloud-outline",
  },

  usual_bedtime: {
    icon: "bed-outline",
  },
};

export default function NextSleepDetailsScreen({ navigation, route }) {
  const { t } = useTranslation();

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const nextSleep = route?.params?.nextSleep;

  if (!nextSleep) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <ScreenHeader
          title={t("Sleep recommendation")}
          onBack={() => navigation.goBack()}
          styles={styles}
        />

        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="moon-outline" size={48} color={colors.primary} />
          </View>

          <Text style={styles.emptyTitle}>
            {t("No sleep prediction available")}
          </Text>

          <Text style={styles.emptyDescription}>
            {t(
              "Keep tracking sleep and Nelo will soon suggest the next ideal sleep window.",
            )}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const isBedtime = nextSleep.type === "bedtime";

  const reasons = Array.isArray(nextSleep.reasons)
    ? nextSleep.reasons.slice(0, 3)
    : [];

  const screenTitle = isBedtime ? t("Bedtime") : t("Next nap");

  const countdownLabel = getCountdownLabel(nextSleep.minutesUntil, t);

  const adviceText = getAdviceLabel(nextSleep.advice, t);

  /*
   * En navigation imbriquée, seules `screen` et `params` sont interprétées :
   * les clés placées à côté resteraient sur la route MainTabs et l’onglet
   * Tracking ne les verrait jamais. Elles vont donc dans `params`, au niveau
   * où l’onglet les lit.
   */
  const handleStartSleep = () => {
    navigation.navigate("MainTabs", {
      screen: "Tracking",

      params: {
        screen: "TrackingOverview",

        openSleepEntry: true,

        initialSleepType: isBedtime ? "night" : "nap",

        requestId: Date.now(),
      },
    });
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <ScreenHeader
        title={screenTitle}
        onBack={() => navigation.goBack()}
        styles={styles}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.hero}>
          <View style={styles.illustration}>
            <Ionicons
              name={isBedtime ? "bed-outline" : "moon-outline"}
              size={50}
              color={colors.primary}
            />

            {!isBedtime && (
              <>
                <Ionicons
                  name="star"
                  size={13}
                  color={colors.primary}
                  style={styles.starOne}
                />

                <Ionicons
                  name="star"
                  size={9}
                  color={colors.primary}
                  style={styles.starTwo}
                />
              </>
            )}
          </View>

          <Text style={styles.eyebrow}>{countdownLabel}</Text>

          <Text style={styles.timeWindow}>
            {nextSleep.idealWindowStart} – {nextSleep.idealWindowEnd}
          </Text>

          {nextSleep.routineStart ? (
            <Text style={styles.routineText}>
              {isBedtime
                ? t("Start the bedtime routine around {{time}}", {
                    time: nextSleep.routineStart,
                  })
                : t("Start the sleep routine around {{time}}", {
                    time: nextSleep.routineStart,
                  })}
            </Text>
          ) : null}

          <ConfidenceBadge
            confidence={nextSleep.confidence}
            colors={colors}
            styles={styles}
            t={t}
          />
        </View>

        {reasons.length > 0 && (
          <View style={styles.reasonsCard}>
            <Text style={styles.sectionTitle}>{t("Why this estimate?")}</Text>

            <View style={styles.reasonsList}>
              {reasons.map((reason, index) => (
                <ReasonRow
                  key={`${reason.type}-${index}`}
                  reason={reason}
                  showSeparator={index < reasons.length - 1}
                  colors={colors}
                  styles={styles}
                  t={t}
                />
              ))}
            </View>
          </View>
        )}

        {adviceText ? (
          <View style={styles.adviceCard}>
            <View style={styles.adviceIcon}>
              <Ionicons name="bulb-outline" size={23} color={colors.primary} />
            </View>

            <View style={styles.adviceContent}>
              <Text style={styles.adviceTitle}>{t("Nelo's advice")}</Text>

              <Text style={styles.adviceText}>{adviceText}</Text>
            </View>
          </View>
        ) : null}

        <Text style={styles.disclaimer}>
          {t(
            "This estimate will adjust as new sleep is recorded. Always follow your baby's signs of tiredness first.",
          )}
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          title={isBedtime ? t("Start night sleep") : t("Start nap")}
          icon="timer-outline"
          onPress={handleStartSleep}
        />
      </View>
    </SafeAreaView>
  );
}

function ScreenHeader({ title, onBack, styles }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerSide}>
        <BackButton onPress={onBack} />
      </View>

      <Text numberOfLines={1} style={styles.headerTitle}>
        {title}
      </Text>

      <View style={styles.headerSide} />
    </View>
  );
}

function ConfidenceBadge({ confidence, colors, styles, t }) {
  if (!confidence) {
    return null;
  }

  const labels = {
    high: t("High confidence"),
    good: t("Good estimate"),
    low: t("Early estimate"),
  };

  return (
    <View style={styles.confidenceBadge}>
      <Ionicons name="checkmark-circle" size={18} color={colors.primary} />

      <Text style={styles.confidenceText}>
        {labels[confidence] ?? labels.good}
      </Text>
    </View>
  );
}

function ReasonRow({ reason, showSeparator, colors, styles, t }) {
  const reasonLabel = getReasonLabel(reason, t);

  if (!reasonLabel) {
    return null;
  }

  const config = REASON_CONFIG[reason.type] ?? REASON_CONFIG.usual_wake_window;

  return (
    <View style={[styles.reasonRow, showSeparator && styles.reasonSeparator]}>
      <View style={styles.reasonIcon}>
        <Ionicons name={config.icon} size={22} color={colors.primary} />
      </View>

      <Text style={styles.reasonText}>{reasonLabel}</Text>
    </View>
  );
}

function getReasonLabel(reason, t) {
  switch (reason.type) {
    case "awake_duration":
      return t("Awake for {{duration}}", {
        duration: formatDuration(reason.minutes, t),
      });

    case "last_nap_duration":
      return t("Last nap lasted {{duration}}", {
        duration: formatDuration(reason.minutes, t),
      });

    case "usual_wake_window":
      return t("Usual wake window: {{minimum}}–{{maximum}}", {
        minimum: formatDuration(reason.minimumMinutes, t),
        maximum: formatDuration(reason.maximumMinutes, t),
      });

    case "daytime_sleep":
      return t("Daytime sleep: {{duration}}", {
        duration: formatDuration(reason.minutes, t),
      });

    case "usual_bedtime":
      return t("Usual bedtime: {{time}}", {
        time: reason.time,
      });

    default:
      return null;
  }
}

function getAdviceLabel(advice, t) {
  switch (advice) {
    case "reduce_stimulation":
      return t("Reduce stimulation and watch for early signs of tiredness.");

    case "start_bedtime_routine":
      return t("Dim the lights and begin the usual bedtime routine.");

    case "short_last_nap":
      return t(
        "The last nap was short, so tiredness may appear a little earlier.",
      );

    case "follow_sleep_signs":
      return t("Watch for yawning, eye rubbing or a sudden change in mood.");

    default:
      return t("Watch for yawning, eye rubbing or a sudden change in mood.");
  }
}

function getCountdownLabel(minutesUntil, t) {
  const safeMinutes = Math.max(0, Math.floor(Number(minutesUntil) || 0));

  if (safeMinutes === 0) {
    return t("The ideal window starts now");
  }

  return t("In about {{count}} minutes", {
    count: safeMinutes,
  });
}

function formatDuration(totalMinutes, t) {
  const safeMinutes = Math.max(0, Math.floor(Number(totalMinutes) || 0));

  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;

  if (hours === 0) {
    return t("{{count}} min", {
      count: minutes,
    });
  }

  if (minutes === 0) {
    return t("{{count}} h", {
      count: hours,
    });
  }

  return t("{{hours}} h {{minutes}} min", {
    hours,
    minutes,
  });
}

const createStyles = (colors) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },

    header: {
      height: 58,

      flexDirection: "row",
      alignItems: "center",

      paddingHorizontal: 20,
    },

    headerSide: {
      width: 42,
      height: 42,

      alignItems: "center",
      justifyContent: "center",
    },

    headerTitle: {
      flex: 1,

      paddingHorizontal: 8,

      textAlign: "center",

      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 18,
      lineHeight: 24,

      color: colors.textPrimary,
    },

    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 28,
    },

    hero: {
      alignItems: "center",

      paddingHorizontal: 12,
      paddingBottom: 24,
    },

    illustration: {
      width: 94,
      height: 94,

      alignItems: "center",
      justifyContent: "center",

      marginBottom: 18,

      borderRadius: 47,
      backgroundColor: colors.selectedBackground,
    },

    starOne: {
      position: "absolute",

      top: 17,
      right: 17,

      opacity: 0.5,
    },

    starTwo: {
      position: "absolute",

      top: 36,
      right: 11,

      opacity: 0.35,
    },

    eyebrow: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 12,
      lineHeight: 17,

      textAlign: "center",
      textTransform: "uppercase",
      letterSpacing: 0.7,

      color: colors.primary,
    },

    timeWindow: {
      marginTop: 6,

      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 34,
      lineHeight: 42,

      textAlign: "center",

      color: colors.textPrimary,
    },

    routineText: {
      marginTop: 6,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 14,
      lineHeight: 20,

      textAlign: "center",

      color: colors.textSecondary,
    },

    confidenceBadge: {
      flexDirection: "row",
      alignItems: "center",

      gap: 7,
      marginTop: 16,
      paddingHorizontal: 13,
      paddingVertical: 8,

      borderWidth: 1,
      borderColor: colors.primarySoft ?? colors.selectedBackground,
      borderRadius: 18,
      backgroundColor: colors.selectedBackground,
    },

    confidenceText: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 13,
      lineHeight: 18,

      color: colors.primary,
    },

    reasonsCard: {
      paddingHorizontal: 18,
      paddingTop: 18,
      paddingBottom: 5,

      borderRadius: 24,
      backgroundColor: colors.white,

      shadowColor: colors.textPrimary,
      shadowOffset: {
        width: 0,
        height: 7,
      },
      shadowOpacity: 0.045,
      shadowRadius: 18,

      elevation: 2,
    },

    sectionTitle: {
      marginBottom: 4,

      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 17,
      lineHeight: 23,

      color: colors.textPrimary,
    },

    reasonsList: {
      marginTop: 2,
    },

    reasonRow: {
      minHeight: 65,

      flexDirection: "row",
      alignItems: "center",

      gap: 13,
      paddingVertical: 10,
    },

    reasonSeparator: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },

    reasonIcon: {
      width: 42,
      height: 42,

      alignItems: "center",
      justifyContent: "center",

      borderRadius: 21,
      backgroundColor: colors.selectedBackground,
    },

    reasonText: {
      flex: 1,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 14,
      lineHeight: 20,

      color: colors.textPrimary,
    },

    adviceCard: {
      flexDirection: "row",
      alignItems: "flex-start",

      gap: 13,
      marginTop: 14,
      padding: 17,

      borderRadius: 22,
      backgroundColor: colors.selectedBackground,
    },

    adviceIcon: {
      width: 42,
      height: 42,

      alignItems: "center",
      justifyContent: "center",

      borderRadius: 21,
      backgroundColor: colors.white,
    },

    adviceContent: {
      flex: 1,
    },

    adviceTitle: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 15,
      lineHeight: 20,

      color: colors.textPrimary,
    },

    adviceText: {
      marginTop: 3,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 13,
      lineHeight: 19,

      color: colors.textSecondary,
    },

    disclaimer: {
      marginTop: 15,
      paddingHorizontal: 8,

      fontFamily: "PlusJakartaSans_400Regular",
      fontSize: 11,
      lineHeight: 17,

      textAlign: "center",

      color: colors.textSecondary,
    },

    footer: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 8,

      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      backgroundColor: colors.background,
    },

    primaryButton: {
      minHeight: 54,

      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",

      gap: 8,
      paddingHorizontal: 20,

      borderRadius: 18,
      backgroundColor: colors.primary,
    },

    primaryButtonPressed: {
      opacity: 0.86,
      transform: [{ scale: 0.99 }],
    },

    primaryButtonText: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 16,
      lineHeight: 22,

      color: colors.white,
    },

    secondaryButton: {
      height: 45,

      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",

      gap: 7,
      marginTop: 5,
    },

    secondaryButtonPressed: {
      opacity: 0.65,
    },

    secondaryButtonText: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 14,
      lineHeight: 19,

      color: colors.primary,
    },

    emptyState: {
      flex: 1,

      alignItems: "center",
      justifyContent: "center",

      paddingHorizontal: 36,
      paddingBottom: 80,
    },

    emptyIcon: {
      width: 96,
      height: 96,

      alignItems: "center",
      justifyContent: "center",

      marginBottom: 20,

      borderRadius: 48,
      backgroundColor: colors.selectedBackground,
    },

    emptyTitle: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 20,
      lineHeight: 27,

      textAlign: "center",

      color: colors.textPrimary,
    },

    emptyDescription: {
      marginTop: 9,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 14,
      lineHeight: 21,

      textAlign: "center",

      color: colors.textSecondary,
    },
  });
