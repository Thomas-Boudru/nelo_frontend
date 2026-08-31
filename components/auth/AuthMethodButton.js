import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { onboardingColors, radius, spacing } from "../../theme/index.js";
const colors = onboardingColors;
export default function AuthMethodButton({
  title,
  onPress,
  imageSource,
  iconName,
  iconSize = 27,

  loading = false,
  disabled = false,
  showChevron = true,
  style,
  imageStyle,
  iconColor = colors.textSecondary,
  accessibilityLabel,
}) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{
        disabled: isDisabled,
        busy: loading,
      }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        pressed && !isDisabled && styles.buttonPressed,
        isDisabled && styles.buttonDisabled,
        style,
      ]}
    >
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : (
        <>
          <View style={styles.leadingContainer}>
            {imageSource ? (
              <Image
                source={imageSource}
                resizeMode="contain"
                style={[styles.image, imageStyle]}
              />
            ) : iconName ? (
              <Ionicons name={iconName} size={iconSize} color={iconColor} />
            ) : null}
          </View>

          <Text numberOfLines={1} style={styles.title}>
            {title}
          </Text>

          <View style={styles.trailingContainer}>
            {showChevron ? (
              <Ionicons
                name="chevron-forward"
                size={25}
                color={colors.primary}
              />
            ) : null}
          </View>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: "100%",
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(220, 227, 241, 0.7)",
    borderRadius: radius.xl,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: spacing.lg,

    shadowColor: "#6F86B3",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.08,
    shadowRadius: 18,

    elevation: 3,
  },

  loadingContainer: {
    flex: 1,
    minHeight: 28,
    alignItems: "center",
    justifyContent: "center",
  },

  buttonPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },

  buttonDisabled: {
    opacity: 0.5,
  },

  leadingContainer: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.lg,
  },

  image: {
    width: 22,
    height: 22,
  },

  title: {
    flex: 1,
    color: colors.textPrimary,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 16,
    lineHeight: 23,
  },

  trailingContainer: {
    width: 28,
    alignItems: "flex-end",
    justifyContent: "center",
    marginLeft: spacing.sm,
  },
});
