import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { onboardingColors, radius, spacing } from "../../theme";

const colors = onboardingColors;

export default function PrimaryButton({
  title,
  onPress,
  disabled = false,
  loading = false,
  icon,
  style,
  variant = "primary",
}) {
  const isDisabled = disabled || loading;
  const isDestructive = variant === "destructive";
  const isWake = variant === "wake";

  const gradientColors = isDestructive
    ? ["#F58B91", colors.error, "#D94A55"]
    : isWake
      ? ["#FFE99A", "#FFD66B", "#F6BE45"]
      : ["#85A9FF", colors.primary, "#4A7EF0"];

  const disabledGradientColors = isDestructive
    ? ["#F7C8CB", "#F2B4B9", "#EFA6AD"]
    : isWake
      ? ["#FFF3C9", "#FBE9B3", "#F5DFA2"]
      : [
          colors.primaryDisabled,
          colors.primaryDisabled,
          colors.primaryDisabled,
        ];

  const shadowColor = isDestructive
    ? colors.error
    : isWake
      ? "#E9B844"
      : colors.primary;

  const contentColor = isWake ? colors.textPrimary : colors.white;

  return (
    <View
      style={[
        styles.shadowContainer,
        { shadowColor },
        isDisabled && styles.shadowContainerDisabled,
        style,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ disabled: isDisabled }}
        disabled={isDisabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.pressable,
          pressed && !isDisabled && styles.buttonPressed,
          isDisabled && styles.buttonDisabled,
        ]}
      >
        <LinearGradient
          pointerEvents="none"
          colors={isDisabled ? disabledGradientColors : gradientColors}
          locations={[0, 0.55, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        <View
          pointerEvents="none"
          style={[styles.highlight, isDisabled && styles.highlightDisabled]}
        />

        <View style={styles.content}>
          {loading ? (
            <ActivityIndicator color={contentColor} />
          ) : (
            <>
              {icon}

              <Text
                style={[
                  styles.label,
                  { color: contentColor },
                  isDisabled && styles.labelDisabled,
                ]}
              >
                {title}
              </Text>
            </>
          )}
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  shadowContainer: {
    width: "100%",
    borderRadius: radius.lg,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
  },

  shadowContainerDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },

  pressable: {
    position: "relative",
    width: "100%",
    height: 56,
    borderRadius: radius.lg,
    overflow: "hidden",
  },

  highlight: {
    position: "absolute",
    top: 0,
    right: 18,
    left: 18,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    zIndex: 2,
  },

  highlightDisabled: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },

  content: {
    position: "relative",
    width: "100%",
    height: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    zIndex: 3,
  },

  buttonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },

  buttonDisabled: {
    opacity: 1,
  },

  label: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 17,
    lineHeight: 22,
  },

  labelDisabled: {
    opacity: 0.7,
  },
});
