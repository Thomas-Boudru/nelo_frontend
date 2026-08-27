import { useMemo, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FontAwesome6, Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import BackButton from "../../components/ui/BackButton.js";
import CustomMilestoneSheet from "./CustomMilestoneSheet.js";

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
        isCustom: false,
      },
      {
        id: "first-laugh",
        label: "First laugh",
        icon: "sparkles-outline",
        isCustom: false,
      },
      {
        id: "rolls-over",
        label: "Rolls over",
        icon: "refresh-outline",
        isCustom: false,
      },
      {
        id: "sits-up",
        label: "Sits up",
        icon: "body-outline",
        isCustom: false,
      },
      {
        id: "starts-crawling",
        label: "Starts crawling",
        icon: "walk-outline",
        isCustom: false,
      },
      {
        id: "first-steps",
        label: "First steps",
        icon: "footsteps-outline",
        isCustom: false,
      },
      {
        id: "first-word",
        label: "First word",
        icon: "chatbubble-ellipses-outline",
        isCustom: false,
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
        isCustom: false,
      },
      {
        id: "first-puree",
        label: "First puree",
        icon: "restaurant-outline",
        isCustom: false,
      },
      {
        id: "first-solid-food",
        label: "First solid food",
        icon: "fast-food-outline",
        isCustom: false,
      },
      {
        id: "eats-alone",
        label: "Eats independently",
        icon: "restaurant-outline",
        isCustom: false,
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
        isCustom: false,
      },
      {
        id: "first-nap-alone",
        label: "First nap alone",
        icon: "bed-outline",
        isCustom: false,
      },
      {
        id: "sleeps-own-room",
        label: "Sleeps in their own room",
        icon: "home-outline",
        isCustom: false,
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
        isCustom: false,
      },
      {
        id: "first-haircut",
        label: "First haircut",
        icon: "cut-outline",
        isCustom: false,
      },
      {
        id: "first-vaccine",
        label: "First vaccine",
        icon: "medical-outline",
        isCustom: false,
      },
      {
        id: "first-birthday",
        label: "First birthday",
        icon: "gift-outline",
        isCustom: false,
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
        isCustom: false,
      },
      {
        id: "first-outing",
        label: "First outing",
        icon: "sunny-outline",
        isCustom: false,
      },
      {
        id: "first-trip",
        label: "First trip",
        icon: "airplane-outline",
        isCustom: false,
      },
      {
        id: "first-day-daycare",
        label: "First day at daycare",
        icon: "school-outline",
        isCustom: false,
      },
      {
        id: "meets-grandparents",
        label: "Met the grandparents",
        icon: "people-outline",
        isCustom: false,
      },
    ],
  },
];

