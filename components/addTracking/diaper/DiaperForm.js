import { useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import DateTimeRow from "../DateTimeRow.js";
import { useThemeColors } from "../../../theme/useThemeColors.js";

const DIAPER_ICONS = {
  dry: require("../../../assets/illustrations/tracking/diaper/dry.png"),
  wet: require("../../../assets/illustrations/tracking/diaper/wet.png"),
  dirty: require("../../../assets/illustrations/tracking/diaper/dirty.png"),
};

const DIAPER_OPTIONS = [
  {
    id: "dry",
    label: "Dry",
    iconType: "dry",
    color: "#8B9BB5",
    background: "#F3F6FA",
  },
  {
    id: "wet",
    label: "Wet",
    iconType: "wet",
    color: "#4E83F7",
    background: "#EEF5FF",
  },
  {
    id: "dirty",
    label: "Dirty",
    iconType: "dirty",
    color: "#D4924A",
    background: "#FFF6EA",
  },
  {
    id: "wetAndDirty",
    label: "Wet & dirty",
    iconType: "wetAndDirty",
    color: "#8B70D6",
    background: "#F5F1FF",
  },
];

const CONSISTENCIES = [
  { id: "liquid", label: "Liquid" },
  { id: "soft", label: "Soft" },
  { id: "formed", label: "Formed" },
  { id: "hard", label: "Hard" },
];

function DiaperContentIcon({ type }) {
  if (type === "wetAndDirty") {
    return (
      <View style={contentIconStyles.combined}>
        <Image
          source={DIAPER_ICONS.wet}
          resizeMode="contain"
          style={contentIconStyles.wetCombined}
        />

        <Image
          source={DIAPER_ICONS.dirty}
          resizeMode="contain"
          style={contentIconStyles.dirtyCombined}
        />
      </View>
    );
  }

  const source = DIAPER_ICONS[type];

  if (!source) {
    return null;
  }

  return (
    <Image
      source={source}
      resizeMode="contain"
      style={[
        contentIconStyles.icon,
        type === "dirty" && contentIconStyles.dirtyIcon,
      ]}
    />
  );
}

const contentIconStyles = StyleSheet.create({
  icon: {
    width: 27,
    height: 27,
  },

  dirtyIcon: {
    width: 29,
    height: 29,
  },

  combined: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },

  wetCombined: {
    width: 22,
    height: 22,
  },

  dirtyCombined: {
    width: 24,
    height: 24,
  },
});

