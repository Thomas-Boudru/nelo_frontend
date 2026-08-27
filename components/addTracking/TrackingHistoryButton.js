import { useMemo } from "react";
import { Pressable, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";

import TimePastIcon from "../../assets/icons/header/historic.svg";
import { useThemeColors } from "../../theme/useThemeColors.js";

/*
 * Bouton d'historique affiché en haut à droite de l'en-tête des sheets
 * d'ajout de suivi. Il ouvre l'écran de suivi correspondant au type.
 */
export default function TrackingHistoryButton({ accessibilityLabel, onPress }) {
  const { t } = useTranslation();

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? t("View history")}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
    >
      <TimePastIcon width={20} height={20} color={colors.iconSecondary} />
    </Pressable>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    button: {
      width: 40,
      height: 40,

      alignItems: "center",
      justifyContent: "center",

      marginTop: -3,

      borderRadius: 20,
      backgroundColor: `${colors.textSecondary}12`,
    },

    buttonPressed: {
      opacity: 0.5,
      transform: [{ scale: 0.94 }],
    },
  });
