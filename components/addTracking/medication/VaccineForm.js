import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import DateTimeRow from "../DateTimeRow.js";
import { useThemeColors } from "../../../theme/useThemeColors.js";

const DOSE_OPTIONS = [
  {
    id: "dose-1",
    value: 1,
    label: "1st dose",
  },
  {
    id: "dose-2",
    value: 2,
    label: "2nd dose",
  },
  {
    id: "dose-3",
    value: 3,
    label: "3rd dose",
  },
  {
    id: "booster",
    value: "booster",
    label: "Booster",
  },
];

export default function VaccineForm({
  value,
  onChange,
  onPressVaccine,
  onPressDetails,
}) {
  const { t } = useTranslation();

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  /*
   * Ces valeurs par défaut évitent que le composant plante
   * si certaines propriétés ne sont pas encore présentes
   * dans l'état du parent.
   */
  const vaccineName = value?.vaccineName ?? "";
  const selectedDose = value?.dose ?? null;
  const nextDoseDate = value?.nextDoseDate ?? null;
  const note = value?.note ?? "";
  const photos = Array.isArray(value?.photos) ? value.photos : [];

  const hasNote = note.trim().length > 0;
  const hasPhotos = photos.length > 0;
  const hasDetails = hasNote || hasPhotos;

  const updateValue = (changes) => {
    onChange?.({
      ...(value ?? {}),
      ...changes,
    });
  };

  const handleSelectDose = (dose) => {
    updateValue({
      dose: selectedDose === dose ? null : dose,
    });
  };

  const handleNextDoseChange = (date) => {
    updateValue({
      hasNextDose: true,
      nextDoseDate: date,
    });
  };

  const handleClearNextDose = () => {
    updateValue({
      hasNextDose: false,
      nextDoseDate: null,
    });
  };

  const getDetailsSummary = () => {
    if (hasNote && hasPhotos) {
      return t("Note and photo added");
    }

    if (hasPhotos) {
      return t("Photo added");
    }

    if (hasNote) {
      return note.trim();
    }

    return t("Add an optional note or a photo");
  };

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("Search vaccine")}
        onPress={onPressVaccine}
        style={({ pressed }) => [
          styles.vaccinePickerButton,
          pressed && styles.pressed,
        ]}
      >
        <Ionicons name="search-outline" size={20} color={colors.textSecondary} />

        <Text
          numberOfLines={1}
          style={[
            styles.vaccinePickerText,
            !vaccineName && styles.vaccinePickerPlaceholder,
          ]}
        >
          {vaccineName || t("Search vaccine")}
        </Text>

        <Ionicons
          name="chevron-forward"
          size={18}
          color={colors.textSecondary}
        />
      </Pressable>

      <View style={styles.doseSection}>
        <Text style={styles.sectionLabel}>{t("Dose")}</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.doseOptions}
        >
          {DOSE_OPTIONS.map((option) => {
            const isSelected = selectedDose === option.value;

            return (
              <Pressable
                key={option.id}
                accessibilityRole="button"
                accessibilityLabel={t(option.label)}
                accessibilityState={{ selected: isSelected }}
                onPress={() => handleSelectDose(option.value)}
                style={({ pressed }) => [
                  styles.doseCard,
                  isSelected && styles.doseCardSelected,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.doseLabel,
                    isSelected && styles.doseLabelSelected,
                  ]}
                >
                  {t(option.label)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          hasDetails ? t("Edit note or photo") : t("Add note or photo")
        }
        onPress={onPressDetails}
        style={({ pressed }) => [styles.noteButton, pressed && styles.pressed]}
      >
        <View style={[styles.noteIcon, hasDetails && styles.noteIconActive]}>
          <Ionicons
            name={hasPhotos ? "image-outline" : "document-text-outline"}
            size={19}
            color={hasDetails ? colors.primary : colors.textSecondary}
          />
        </View>

        <View style={styles.noteTextContainer}>
          <Text style={styles.noteTitle}>
            {hasDetails ? t("Edit note or photo") : t("Add note or photo")}
          </Text>

          <Text numberOfLines={1} style={styles.noteDescription}>
            {getDetailsSummary()}
          </Text>
        </View>

        <View style={styles.noteRightContent}>
          {hasDetails ? (
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
        value={value?.vaccineDate ?? new Date()}
        onChange={(vaccineDate) =>
          updateValue({
            vaccineDate,
            isDateEdited: true,
          })
        }
      />

      {/*
       * Même ligne, même sélecteur : seul le mode change (date seule,
       * dans le futur) pour la prochaine dose.
       */}
      <DateTimeRow
        title="Next dose"
        mode="date"
        emptyLabel="Choose a date"
        isNow={!nextDoseDate}
        value={nextDoseDate ?? new Date()}
        minimumDate={new Date()}
        maximumDate={null}
        onChange={handleNextDoseChange}
        onClear={handleClearNextDose}
      />
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: {
      gap: 22,
    },

    vaccinePickerButton: {
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

    vaccinePickerText: {
      flex: 1,
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 13,
      color: colors.textPrimary,
    },

    vaccinePickerPlaceholder: {
      fontFamily: "PlusJakartaSans_500Medium",
      color: colors.textSecondary,
    },

    doseSection: {
      gap: 10,
    },

    sectionLabel: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 12,
      color: colors.textSecondary,
    },

    doseOptions: {
      gap: 8,
      paddingRight: 4,
    },

    doseCard: {
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

    doseCardSelected: {
      borderColor: `${colors.primary}20`,
      backgroundColor: `${colors.primary}0A`,
    },

    doseLabel: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 12,
      color: colors.textSecondary,
    },

    doseLabelSelected: {
      color: colors.primary,
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

    pressed: {
      opacity: 0.78,
    },
  });
}