export default function DiaperForm({ value, onChange, onPressNote }) {
  const { t } = useTranslation();

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [showDetails, setShowDetails] = useState(false);

  const includesPoop =
    value?.content === "dirty" || value?.content === "wetAndDirty";

  const patchEntry = (patch) => {
    onChange?.({
      ...value,
      ...patch,
    });
  };

  const handleSelectContent = (content) => {
    const nextIncludesPoop = content === "dirty" || content === "wetAndDirty";

    patchEntry({
      content,
      consistency: nextIncludesPoop ? value?.consistency : null,
    });

    if (!nextIncludesPoop) {
      setShowDetails(false);
    }
  };

  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.sectionTitle}>{t("What was in the diaper?")}</Text>

        <Text style={styles.sectionDescription}>
          {t("Choose the option that best describes the diaper")}
        </Text>
      </View>

      <View style={styles.optionsGrid}>
        {DIAPER_OPTIONS.map((option) => {
          const isSelected = value?.content === option.id;

          return (
            <Pressable
              key={option.id}
              onPress={() => handleSelectContent(option.id)}
              style={({ pressed }) => [
                styles.optionCard,
                {
                  backgroundColor: option.background,
                },
                isSelected && {
                  borderColor: option.color,
                  borderWidth: 1.5,
                },
                pressed && styles.pressed,
              ]}
            >
              <View
                style={[
                  styles.optionIcon,
                  {
                    backgroundColor: `${option.color}16`,
                  },
                ]}
              >
                <DiaperContentIcon type={option.iconType} />
              </View>

              <Text
                style={[
                  styles.optionLabel,
                  isSelected && {
                    color: option.color,
                  },
                ]}
              >
                {t(option.label)}
              </Text>

              {isSelected ? (
                <View
                  style={[
                    styles.checkBadge,
                    {
                      backgroundColor: option.color,
                    },
                  ]}
                >
                  <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {includesPoop ? (
        <View>
          <Pressable
            onPress={() => setShowDetails((current) => !current)}
            style={({ pressed }) => [
              styles.detailsButton,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.detailsButtonLeft}>
              <View style={styles.detailsIcon}>
                <Ionicons
                  name="options-outline"
                  size={18}
                  color={colors.primary}
                />
              </View>

              <Text style={styles.detailsButtonLabel}>
                {showDetails ? t("Hide details") : t("Add details")}
              </Text>
            </View>

            <Ionicons
              name={showDetails ? "chevron-up" : "chevron-down"}
              size={18}
              color={colors.textSecondary}
            />
          </Pressable>

          {showDetails ? (
            <View style={styles.detailsContent}>
              <Text style={styles.detailsTitle}>{t("Consistency")}</Text>

              <View style={styles.chips}>
                {CONSISTENCIES.map((consistency) => {
                  const isSelected = value?.consistency === consistency.id;

                  return (
                    <Pressable
                      key={consistency.id}
                      onPress={() =>
                        patchEntry({
                          consistency: isSelected ? null : consistency.id,
                        })
                      }
                      style={[styles.chip, isSelected && styles.chipSelected]}
                    >
                      <Text
                        style={[
                          styles.chipLabel,
                          isSelected && styles.chipLabelSelected,
                        ]}
                      >
                        {t(consistency.label)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}
        </View>
      ) : null}

      <DiaperNoteButton
        note={value?.note}
        onPress={onPressNote}
        colors={colors}
        styles={styles}
        t={t}
      />

      <DateTimeRow
        isNow={!value?.isDateEdited}
        date={value?.diaperDate ?? new Date()}
        onDateChange={(nextDate) =>
          patchEntry({
            diaperDate: nextDate,
            isDateEdited: true,
          })
        }
      />
    </View>
  );
}

function DiaperNoteButton({ note, onPress, colors, styles, t }) {
  const cleanedNote = note?.trim() ?? "";
  const hasNote = cleanedNote.length > 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={hasNote ? t("Edit note") : t("Add a note")}
      onPress={onPress}
      style={({ pressed }) => [styles.noteButton, pressed && styles.pressed]}
    >
      <View style={styles.noteIcon}>
        <Ionicons
          name="document-text-outline"
          size={19}
          color={colors.primary}
        />
      </View>

      <View style={styles.noteTextContainer}>
        <Text style={styles.noteTitle}>
          {hasNote ? t("Edit note") : t("Add a note")}
        </Text>

        <Text numberOfLines={1} style={styles.noteDescription}>
          {hasNote
            ? cleanedNote
            : t("Add an optional detail about this diaper")}
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
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: {
      gap: 20,
    },

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

    optionsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },

    optionCard: {
      position: "relative",
      alignItems: "center",
      justifyContent: "center",
      width: "48%",
      minHeight: 108,
      paddingHorizontal: 12,
      paddingVertical: 15,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: "transparent",
    },

    optionIcon: {
      alignItems: "center",
      justifyContent: "center",
      width: 52,
      height: 42,
      borderRadius: 15,
    },
    optionLabel: {
      marginTop: 9,
      textAlign: "center",
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 13,
      color: colors.textPrimary,
    },

    checkBadge: {
      position: "absolute",
      top: 10,
      right: 10,
      alignItems: "center",
      justifyContent: "center",
      width: 20,
      height: 20,
      borderRadius: 10,
    },

    detailsButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      minHeight: 54,
      paddingHorizontal: 14,
      borderRadius: 17,
      backgroundColor: colors.lightBlue,
      borderWidth: 1,
      borderColor: colors.border,
    },

    detailsButtonLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },

    detailsIcon: {
      alignItems: "center",
      justifyContent: "center",
      width: 32,
      height: 32,
      borderRadius: 11,
      backgroundColor: `${colors.primary}12`,
    },

    detailsButtonLabel: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 13,
      color: colors.textPrimary,
    },

    detailsContent: {
      marginTop: 12,
    },

    detailsTitle: {
      marginBottom: 10,
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 12,
      color: colors.textSecondary,
    },

    chips: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },

    chip: {
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 13,
      backgroundColor: colors.lightBlue,
      borderWidth: 1,
      borderColor: colors.border,
    },

    chipSelected: {
      backgroundColor: `${colors.primary}12`,
      borderColor: colors.primary,
    },

    chipLabel: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 12,
      color: colors.textSecondary,
    },

    chipLabelSelected: {
      color: colors.primary,
    },

    pressed: {
      opacity: 0.78,
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
      backgroundColor: `${colors.primary}12`,
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
      width: 18,
      alignItems: "center",
      justifyContent: "center",
    },

    noteIndicator: {
      width: 8,
      height: 8,
      borderRadius: 999,
      backgroundColor: colors.primary,
    },
  });
}
