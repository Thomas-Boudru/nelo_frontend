import { StyleSheet, View } from "react-native";

import { colors, radius } from "../../theme";

export default function OnboardingProgressBar({
  currentStep,
  totalSteps,
  style,
}) {
  const safeTotal = Math.max(totalSteps, 1);
  const safeCurrent = Math.min(Math.max(currentStep, 0), safeTotal);

  const progress = safeCurrent / safeTotal;

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{
        min: 0,
        max: safeTotal,
        now: safeCurrent,
      }}
      style={[styles.track, style]}
    >
      <View
        style={[
          styles.progress,
          {
            width: `${progress * 100}%`,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: "100%",
    height: 6,
    overflow: "hidden",
    borderRadius: radius.full,
    backgroundColor: colors.border,
  },

  progress: {
    height: "100%",
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
});
