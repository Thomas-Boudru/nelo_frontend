import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import BackButton from "../../components/ui/BackButton.js";
import { useThemeColors } from "../../theme/useThemeColors.js";

const MILESTONE_CATEGORIES = [
  {
    id: "development",
    label: "Development",
    milestones: [
      {
        id: "first-smile",
        label: "First smile",
        icon: "happy-outline",
      },
      {
        id: "first-laugh",
        label: "First laugh",
        icon: "sparkles-outline",
      },
      {
        id: "rolls-over",
        label: "Rolls over",
        icon: "refresh-outline",
      },
      {
        id: "sits-up",
        label: "Sits up",
        icon: "body-outline",
      },
      {
        id: "starts-crawling",
        label: "Starts crawling",
        icon: "walk-outline",
      },
      {
        id: "first-steps",
        label: "First steps",
        icon: "footsteps-outline",
      },
      {
        id: "first-word",
        label: "First word",
        icon: "chatbubble-ellipses-outline",
      },
    ],
  },
  {
    id: "feeding",
    label: "Feeding",
    milestones: [
      {
        id: "first-bottle",
        label: "First bottle",
        icon: "nutrition-outline",
      },
      {
        id: "first-puree",
        label: "First puree",
        icon: "restaurant-outline",
      },
      {
        id: "first-solid-food",
        label: "First solid food",
        icon: "fast-food-outline",
      },
      {
        id: "eats-alone",
        label: "Eats independently",
        icon: "restaurant-outline",
      },
    ],
  },
  {
    id: "sleep",
    label: "Sleep",
    milestones: [
      {
        id: "first-full-night",
        label: "First full night",
        icon: "moon-outline",
      },
      {
        id: "first-nap-alone",
        label: "First nap alone",
        icon: "bed-outline",
      },
      {
        id: "sleeps-own-room",
        label: "Sleeps in their own room",
        icon: "home-outline",
      },
    ],
  },
  {
    id: "growth",
    label: "Growth and health",
    milestones: [
      {
        id: "first-tooth",
        label: "First tooth",
        icon: "sparkles-outline",
      },
      {
        id: "first-haircut",
        label: "First haircut",
        icon: "cut-outline",
      },
      {
        id: "first-vaccine",
        label: "First vaccine",
        icon: "medical-outline",
      },
      {
        id: "first-birthday",
        label: "First birthday",
        icon: "gift-outline",
      },
    ],
  },
  {
    id: "daily-life",
    label: "Daily life",
    milestones: [
      {
        id: "first-bath",
        label: "First bath",
        icon: "water-outline",
      },
      {
        id: "first-outing",
        label: "First outing",
        icon: "sunny-outline",
      },
      {
        id: "first-trip",
        label: "First trip",
        icon: "airplane-outline",
      },
      {
        id: "first-day-daycare",
        label: "First day at daycare",
        icon: "school-outline",
      },
      {
        id: "meets-grandparents",
        label: "Met the grandparents",
        icon: "people-outline",
      },
    ],
  },
];

