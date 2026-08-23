import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import DiaperIcon from "../../../assets/illustrations/tracking/diaper/diaper.svg";
import PottyIcon from "../../../assets/illustrations/tracking/diaper/potty.svg";

import { useThemeColors } from "../../../theme/useThemeColors.js";

const DIAPER_TYPES = [
  {
    id: "diaper",
    label: "Diaper",
    Icon: DiaperIcon,
  },
  {
    id: "potty",
    label: "Potty",
    Icon: PottyIcon,
  },
];

export default function DiaperTypeTabs({ value, onChange }) {
  const { t } = useTranslation();

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.wrapper}>
      <View style={styles.content}>
        {DIAPER_TYPES.map((type) => {
          const isSelected = value === type.id;

          const iconColor = isSelected ? colors.primary : colors.textSecondary;

          const Icon = type.Icon;

          return (
            <Pressable
              key={type.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: isSelected }}
              onPress={() => onChange?.(type.id)}
              style={({ pressed }) => [
                styles.tab,
                isSelected && styles.tabSelected,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.iconContainer}>
                <Icon width={17} height={17} color={iconColor} />
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
      width: 22,
      height: 22,
      alignItems: "center",
      justifyContent: "center",
      overflow: "visible",
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
