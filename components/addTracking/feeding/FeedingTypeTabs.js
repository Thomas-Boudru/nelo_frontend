import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useThemeColors } from "../../../theme/useThemeColors.js";

const FEEDING_TYPES = [
  { id: "bottle", label: "Bottle", icon: "water-outline" },
  { id: "breastfeeding", label: "Breastfeeding", icon: "heart-outline" },
  { id: "solids", label: "Solids", icon: "restaurant-outline" },
  { id: "pumping", label: "Pumping", icon: "fitness-outline" },
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

          return (
            <Pressable
              key={type.id}
              onPress={() => onChange?.(type.id)}
              style={[styles.tab, isSelected && styles.tabSelected]}
            >
              <Ionicons
                name={type.icon}
                size={17}
                color={isSelected ? colors.primary : colors.textSecondary}
              />

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
      backgroundColor: colors.lightBlue,
      marginBottom: 14,
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
  });
}
