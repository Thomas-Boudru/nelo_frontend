import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import BottleIcon from "../../../assets/illustrations/tracking/feeding/bottle.svg";
import BreastfeedingIcon from "../../../assets/illustrations/tracking/feeding/breastfeeding.svg";
import SolidsIcon from "../../../assets/illustrations/tracking/feeding/solids.svg";
import PumpingIcon from "../../../assets/illustrations/tracking/feeding/pumping.svg";

import { useThemeColors } from "../../../theme/useThemeColors.js";

const DEFAULT_VISIBLE_FEEDING_METHODS = [
  "breastfeeding",
  "bottle",
  "solids",
  "pumping",
];

const FEEDING_TYPES = [
  {
    id: "bottle",
    labelKey: "Bottle",
    Icon: BottleIcon,
  },
  {
    id: "breastfeeding",
    labelKey: "Breastfeeding",
    Icon: BreastfeedingIcon,
  },
  {
    id: "solids",
    labelKey: "Solid foods",
    Icon: SolidsIcon,
  },
  {
    id: "pumping",
    labelKey: "Pumping",
    Icon: PumpingIcon,
  },
];

export default function FeedingTypeTabs({
  value,
  visibleMethods = DEFAULT_VISIBLE_FEEDING_METHODS,
  onChange,
}) {
  const { t } = useTranslation();

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const displayedFeedingTypes = useMemo(() => {
    const validVisibleMethods = Array.isArray(visibleMethods)
      ? visibleMethods
      : DEFAULT_VISIBLE_FEEDING_METHODS;

    const filteredTypes = FEEDING_TYPES.filter((type) =>
      validVisibleMethods.includes(type.id),
    );

    return filteredTypes.length > 0 ? filteredTypes : FEEDING_TYPES;
  }, [visibleMethods]);

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {displayedFeedingTypes.map((type) => {
          const isSelected = value === type.id;

          const iconColor = isSelected ? colors.primary : colors.textSecondary;

          const Icon = type.Icon;

          return (
            <Pressable
              key={type.id}
              accessibilityRole="button"
              accessibilityLabel={t(type.labelKey)}
              accessibilityState={{
                selected: isSelected,
              }}
              onPress={() => onChange?.(type.id)}
              style={[styles.tab, isSelected && styles.tabSelected]}
            >
              <View style={styles.iconContainer}>
                <Icon width="100%" height="100%" color={iconColor} />
              </View>

              <Text style={[styles.label, isSelected && styles.labelSelected]}>
                {t(type.labelKey)}
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
