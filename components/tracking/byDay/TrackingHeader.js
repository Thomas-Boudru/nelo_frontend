import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import ChildSelectorButton from "../../home/ChildSelectorButton.js";
import { useThemeColors } from "../../../theme/useThemeColors.js";

export default function TrackingHeader({ child, onPressChild, onPressShare }) {
  const { t } = useTranslation();

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <View style={styles.textContainer}>
        <Text style={styles.title}>{t("Tracking")}</Text>
      </View>

      <View style={styles.headerActions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("Share child data")}
          accessibilityHint={t(
            "Create a secure link to share your child's tracking data",
          )}
          hitSlop={6}
          onPress={onPressShare}
          style={({ pressed }) => [
            styles.shareButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="share-outline" size={20} color={colors.primary} />
        </Pressable>

        <ChildSelectorButton child={child} onPress={onPressChild} />
      </View>
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 10,
      gap: 12,
    },

    textContainer: {
      flex: 1,
      minWidth: 0,
    },

    title: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 22,
      lineHeight: 30,
      letterSpacing: -0.5,
      color: colors.textPrimary,
    },

    headerActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },

    shareButton: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.lightBackground,
      borderWidth: 1,
      borderColor: colors.lightBackground,
    },

    pressed: {
      opacity: 0.72,
    },
  });
