import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors, radius, spacing } from "../../theme";

export default function ChoiceCard({
  title,
  description,
  illustration,
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
      {illustration ? (
        <View style={styles.illustrationContainer}>{illustration}</View>
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
    minHeight: 150,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.white,

    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
  },

  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.selectedBackground,
  },

  cardPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },

  illustrationContainer: {
    width: 112,
    height: 112,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    overflow: "hidden",
  },

  content: {
    flex: 1,
    gap: spacing.sm,
  },

  title: {
    color: colors.textPrimary,
    fontFamily: "Outfit_600SemiBold",
    fontSize: 20,
    lineHeight: 26,
  },

  description: {
    color: colors.textSecondary,
    fontFamily: "Outfit_400Regular",
    fontSize: 15,
    lineHeight: 22,
  },

  selectedIcon: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,

    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.primary,

    alignItems: "center",
    justifyContent: "center",
  },
});
