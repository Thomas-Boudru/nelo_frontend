import { forwardRef, useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useThemeColors } from "../../theme/useThemeColors.js";

const UNIT_GROUPS = [
  {
    id: "weight",
    titleKey: "Weight",
    icon: "scale-outline",
    options: [
      {
        id: "kg",
        label: "kg",
        accessibilityLabelKey: "Kilograms",
      },
      {
        id: "lb",
        label: "lb",
        accessibilityLabelKey: "Pounds",
      },
    ],
  },
  {
    id: "length",
    titleKey: "Length",
    descriptionKey: "Used for height and head circumference",
    icon: "resize-outline",
    options: [
      {
        id: "cm",
        label: "cm",
        accessibilityLabelKey: "Centimeters",
      },
      {
        id: "in",
        label: "in",
        accessibilityLabelKey: "Inches",
      },
    ],
  },
  {
    id: "temperature",
    titleKey: "Temperature",
    icon: "thermometer-outline",
    options: [
      {
        id: "celsius",
        label: "°C",
        accessibilityLabelKey: "Celsius",
      },
      {
        id: "fahrenheit",
        label: "°F",
        accessibilityLabelKey: "Fahrenheit",
      },
    ],
  },
];

function SegmentedControl({
  options,
  selectedValue,
  onSelect,
  disabled = false,
  colors,
  styles,
  t,
}) {
  return (
    <View
      accessibilityRole="radiogroup"
      style={[
        styles.segmentedControl,
        disabled && styles.segmentedControlDisabled,
      ]}
    >
      {options.map((option) => {
        const selected = option.id === selectedValue;

        return (
          <Pressable
            key={option.id}
            accessibilityRole="radio"
            accessibilityLabel={t(option.accessibilityLabelKey)}
            accessibilityState={{
              selected,
              disabled,
            }}
            disabled={disabled}
            onPress={() => onSelect(option.id)}
            style={({ pressed }) => [
              styles.segment,
              selected && styles.segmentSelected,
              pressed && !disabled && styles.segmentPressed,
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                selected && styles.segmentTextSelected,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function UnitRow({
  group,
  selectedValue,
  onSelect,
  disabled = false,
  isLast = false,
  colors,
  styles,
  t,
}) {
  return (
    <View
      style={[
        styles.unitRow,
        !isLast && styles.unitRowBorder,
        disabled && styles.unitRowDisabled,
      ]}
    >
      <View style={styles.unitIconContainer}>
        <Ionicons
          name={group.icon}
          size={21}
          color={disabled ? colors.textSecondary : colors.primary}
        />
      </View>

      <View style={styles.unitInformation}>
        <Text style={styles.unitTitle}>{t(group.titleKey)}</Text>

        {group.descriptionKey ? (
          <Text style={styles.unitDescription}>{t(group.descriptionKey)}</Text>
        ) : null}
      </View>

      <SegmentedControl
        options={group.options}
        selectedValue={selectedValue}
        onSelect={onSelect}
        disabled={disabled}
        colors={colors}
        styles={styles}
        t={t}
      />
    </View>
  );
}

const MeasurementUnitsSheet = forwardRef(function MeasurementUnitsSheet(
  {
    initialUnits = {
      weight: "kg",
      length: "cm",
      temperature: "celsius",
    },
    isSaving = false,
    onChangeUnits,
  },
  ref,
) {
  const { t } = useTranslation();

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [units, setUnits] = useState(initialUnits);

  const snapPoints = useMemo(() => ["55%"], []);

  const renderBackdrop = useCallback(
    (props) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior={isSaving ? "none" : "close"}
        opacity={0.42}
      />
    ),
    [isSaving],
  );

  const handleSelectUnit = async (unitType, unitValue) => {
    if (units[unitType] === unitValue || isSaving) {
      return;
    }

    const previousUnits = units;

    const nextUnits = {
      ...units,
      [unitType]: unitValue,
    };

    /*
     * Mise à jour immédiate pour une interface fluide.
     */
    setUnits(nextUnits);

    try {
      const saved = await onChangeUnits?.({
        unitType,
        unitValue,
        units: nextUnits,
      });

      /*
       * Le parent peut retourner false si la sauvegarde
       * n’a pas fonctionné.
       */
      if (saved === false) {
        setUnits(previousUnits);
      }
    } catch (error) {
      setUnits(previousUnits);

      console.log("Unable to update measurement units:", error);
    }
  };

  return (
    <BottomSheetModal
      ref={ref}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose={!isSaving}
      enableDynamicSizing={false}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBackground}
      handleStyle={styles.handle}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <BottomSheetView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{t("Measurement units")}</Text>

          <Text style={styles.description}>
            {t("Choose the units Nelo should use throughout the application")}
          </Text>
        </View>

        <View style={styles.settingsCard}>
          {UNIT_GROUPS.map((group, index) => (
            <UnitRow
              key={group.id}
              group={group}
              selectedValue={units[group.id]}
              disabled={isSaving}
              isLast={index === UNIT_GROUPS.length - 1}
              onSelect={(value) => {
                handleSelectUnit(group.id, value);
              }}
              colors={colors}
              styles={styles}
              t={t}
            />
          ))}
        </View>

        <View style={styles.informationCard}>
          <Ionicons
            name="information-circle-outline"
            size={18}
            color={colors.primary}
          />

          <Text style={styles.informationText}>
            {t(
              "Existing measurements will automatically be displayed in the selected units",
            )}
          </Text>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

export default MeasurementUnitsSheet;

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
      paddingHorizontal: 18,
      paddingBottom: 24,
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

    settingsCard: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderRadius: 22,

      backgroundColor: colors.white,

      overflow: "hidden",

      shadowColor: colors.textPrimary,
      shadowOffset: {
        width: 0,
        height: 5,
      },
      shadowOpacity: 0.035,
      shadowRadius: 14,

      elevation: 2,
    },

    unitRow: {
      minHeight: 82,

      flexDirection: "row",
      alignItems: "center",

      paddingHorizontal: 14,
      paddingVertical: 12,
    },

    unitRowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },

    unitRowDisabled: {
      opacity: 0.5,
    },

    unitIconContainer: {
      width: 40,
      height: 40,

      alignItems: "center",
      justifyContent: "center",

      marginRight: 11,

      borderRadius: 20,

      backgroundColor: colors.selectedBackground,
    },

    unitInformation: {
      flex: 1,

      minWidth: 0,
      marginRight: 12,
    },

    unitTitle: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 14,
      lineHeight: 20,

      color: colors.textPrimary,
    },

    unitDescription: {
      marginTop: 2,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 10,
      lineHeight: 15,

      color: colors.textSecondary,
    },

    segmentedControl: {
      width: 112,
      height: 42,

      flexDirection: "row",

      padding: 3,

      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 15,

      backgroundColor: colors.selectedBackground,
    },

    segmentedControlDisabled: {
      opacity: 0.7,
    },

    segment: {
      flex: 1,

      alignItems: "center",
      justifyContent: "center",

      borderRadius: 11,
    },

    segmentSelected: {
      backgroundColor: colors.white,

      shadowColor: colors.textPrimary,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.08,
      shadowRadius: 5,

      elevation: 2,
    },

    segmentPressed: {
      opacity: 0.65,
    },

    segmentText: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 13,
      lineHeight: 18,

      color: colors.textSecondary,
    },

    segmentTextSelected: {
      color: colors.primary,
    },

    informationCard: {
      flexDirection: "row",
      alignItems: "flex-start",

      gap: 9,

      paddingHorizontal: 14,
      paddingVertical: 13,
      marginTop: 15,

      borderRadius: 17,

      backgroundColor: colors.selectedBackground,
    },

    informationText: {
      flex: 1,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 11,
      lineHeight: 17,

      color: colors.textSecondary,
    },
  });
