import { useMemo } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useThemeColors } from "../../theme/useThemeColors.js";

const STAR_PINK_IMAGE = require("../../assets/illustrations/onboarding/starYellow.png");

export default function MemoryCard({ memory, onPress }) {
  const { t } = useTranslation();

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!memory) {
    return null;
  }

  return (
    <View style={styles.card}>
      <View style={styles.content}>
        <Text style={styles.title}>
          {t("Months ago", {
            count: memory.monthsAgo,
          })}
        </Text>

        <Text style={styles.description}>{memory.description} ❤️</Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("View memory")}
          onPress={onPress}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
        >
          <Ionicons name="image-outline" size={18} color={colors.primary} />

          <Text style={styles.buttonText}>{t("View memory")}</Text>

          <Ionicons name="chevron-forward" size={17} color={colors.primary} />
        </Pressable>
      </View>

      <View style={styles.imageWrapper}>
        <View style={styles.imageContainer}>
          {memory.image ? (
            <Image source={memory.image} style={styles.image} />
          ) : (
            <View style={styles.imageFallback}>
              <Ionicons
                name="images-outline"
                size={36}
                color={colors.primary}
              />

              <Text style={styles.imageFallbackText}>{t("Memory photo")}</Text>
            </View>
          )}
        </View>
      </View>

      <Image
        source={STAR_PINK_IMAGE}
        resizeMode="contain"
        style={styles.starOne}
      />

      <Image
        source={STAR_PINK_IMAGE}
        resizeMode="contain"
        style={styles.starTwo}
      />
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    card: {
      position: "relative",

      minHeight: 180,

      flexDirection: "row",
      alignItems: "stretch",

      marginHorizontal: 20,
      padding: 18,

      borderRadius: 28,
      backgroundColor: colors.white,

      overflow: "hidden",

      shadowColor: colors.textPrimary,
      shadowOffset: {
        width: 0,
        height: 8,
      },
      shadowOpacity: 0.055,
      shadowRadius: 22,

      elevation: 3,
    },

    content: {
      zIndex: 2,

      flex: 1,
      justifyContent: "center",

      paddingRight: 14,
    },

    title: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 18,
      lineHeight: 23,

      color: colors.textPrimary,
    },

    description: {
      marginTop: 8,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 13,
      lineHeight: 19,

      color: colors.textSecondary,
    },

    button: {
      alignSelf: "flex-start",

      flexDirection: "row",
      alignItems: "center",

      gap: 6,

      marginTop: 16,
      paddingHorizontal: 12,
      paddingVertical: 8,

      borderRadius: 18,
      backgroundColor: colors.selectedBackground,
    },

    buttonText: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 12,

      color: colors.primary,
    },

    imageWrapper: {
      width: 145,
      minHeight: 144,

      justifyContent: "center",

      transform: [{ rotate: "3deg" }, { translateX: 3 }],

      shadowColor: colors.textPrimary,
      shadowOffset: {
        width: 0,
        height: 6,
      },
      shadowOpacity: 0.1,
      shadowRadius: 12,

      elevation: 4,
    },

    imageContainer: {
      flex: 1,

      borderRadius: 22,
      backgroundColor: colors.lightBackground,

      overflow: "hidden",
    },

    image: {
      width: "100%",
      height: "100%",

      resizeMode: "cover",

      // L'image est légèrement agrandie afin d'éviter
      // les bords vides causés par la rotation.
      transform: [{ scale: 1.04 }],
    },

    imageFallback: {
      flex: 1,

      alignItems: "center",
      justifyContent: "center",

      paddingHorizontal: 12,

      backgroundColor: colors.lightBackground,
    },

    imageFallbackText: {
      marginTop: 8,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 11,
      lineHeight: 15,
      textAlign: "center",

      color: colors.textSecondary,
    },

    starOne: {
      position: "absolute",

      zIndex: 3,

      top: 28,
      right: 158,

      width: 18,
      height: 18,

      transform: [{ rotate: "-12deg" }],
    },

    starTwo: {
      position: "absolute",

      zIndex: 3,

      right: 154,
      bottom: 27,

      width: 12,
      height: 12,

      opacity: 0.8,
      transform: [{ rotate: "15deg" }],
    },

    buttonPressed: {
      opacity: 0.7,
      transform: [{ scale: 0.97 }],
    },
  });
