import { forwardRef, useCallback, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useThemeColors } from "../../theme/useThemeColors.js";

const AddMomentSheet = forwardRef(function AddMomentSheet(
  { childName, onSelectPhoto, onSelectNote, onSelectMilestone },
  ref,
) {
  const { t } = useTranslation();

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

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

  const handleSelect = (callback) => {
    ref?.current?.dismiss();

    /*
     * On attend légèrement que la bottom sheet soit fermée
     * avant de naviguer vers l'écran suivant.
     */
    setTimeout(() => {
      callback?.();
    }, 220);
  };

  return (
    <BottomSheetModal
      ref={ref}
      index={0}
      enableDynamicSizing
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBackground}
      handleStyle={styles.handle}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <BottomSheetView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{t("Add a moment")}</Text>

          <Text style={styles.description}>
            {t("Choose what you would like to remember about child", {
              childName,
            })}
          </Text>
        </View>

        <View style={styles.optionsContainer}>
          <MomentTypeRow
            icon="images-outline"
            title={t("Photo")}
            description={t("Add one or more photos with a caption")}
            iconBackground={`${colors.primary}12`}
            iconColor={colors.primary}
            onPress={() => handleSelect(onSelectPhoto)}
            colors={colors}
            styles={styles}
          />

          <MomentTypeRow
            icon="create-outline"
            title={t("Note")}
            description={t("Write down a small memory or anecdote")}
            iconBackground="#FFF7E8"
            iconColor="#E7A42B"
            onPress={() => handleSelect(onSelectNote)}
            colors={colors}
            styles={styles}
          />

          <MomentTypeRow
            icon="star-outline"
            title={t("Milestone")}
            description={t("Save an important first or achievement")}
            iconBackground="#FFF0F3"
            iconColor="#E9788D"
            isLast
            onPress={() => handleSelect(onSelectMilestone)}
            colors={colors}
            styles={styles}
          />
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

function MomentTypeRow({
  icon,
  title,
  description,
  iconBackground,
  iconColor,
  onPress,
  isLast = false,
  colors,
  styles,
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [
        styles.optionRow,
        !isLast && styles.optionRowBorder,
        pressed && styles.optionRowPressed,
      ]}
    >
      <View
        style={[
          styles.optionIconContainer,
          {
            backgroundColor: iconBackground,
          },
        ]}
      >
        <Ionicons name={icon} size={23} color={iconColor} />
      </View>

      <View style={styles.optionTextContainer}>
        <Text style={styles.optionTitle}>{title}</Text>

        <Text style={styles.optionDescription}>{description}</Text>
      </View>

      <Ionicons name="chevron-forward" size={17} color={colors.textSecondary} />
    </Pressable>
  );
}

export default AddMomentSheet;

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
      paddingHorizontal: 22,
      paddingTop: 8,
      paddingBottom: 28,
    },

    header: {
      alignItems: "flex-start",
    },

    headerIcon: {
      width: 58,
      height: 58,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 29,
      backgroundColor: colors.selectedBackground,
    },

    title: {
      marginTop: 13,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 21,
      lineHeight: 29,
      textAlign: "center",
      color: colors.textPrimary,
    },

    description: {
      maxWidth: 320,
      marginTop: 5,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 12,
      lineHeight: 19,
      textAlign: "center",
      color: colors.textSecondary,
    },

    optionsContainer: {
      marginTop: 22,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderRadius: 22,
      backgroundColor: colors.white,
      overflow: "hidden",
    },

    optionRow: {
      minHeight: 78,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 15,
    },

    optionRowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },

    optionRowPressed: {
      backgroundColor: colors.selectedBackground,
    },

    optionIconContainer: {
      width: 46,
      height: 46,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 13,
      borderRadius: 23,
    },

    optionTextContainer: {
      flex: 1,
      minWidth: 0,
      marginRight: 12,
    },

    optionTitle: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 14,
      lineHeight: 20,
      color: colors.textPrimary,
    },

    optionDescription: {
      marginTop: 3,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 11,
      lineHeight: 16,
      color: colors.textSecondary,
    },

    cancelButton: {
      minHeight: 46,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 10,
      borderRadius: 15,
    },

    cancelButtonPressed: {
      backgroundColor: colors.selectedBackground,
    },

    cancelButtonText: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 13,
      lineHeight: 18,
      color: colors.textSecondary,
    },
  });
