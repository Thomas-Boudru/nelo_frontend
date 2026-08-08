import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { onboardingColors, radius, spacing } from "../../theme/index.js";

const colors = onboardingColors;

export default function FormField({
  label,
  optionalLabel,
  value,
  onChangeText,
  placeholder,

  helperText,
  helperIconName = "heart-outline",
  showHelperIcon = true,

  error,
  errorIconName = "alert-circle-outline",

  iconName,
  iconSize = 23,

  rightIconName,
  rightIconSize = 22,
  onRightIconPress,
  rightIconAccessibilityLabel,

  required = false,
  showLabel = true,

  size = "default",
  variant = "default",

  disabled = false,
  editable = true,

  InputComponent = TextInput,

  containerStyle,
  labelRowStyle,
  labelStyle,
  inputContainerStyle,
  inputStyle,
  helperTextStyle,
  errorTextStyle,

  onFocus,
  onBlur,

  ...textInputProps
}) {
  const [isFocused, setIsFocused] = useState(false);

  const hasError = Boolean(error);
  const isDisabled = disabled || editable === false;
  const isDanger = variant === "danger";

  const shouldShowLabel = showLabel && Boolean(label);
  const shouldShowFeedback = hasError || Boolean(helperText);

  const getAccentColor = () => {
    if (hasError || isDanger) {
      return colors.error || "#E97878";
    }

    if (isFocused) {
      return colors.primary;
    }

    return colors.textSecondary;
  };

  const getSelectionColor = () => {
    if (isDanger) {
      return colors.error || "#E97878";
    }

    return colors.primary;
  };

  const handleFocus = (event) => {
    setIsFocused(true);
    onFocus?.(event);
  };

  const handleBlur = (event) => {
    setIsFocused(false);
    onBlur?.(event);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {shouldShowLabel ? (
        <View style={[styles.labelRow, labelRowStyle]}>
          <Text
            style={[styles.label, isDanger && styles.labelDanger, labelStyle]}
          >
            {label}

            {required ? <Text style={styles.required}> *</Text> : null}
          </Text>

          {optionalLabel ? (
            <Text style={styles.optionalLabel}>{optionalLabel}</Text>
          ) : null}
        </View>
      ) : null}

      <View
        style={[
          styles.inputContainer,

          size === "large" && styles.inputContainerLarge,

          isFocused && !hasError && !isDanger && styles.inputContainerFocused,

          isDanger && styles.inputContainerDanger,

          hasError && styles.inputContainerError,

          isDisabled && styles.inputContainerDisabled,

          inputContainerStyle,
        ]}
      >
        {iconName ? (
          <Ionicons
            name={iconName}
            size={iconSize}
            color={isDisabled ? colors.textSecondary : getAccentColor()}
            style={styles.leftIcon}
          />
        ) : null}

        <InputComponent
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={
            isDanger ? `${colors.error}90` : colors.textSecondary
          }
          selectionColor={getSelectionColor()}
          editable={!isDisabled}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={[
            styles.input,

            size === "large" && styles.inputLarge,

            isDanger && styles.inputDanger,

            inputStyle,
          ]}
          {...textInputProps}
        />

        {rightIconName ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              rightIconAccessibilityLabel || "Action du champ"
            }
            disabled={!onRightIconPress}
            hitSlop={10}
            onPress={onRightIconPress}
            style={({ pressed }) => [
              styles.rightIconButton,
              pressed && onRightIconPress && styles.rightIconButtonPressed,
            ]}
          >
            <Ionicons
              name={rightIconName}
              size={rightIconSize}
              color={getAccentColor()}
            />
          </Pressable>
        ) : null}
      </View>

      {shouldShowFeedback ? (
        <View style={styles.feedbackRow}>
          {hasError ? (
            <Ionicons
              name={errorIconName}
              size={17}
              color={colors.error || "#E97878"}
              style={styles.feedbackIcon}
            />
          ) : showHelperIcon && helperIconName ? (
            <Ionicons
              name={helperIconName}
              size={17}
              color={isDanger ? colors.error : colors.textSecondary}
              style={styles.feedbackIcon}
            />
          ) : null}

          {hasError ? (
            <Text style={[styles.errorText, errorTextStyle]}>{error}</Text>
          ) : (
            <Text
              style={[
                styles.helperText,
                isDanger && styles.helperTextDanger,
                helperTextStyle,
              ]}
            >
              {helperText}
            </Text>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },

  labelRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",

    gap: spacing.sm,

    marginBottom: spacing.sm,
  },

  label: {
    flex: 1,

    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 16,
    lineHeight: 22,

    color: colors.textPrimary,
  },

  labelDanger: {
    color: colors.error,
  },

  optionalLabel: {
    marginTop: 2,

    fontFamily: "PlusJakartaSans_500Regular",
    fontSize: 12,
    lineHeight: 18,

    color: colors.textSecondary,
  },

  required: {
    color: colors.primary,
  },

  inputContainer: {
    minHeight: 58,

    flexDirection: "row",
    alignItems: "center",

    paddingHorizontal: spacing.md,

    borderWidth: 1.5,
    borderColor: "#DCE3F1",
    borderRadius: radius.lg,

    backgroundColor: "#FFFFFF",
  },

  inputContainerLarge: {
    minHeight: 72,

    paddingHorizontal: spacing.lg,
  },

  inputContainerFocused: {
    borderColor: colors.primary,
  },

  inputContainerDanger: {
    borderColor: colors.error,

    backgroundColor: `${colors.error}06`,
  },

  inputContainerError: {
    borderColor: colors.error || "#E97878",
  },

  inputContainerDisabled: {
    opacity: 0.55,

    backgroundColor: "#F7F9FD",
  },

  leftIcon: {
    marginRight: spacing.sm,
  },

  input: {
    flex: 1,

    minHeight: 56,

    paddingVertical: 0,

    fontFamily: "PlusJakartaSans_500Regular",
    fontSize: 16,

    color: colors.textPrimary,
  },

  inputDanger: {
    color: colors.error,
  },

  inputLarge: {
    minHeight: 70,

    fontSize: 17,
  },

  rightIconButton: {
    alignItems: "center",
    justifyContent: "center",

    marginLeft: spacing.sm,
  },

  rightIconButtonPressed: {
    opacity: 0.6,
  },

  feedbackRow: {
    flexDirection: "row",
    alignItems: "flex-start",

    gap: 7,

    marginTop: spacing.sm,
    paddingHorizontal: 2,
  },

  feedbackIcon: {
    marginTop: 1,
  },

  helperText: {
    flex: 1,

    fontFamily: "PlusJakartaSans_500Regular",
    fontSize: 13,
    lineHeight: 20,

    color: colors.textSecondary,
  },

  helperTextDanger: {
    color: colors.error,
  },

  errorText: {
    flex: 1,

    fontFamily: "PlusJakartaSans_500Regular",
    fontSize: 13,
    lineHeight: 20,

    color: colors.error || "#E97878",
  },
});
