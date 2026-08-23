import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import MedicineIcon from "../../../assets/illustrations/tracking/medication/medicine.svg";
import VaccineIcon from "../../../assets/illustrations/tracking/medication/vaccine.svg";

import { useThemeColors } from "../../../theme/useThemeColors.js";

const MEDICATION_TYPES = [
  {
    id: "medication",
    label: "Medicine",
    Icon: MedicineIcon,
  },
  {
    id: "vaccine",
    label: "Vaccine",
    Icon: VaccineIcon,
  },
];

export default function MedicationTypeTabs({ value, onChange }) {
  const { t } = useTranslation();

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.wrapper}>
      <View accessibilityRole="tablist" style={styles.content}>
        {MEDICATION_TYPES.map((type) => {
          const isSelected = value === type.id;
          const iconColor = isSelected ? colors.primary : colors.textSecondary;

          const Icon = type.Icon;

          return (
            <Pressable
              key={type.id}
              accessibilityRole="tab"
              accessibilityLabel={t(type.label)}
              accessibilityState={{ selected: isSelected }}
              onPress={() => onChange?.(type.id)}
              style={({ pressed }) => [
                styles.tab,
                isSelected && styles.tabSelected,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.iconContainer}>
                <Icon width="100%" height="100%" color={iconColor} />
              </View>

              <Text style={[styles.label, isSelected && styles.labelSelected]}>
                {t(type.label)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    wrapper: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },

    content: {
      flexDirection: "row",
      paddingHorizontal: 20,
      gap: 8,
    },

    tab: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      paddingHorizontal: 18,
      paddingVertical: 10,
      marginBottom: 14,
      borderRadius: 14,
      backgroundColor: "transparent",
    },

    tabSelected: {
      backgroundColor: `${colors.primary}14`,
    },

    iconContainer: {
      width: 20,
      height: 20,
      alignItems: "center",
      justifyContent: "center",
    },

    label: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 12,
      color: colors.textSecondary,
    },

    labelSelected: {
      color: colors.primary,
    },

    pressed: {
      opacity: 0.75,
    },
  });
}
