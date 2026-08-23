import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useThemeColors } from "../../theme/useThemeColors.js";

export default function NeloQuestionBar({ onPress, onPressVoice }) {
  const { t } = useTranslation();

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleVoicePress = (event) => {
    event.stopPropagation();
    onPressVoice?.();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("Ask Nelo a question")}
      accessibilityHint={t("Open Nelo copilot")}
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        pressed && styles.containerPressed,
      ]}
    >
      <View style={styles.content}>
        <View style={styles.sparklesContainer}>
          <Ionicons name="sparkles" size={19} color={colors.primary} />
        </View>

        <Text style={styles.placeholder} numberOfLines={1}>
          {t("Ask Nelo placeholder")}
        </Text>
      </View>

      {/*<Pressable
        accessibilityRole="button"
        accessibilityLabel={t("Ask Nelo with voice")}
        onPress={handleVoicePress}
        hitSlop={6}
        style={({ pressed }) => [
          styles.voiceButton,
          pressed && styles.voiceButtonPressed,
        ]}
      >
        <Ionicons name="mic-outline" size={21} color={colors.white} />
      </Pressable>*/}
    </Pressable>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      height: 56,
      marginTop: -23,

      flexDirection: "row",
      alignItems: "center",

      marginHorizontal: 20,
      paddingLeft: 14,
      paddingRight: 8,

      borderRadius: 28,
      backgroundColor: colors.white,

      shadowColor: colors.textPrimary,
      shadowOffset: {
        width: 0,
        height: 6,
      },
      shadowOpacity: 0.07,
      shadowRadius: 18,

      elevation: 4,
    },

    content: {
      flex: 1,

      flexDirection: "row",
      alignItems: "center",
    },

    sparklesContainer: {
      width: 32,
      height: 32,

      alignItems: "center",
      justifyContent: "center",
    },

    placeholder: {
      flex: 1,

      marginLeft: 10,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 14,
      lineHeight: 19,

      color: colors.textSecondary,
    },

    voiceButton: {
      width: 40,
      height: 40,

      alignItems: "center",
      justifyContent: "center",

      borderRadius: 20,
      backgroundColor: colors.primary,

      shadowColor: colors.primary,
      shadowOffset: {
        width: 0,
        height: 3,
      },
      shadowOpacity: 0.2,
      shadowRadius: 7,

      elevation: 5,
    },

    containerPressed: {
      opacity: 0.9,
      transform: [{ scale: 0.99 }],
    },

    voiceButtonPressed: {
      opacity: 0.9,
      transform: [{ scale: 0.94 }],
    },
  });
