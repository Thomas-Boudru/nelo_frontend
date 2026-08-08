import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { onboardingColors, radius, spacing } from "../../theme";
const colors = onboardingColors;
export default function ChoiceCard({
  title,
  description,
  imageSource,
  selected = false,
  onPress,
  style,
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={title}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        selected && styles.cardSelected,
        pressed && styles.cardPressed,
        style,
      ]}
    >
      {imageSource ? (
        <View style={styles.illustrationContainer}>
          <Image
            source={imageSource}
            resizeMode="contain"
            style={styles.illustration}
          />
        </View>
      ) : null}

      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>

        {description ? (
          <Text style={styles.description}>{description}</Text>
        ) : null}
      </View>

      {selected ? (
        <View style={styles.selectedIcon}>
          <Ionicons name="checkmark" size={18} color={colors.white} />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    minHeight: 170,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,

    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,

    borderWidth: 1,
    borderColor: "rgba(110, 140, 195, 0.1)",
    borderRadius: radius.xl,
    backgroundColor: colors.white,

    shadowColor: "#5D7CC7",
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 8,
    },

    elevation: 5,
  },

  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.selectedBackground,
  },

  cardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },

  illustrationContainer: {
    width: 118,
    height: 118,
    borderRadius: 59,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: "#EEF4FF",
    overflow: "hidden",
  },

  illustration: {
    width: 100,
    height: 100,
  },

  content: {
    flex: 1,
    minWidth: 0,
    gap: spacing.sm,
  },

  title: {
    color: colors.textPrimary,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 20,
    lineHeight: 27,
  },

  description: {
    color: colors.textSecondary,
    fontFamily: "PlusJakartaSans_500Regular",
    fontSize: 15,
    lineHeight: 22,
  },

  selectedIcon: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,

    width: 28,
    height: 28,
    borderRadius: 14,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: colors.primary,
  },
});
