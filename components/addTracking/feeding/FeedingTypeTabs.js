import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import BottleIcon from "../../../assets/illustrations/tracking/feeding/bottle.svg";
import BreastfeedingIcon from "../../../assets/illustrations/tracking/feeding/breastfeeding.svg";
import SolidsIcon from "../../../assets/illustrations/tracking/feeding/solids.svg";
import PumpingIcon from "../../../assets/illustrations/tracking/feeding/pumping.svg";

import { useThemeColors } from "../../../theme/useThemeColors.js";

const FEEDING_TYPES = [
  {
    id: "bottle",
    label: "Bottle",
    Icon: BottleIcon,
  },
  {
    id: "breastfeeding",
    label: "Breastfeeding",
    Icon: BreastfeedingIcon,
  },
  {
    id: "solids",
    label: "Solids",
    Icon: SolidsIcon,
  },
  {
    id: "pumping",
    label: "Pumping",
    Icon: PumpingIcon,
  },
];

export default function FeedingTypeTabs({ value, onChange }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {FEEDING_TYPES.map((type) => {
          const isSelected = value === type.id;
          const iconColor = isSelected ? colors.primary : colors.textSecondary;

          const Icon = type.Icon;

          return (
            <Pressable
              key={type.id}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => onChange?.(type.id)}
              style={[styles.tab, isSelected && styles.tabSelected]}
            >
              <View style={styles.iconContainer}>
                <Icon width="100%" height="100%" color={iconColor} />
              </View>

              <Text style={[styles.label, isSelected && styles.labelSelected]}>
                {type.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
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
      paddingHorizontal: 20,
      gap: 8,
    },

    tab: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      paddingHorizontal: 13,
      paddingVertical: 10,
      borderRadius: 14,
      backgroundColor: "transparent",
      marginBottom: 14,
    },

    tabSelected: {
      backgroundColor: `${colors.primary}14`,
    },

    iconContainer: {
      width: 19,
      height: 19,
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
  });
}
