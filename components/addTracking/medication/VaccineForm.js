import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import DateTimeRow from "../DateTimeRow.js";
import { useThemeColors } from "../../../theme/useThemeColors.js";

const DOSES = [
  { id: "dose1", label: "1st dose" },
  { id: "dose2", label: "2nd dose" },
  { id: "dose3", label: "3rd dose" },
  { id: "booster", label: "Booster" },
  { id: "unspecified", label: "Not specified" },
];

export default function VaccineForm({ value, onChange, onPressPhoto }) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const patchEntry = (patch) => onChange?.({ ...value, ...patch });

  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.sectionTitle}>{t("Which vaccine was given?")}</Text>
        <Text style={styles.sectionDescription}>
          {t("Enter the name written in the child health record")}
        </Text>
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>{t("Vaccine name")}</Text>
        <View style={styles.textField}>
          <Ionicons
            name="search-outline"
            size={19}
            color={colors.textSecondary}
          />
          <BottomSheetTextInput
            value={value?.vaccineName ?? ""}
            onChangeText={(vaccineName) => patchEntry({ vaccineName })}
            placeholder={t("Search or enter a vaccine")}
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="words"
            style={styles.singleLineInput}
          />
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>{t("Dose")}</Text>
        <View style={styles.chips}>
          {DOSES.map((dose) => {
            const isSelected = value?.dose === dose.id;
            return (
              <Pressable
                key={dose.id}
                onPress={() => patchEntry({ dose: dose.id })}
                style={[styles.chip, isSelected && styles.chipSelected]}
              >
                <Text
                  style={[
                    styles.chipLabel,
                    isSelected && styles.chipLabelSelected,
                  ]}
                >
                  {t(dose.label)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <DateTimeRow
        isNow={!value?.isDateEdited}
        date={value?.vaccineDate ?? new Date()}
        onDateChange={(vaccineDate) =>
          patchEntry({ vaccineDate, isDateEdited: true })
        }
      />

      <Pressable
        onPress={() => patchEntry({ hasNextDose: !value?.hasNextDose })}
        style={({ pressed }) => [
          styles.optionalRow,
          value?.hasNextDose && styles.optionalRowSelected,
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.optionalLeft}>
          <View style={styles.optionalIcon}>
            <Ionicons
              name="calendar-outline"
              size={19}
              color={colors.primary}
            />
          </View>
          <View>
            <Text style={styles.optionalTitle}>{t("Next dose")}</Text>
            <Text style={styles.optionalDescription}>
              {t("Add a date if one was provided")}
            </Text>
          </View>
        </View>
        <Ionicons
          name={value?.hasNextDose ? "chevron-up" : "add"}
          size={20}
          color={colors.primary}
        />
      </Pressable>

      {value?.hasNextDose ? (
        <DateTimeRow
          isNow={false}
          date={value?.nextDoseDate ?? new Date()}
          onDateChange={(nextDoseDate) => patchEntry({ nextDoseDate })}
        />
      ) : null}

      <View style={styles.noteSection}>
        <View style={styles.noteHeader}>
          <Text style={styles.fieldLabel}>{t("Note")}</Text>
          <Pressable
            onPress={onPressPhoto}
            style={({ pressed }) => [
              styles.photoButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="camera-outline" size={17} color={colors.primary} />
            <Text style={styles.photoButtonLabel}>
              {value?.photo ? t("Change photo") : t("Add photo")}
            </Text>
          </Pressable>
        </View>
        <View style={styles.inputContainer}>
          <BottomSheetTextInput
            value={value?.note ?? ""}
            onChangeText={(note) => patchEntry({ note })}
            placeholder={t("Add an optional note")}
            placeholderTextColor={colors.textSecondary}
            multiline
            maxLength={300}
            textAlignVertical="top"
            style={styles.noteInput}
          />
          <Text style={styles.characterCounter}>
            {(value?.note ?? "").length}/300
          </Text>
        </View>
      </View>
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: { gap: 20 },
    sectionTitle: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 17,
      color: colors.textPrimary,
    },
    sectionDescription: {
      marginTop: 5,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 12,
      lineHeight: 18,
      color: colors.textSecondary,
    },
    field: { gap: 8 },
    fieldLabel: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 12,
      color: colors.textSecondary,
    },
    textField: {
      minHeight: 52,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 14,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.lightBlue,
    },
    singleLineInput: {
      flex: 1,
      paddingVertical: 13,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 14,
      color: colors.textPrimary,
    },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: {
      minHeight: 38,
      justifyContent: "center",
      paddingHorizontal: 14,
      borderRadius: 13,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.white,
    },
    chipSelected: {
      borderColor: colors.primary,
      backgroundColor: `${colors.primary}0D`,
    },
    chipLabel: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 12,
      color: colors.textSecondary,
    },
    chipLabelSelected: { color: colors.primary },
    optionalRow: {
      minHeight: 66,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.lightBlue,
    },
    optionalRowSelected: { borderColor: colors.primary },
    optionalLeft: { flexDirection: "row", alignItems: "center", gap: 11 },
    optionalIcon: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 13,
      backgroundColor: `${colors.primary}12`,
    },
    optionalTitle: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 13,
      color: colors.textPrimary,
    },
    optionalDescription: {
      marginTop: 3,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 11,
      color: colors.textSecondary,
    },
    noteSection: { gap: 8 },
    noteHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    photoButton: { flexDirection: "row", alignItems: "center", gap: 5 },
    photoButtonLabel: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 12,
      color: colors.primary,
    },
    inputContainer: { position: "relative" },
    noteInput: {
      minHeight: 82,
      maxHeight: 130,
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 30,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.lightBlue,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 13,
      lineHeight: 19,
      color: colors.textPrimary,
    },
    characterCounter: {
      position: "absolute",
      right: 12,
      bottom: 10,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 10,
      color: colors.textSecondary,
    },
    pressed: { opacity: 0.78 },
  });
}
