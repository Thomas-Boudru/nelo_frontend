import { useMemo } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import {
  TRACKING_FILTERS,
  TRACKING_TYPE_CONFIG,
} from "../../../data/mockTrackingData.js";

import { useThemeColors } from "../../../theme/useThemeColors.js";

const FILTER_VISUALS = {
  all: {
    icon: "list-outline",
  },

  feeding: {
    image: TRACKING_TYPE_CONFIG.bottle.image,
  },

  sleep: {
    image: TRACKING_TYPE_CONFIG.sleep.image,
  },

  diaper: {
    image: TRACKING_TYPE_CONFIG.diaper.image,
  },

  health: {
    image: TRACKING_TYPE_CONFIG.symptoms.image,
  },
};

function FilterIcon({ filterId, isSelected, colors, styles }) {
  const visual = FILTER_VISUALS[filterId];

  if (!visual) {
    return null;
  }

  if (visual.image) {
    return (
      <Image
        source={visual.image}
        resizeMode="contain"
        style={styles.filterImage}
      />
    );
  }

  return (
    <Ionicons
      name={visual.icon}
      size={17}
      color={isSelected ? colors.white : (colors.primary ?? "#4F7DF3")}
    />
  );
}

export default function TrackingFilterChips({
  filters = TRACKING_FILTERS,
  values = {},
  selectedFilterId = "all",
  onSelectFilter,
}) {
  const { t } = useTranslation();

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        {filters.map((filter) => {
          const isSelected = filter.id === selectedFilterId;

          const filterValue = values?.[filter.id];

          const hasValue =
            filterValue !== undefined &&
            filterValue !== null &&
            filterValue !== "";

          const translatedLabel = t(filter.labelKey);

          const accessibilityLabel = hasValue
            ? `${translatedLabel}, ${filterValue}`
            : translatedLabel;

          return (
            <Pressable
              key={filter.id}
              accessibilityRole="tab"
              accessibilityLabel={accessibilityLabel}
              accessibilityState={{
                selected: isSelected,
              }}
              onPress={() => onSelectFilter?.(filter.id)}
              style={({ pressed }) => [
                styles.filterChip,
                isSelected && styles.filterChipSelected,
                pressed && styles.filterChipPressed,
              ]}
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.filterLabel,
                  isSelected && styles.filterLabelSelected,
                ]}
              >
                {translatedLabel}
              </Text>

              {hasValue ? (
                <Text
                  numberOfLines={1}
                  style={[
                    styles.filterValue,
                    isSelected && styles.filterValueSelected,
                  ]}
                >
                  {filterValue}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      minWidth: 0,
    },

    scrollContent: {
      alignItems: "center",

      gap: 8,

      paddingVertical: 2,
      paddingRight: 2,
    },

    filterChip: {
      minHeight: 42,

      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",

      gap: 6,

      paddingHorizontal: 12,

      borderRadius: 21,
      borderWidth: 1,
      borderColor: colors.border ?? "#DCE5F2",

      backgroundColor: colors.white,
    },

    filterChipSelected: {
      borderColor: colors.primaryDisabled,
      backgroundColor: colors.primarySoft,
    },

    filterChipPressed: {
      opacity: 0.74,
      transform: [{ scale: 0.98 }],
    },

    filterImage: {
      width: 19,
      height: 19,
    },

    filterLabel: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 11,
      lineHeight: 16,

      color: colors.textPrimary,
    },

    filterLabelSelected: {
      color: colors.primaryPressed,
    },

    filterValue: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 11,
      lineHeight: 16,

      color: colors.primary ?? "#4F7DF3",
    },

    filterValueSelected: {
      color: colors.primaryPressed,
    },
  });
