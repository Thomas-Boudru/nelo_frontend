import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import ChildSelectorButton from "../../home/ChildSelectorButton.js";
import { useThemeColors } from "../../../theme/useThemeColors.js";

export default function TrackingHeader({ child, onPressChild }) {
  const { t } = useTranslation();

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <View style={styles.textContainer}>
        <Text style={styles.title}>{t("Tracking")}</Text>

        {/*<Text style={styles.subtitle} numberOfLines={2}>
          {t("Review your child's day and progress")}
        </Text>*/}
      </View>

      <ChildSelectorButton child={child} onPress={onPressChild} />
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",

      gap: 16,

      paddingHorizontal: 20,
      paddingVertical: 10,
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

    subtitle: {
      marginTop: 2,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 12,
      lineHeight: 17,

      color: colors.textSecondary,
    },
  });
