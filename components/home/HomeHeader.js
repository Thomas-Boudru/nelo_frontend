import { useMemo } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { useThemeColors } from "../../theme/useThemeColors.js";
import ChildSelectorButton from "./ChildSelectorButton.js";

const HERO_ILLUSTRATIONS = {
  blue: require("../../assets/illustrations/home/blueBearCropped.png"),
  pink: require("../../assets/illustrations/home/pinkBearCropped.png"),
  green: require("../../assets/illustrations/home/greenBearCropped.png"),
};

const CLOUD_LARGE_IMAGE = require("../../assets/illustrations/home/cloud1.png");

const CLOUD_SMALL_IMAGE = require("../../assets/illustrations/home/cloud2.png");

export default function HomeHeader({
  parentFirstName,
  child,
  onPressChild,
  onPressNotifications,
  hasUnreadNotifications = false,
}) {
  const { t } = useTranslation();

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const themeMode = useSelector((state) => state.theme?.mode ?? "blue");

  const heroIllustration =
    HERO_ILLUSTRATIONS[themeMode] ?? HERO_ILLUSTRATIONS.blue;

  return (
    <View style={styles.container}>
      <View pointerEvents="none" style={styles.decorationsContainer}>
        <Image
          source={CLOUD_LARGE_IMAGE}
          resizeMode="contain"
          style={styles.greetingCloud}
        />

        <Image
          source={CLOUD_SMALL_IMAGE}
          resizeMode="contain"
          style={styles.notificationCloud}
        />
      </View>

      <View style={styles.topRow}>
        <View style={styles.greetingContainer}>
          <Text style={styles.greetingTop}>{t("Hello")}</Text>

          <Text style={styles.greetingBottom}>{parentFirstName} 👋</Text>
        </View>

        <View style={styles.actions}>
          <ChildSelectorButton child={child} onPress={onPressChild} />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("Open notifications")}
            onPress={onPressNotifications}
            style={({ pressed }) => [
              styles.notificationButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name="notifications-outline"
              size={26}
              color={colors.textSecondary}
            />

            {hasUnreadNotifications && (
              <View
                accessibilityElementsHidden
                importantForAccessibility="no"
                style={styles.notificationBadge}
              />
            )}
          </Pressable>
        </View>
      </View>

      <View style={styles.hero}>
        <View pointerEvents="none" style={styles.heroIllustrationContainer}>
          <Image
            source={heroIllustration}
            resizeMode="contain"
            style={styles.heroImage}
          />
        </View>

        <View style={styles.heroTextContainer}>
          <Text style={styles.title}>{t("Today")}</Text>

          <Text style={styles.subtitle}>
            {t("Everything looks normal for child today", {
              childName: child?.firstName,
            })}
          </Text>
        </View>
      </View>
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      position: "relative",

      paddingHorizontal: 20,

      overflow: "visible",
    },

    decorationsContainer: {
      ...StyleSheet.absoluteFillObject,

      zIndex: 0,

      overflow: "visible",
    },

    greetingCloud: {
      position: "absolute",

      top: 2,
      left: 82,

      width: 82,
      height: 48,

      opacity: 0.45,
    },

    notificationCloud: {
      position: "absolute",

      top: 66,
      right: 9,

      width: 62,
      height: 38,

      opacity: 0.48,
    },

    topRow: {
      position: "relative",
      zIndex: 3,

      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",

      gap: 12,
    },

    greetingContainer: {
      flex: 1,

      zIndex: 2,
    },

    greetingTop: {
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 18,
      lineHeight: 24,

      color: colors.textSecondary,
    },

    greetingBottom: {
      marginTop: 2,

      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 20,
      lineHeight: 27,

      color: colors.textPrimary,
    },

    actions: {
      zIndex: 3,

      flexDirection: "row",
      alignItems: "center",

      gap: 10,
    },

    notificationButton: {
      width: 40,
      height: 40,

      alignItems: "center",
      justifyContent: "center",

      borderRadius: 20,
      backgroundColor: colors.lightBackground,

      shadowColor: colors.textPrimary,
      shadowOffset: {
        width: 0,
        height: 5,
      },
      shadowOpacity: 0.06,
      shadowRadius: 14,

      elevation: 3,
    },

    notificationBadge: {
      position: "absolute",

      top: 0,
      right: 0,

      width: 12,
      height: 12,

      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.white,

      backgroundColor: colors.primary,
    },

    hero: {
      position: "relative",
      zIndex: 1,

      height: 180,

      justifyContent: "center",

      marginTop: 6,

      overflow: "visible",
    },

    heroIllustrationContainer: {
      ...StyleSheet.absoluteFillObject,

      zIndex: 0,

      overflow: "visible",
    },

    heroImage: {
      position: "absolute",

      right: -35,
      bottom: -12,

      width: 290,
      height: 205,

      opacity: 0.45,
    },
    heroTextContainer: {
      zIndex: 2,

      width: "53%",

      justifyContent: "center",
    },

    title: {
      fontFamily: "Lora_700Bold",
      fontSize: 38,
      lineHeight: 42,
      letterSpacing: -1.1,
      marginTop: -15,

      color: colors.textPrimary,
    },

    subtitle: {
      maxWidth: 210,
      marginTop: 4,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 12,
      lineHeight: 17,

      color: colors.textSecondary,
    },

    pressed: {
      opacity: 0.75,
      transform: [{ scale: 0.98 }],
    },

    childFallbackImage: {
      width: 30,
      height: 30,
    },
  });
