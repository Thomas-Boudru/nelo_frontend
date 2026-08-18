import { useMemo } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { TRACKING_TYPE_CONFIG } from "../../../data/mockTrackingData.js";
import { useThemeColors } from "../../../theme/useThemeColors.js";

export default function TrackingTypeCard({
  item,
  variant = "default",
  onPress,
}) {
  const { t } = useTranslation();

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const isCompact = variant === "compact";

  const fallbackVisual = TRACKING_TYPE_CONFIG.bottle;

  const image = item?.image ?? fallbackVisual.image;

  const backgroundColor =
    item?.backgroundColor ?? fallbackVisual.backgroundColor;

  const title = item?.titleKey ? t(item.titleKey) : item?.title;

  const subtitle = item?.subtitleKey ? t(item.subtitleKey) : item?.subtitle;

  const metadata = item?.metadataKey ? t(item.metadataKey) : item?.metadata;

  const accessibilityLabel = [title, subtitle, metadata]
    .filter(Boolean)
    .join(", ");

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={t("Opens the complete tracking history")}
      onPress={() => onPress?.(item)}
      style={({ pressed }) => [
        styles.card,
        isCompact && styles.cardCompact,
        pressed && styles.cardPressed,
      ]}
    >
      <View
        style={[
          styles.imageContainer,
          isCompact && styles.imageContainerCompact,
          {
            backgroundColor,
          },
        ]}
      >
        <Image
          source={image}
          resizeMode="contain"
          style={[styles.image, isCompact && styles.imageCompact]}
        />
      </View>

      <View style={styles.content}>
        <Text
          numberOfLines={1}
          style={[styles.title, isCompact && styles.titleCompact]}
        >
          {title}
        </Text>

        {!isCompact && subtitle ? (
          <Text numberOfLines={2} style={styles.subtitle}>
            {subtitle}
          </Text>
        ) : null}

        {metadata ? (
          <Text
            numberOfLines={isCompact ? 2 : 1}
            style={[styles.metadata, isCompact && styles.metadataCompact]}
          >
            {metadata}
          </Text>
        ) : null}
      </View>

      <Ionicons
        name="chevron-forward"
        size={isCompact ? 18 : 21}
        color={colors.textSecondary}
      />
    </Pressable>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    card: {
      minHeight: 104,

      flexDirection: "row",
      alignItems: "center",

      gap: 13,

      paddingHorizontal: 14,
      paddingVertical: 14,

      borderRadius: 20,

      backgroundColor: colors.white,

      shadowColor: colors.textPrimary,
      shadowOffset: {
        width: 0,
        height: 5,
      },
      shadowOpacity: 0.045,
      shadowRadius: 14,

      elevation: 2,
    },

    cardCompact: {
      minHeight: 86,

      gap: 10,

      paddingHorizontal: 12,
      paddingVertical: 12,

      borderRadius: 18,
    },

    cardPressed: {
      opacity: 0.75,
      transform: [{ scale: 0.985 }],
    },

    imageContainer: {
      width: 62,
      height: 62,

      alignItems: "center",
      justifyContent: "center",

      borderRadius: 18,
    },

    imageContainerCompact: {
      width: 48,
      height: 48,

      borderRadius: 15,
    },

    image: {
      width: 44,
      height: 44,
    },

    imageCompact: {
      width: 33,
      height: 33,
    },

    content: {
      flex: 1,
      minWidth: 0,
    },

    title: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 15,
      lineHeight: 21,

      color: colors.textPrimary,
    },

    titleCompact: {
      fontSize: 13,
      lineHeight: 18,
    },

    subtitle: {
      marginTop: 2,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 11,
      lineHeight: 16,

      color: colors.textSecondary,
    },

    metadata: {
      marginTop: 4,

      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 11,
      lineHeight: 16,

      color: colors.textSecondary,
    },

    metadataCompact: {
      marginTop: 2,

      fontSize: 9,
      lineHeight: 13,
    },
  });
