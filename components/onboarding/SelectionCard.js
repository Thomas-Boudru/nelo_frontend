import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { onboardingColors, radius, spacing } from "../../theme/index.js";
const colors = onboardingColors;
export default function SelectionCard({
  label,
  selected = false,
  onPress,
  imageSource,
  iconName,
  disabled = false,
  accessibilityLabel,
  style,
  imageStyle,
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityState={{
        selected,
        disabled,
      }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        selected && styles.cardSelected,
        pressed && !disabled && styles.cardPressed,
        disabled && styles.cardDisabled,
        style,
      ]}
    >
      <View
        style={[
          styles.selectionIndicator,
          selected && styles.selectionIndicatorSelected,
        ]}
      >
        {selected ? (
          <Ionicons name="checkmark" size={16} color="#FFFFFF" />
        ) : null}
      </View>

      {imageSource ? (
        <Image
          source={imageSource}
          resizeMode="contain"
          style={[styles.image, imageStyle]}
        />
      ) : iconName ? (
        <View
          style={[
            styles.iconContainer,
            selected && styles.iconContainerSelected,
          ]}
        >
          <Ionicons
            name={iconName}
            size={27}
            color={selected ? colors.primary : colors.textSecondary}
          />
        </View>
      ) : null}

      <Text style={[styles.label, selected && styles.labelSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 104,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#DCE3F1",
    borderRadius: radius.lg,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },

  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: "#F3F7FF",
  },

  cardPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.985 }],
  },

  cardDisabled: {
    opacity: 0.45,
  },

  selectionIndicator: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#DCE3F1",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },

  selectionIndicatorSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },

  image: {
    width: 58,
    height: 58,
    marginBottom: spacing.xs,
  },

  iconContainer: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
    backgroundColor: "#F3F6FC",
    marginBottom: spacing.sm,
  },

  iconContainerSelected: {
    backgroundColor: "#E7EFFF",
  },

  label: {
    color: colors.textPrimary,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 15,
    lineHeight: 21,
    textAlign: "center",
  },

  labelSelected: {
    color: colors.primary,
    fontFamily: "PlusJakartaSans_700Bold",
  },
});
