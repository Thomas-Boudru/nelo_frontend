import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import DateTimeRow from "../DateTimeRow.js";
import { useThemeColors } from "../../../theme/useThemeColors.js";

const MEDICATION_UNITS = [
  {
    id: "ml",
    label: "ml",
  },
  {
    id: "drops",
    label: "Drops",
  },
  {
    id: "tablet",
    label: "Tablet",
  },
  {
    id: "suppository",
    label: "Suppository",
  },
  {
    id: "dose",
    label: "Dose",
  },
];

export default function MedicationForm({
  value,
  onChange,
  recentMedications = [],
  onPressNote,
  onPressMedication,
}) {
  const { t } = useTranslation();

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const patchEntry = (patch) => {
    onChange?.({
      ...value,
      ...patch,
    });
  };

  const handleSelectMedication = (medication) => {
    const isAlreadySelected =
      value?.medicationId === medication.id ||
      value?.medicationName?.trim().toLowerCase() ===
        medication.name.trim().toLowerCase();

    if (isAlreadySelected) {
      patchEntry({
        medicationId: null,
        medicationName: "",
        medicationTranslationKey: null,
        isCustomMedication: false,
      });

      return;
    }

    patchEntry({
      medicationId: medication.id,
      medicationName: medication.name,
      medicationTranslationKey: medication.translationKey ?? null,
      isCustomMedication: medication.isCustom ?? false,
    });
  };

  const hasNote = Boolean(value?.note?.trim());

  return (
    <View style={styles.container}>
      <View style={styles.medicationSection}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("Choose a medication")}
          onPress={onPressMedication}
          style={({ pressed }) => [
            styles.medicationPickerButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons
            name="search-outline"
            size={20}
            color={colors.textSecondary}
          />

          <Text
            numberOfLines={1}
            style={[
              styles.medicationPickerText,
              !value?.medicationName && styles.medicationPickerPlaceholder,
            ]}
          >
            {value?.medicationName || t("Search for a medication")}
          </Text>

          <Ionicons
            name="chevron-forward"
            size={18}
            color={colors.textSecondary}
          />
        </Pressable>

        {recentMedications.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.recentMedicationsContent}
          >
            {recentMedications.map((medication) => {
              const isSelected =
                value?.medicationId === medication.id ||
                value?.medicationName?.trim().toLowerCase() ===
                  medication.name.trim().toLowerCase();

              return (
                <Pressable
                  key={medication.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={medication.name}
                  accessibilityHint={
                    isSelected
                      ? t("Tap again to remove this medication")
                      : t("Select this medication")
                  }
                  onPress={() => handleSelectMedication(medication)}
                  style={({ pressed }) => [
                    styles.recentMedication,
                    isSelected && styles.recentMedicationSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.recentMedicationText,
                      isSelected && styles.recentMedicationTextSelected,
                    ]}
                  >
                    {medication.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}
      </View>

      <View style={styles.amountSection}>
        <Text style={styles.sectionLabel}>{t("Amount given")}</Text>

        <View style={styles.amountInputContainer}>
          <BottomSheetTextInput
            value={String(value?.amount ?? "")}
            onChangeText={(amount) => patchEntry({ amount })}
            placeholder="0"
            placeholderTextColor={colors.textSecondary}
            keyboardType="decimal-pad"
            selectTextOnFocus
            style={styles.amountInput}
          />

          <Text style={styles.selectedUnit}>
            {t(
              MEDICATION_UNITS.find((unit) => unit.id === value?.unit)?.label ??
                "ml",
            )}
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.unitsContent}
        >
          {MEDICATION_UNITS.map((unit) => {
            const isSelected = value?.unit === unit.id;

            return (
              <Pressable
                key={unit.id}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                onPress={() => patchEntry({ unit: unit.id })}
                style={({ pressed }) => [
                  styles.unitCard,
                  isSelected && styles.unitCardSelected,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.unitLabel,
                    isSelected && styles.unitLabelSelected,
                  ]}
                >
                  {t(unit.label)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={onPressNote}
        style={({ pressed }) => [
          styles.noteButton,
          hasNote && styles.noteButtonActive,
          pressed && styles.pressed,
        ]}
      >
        <View style={[styles.noteIcon, hasNote && styles.noteIconActive]}>
          <Ionicons
            name="document-text-outline"
            size={19}
            color={hasNote ? colors.primary : colors.textSecondary}
          />
        </View>

        <View style={styles.noteTextContainer}>
          <Text style={styles.noteTitle}>
            {hasNote ? t("Edit note") : t("Add a note")}
          </Text>

          <Text numberOfLines={1} style={styles.noteDescription}>
            {hasNote
              ? value.note.trim()
              : t("Add optional details about this medication")}
          </Text>
        </View>

        <View style={styles.noteRightContent}>
          {hasNote ? (
            <View style={styles.noteIndicator} />
          ) : (
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.textSecondary}
            />
          )}
        </View>
      </Pressable>

      <DateTimeRow
        isNow={!value?.isDateEdited}
        date={value?.medicationDate ?? new Date()}
        onDateChange={(medicationDate) =>
          patchEntry({
            medicationDate,
            isDateEdited: true,
          })
        }
      />

      <View style={styles.informationRow}>
        <Ionicons
          name="information-circle-outline"
          size={17}
          color={colors.textSecondary}
        />

        <Text style={styles.informationText}>
          {t(
            "Nelo records the amount you enter and does not recommend a dosage",
          )}
        </Text>
      </View>
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: {
      gap: 22,
    },

    medicationSection: {
      gap: 10,
    },

    nameInputContainer: {
      minHeight: 58,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 15,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.lightBlue,
      gap: 11,
    },

    nameInput: {
      flex: 1,
      minHeight: 56,
      paddingVertical: 0,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 14,
      color: colors.textPrimary,
    },

    clearButton: {
      alignItems: "center",
      justifyContent: "center",
    },

    recentMedicationsContent: {
      gap: 8,
      paddingRight: 4,
    },

    recentMedication: {
      maxWidth: 190,
      minHeight: 42,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 15,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.white,
    },

    recentMedicationSelected: {
      borderColor: `${colors.primary}20`,
      backgroundColor: `${colors.primary}0A`,
    },

    recentMedicationText: {
      flexShrink: 1,
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 12,
      color: colors.textSecondary,
    },

    recentMedicationTextSelected: {
      color: colors.primary,
    },

    amountSection: {
      gap: 10,
    },

    sectionLabel: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 12,
      color: colors.textSecondary,
    },

    amountInputContainer: {
      height: 62,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      borderRadius: 19,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.lightBlue,
    },

    amountInput: {
      flex: 1,
      height: 62,
      paddingTop: 0,
      paddingBottom: 0,
      textAlignVertical: "center",
      includeFontPadding: false,
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 22,
      lineHeight: 28,
      color: colors.textPrimary,
    },

    selectedUnit: {
      marginLeft: 12,
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 14,
      lineHeight: 20,
      color: colors.textSecondary,
    },

    unitsContent: {
      gap: 8,
      paddingRight: 4,
    },

    unitCard: {
      minHeight: 42,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 15,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.white,
      gap: 7,
    },

    unitCardSelected: {
      borderColor: `${colors.primary}20`,
      backgroundColor: `${colors.primary}0A`,
    },

    unitLabel: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 12,
      color: colors.textSecondary,
    },

    unitLabelSelected: {
      color: colors.primary,
    },

    unitCheck: {
      alignItems: "center",
      justifyContent: "center",
      width: 17,
      height: 17,
      borderRadius: 9,
      backgroundColor: colors.primary,
    },

    noteButton: {
      minHeight: 66,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 13,
      paddingVertical: 10,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.lightBlue,
      gap: 11,
    },

    noteIcon: {
      alignItems: "center",
      justifyContent: "center",
      width: 40,
      height: 40,
      borderRadius: 13,
      backgroundColor: colors.white,
    },

    noteIconActive: {
      backgroundColor: `${colors.primary}14`,
    },

    noteTextContainer: {
      flex: 1,
      minWidth: 0,
    },

    noteTitle: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 13,
      color: colors.textPrimary,
    },

    noteDescription: {
      marginTop: 3,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 11,
      color: colors.textSecondary,
    },

    noteAddedBadge: {
      alignItems: "center",
      justifyContent: "center",
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: colors.primary,
    },

    informationRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      paddingHorizontal: 2,
      gap: 8,
    },

    informationText: {
      flex: 1,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 11,
      lineHeight: 16,
      color: colors.textSecondary,
    },

    pressed: {
      opacity: 0.76,
    },
    noteRightContent: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },

    noteIndicator: {
      width: 7,
      height: 7,
      borderRadius: 999,
      backgroundColor: colors.primary,
    },

    medicationPickerButton: {
      minHeight: 58,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      paddingVertical: 11,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.lightBlue,
      gap: 11,
    },

    medicationPickerText: {
      flex: 1,
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 13,
      color: colors.textPrimary,
    },

    medicationPickerPlaceholder: {
      fontFamily: "PlusJakartaSans_500Medium",
      color: colors.textSecondary,
    },

    pressed: {
      opacity: 0.78,
    },
  });
}
