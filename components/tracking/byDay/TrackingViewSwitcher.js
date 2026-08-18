import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";

import { useThemeColors } from "../../../theme/useThemeColors.js";

export default function TrackingViewSwitcher({ mode = "day", onChangeMode }) {
  const { t } = useTranslation();

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const isDayMode = mode === "day";

  const [selectorWidth, setSelectorWidth] = useState(0);

  const animatedPosition = useRef(
    new Animated.Value(isDayMode ? 0 : 1),
  ).current;

  useEffect(() => {
    Animated.timing(animatedPosition, {
      toValue: isDayMode ? 0 : 1,
      duration: 190,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [animatedPosition, isDayMode]);

  const indicatorWidth = selectorWidth > 0 ? (selectorWidth - 6) / 2 : 0;

  const indicatorTranslateX = animatedPosition.interpolate({
    inputRange: [0, 1],
    outputRange: [0, indicatorWidth],
  });

  const handleSelectorLayout = (event) => {
    setSelectorWidth(event.nativeEvent.layout.width);
  };

  const handlePressDayMode = () => {
    if (!isDayMode) {
      onChangeMode?.("day");
    }
  };

  const handlePressTypeMode = () => {
    if (isDayMode) {
      onChangeMode?.("type");
    }
  };

  return (
    <View style={styles.container}>
      <View onLayout={handleSelectorLayout} style={styles.modeSelector}>
        {selectorWidth > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.selectedIndicator,
              {
                width: indicatorWidth,
                transform: [
                  {
                    translateX: indicatorTranslateX,
                  },
                ],
              },
            ]}
          />
        ) : null}

        <Pressable
          accessibilityRole="tab"
          accessibilityLabel={t("View tracking by day")}
          accessibilityState={{
            selected: isDayMode,
          }}
          onPress={handlePressDayMode}
          style={({ pressed }) => [
            styles.modeButton,
            pressed && styles.modeButtonPressed,
          ]}
        >
          <Text
            numberOfLines={1}
            style={[
              styles.modeButtonText,
              isDayMode && styles.modeButtonTextSelected,
            ]}
          >
            {t("By day")}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="tab"
          accessibilityLabel={t("View tracking by type")}
          accessibilityState={{
            selected: !isDayMode,
          }}
          onPress={handlePressTypeMode}
          style={({ pressed }) => [
            styles.modeButton,
            pressed && styles.modeButtonPressed,
          ]}
        >
          <Text
            numberOfLines={1}
            style={[
              styles.modeButtonText,
              !isDayMode && styles.modeButtonTextSelected,
            ]}
          >
            {t("By type")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 20,
      marginTop: 8,
    },

    modeSelector: {
      position: "relative",

      width: "100%",
      height: 44,

      flexDirection: "row",

      padding: 3,

      borderRadius: 15,
      borderWidth: 1,
      borderColor: colors.border ?? "#DCE5F2",

      backgroundColor: colors.white,

      overflow: "hidden",
    },

    selectedIndicator: {
      position: "absolute",

      top: 3,
      bottom: 3,
      left: 3,

      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.primaryDisabled,

      backgroundColor: colors.primarySoft,
    },
    modeButton: {
      zIndex: 1,

      flex: 1,

      alignItems: "center",
      justifyContent: "center",

      paddingHorizontal: 12,

      borderRadius: 12,
    },

    modeButtonPressed: {
      opacity: 0.72,
    },

    modeButtonText: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 13,
      lineHeight: 18,

      color: colors.textSecondary,
    },

    modeButtonTextSelected: {
      color: colors.primaryPressed,
    },
  });
