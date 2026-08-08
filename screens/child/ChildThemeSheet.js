import { forwardRef, useCallback, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { BottomSheetBackdrop, BottomSheetModal } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useThemeColors } from "../../theme/useThemeColors.js";

const THEMES = [
  {
    id: "blue",
    titleKey: "Blue",
    primaryColor: "#4E83F7",
    backgroundColor: "#EDF4FF",
  },
  {
    id: "pink",
    titleKey: "Pink",
    primaryColor: "#F27BA6",
    backgroundColor: "#FFF0F5",
  },
  {
    id: "green",
    titleKey: "Green",
    primaryColor: "#55BE92",
    backgroundColor: "#EAF9F3",
  },
];

function ThemeRow({ theme, selected, onPress, colors, styles }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={theme.titleKey}
      accessibilityState={{ selected }}
      onPress={() => onPress(theme.id)}
      style={({ pressed }) => [
        styles.themeRow,
        selected && styles.themeRowSelected,
        pressed && styles.themeRowPressed,
      ]}
    >
      <View
        style={[
          styles.themeCircle,
          {
            backgroundColor: theme.primaryColor,
          },
        ]}
      />
      <View style={styles.themeInformation}>
        <Text style={styles.themeTitle}>{theme.titleKey}</Text>
      </View>

      <View
        style={[
          styles.selectionCircle,
          selected && {
            borderColor: theme.primaryColor,
            backgroundColor: theme.primaryColor,
          },
        ]}
      >
        {selected ? (
          <Ionicons name="checkmark" size={15} color={colors.white} />
        ) : null}
      </View>
    </Pressable>
  );
}

const ChildThemeSheet = forwardRef(function ChildThemeSheet(
  { selectedTheme = "blue", onSelectTheme },
  ref,
) {
  const { t } = useTranslation();

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const snapPoints = useMemo(() => ["43%"], []);

  const renderBackdrop = useCallback(
    (props) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
        opacity={0.42}
      />
    ),
    [],
  );

  const handleSelectTheme = (themeId) => {
    onSelectTheme?.(themeId);
    ref?.current?.dismiss();
  };

  return (
    <BottomSheetModal
      ref={ref}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose
      enableDynamicSizing={false}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBackground}
      handleStyle={styles.handle}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{t("Choose a theme")}</Text>

          <Text style={styles.description}>
            {t("Choose the color used for this child")}
          </Text>
        </View>

        <View style={styles.themeList}>
          {THEMES.map((theme) => (
            <ThemeRow
              key={theme.id}
              theme={{
                ...theme,
                titleKey: t(theme.titleKey),
              }}
              selected={theme.id === selectedTheme}
              onPress={handleSelectTheme}
              colors={colors}
              styles={styles}
            />
          ))}
        </View>
      </View>
    </BottomSheetModal>
  );
});

export default ChildThemeSheet;

const createStyles = (colors) =>
  StyleSheet.create({
    sheetBackground: {
      backgroundColor: colors.white,

      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,
    },

    handle: {
      paddingTop: 10,
      paddingBottom: 5,
    },

    handleIndicator: {
      width: 44,
      height: 5,

      borderRadius: 3,

      backgroundColor: colors.textSecondary,

      opacity: 0.25,
    },

    container: {
      flex: 1,

      paddingHorizontal: 18,
      paddingBottom: 16,
    },

    header: {
      paddingHorizontal: 2,
      paddingTop: 2,
      paddingBottom: 15,
    },

    title: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 20,
      lineHeight: 28,

      color: colors.textPrimary,
    },

    description: {
      marginTop: 3,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 12,
      lineHeight: 18,

      color: colors.textSecondary,
    },

    themeList: {
      gap: 8,
    },

    themeRow: {
      minHeight: 72,

      flexDirection: "row",
      alignItems: "center",

      paddingHorizontal: 11,
      paddingVertical: 8,

      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,

      backgroundColor: colors.white,
    },

    themeRowSelected: {
      backgroundColor: colors.selectedBackground,
    },

    themeRowPressed: {
      opacity: 0.72,

      transform: [{ scale: 0.985 }],
    },

    themePreview: {
      width: 54,
      height: 54,

      flexDirection: "row",
      alignItems: "center",

      marginRight: 13,
      paddingHorizontal: 8,

      borderRadius: 17,
    },

    themeColorCircle: {
      width: 17,
      height: 17,

      borderWidth: 3,
      borderColor: colors.white,
      borderRadius: 9,

      shadowColor: colors.textPrimary,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.08,
      shadowRadius: 3,

      elevation: 1,
    },

    previewContent: {
      flex: 1,

      gap: 5,

      marginLeft: 6,
    },

    previewLargeLine: {
      width: "100%",
      height: 5,

      borderRadius: 3,

      opacity: 0.8,
    },

    previewSmallLine: {
      width: "65%",
      height: 4,

      borderRadius: 2,

      opacity: 0.35,
    },

    themeInformation: {
      flex: 1,

      minWidth: 0,
    },

    themeTitle: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 15,
      lineHeight: 21,

      color: colors.textPrimary,
    },

    selectionCircle: {
      width: 24,
      height: 24,

      alignItems: "center",
      justifyContent: "center",

      marginLeft: 10,

      borderWidth: 1.5,
      borderColor: colors.textSecondary,
      borderRadius: 12,
    },

    themeCircle: {
      width: 35,
      height: 35,

      borderRadius: 35,

      borderWidth: 3,
      borderColor: colors.white,

      marginRight: 14,

      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.06,
      shadowRadius: 2,

      elevation: 1,
    },
  });
