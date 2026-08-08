import { useEffect, useMemo, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useThemeColors } from "../../../theme/useThemeColors";

const TOAST_CONFIG = {
  success: {
    icon: "checkmark-circle-outline",
  },
  info: {
    icon: "information-circle-outline",
  },
  error: {
    icon: "alert-circle-outline",
  },
};

export default function ToastMessage({
  visible,
  type = "info",
  title,
  message,
  onClose,
}) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  const styles = useMemo(() => createStyles(colors), [colors]);

  const translateY = useRef(new Animated.Value(-30)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const config = TOAST_CONFIG[type] ?? TOAST_CONFIG.info;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          speed: 18,
          bounciness: 5,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();

      return;
    }

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -20,
        duration: 160,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 140,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, opacity, translateY]);

  if (!visible && !title && !message) {
    return null;
  }

  const accentColor =
    type === "success"
      ? colors.success
      : type === "error"
        ? colors.error
        : colors.primary;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.overlay,
        {
          paddingTop: insets.top + 10,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.toast,
          {
            opacity,
            transform: [{ translateY }],
          },
        ]}
      >
        <View
          style={[
            styles.accent,
            {
              backgroundColor: accentColor,
            },
          ]}
        />

        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: `${accentColor}14`,
            },
          ]}
        >
          <Ionicons name={config.icon} size={22} color={accentColor} />
        </View>

        <View style={styles.content}>
          {title ? (
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          ) : null}

          {message ? (
            <Text style={styles.message} numberOfLines={2}>
              {message}
            </Text>
          ) : null}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close notification"
          hitSlop={10}
          onPress={onClose}
          style={({ pressed }) => [
            styles.closeButton,
            pressed && styles.closeButtonPressed,
          ]}
        >
          <Ionicons name="close" size={18} color={colors.textSecondary} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    overlay: {
      position: "absolute",

      top: 0,
      right: 0,
      left: 0,

      zIndex: 9999,
      elevation: 9999,

      paddingHorizontal: 16,
    },

    toast: {
      position: "relative",

      width: "100%",
      minHeight: 72,

      flexDirection: "row",
      alignItems: "center",

      paddingVertical: 12,
      paddingRight: 10,
      paddingLeft: 16,

      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderRadius: 20,

      backgroundColor: colors.white,

      overflow: "hidden",

      shadowColor: colors.textPrimary,
      shadowOffset: {
        width: 0,
        height: 8,
      },
      shadowOpacity: 0.12,
      shadowRadius: 18,

      elevation: 10,
    },

    accent: {
      position: "absolute",

      top: 12,
      bottom: 12,
      left: 0,

      width: 4,

      borderTopRightRadius: 4,
      borderBottomRightRadius: 4,
    },

    iconContainer: {
      width: 42,
      height: 42,

      alignItems: "center",
      justifyContent: "center",

      marginRight: 12,

      borderRadius: 21,
    },

    content: {
      flex: 1,

      minWidth: 0,
    },

    title: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 14,
      lineHeight: 20,

      color: colors.textPrimary,
    },

    message: {
      marginTop: 2,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 12,
      lineHeight: 18,

      color: colors.textSecondary,
    },

    closeButton: {
      width: 34,
      height: 34,

      alignItems: "center",
      justifyContent: "center",

      marginLeft: 6,

      borderRadius: 17,
    },

    closeButtonPressed: {
      backgroundColor: colors.selectedBackground,
    },
  });