function createCustomMilestoneId() {
  return `custom-milestone-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}

export default function MilestonePickerScreen({ navigation, route }) {
  const { t } = useTranslation();

  const colors = useThemeColors();

  const styles = useMemo(() => createStyles(colors), [colors]);

  const customMilestoneSheetRef = useRef(null);

  const [search, setSearch] = useState("");

  /*
   * À remplacer plus tard par les milestones chargés
   * depuis le backend pour l’enfant sélectionné.
   */
  const [customMilestones, setCustomMilestones] = useState([]);

  const activeCustomMilestones = useMemo(
    () => customMilestones.filter((milestone) => !milestone.deletedAt),
    [customMilestones],
  );

  const categoriesWithCustomMilestones = useMemo(
    () =>
      MILESTONE_CATEGORIES.map((category) => ({
        ...category,

        milestones: [
          ...category.milestones,

          ...activeCustomMilestones.filter(
            (milestone) => milestone.categoryId === category.id,
          ),
        ],
      })),
    [activeCustomMilestones],
  );

  const normalizedSearch = search.trim().toLocaleLowerCase();

  const filteredCategories = useMemo(() => {
    if (!normalizedSearch) {
      return categoriesWithCustomMilestones;
    }

    return categoriesWithCustomMilestones
      .map((category) => ({
        ...category,

        milestones: category.milestones.filter((milestone) => {
          const milestoneLabel = milestone.isCustom
            ? milestone.label
            : t(milestone.label);

          return milestoneLabel.toLocaleLowerCase().includes(normalizedSearch);
        }),
      }))
      .filter((category) => category.milestones.length > 0);
  }, [categoriesWithCustomMilestones, normalizedSearch, t]);

  function getMilestoneLabel(milestone) {
    if (!milestone) {
      return "";
    }

    return milestone.isCustom ? milestone.label : t(milestone.label);
  }

  function handleSelectMilestone(milestone, category) {
    navigation.navigate({
      name: "MomentEditor",

      params: {
        ...route?.params?.editorParams,

        selectedMilestone: {
          ...milestone,

          /*
           * On conserve l’identifiant technique
           * et le libellé de la catégorie.
           */
          categoryId: category.id,
          category: category.label,

          /*
           * Snapshot du texte affiché.
           * Utile si le milestone personnalisé
           * est renommé ou supprimé plus tard.
           */
          displayLabel: getMilestoneLabel(milestone),
        },
      },

      merge: true,
    });
  }

  function handleOpenCreateMilestone() {
    customMilestoneSheetRef.current?.present({
      mode: "create",
    });
  }

  function handleOpenEditMilestone(milestone) {
    customMilestoneSheetRef.current?.present({
      mode: "edit",
      milestone,
    });
  }

  async function handleSaveCustomMilestone({ mode, milestone }) {
    /*
     * Plus tard :
     *
     * if (mode === "create") {
     *   return await api.post(
     *     `/children/${childId}/milestones`,
     *     milestone,
     *   );
     * }
     *
     * return await api.patch(
     *   `/children/${childId}/milestones/${milestone.id}`,
     *   milestone,
     * );
     */

    if (mode === "create") {
      const savedMilestone = {
        ...milestone,
        id: createCustomMilestoneId(),
      };

      setCustomMilestones((currentMilestones) => [
        ...currentMilestones,
        savedMilestone,
      ]);

      return savedMilestone;
    }

    setCustomMilestones((currentMilestones) =>
      currentMilestones.map((currentMilestone) =>
        currentMilestone.id === milestone.id ? milestone : currentMilestone,
      ),
    );

    return milestone;
  }

  async function handleDeleteCustomMilestone({ milestone }) {
    /*
     * Plus tard :
     *
     * await api.delete(
     *   `/children/${childId}/milestones/${milestone.id}`,
     * );
     *
     * Le backend devrait effectuer une
     * suppression logique avec deletedAt.
     */

    setCustomMilestones((currentMilestones) =>
      currentMilestones.map((currentMilestone) =>
        currentMilestone.id === milestone.id ? milestone : currentMilestone,
      ),
    );

    return true;
  }

  function handleCustomMilestoneSaved({ mode, milestone }) {
    /*
     * Après une création, le nouveau milestone
     * est directement sélectionné.
     *
     * Après une édition, on reste sur le picker.
     */
    if (mode !== "create") {
      return;
    }

    const category = MILESTONE_CATEGORIES.find(
      (item) => item.id === milestone.categoryId,
    );

    if (!category) {
      return;
    }

    handleSelectMilestone(milestone, category);
  }

  return (
    <>
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
            onPress={handleOpenCreateMilestone}
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
                      const isLast = index === category.milestones.length - 1;

                      const milestoneLabel = getMilestoneLabel(milestone);

                      return (
                        <Pressable
                          key={milestone.id}
                          accessibilityRole="button"
                          accessibilityLabel={milestoneLabel}
                          onPress={() =>
                            handleSelectMilestone(milestone, category)
                          }
                          style={({ pressed }) => [
                            styles.milestoneRow,
                            !isLast && styles.milestoneRowBorder,
                            pressed && styles.milestoneRowPressed,
                          ]}
                        >
                          <View
                            style={[
                              styles.milestoneIconContainer,
                              milestone.isCustom &&
                                styles.customMilestoneIconContainer,
                            ]}
                          >
                            <Ionicons
                              name={
                                milestone.icon ||
                                (milestone.isCustom
                                  ? "heart-outline"
                                  : "sparkles-outline")
                              }
                              size={21}
                              color={
                                milestone.isCustom
                                  ? colors.primary
                                  : colors.textSecondary
                              }
                            />
                          </View>

                          <Text numberOfLines={2} style={styles.milestoneLabel}>
                            {milestoneLabel}
                          </Text>

                          {milestone.isCustom ? (
                            <View style={styles.rowActions}>
                              <View style={styles.customBadge}>
                                <Text style={styles.customBadgeText}>
                                  {t("Custom")}
                                </Text>
                              </View>

                              <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={t("Edit custom milestone")}
                                hitSlop={8}
                                onPress={(event) => {
                                  event.stopPropagation();

                                  handleOpenEditMilestone(milestone);
                                }}
                                style={({ pressed }) => [
                                  styles.editButton,
                                  pressed && styles.editButtonPressed,
                                ]}
                              >
                                <FontAwesome6
                                  name="pen"
                                  size={13}
                                  color={colors.primary}
                                />
                              </Pressable>
                            </View>
                          ) : null}
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

      <CustomMilestoneSheet
        ref={customMilestoneSheetRef}
        existingMilestones={customMilestones}
        onSave={handleSaveCustomMilestone}
        onDelete={handleDeleteCustomMilestone}
        onSaved={handleCustomMilestoneSaved}
      />
    </>
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
      color: colors.textPrimary,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 18,
      lineHeight: 24,
      textAlign: "center",
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
      color: colors.textPrimary,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 14,
      lineHeight: 20,
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
      color: colors.textPrimary,
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 14,
      lineHeight: 20,
    },

    customMilestoneDescription: {
      marginTop: 3,
      color: colors.textSecondary,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 11,
      lineHeight: 16,
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
      color: colors.textPrimary,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 15,
      lineHeight: 21,
    },

    categoryCard: {
      overflow: "hidden",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderRadius: 21,
      backgroundColor: colors.white,
    },

    milestoneRow: {
      minHeight: 64,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 15,
      paddingVertical: 8,
    },

    milestoneRowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },

    milestoneRowPressed: {
      opacity: 0.75,
    },

    milestoneIconContainer: {
      width: 40,
      height: 40,
      flexShrink: 0,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
      borderRadius: 20,
      backgroundColor: colors.background,
    },

    milestoneLabel: {
      flex: 1,
      minWidth: 0,
      color: colors.textPrimary,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 14,
      lineHeight: 20,
    },

    rowActions: {
      flexShrink: 0,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginLeft: 10,
    },

    customBadge: {
      paddingHorizontal: 7,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: `${colors.primary}12`,
    },

    customBadgeText: {
      color: colors.primary,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 8,
      lineHeight: 11,
    },

    editButton: {
      width: 32,
      height: 32,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 16,
      backgroundColor: `${colors.primary}12`,
    },

    editButtonPressed: {
      opacity: 0.65,
      transform: [{ scale: 0.94 }],
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
      color: colors.textPrimary,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 17,
      lineHeight: 23,
      textAlign: "center",
    },

    emptyDescription: {
      maxWidth: 290,
      marginTop: 6,
      color: colors.textSecondary,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 12,
      lineHeight: 19,
      textAlign: "center",
    },

    customMilestoneIconContainer: {
      backgroundColor: colors.selectedBackground,
    },
  });