export default function MilestonePickerScreen({ navigation, route }) {
  const { t } = useTranslation();

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const selectedMilestoneId = route?.params?.selectedMilestoneId ?? null;

  const [search, setSearch] = useState("");

  const normalizedSearch = search.trim().toLowerCase();

  const filteredCategories = useMemo(() => {
    if (!normalizedSearch) {
      return MILESTONE_CATEGORIES;
    }

    return MILESTONE_CATEGORIES.map((category) => ({
      ...category,
      milestones: category.milestones.filter((milestone) =>
        t(milestone.label).toLowerCase().includes(normalizedSearch),
      ),
    })).filter((category) => category.milestones.length > 0);
  }, [normalizedSearch, t]);

  const handleSelectMilestone = (milestone, category) => {
    navigation.navigate({
      name: "MomentEditor",
      params: {
        ...route?.params?.editorParams,
        selectedMilestone: {
          ...milestone,
          category: category.label,
        },
      },
      merge: true,
    });
  };

  const handleCreateCustomMilestone = () => {
    navigation.navigate("CustomMilestone", {
      editorParams: route?.params?.editorParams,
    });
  };

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />

        <Text style={styles.headerTitle}>{t("Choose a milestone")}</Text>

        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.searchContainer}>
          <Ionicons
            name="search-outline"
            size={21}
            color={colors.textSecondary}
          />

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t("Search milestones")}
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            style={styles.searchInput}
          />

          {search ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("Clear search")}
              onPress={() => setSearch("")}
              hitSlop={8}
              style={({ pressed }) => [
                styles.clearButton,
                pressed && styles.clearButtonPressed,
              ]}
            >
              <Ionicons
                name="close-circle"
                size={20}
                color={colors.textSecondary}
              />
            </Pressable>
          ) : null}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("Create a custom milestone")}
          onPress={handleCreateCustomMilestone}
          style={({ pressed }) => [
            styles.customMilestoneButton,
            pressed && styles.customMilestoneButtonPressed,
          ]}
        >
          <View style={styles.customMilestoneIcon}>
            <Ionicons name="add" size={22} color={colors.primary} />
          </View>

          <View style={styles.customMilestoneTextContainer}>
            <Text style={styles.customMilestoneTitle}>
              {t("Create a custom milestone")}
            </Text>

            <Text style={styles.customMilestoneDescription}>
              {t("Add a milestone that is unique to your family")}
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={18}
            color={colors.textSecondary}
          />
        </Pressable>

        {filteredCategories.length > 0 ? (
          <View style={styles.categories}>
            {filteredCategories.map((category) => (
              <View key={category.id} style={styles.category}>
                <Text style={styles.categoryTitle}>{t(category.label)}</Text>

                <View style={styles.categoryCard}>
                  {category.milestones.map((milestone, index) => {
                    const selected = milestone.id === selectedMilestoneId;

                    const isLast = index === category.milestones.length - 1;

                    return (
                      <Pressable
                        key={milestone.id}
                        accessibilityRole="radio"
                        accessibilityLabel={t(milestone.label)}
                        accessibilityState={{
                          selected,
                        }}
                        onPress={() =>
                          handleSelectMilestone(milestone, category)
                        }
                        style={({ pressed }) => [
                          styles.milestoneRow,
                          !isLast && styles.milestoneRowBorder,
                          selected && styles.milestoneRowSelected,
                          pressed && styles.milestoneRowPressed,
                        ]}
                      >
                        <View
                          style={[
                            styles.milestoneIconContainer,
                            selected && styles.milestoneIconContainerSelected,
                          ]}
                        >
                          <Ionicons
                            name={milestone.icon}
                            size={21}
                            color={
                              selected ? colors.primary : colors.textSecondary
                            }
                          />
                        </View>

                        <Text
                          style={[
                            styles.milestoneLabel,
                            selected && styles.milestoneLabelSelected,
                          ]}
                        >
                          {t(milestone.label)}
                        </Text>

                        <View
                          style={[
                            styles.radioOuter,
                            selected && styles.radioOuterSelected,
                          ]}
                        >
                          {selected ? <View style={styles.radioInner} /> : null}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="search-outline"
                size={28}
                color={colors.primary}
              />
            </View>

            <Text style={styles.emptyTitle}>{t("No milestones found")}</Text>

            <Text style={styles.emptyDescription}>
              {t("Try another search or create your own milestone")}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },

    header: {
      minHeight: 64,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
    },

    headerTitle: {
      flex: 1,
      marginHorizontal: 12,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 18,
      lineHeight: 24,
      textAlign: "center",
      color: colors.textPrimary,
    },

    headerPlaceholder: {
      width: 42,
      height: 42,
    },

    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 38,
    },

    searchContainer: {
      minHeight: 54,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 15,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderRadius: 18,
      backgroundColor: colors.white,
    },

    searchInput: {
      flex: 1,
      paddingVertical: 0,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 14,
      lineHeight: 20,
      color: colors.textPrimary,
    },

    clearButton: {
      width: 30,
      height: 30,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 15,
    },

    clearButtonPressed: {
      backgroundColor: colors.selectedBackground,
    },

    customMilestoneButton: {
      minHeight: 76,
      flexDirection: "row",
      alignItems: "center",
      marginTop: 16,
      paddingHorizontal: 15,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: `${colors.primary}35`,
      borderRadius: 20,
      backgroundColor: colors.selectedBackground,
    },

    customMilestoneButtonPressed: {
      opacity: 0.75,
    },

    customMilestoneIcon: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
      borderRadius: 22,
      backgroundColor: colors.white,
    },

    customMilestoneTextContainer: {
      flex: 1,
      minWidth: 0,
      marginRight: 10,
    },

    customMilestoneTitle: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 14,
      lineHeight: 20,
      color: colors.textPrimary,
    },

    customMilestoneDescription: {
      marginTop: 3,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 11,
      lineHeight: 16,
      color: colors.textSecondary,
    },

    categories: {
      gap: 24,
      marginTop: 24,
    },

    category: {
      gap: 9,
    },

    categoryTitle: {
      paddingHorizontal: 3,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 15,
      lineHeight: 21,
      color: colors.textPrimary,
    },

    categoryCard: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderRadius: 21,
      backgroundColor: colors.white,
      overflow: "hidden",
    },

    milestoneRow: {
      minHeight: 64,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 15,
    },

    milestoneRowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },

    milestoneRowSelected: {
      backgroundColor: colors.selectedBackground,
    },

    milestoneRowPressed: {
      opacity: 0.75,
    },

    milestoneIconContainer: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
      borderRadius: 20,
      backgroundColor: colors.background,
    },

    milestoneIconContainerSelected: {
      backgroundColor: colors.white,
    },

    milestoneLabel: {
      flex: 1,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 14,
      lineHeight: 20,
      color: colors.textPrimary,
    },

    milestoneLabelSelected: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      color: colors.primary,
    },

    radioOuter: {
      width: 22,
      height: 22,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 11,
    },

    radioOuterSelected: {
      borderColor: colors.primary,
    },

    radioInner: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: colors.primary,
    },

    emptyState: {
      alignItems: "center",
      paddingTop: 70,
      paddingHorizontal: 30,
    },

    emptyIcon: {
      width: 62,
      height: 62,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 31,
      backgroundColor: colors.selectedBackground,
    },

    emptyTitle: {
      marginTop: 16,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 17,
      lineHeight: 23,
      textAlign: "center",
      color: colors.textPrimary,
    },

    emptyDescription: {
      maxWidth: 290,
      marginTop: 6,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 12,
      lineHeight: 19,
      textAlign: "center",
      color: colors.textSecondary,
    },
  });
