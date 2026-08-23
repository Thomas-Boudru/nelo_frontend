import { useMemo } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import DateTimeRow from "../DateTimeRow.js";
import { useThemeColors } from "../../../theme/useThemeColors.js";

const POTTY_ICONS = {
  wet: require("../../../assets/illustrations/tracking/diaper/wet.png"),
  dirty: require("../../../assets/illustrations/tracking/diaper/dirty.png"),
};

const POTTY_OPTIONS = [
  {
    id: "pee",
    label: "Pee",
    iconType: "wet",
    color: "#4E83F7",
    background: "#EEF5FF",
  },
  {
    id: "poop",
    label: "Poop",
    iconType: "dirty",
    color: "#D4924A",
    background: "#FFF6EA",
  },
  {
    id: "peeAndPoop",
    label: "Pee & poop",
    iconType: "wetAndDirty",
    color: "#8B70D6",
    background: "#F5F1FF",
  },
];

function PottyContentIcon({ type }) {
  if (type === "wetAndDirty") {
    return (
      <View style={contentIconStyles.combined}>
        <Image
          source={POTTY_ICONS.wet}
          resizeMode="contain"
          style={contentIconStyles.wetCombined}
        />

        <Image
          source={POTTY_ICONS.dirty}
          resizeMode="contain"
          style={contentIconStyles.dirtyCombined}
        />
      </View>
    );
  }

  const source = POTTY_ICONS[type];

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
    width: 23,
    height: 23,
  },

  dirtyCombined: {
    width: 25,
    height: 25,
  },
});

export default function PottyForm({ value, onChange, onPressNote }) {
  const { t } = useTranslation();

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const patchEntry = (patch) => {
    onChange?.({
      ...value,
      ...patch,
    });
  };

  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.sectionTitle}>{t("What happened?")}</Text>

        <Text style={styles.sectionDescription}>
          {t("Choose what happened during potty time")}
        </Text>
      </View>

      <View style={styles.optionsGrid}>
        {POTTY_OPTIONS.map((option, index) => {
          const isSelected = value?.content === option.id;
          const isBothOption = index === 2;

          return (
            <Pressable
              key={option.id}
              onPress={() => patchEntry({ content: option.id })}
              style={({ pressed }) => [
                styles.optionCard,
                isBothOption && styles.optionCardWide,
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
                <PottyContentIcon type={option.iconType} />
              </View>

              <Text
                style={[
                  styles.optionLabel,
                  isBothOption && styles.optionLabelWide,
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

      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: Boolean(value?.isAccident) }}
        onPress={() =>
          patchEntry({
            isAccident: !value?.isAccident,
          })
        }
        style={({ pressed }) => [
          styles.accidentRow,
          value?.isAccident && styles.accidentRowSelected,
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.accidentLeft}>
          <View
            style={[
              styles.accidentIcon,
              value?.isAccident && styles.accidentIconSelected,
            ]}
          >
            <Ionicons
              name="alert-circle-outline"
              size={19}
              color={value?.isAccident ? colors.primary : colors.textSecondary}
            />
          </View>

          <View>
            <Text style={styles.accidentTitle}>{t("It was an accident")}</Text>

            <Text style={styles.accidentDescription}>
              {t("Record this as a potty accident")}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.checkbox,
            value?.isAccident && styles.checkboxSelected,
          ]}
        >
          {value?.isAccident ? (
            <Ionicons name="checkmark" size={14} color="#FFFFFF" />
          ) : null}
        </View>
      </Pressable>

      <PottyNoteButton
        note={value?.note}
        onPress={onPressNote}
        colors={colors}
        styles={styles}
        t={t}
      />

      <DateTimeRow
        isNow={!value?.isDateEdited}
        date={value?.pottyDate ?? new Date()}
        onDateChange={(nextDate) =>
          patchEntry({
            pottyDate: nextDate,
            isDateEdited: true,
          })
        }
      />
    </View>
  );
}

function PottyNoteButton({ note, onPress, colors, styles, t }) {
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
            : t("Add an optional detail about this potty time")}
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
      padding: 14,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: "transparent",
    },

    optionCardWide: {
      width: "100%",
      minHeight: 88,
      flexDirection: "row",
      gap: 12,
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

    accidentRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      minHeight: 64,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.lightBlue,
    },

    accidentRowSelected: {
      borderColor: colors.primary,
      backgroundColor: `${colors.primary}0D`,
    },

    accidentLeft: {
      flexDirection: "row",
      alignItems: "center",
      flexShrink: 1,
      gap: 11,
    },

    accidentIcon: {
      alignItems: "center",
      justifyContent: "center",
      width: 38,
      height: 38,
      borderRadius: 13,
      backgroundColor: colors.white,
    },

    accidentIconSelected: {
      backgroundColor: `${colors.primary}12`,
    },

    accidentTitle: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 13,
      color: colors.textPrimary,
    },

    accidentDescription: {
      marginTop: 3,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 11,
      color: colors.textSecondary,
    },

    checkbox: {
      alignItems: "center",
      justifyContent: "center",
      width: 23,
      height: 23,
      borderRadius: 8,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.white,
    },

    checkboxSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primary,
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

    optionLabelWide: {
      marginTop: 0,
    },
  });
}
