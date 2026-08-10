import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useThemeColors } from "../../../theme/useThemeColors.js";

const MEDICATION_TYPES = [
  {
    id: "medication",
    label: "Medicine",
    icon: "medical-outline",
  },
  {
    id: "vaccine",
    label: "Vaccine",
    icon: "shield-checkmark-outline",
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
              <Ionicons
                name={type.icon}
                size={18}
                color={isSelected ? colors.primary : colors.textSecondary}
              />

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
      backgroundColor: colors.lightBlue,
    },

    tabSelected: {
      backgroundColor: `${colors.primary}14`,
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
