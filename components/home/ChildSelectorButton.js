import { useMemo } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import BabyFaceIcon from "../../assets/icons/header/faceBaby.svg";

import { useThemeColors } from "../../theme/useThemeColors.js";

const BABY_FALLBACK_ICONS = {
  blue: require("../../assets/icons/header/babyBlue.png"),
  pink: require("../../assets/icons/header/babyPink.png"),
  green: require("../../assets/icons/header/babyGreen.png"),
};

export default function ChildSelectorButton({ child, onPress }) {
  const { t } = useTranslation();

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const themeMode = useSelector((state) => state.theme?.mode ?? "blue");

  const babyFallbackIcon =
    BABY_FALLBACK_ICONS[themeMode] ?? BABY_FALLBACK_ICONS.blue;

  const childAgeLabel =
    child?.ageLabel ??
    t("Child age in months", {
      count: child?.ageInMonths ?? 0,
    });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("Open child selector")}
      onPress={onPress}
      style={({ pressed }) => [styles.childSelector, pressed && styles.pressed]}
    >
      <View style={styles.childImageOuter}>
        {child?.profilePicture ? (
          <Image source={child.profilePicture} style={styles.childImage} />
        ) : (
          <View style={styles.childImageFallback}>
            <BabyFaceIcon width={50} height={50} color={colors.primary} />
          </View>
        )}
      </View>

      <View style={styles.childInformation}>
        <Text style={styles.childName} numberOfLines={1}>
          {child?.firstName}
        </Text>

        <Text style={styles.childAge} numberOfLines={1}>
          {childAgeLabel}
        </Text>
      </View>

      <Ionicons
        name="chevron-down"
        size={16}
        color={colors.textSecondary}
        style={styles.childChevron}
      />
    </Pressable>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    childSelector: {
      minWidth: 150,
      height: 58,

      flexDirection: "row",
      alignItems: "center",

      paddingLeft: 5,
      paddingRight: 12,

      borderRadius: 29,
      backgroundColor: colors.lightBackground,

      overflow: "visible",

      shadowColor: colors.textPrimary,
      shadowOffset: {
        width: 0,
        height: 5,
      },
      shadowOpacity: 0.06,
      shadowRadius: 14,

      elevation: 3,
    },

    childImageOuter: {
      width: 68,
      height: 68,

      alignItems: "center",
      justifyContent: "center",

      marginLeft: -5,
      marginRight: 5,

      borderRadius: 34,
      borderWidth: 4,
      borderColor: colors.lightBackground,

      backgroundColor: colors.lightBackground,

      shadowColor: colors.textPrimary,
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.08,
      shadowRadius: 10,

      elevation: 4,

      overflow: "hidden",
    },

    childImage: {
      width: "100%",
      height: "100%",

      borderRadius: 34,

      resizeMode: "cover",
    },

    childImageFallback: {
      width: "100%",
      height: "100%",

      alignItems: "center",
      justifyContent: "center",

      borderRadius: 34,
      backgroundColor: colors.selectedBackground,
    },

    childFallbackImage: {
      width: 30,
      height: 30,
    },

    childInformation: {
      flex: 1,
      justifyContent: "center",
    },

    childName: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 12,
      lineHeight: 17,

      color: colors.textPrimary,
    },

    childAge: {
      marginTop: 1,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 10,
      lineHeight: 14,

      color: colors.textSecondary,
    },

    childChevron: {
      marginLeft: 0,
    },

    pressed: {
      opacity: 0.75,
      transform: [{ scale: 0.98 }],
    },
  });
