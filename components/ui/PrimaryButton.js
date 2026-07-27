import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { colors, radius, spacing } from "../../theme";

export default function PrimaryButton({
  title,
  onPress,
  disabled = false,
  loading = false,
  icon,
  style,
}) {
  const isDisabled = disabled || loading;

  return (
    <View style={[styles.shadowContainer, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ disabled: isDisabled }}
        disabled={isDisabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.pressable,
          pressed && !isDisabled && styles.buttonPressed,
        ]}
      >
        <LinearGradient
          colors={
            isDisabled
              ? [colors.primaryDisabled, colors.primaryDisabled]
              : ["#78A1FF", colors.primary, "#5688F7"]
          }
          locations={[0, 0.55, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <View style={styles.highlight} />

          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <View style={styles.content}>
              {icon}
              <Text style={styles.label}>{title}</Text>
            </View>
          )}
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  shadowContainer: {
    width: "100%",
    borderRadius: radius.lg,

    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.24,
    shadowRadius: 14,

    elevation: 7,
  },

  pressable: {
    width: "100%",
    minHeight: 56,
    borderRadius: radius.lg,
    overflow: "hidden",
  },

  gradient: {
    minHeight: 56,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,

    alignItems: "center",
    justifyContent: "center",
  },

  highlight: {
    position: "absolute",
    top: 0,
    left: 20,
    right: 20,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.32)",
  },

  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },

  buttonPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.92,
  },

  label: {
    color: colors.white,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 17,
    lineHeight: 22,
  },
});
