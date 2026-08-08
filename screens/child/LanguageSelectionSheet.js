import { forwardRef, useCallback, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetFlatList,
  BottomSheetModal,
} from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import GreatBritainFlag from "../../assets/icons/flags/en.svg";
import FranceFlag from "../../assets/icons/flags/fr.svg";
import GermanyFlag from "../../assets/icons/flags/de.svg";
import SpainFlag from "../../assets/icons/flags/es.svg";
import ItalyFlag from "../../assets/icons/flags/it.svg";
import NetherlandsFlag from "../../assets/icons/flags/nl.svg";
import PortugalFlag from "../../assets/icons/flags/pt.svg";

import { useThemeColors } from "../../theme/useThemeColors.js";

export const LANGUAGES = [
  {
    id: "en",
    label: "English",
    FlagComponent: GreatBritainFlag,
  },
  {
    id: "fr",
    label: "Français",
    FlagComponent: FranceFlag,
  },
  {
    id: "de",
    label: "Deutsch",
    FlagComponent: GermanyFlag,
  },
  {
    id: "es",
    label: "Español",
    FlagComponent: SpainFlag,
  },
  {
    id: "it",
    label: "Italiano",
    FlagComponent: ItalyFlag,
  },
  {
    id: "nl",
    label: "Nederlands",
    FlagComponent: NetherlandsFlag,
  },
  {
    id: "pt",
    label: "Português",
    FlagComponent: PortugalFlag,
  },
];

function LanguageRow({ language, selected, onPress, colors, styles }) {
  const FlagComponent = language.FlagComponent;

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={language.label}
      accessibilityState={{ selected }}
      onPress={() => onPress(language)}
      style={({ pressed }) => [
        styles.languageRow,
        selected && styles.languageRowSelected,
        pressed && styles.languageRowPressed,
      ]}
    >
      <FlagComponent width={30} height={30} />

      <Text style={styles.languageName}>{language.label}</Text>

      <View
        style={[
          styles.selectionIndicator,
          selected && styles.selectionIndicatorSelected,
        ]}
      >
        {selected ? (
          <Ionicons name="checkmark" size={15} color={colors.white} />
        ) : null}
      </View>
    </Pressable>
  );
}

const LanguageSelectionSheet = forwardRef(function LanguageSelectionSheet(
  { selectedLanguage = "en", onSelectLanguage },
  ref,
) {
  const { t, i18n } = useTranslation();
  const colors = useThemeColors();

  const styles = useMemo(() => createStyles(colors), [colors]);

  const snapPoints = useMemo(() => ["78%"], []);

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

  const handleSelectLanguage = async (language) => {
    try {
      const languageChanged = await onSelectLanguage?.(language);

      if (languageChanged === false) {
        return;
      }

      ref?.current?.dismiss();
    } catch (error) {
      console.log("Unable to change language:", error);
    }
  };

  const renderLanguage = ({ item }) => (
    <LanguageRow
      language={item}
      selected={item.id === selectedLanguage}
      onPress={handleSelectLanguage}
      colors={colors}
      styles={styles}
    />
  );

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
          <Text style={styles.title}>{t("Choose your language")}</Text>

          <Text style={styles.description}>
            {t("You can change the application language at any time")}
          </Text>
        </View>

        <BottomSheetFlatList
          data={LANGUAGES}
          keyExtractor={(item) => item.id}
          renderItem={renderLanguage}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      </View>
    </BottomSheetModal>
  );
});

export default LanguageSelectionSheet;

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
      paddingBottom: 22,
    },

    header: {
      paddingHorizontal: 3,
      paddingTop: 5,
      paddingBottom: 17,
    },

    title: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 21,
      lineHeight: 29,

      color: colors.textPrimary,
    },

    description: {
      marginTop: 5,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 12,
      lineHeight: 18,

      color: colors.textSecondary,
    },

    listContent: {
      paddingBottom: 12,
    },

    languageRow: {
      minHeight: 64,

      flexDirection: "row",
      alignItems: "center",

      paddingHorizontal: 15,
      paddingVertical: 10,
      marginBottom: 8,

      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,

      backgroundColor: colors.white,
    },

    languageRowSelected: {
      borderColor: colors.primary,

      backgroundColor: colors.selectedBackground,
    },

    languageRowPressed: {
      opacity: 0.75,

      transform: [{ scale: 0.99 }],
    },

    languageName: {
      flex: 1,

      marginLeft: 14,

      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 15,
      lineHeight: 21,

      color: colors.textPrimary,
    },

    selectionIndicator: {
      width: 25,
      height: 25,

      alignItems: "center",
      justifyContent: "center",

      marginLeft: 10,

      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 13,

      backgroundColor: colors.white,
    },

    selectionIndicatorSelected: {
      borderColor: colors.primary,

      backgroundColor: colors.primary,
    },
  });
