import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { onboardingColors, radius, spacing } from "../../theme/index.js";
const colors = onboardingColors;
export default function DateField({
  label,
  value,
  placeholder,
  helperText,
  error,
  onPress,
  disabled = false,
  required = false,
  containerStyle,
}) {
  const hasValue = Boolean(value);
  const hasError = Boolean(error);

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Text style={styles.label}>
          {label}
          {required ? <Text style={styles.required}> *</Text> : null}
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={placeholder}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.field,
          hasError && styles.fieldError,
          pressed && !disabled && styles.fieldPressed,
          disabled && styles.fieldDisabled,
        ]}
      >
        <View style={styles.leftContent}>
          <Ionicons
            name="calendar-outline"
            size={23}
            color={
              hasError
                ? colors.error || "#E97878"
                : hasValue
                  ? colors.primary
                  : colors.textSecondary
            }
          />

          <Text
            numberOfLines={1}
            style={[styles.value, !hasValue && styles.placeholder]}
          >
            {hasValue ? value : placeholder}
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={21} color={colors.primary} />
      </Pressable>

      {hasError ? (
        <View style={styles.feedbackRow}>
          <Ionicons
            name="alert-circle-outline"
            size={17}
            color={colors.error || "#E97878"}
          />

          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : helperText ? (
        <View style={styles.feedbackRow}>
          <Ionicons
            name="information-circle-outline"
            size={17}
            color={colors.textSecondary}
          />

          <Text style={styles.helperText}>{helperText}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },

  label: {
    marginBottom: spacing.sm,
    color: colors.textPrimary,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 16,
    lineHeight: 22,
  },

  required: {
    color: colors.primary,
  },

  field: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderColor: "#DCE3F1",
    borderRadius: radius.lg,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: spacing.md,
  },

  fieldError: {
    borderColor: colors.error || "#E97878",
  },

  fieldPressed: {
    borderColor: colors.primary,
    opacity: 0.85,
  },

  fieldDisabled: {
    opacity: 0.45,
  },

  leftContent: {
    minWidth: 0,
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginRight: spacing.sm,
  },

  value: {
    flex: 1,
    color: colors.textPrimary,
    fontFamily: "PlusJakartaSans_500Regular",
    fontSize: 16,
    lineHeight: 22,
  },

  placeholder: {
    color: colors.textSecondary,
  },

  feedbackRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    marginTop: spacing.sm,
    paddingHorizontal: 2,
  },

  helperText: {
    flex: 1,
    color: colors.textSecondary,
    fontFamily: "PlusJakartaSans_500Regular",
    fontSize: 13,
    lineHeight: 20,
  },

  errorText: {
    flex: 1,
    color: colors.error || "#E97878",
    fontFamily: "PlusJakartaSans_500Regular",
    fontSize: 13,
    lineHeight: 20,
  },
});
