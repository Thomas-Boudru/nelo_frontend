import { useEffect, useMemo, useRef, useState } from "react";
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

import { useAuth } from "../../auth/AuthProvider.js";
import { useToast } from "../../components/ui/toast/useToast.js";
import { CommonActions, StackActions } from "@react-navigation/native";

import {
  getLocalCustomMilestones,
  createLocalCustomMilestone,
  updateLocalCustomMilestone,
  archiveLocalCustomMilestone,
} from "../../database/moments/customMilestonesRepository.js";

import { processSyncQueue } from "../../sync/processSyncQueue.js";

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

function toPickerMilestone(milestone) {
  return {
    ...milestone,
    label: milestone.name,
    categoryId: milestone.categoryCode,
    isCustom: true,
    icon: "heart-outline",

    // Compatibilité avec le filtre actuel de CustomMilestoneSheet.
    deletedAt: milestone.archivedAt ?? null,
  };
}

export default function MilestonePickerScreen({ navigation, route }) {
  const { t } = useTranslation();

  const { user, accessToken, refreshSession } = useAuth();
  const { showToast } = useToast();

  const childId =
    route?.params?.childId ?? route?.params?.editorParams?.childId;

  const customMutationRef = useRef(false);

  const colors = useThemeColors();

  const styles = useMemo(() => createStyles(colors), [colors]);

  const customMilestoneSheetRef = useRef(null);

  const [search, setSearch] = useState("");

  /*
   * À remplacer plus tard par les milestones chargés
   * depuis le backend pour l’enfant sélectionné.
   */
  const [customMilestones, setCustomMilestones] = useState([]);

  useEffect(() => {
    let cancelled = false;

    setCustomMilestones([]);

    if (!user?.id || !childId) {
      return;
    }

    async function loadLocalMilestones() {
      try {
        const milestones = await getLocalCustomMilestones({
          userId: user.id,
          childId,
        });

        if (!cancelled) {
          setCustomMilestones(milestones.map(toPickerMilestone));
        }
      } catch (error) {
        console.error("Unable to load local milestones:", error);

        if (!cancelled) {
          showToast({
            type: "error",
            title: t("Unable to load milestones"),
            message: t("Please try again in a moment."),
          });
        }
      }
    }

    void loadLocalMilestones();

    return () => {
      cancelled = true;
    };
  }, [childId, user?.id, showToast, t]);

  const activeCustomMilestones = useMemo(
    () => customMilestones.filter((milestone) => !milestone.deletedAt),
    [customMilestones],
  );

  function synchronizeCustomMilestones() {
    void processSyncQueue({
      userId: user?.id,
      accessToken,
      refreshSession,
    }).catch((error) => {
      console.warn("Unable to synchronize custom milestones:", error);
    });
  }

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
    const state = navigation.getState();
    const editorRouteKey = route?.params?.editorRouteKey;

    let editorIndex = -1;

    // Chercher l'éditeur qui a ouvert ce sélecteur.
    for (let index = state.index - 1; index >= 0; index -= 1) {
      const candidate = state.routes[index];

      const matches = editorRouteKey
        ? candidate.key === editorRouteKey
        : candidate.name === "MomentEditor";

      if (matches) {
        editorIndex = index;
        break;
      }
    }

    if (editorIndex < 0) {
      showToast({
        type: "error",
        title: t("Unable to select milestone"),
        message: t("Go back to the moment editor and try again."),
      });

      return;
    }

    const editorRoute = state.routes[editorIndex];

    const selectedMilestone = {
      ...milestone,
      categoryId: category.id,
      category: category.label,
      displayLabel: getMilestoneLabel(milestone),
    };

    // Transmettre la sélection à l'éditeur existant.
    navigation.dispatch({
      ...CommonActions.setParams({
        selectedMilestone,
      }),
      source: editorRoute.key,
      target: state.key,
    });

    // Retirer le sélecteur de la pile et retrouver cet éditeur.
    navigation.dispatch({
      ...StackActions.pop(state.index - editorIndex),
      target: state.key,
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
    if (customMutationRef.current) {
      return false;
    }

    if (!user?.id || !childId) {
      throw new Error(t("Missing user ID or child ID."));
    }

    customMutationRef.current = true;

    let savedMilestone;

    try {
      const data = {
        name: milestone.label,
        categoryCode: milestone.categoryId,
      };

      if (mode === "create") {
        savedMilestone = await createLocalCustomMilestone({
          userId: user.id,
          childId,
          data,
        });
      } else if (mode === "edit") {
        savedMilestone = await updateLocalCustomMilestone({
          userId: user.id,
          childId,
          milestoneId: milestone.id,
          data,
        });
      } else {
        throw new Error("Invalid custom milestone mode.");
      }
    } catch (error) {
      console.error("Unable to save custom milestone locally:", error);

      throw new Error(
        t(error?.message || "Unable to save this milestone. Please try again."),
      );
    } finally {
      customMutationRef.current = false;
    }

    const pickerMilestone = toPickerMilestone(savedMilestone);

    setCustomMilestones((current) => {
      const exists = current.some((item) => item.id === pickerMilestone.id);

      return exists
        ? current.map((item) =>
            item.id === pickerMilestone.id ? pickerMilestone : item,
          )
        : [...current, pickerMilestone];
    });

    synchronizeCustomMilestones();

    return pickerMilestone;
  }

  async function handleDeleteCustomMilestone({ milestone }) {
    if (customMutationRef.current) {
      return false;
    }

    if (!user?.id || !childId) {
      throw new Error(t("Missing user ID or child ID."));
    }

    customMutationRef.current = true;

    try {
      await archiveLocalCustomMilestone({
        userId: user.id,
        childId,
        milestoneId: milestone.id,
      });
    } catch (error) {
      console.error("Unable to archive custom milestone locally:", error);

      throw new Error(
        t(
          error?.message ||
            "Unable to delete this milestone. Please try again.",
        ),
      );
    } finally {
      customMutationRef.current = false;
    }

    setCustomMilestones((current) =>
      current.filter((item) => item.id !== milestone.id),
    );

    synchronizeCustomMilestones();

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
