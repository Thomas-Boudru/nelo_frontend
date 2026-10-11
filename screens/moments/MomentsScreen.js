import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useFocusEffect } from "@react-navigation/native";

import ChildSelectorButton from "../../components/home/ChildSelectorButton.js";
import ChildSelectorSheet from "../child/ChildSelectorSheet.js";
import AddMomentSheet from "./AddMomentSheet.js";
import MomentsFilterSheet from "./MomentsFilterSheet.js";

import { useThemeColors } from "../../theme/useThemeColors.js";
import { useAuth } from "../../auth/AuthProvider.js";

import { loadChildren, selectChild } from "../../store/slices/childrenSlice.js";

import { synchronizeMoments } from "../../sync/moments/synchronizeMoments.js";
import { getLocalMoments } from "../../database/moments/momentsRepository.js";

import {
  buildMomentGroups,
  toMomentDisplay,
} from "../../utils/momentDisplay.js";

function createEmptyFilters() {
  return {
    types: [],
    dateRange: "all",
    authorIds: [],
  };
}

export default function MomentsScreen({ navigation }) {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();

  const { user, accessToken, refreshSession } = useAuth();

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const children = useSelector((state) => state.children.children);

  const selectedChildId = useSelector(
    (state) => state.children.selectedChildId,
  );

  const childSelectorSheetRef = useRef(null);
  const momentsFilterSheetRef = useRef(null);
  const addMomentSheetRef = useRef(null);

  const requestIdRef = useRef(0);
  const focusSessionRef = useRef(null);
  const refreshInProgressRef = useRef(false);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filters, setFilters] = useState(createEmptyFilters);

  const [momentsState, setMomentsState] = useState({
    userId: null,
    childId: null,
    items: [],
    loading: false,
    error: null,
  });

  const childPickerChildren = useMemo(
    () =>
      children.map((child) => {
        let ageInMonths = 0;

        if (child.birthDate) {
          const [birthYear, birthMonth, birthDay] = child.birthDate
            .slice(0, 10)
            .split("-")
            .map(Number);

          if (
            Number.isFinite(birthYear) &&
            Number.isFinite(birthMonth) &&
            Number.isFinite(birthDay)
          ) {
            const today = new Date();

            ageInMonths =
              (today.getFullYear() - birthYear) * 12 +
              today.getMonth() -
              (birthMonth - 1);

            if (today.getDate() < birthDay) {
              ageInMonths -= 1;
            }

            ageInMonths = Math.max(0, ageInMonths);
          }
        }

        return {
          ...child,
          firstName: child.displayName || t("Baby"),
          ageInMonths,
          ageLabel:
            child.birthStatus === "expected"
              ? t("Expected date of birth")
              : t("Child age in months", {
                  count: ageInMonths,
                }),
          profilePicture: child.avatar?.url
            ? {
                uri: child.avatar.url,
                cacheKey:
                  `child-avatar:${child.id}:` + child.avatar.attachmentId,
              }
            : null,
        };
      }),
    [children, t],
  );

  const selectedChild = useMemo(
    () =>
      childPickerChildren.find((child) => child.id === selectedChildId) ||
      childPickerChildren[0] ||
      null,
    [childPickerChildren, selectedChildId],
  );

  const userId = user?.id ?? null;
  const childId = selectedChild?.id ?? null;

  useEffect(() => {
    setFilters(createEmptyFilters());
  }, [userId, childId]);

  const loadLocalMoments = useCallback(async () => {
    const session = focusSessionRef.current;

    if (!session || session.userId !== userId || session.childId !== childId) {
      return;
    }

    const requestId = ++requestIdRef.current;

    const isStillCurrent = () =>
      focusSessionRef.current === session && requestIdRef.current === requestId;

    if (!userId || !childId) {
      setMomentsState({
        userId,
        childId,
        items: [],
        loading: false,
        error: null,
      });

      return;
    }

    setMomentsState((current) => ({
      userId,
      childId,
      items:
        current.userId === userId && current.childId === childId
          ? current.items
          : [],
      loading: true,
      error: null,
    }));

    try {
      const items = await getLocalMoments({
        userId,
        childId,
      });

      if (!isStillCurrent()) {
        return;
      }

      setMomentsState({
        userId,
        childId,
        items,
        loading: false,
        error: null,
      });
    } catch (error) {
      if (!isStillCurrent()) {
        return;
      }

      console.error("Unable to load local moments:", error);

      setMomentsState((current) => ({
        ...current,
        loading: false,
        error,
      }));
    }
  }, [userId, childId]);

  useFocusEffect(
    useCallback(() => {
      const session = { userId, childId };

      focusSessionRef.current = session;

      const isStillCurrent = () => focusSessionRef.current === session;

      async function loadAndSynchronize() {
        // Affichage immédiat des données disponibles hors ligne.
        await loadLocalMoments();

        if (!isStillCurrent() || !userId || !childId || !accessToken) {
          return;
        }

        try {
          const result = await synchronizeMoments({
            userId,
            childId,
            accessToken,
            refreshSession,
          });

          if (result.deferred > 0) {
            console.info(
              "Remote moments deferred because local changes are pending:",
              result.deferred,
            );
          }
        } catch (error) {
          // Conserver l'affichage local si le réseau échoue.
          console.warn("Unable to synchronize moments:", error);
        } finally {
          if (isStillCurrent()) {
            await loadLocalMoments();
          }
        }
      }

      void loadAndSynchronize();

      return () => {
        if (focusSessionRef.current === session) {
          focusSessionRef.current = null;
        }

        requestIdRef.current += 1;
      };
    }, [userId, childId, accessToken, refreshSession, loadLocalMoments]),
  );

  const isCurrentChild =
    momentsState.userId === userId && momentsState.childId === childId;

  const moments = useMemo(() => {
    if (!isCurrentChild) {
      return [];
    }

    return momentsState.items.map((moment) =>
      toMomentDisplay(moment, {
        child: selectedChild,
        userId,
        language: i18n.language,
        t,
      }),
    );
  }, [
    isCurrentChild,
    momentsState.items,
    selectedChild,
    userId,
    i18n.language,
    t,
  ]);

  const members = useMemo(() => {
    const result = new Map();

    for (const moment of moments) {
      if (!moment.createdByUserId) {
        continue;
      }

      result.set(moment.createdByUserId, {
        id: moment.createdByUserId,
        firstName: moment.authorName,
      });
    }

    return [...result.values()];
  }, [moments]);

  const momentGroups = useMemo(
    () =>
      buildMomentGroups(moments, filters, {
        language: i18n.language,
        t,
      }),
    [moments, filters, i18n.language, t],
  );

  const isLoadingMoments =
    Boolean(userId && childId) && (!isCurrentChild || momentsState.loading);

  const momentsError = isCurrentChild ? momentsState.error : null;

  const activeFilters = useMemo(() => {
    const result = [];

    const typeLabels = {
      photo: t("Photos"),
      note: t("Notes"),
      milestone: t("Milestones"),
    };

    for (const typeId of filters.types) {
      result.push({
        id: `type-${typeId}`,
        category: "type",
        value: typeId,
        label: typeLabels[typeId] ?? typeId,
      });
    }

    if (filters.dateRange !== "all") {
      const dateLabels = {
        today: t("Today"),
        "last-7-days": t("Last 7 days"),
        "last-30-days": t("Last 30 days"),
      };

      result.push({
        id: `date-${filters.dateRange}`,
        category: "date",
        value: filters.dateRange,
        label: dateLabels[filters.dateRange] ?? filters.dateRange,
      });
    }

    for (const authorId of filters.authorIds) {
      const member = members.find((item) => item.id === authorId);

      result.push({
        id: `author-${authorId}`,
        category: "author",
        value: authorId,
        label: member?.firstName ?? t("Family member"),
      });
    }

    return result;
  }, [filters, members, t]);

  const handleRefresh = async () => {
    const session = focusSessionRef.current;

    if (refreshInProgressRef.current || !userId || !childId || !session) {
      return;
    }

    refreshInProgressRef.current = true;
    setIsRefreshing(true);

    const isStillCurrent = () => focusSessionRef.current === session;

    try {
      await loadLocalMoments();

      if (!isStillCurrent()) {
        return;
      }

      const result = await synchronizeMoments({
        userId,
        childId,
        accessToken,
        refreshSession,
      });

      if (!isStillCurrent()) {
        return;
      }

      if (!result.skipped) {
        await dispatch(
          loadChildren({
            userId,
            accessToken,
            refreshSession,
          }),
        ).unwrap();
      }

      if (isStillCurrent() && result.deferred > 0) {
        Alert.alert(
          t("Some moments are still waiting to sync"),
          t(
            "Your local changes were kept. Some moments could not be updated from the server yet.",
          ),
        );
      }
    } catch (error) {
      console.error("Unable to refresh moments:", error);

      if (isStillCurrent()) {
        Alert.alert(
          t("Unable to refresh"),
          t("Check your internet connection and try again."),
        );
      }
    } finally {
      // Recharger aussi les pages déjà enregistrées si une page suivante
      // ou un téléchargement a échoué.
      if (isStillCurrent()) {
        await loadLocalMoments();
      }

      refreshInProgressRef.current = false;
      setIsRefreshing(false);
    }
  };

  const handleOpenChildSelector = () => {
    childSelectorSheetRef.current?.present();
  };

  const handleSelectChild = (child) => {
    dispatch(selectChild(child.id));
  };

  const handleAddChild = () => {
    navigation.navigate("ChildProfileForm", {
      mode: "create",
    });
  };

  const handleAddMoment = () => {
    if (!selectedChild || !userId) {
      return;
    }

    addMomentSheetRef.current?.present();
  };

  const handleCreateMoment = (type) => {
    if (!selectedChild || !userId) {
      return;
    }

    navigation.navigate("MomentEditor", {
      mode: "create",
      type,
      childId: selectedChild.id,
      childName: selectedChild.firstName,
    });
  };

  const handleOpenFilters = () => {
    momentsFilterSheetRef.current?.present();
  };

  const handleOpenMoment = (moment) => {
    navigation.navigate("MomentDetails", {
      momentId: moment.id,
      childId: moment.childId,
    });
  };

  const handleRemoveFilter = (filter) => {
    setFilters((current) => {
      if (filter.category === "type") {
        return {
          ...current,
          types: current.types.filter((id) => id !== filter.value),
        };
      }

      if (filter.category === "author") {
        return {
          ...current,
          authorIds: current.authorIds.filter((id) => id !== filter.value),
        };
      }

      if (filter.category === "date") {
        return {
          ...current,
          dateRange: "all",
        };
      }

      return current;
    });
  };

  const canAddMoment = Boolean(selectedChild && userId);

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>{t("Moments")}</Text>

            <Text style={styles.subtitle}>
              {selectedChild
                ? t("Child memories", {
                    childName: selectedChild.firstName,
                  })
                : t("Select a child to see their moments.")}
            </Text>
          </View>

          {selectedChild ? (
            <ChildSelectorButton
              child={selectedChild}
              onPress={handleOpenChildSelector}
            />
          ) : null}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("Add a moment")}
          accessibilityState={{ disabled: !canAddMoment }}
          disabled={!canAddMoment}
          onPress={handleAddMoment}
          style={({ pressed }) => [
            styles.addMomentCard,
            !canAddMoment && styles.disabled,
            pressed && styles.addMomentCardPressed,
          ]}
        >
          <View style={styles.addMomentIcon}>
            <Ionicons name="add" size={25} color={colors.primary} />
          </View>

          <View style={styles.addMomentTextContainer}>
            <Text style={styles.addMomentTitle}>{t("Add a moment")}</Text>

            <Text style={styles.addMomentDescription}>
              {t("Photos, notes and milestones")}
            </Text>
          </View>
        </Pressable>

        <ScrollView
          horizontal
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          style={styles.filtersScroll}
          contentContainerStyle={styles.filtersContent}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("Filters")}
            onPress={handleOpenFilters}
            style={({ pressed }) => [
              styles.filterButton,
              pressed && styles.filterButtonPressed,
            ]}
          >
            <Ionicons
              name="options-outline"
              size={18}
              color={colors.textPrimary}
            />

            <Text style={styles.filterButtonText}>{t("Filters")}</Text>

            {activeFilters.length > 0 ? (
              <View style={styles.filterCount}>
                <Text style={styles.filterCountText}>
                  {activeFilters.length}
                </Text>
              </View>
            ) : null}
          </Pressable>

          {activeFilters.map((filter) => (
            <View key={filter.id} style={styles.activeFilter}>
              <Text style={styles.activeFilterText} numberOfLines={1}>
                {filter.label}
              </Text>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("Remove filter", {
                  filterName: filter.label,
                })}
                hitSlop={8}
                onPress={() => handleRemoveFilter(filter)}
                style={({ pressed }) => [
                  styles.removeFilterButton,
                  pressed && styles.removeFilterButtonPressed,
                ]}
              >
                <Ionicons name="close" size={15} color={colors.primary} />
              </Pressable>
            </View>
          ))}
        </ScrollView>

        <View style={styles.timeline}>
          {!selectedChild ? (
            <Text style={styles.subtitle}>
              {t("Select a child to see their moments.")}
            </Text>
          ) : !userId ? (
            <Text style={styles.subtitle}>
              {t("Sign in to see your moments.")}
            </Text>
          ) : (
            <>
              {momentsError ? (
                <View>
                  <Text style={styles.subtitle}>
                    {t("Unable to load moments.")}
                  </Text>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("Try again")}
                    onPress={() => void loadLocalMoments()}
                    style={styles.retryButton}
                  >
                    <Text style={styles.filterButtonText}>
                      {t("Try again")}
                    </Text>
                  </Pressable>
                </View>
              ) : null}

              {isLoadingMoments && moments.length === 0 ? (
                <Text style={styles.subtitle}>{t("Loading moments...")}</Text>
              ) : momentGroups.length > 0 ? (
                momentGroups.map((group) => (
                  <MomentGroup
                    key={group.id}
                    group={group}
                    onPressMoment={handleOpenMoment}
                    colors={colors}
                    styles={styles}
                    t={t}
                  />
                ))
              ) : !momentsError ? (
                <Text style={styles.subtitle}>
                  {moments.length === 0
                    ? t("No moments yet. Add your first memory.")
                    : t("No moments match these filters.")}
                </Text>
              ) : null}
            </>
          )}
        </View>
      </ScrollView>

      <ChildSelectorSheet
        ref={childSelectorSheetRef}
        children={childPickerChildren}
        selectedChildId={childId}
        onSelectChild={handleSelectChild}
        onAddChild={handleAddChild}
      />

      {selectedChild ? (
        <AddMomentSheet
          ref={addMomentSheetRef}
          childName={selectedChild.firstName}
          onSelectPhoto={() => handleCreateMoment("photo")}
          onSelectNote={() => handleCreateMoment("note")}
          onSelectMilestone={() => handleCreateMoment("milestone")}
        />
      ) : null}

      <MomentsFilterSheet
        key={`${userId ?? "no-user"}:${childId ?? "no-child"}`}
        ref={momentsFilterSheetRef}
        filters={filters}
        members={members}
        onApply={setFilters}
      />
    </SafeAreaView>
  );
}

function MomentGroup({ group, onPressMoment, colors, styles, t }) {
  const rows = buildMomentRows(group.moments);

  return (
    <View style={styles.momentGroup}>
      <Text style={styles.groupTitle}>{group.label}</Text>

      <View style={styles.groupContent}>
        {rows.map((row, rowIndex) => {
          if (row.length === 1) {
            return (
              <MomentCard
                key={row[0].id}
                moment={row[0]}
                fullWidth
                onPress={() => onPressMoment(row[0])}
                colors={colors}
                styles={styles}
                t={t}
              />
            );
          }

          return (
            <View key={`${group.id}-${rowIndex}`} style={styles.compactRow}>
              {row.map((moment) => (
                <MomentCard
                  key={moment.id}
                  moment={moment}
                  onPress={() => onPressMoment(moment)}
                  colors={colors}
                  styles={styles}
                  t={t}
                />
              ))}
            </View>
          );
        })}
      </View>
    </View>
  );
}

function AgeBadge({ label, styles }) {
  if (!label) {
    return null;
  }

  return (
    <View style={styles.ageBadge}>
      <Text style={styles.ageBadgeText}>{label}</Text>
    </View>
  );
}

function MomentCard({ moment, fullWidth = false, onPress, colors, styles, t }) {
  const authorLabel = t("Added by {{authorName}}", {
    authorName: moment.authorName,
  });

  if (moment.type === "milestone") {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={moment.title || t("Milestone")}
        onPress={onPress}
        style={({ pressed }) => [
          styles.momentCard,
          styles.compactMomentCard,
          styles.milestoneCard,
          fullWidth && styles.fullWidthCard,
          pressed && styles.momentCardPressed,
        ]}
      >
        <View style={styles.milestoneIllustration}>
          <Ionicons
            name={moment.milestone?.icon ?? "flag-outline"}
            size={35}
            color={styles.milestoneIcon.color}
          />
        </View>

        <Text style={styles.milestoneTitle}>
          {moment.title || t("Milestone")}
        </Text>

        <Text style={styles.momentMetadata}>{authorLabel}</Text>

        <AgeBadge label={moment.childAgeLabel} styles={styles} />
      </Pressable>
    );
  }

  if (moment.type === "note") {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={moment.description || moment.title || t("Note")}
        onPress={onPress}
        style={({ pressed }) => [
          styles.momentCard,
          styles.compactMomentCard,
          styles.noteCard,
          fullWidth && styles.fullWidthCard,
          pressed && styles.momentCardPressed,
        ]}
      >
        <View style={styles.cardTopRow} />

        <Text style={styles.noteText} numberOfLines={5}>
          {moment.description}
        </Text>

        <View style={styles.noteBottomRow}>
          <Text
            style={[styles.momentMetadata, styles.noteAuthor]}
            numberOfLines={1}
          >
            {authorLabel}
          </Text>

          <AgeBadge label={moment.childAgeLabel} styles={styles} />
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={moment.title || t("Photo moment")}
      onPress={onPress}
      style={({ pressed }) => [
        styles.momentCard,
        fullWidth ? styles.fullWidthPhotoCard : styles.compactPhotoCard,
        pressed && styles.momentCardPressed,
      ]}
    >
      <View style={styles.photoContainer}>
        {moment.image ? (
          <Image
            source={moment.image}
            resizeMode="cover"
            style={styles.photo}
          />
        ) : (
          <View style={[styles.photo, styles.photoPlaceholder]}>
            <Ionicons
              name="image-outline"
              size={32}
              color={colors.textSecondary}
            />
          </View>
        )}
      </View>

      <View style={styles.photoContent}>
        {moment.title || moment.childAgeLabel ? (
          <View style={styles.photoTitleRow}>
            {moment.title ? (
              <Text style={styles.photoTitle} numberOfLines={2}>
                {moment.title}
              </Text>
            ) : (
              <View style={styles.photoTitleSpacer} />
            )}

            <AgeBadge label={moment.childAgeLabel} styles={styles} />
          </View>
        ) : null}

        {moment.description ? (
          <Text style={styles.photoDescription} numberOfLines={2}>
            {moment.description}
          </Text>
        ) : null}

        <Text style={styles.momentMetadata}>{authorLabel}</Text>
      </View>
    </Pressable>
  );
}

function buildMomentRows(moments) {
  const rows = [];
  let compactRow = [];

  for (const moment of moments) {
    const shouldUseFullWidth = moment.type === "photo" && !moment.compact;

    if (shouldUseFullWidth) {
      if (compactRow.length > 0) {
        rows.push(compactRow);
        compactRow = [];
      }

      rows.push([moment]);
      continue;
    }

    compactRow.push(moment);

    if (compactRow.length === 2) {
      rows.push(compactRow);
      compactRow = [];
    }
  }

  if (compactRow.length > 0) {
    rows.push(compactRow);
  }

  return rows;
}

const createStyles = (colors) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },

    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 125,
    },

    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 14,
      marginBottom: 20,
    },

    headerTextContainer: {
      flex: 1,
      minWidth: 0,
    },

    title: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 22,
      lineHeight: 30,
      color: colors.textPrimary,
    },

    subtitle: {
      marginTop: 2,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 13,
      lineHeight: 19,
      color: colors.textSecondary,
    },

    addMomentCard: {
      minHeight: 78,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 17,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderRadius: 22,
      backgroundColor: colors.white,
      shadowColor: colors.textPrimary,
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.035,
      shadowRadius: 14,
      elevation: 2,
    },

    addMomentCardPressed: {
      opacity: 0.78,
      transform: [{ scale: 0.99 }],
    },

    addMomentIcon: {
      width: 46,
      height: 46,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 13,
      borderRadius: 23,
      backgroundColor: colors.selectedBackground,
    },

    addMomentTextContainer: {
      flex: 1,
      minWidth: 0,
      marginRight: 10,
    },

    addMomentTitle: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 15,
      lineHeight: 21,
      color: colors.textPrimary,
    },

    addMomentDescription: {
      marginTop: 3,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 11,
      lineHeight: 16,
      color: colors.textSecondary,
    },

    filtersScroll: {
      marginTop: 16,
      marginBottom: 24,
      marginHorizontal: -20,
    },

    filtersContent: {
      alignItems: "center",
      gap: 9,
      paddingHorizontal: 20,
    },

    filterButton: {
      minHeight: 40,
      flexDirection: "row",
      alignItems: "center",
      flexShrink: 0,
      gap: 7,
      paddingHorizontal: 13,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderRadius: 20,
      backgroundColor: colors.white,
    },

    filterButtonPressed: {
      backgroundColor: colors.selectedBackground,
    },

    filterButtonText: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 12,
      lineHeight: 17,
      color: colors.textPrimary,
    },

    filterCount: {
      minWidth: 20,
      height: 20,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 5,
      borderRadius: 10,
      backgroundColor: colors.primary,
    },

    filterCountText: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 10,
      lineHeight: 13,
      color: colors.white,
    },

    activeFilter: {
      minHeight: 40,
      maxWidth: 160,
      flexDirection: "row",
      alignItems: "center",
      flexShrink: 0,
      gap: 5,
      paddingLeft: 13,
      paddingRight: 7,
      borderWidth: 1,
      borderColor: `${colors.primary}45`,
      borderRadius: 20,
      backgroundColor: colors.selectedBackground,
    },

    activeFilterText: {
      flexShrink: 1,
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 12,
      lineHeight: 17,
      color: colors.primary,
    },

    removeFilterButton: {
      width: 25,
      height: 25,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 13,
    },

    removeFilterButtonPressed: {
      backgroundColor: `${colors.primary}12`,
    },

    timeline: {
      gap: 27,
    },

    momentGroup: {
      gap: 11,
    },

    groupTitle: {
      paddingHorizontal: 2,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 17,
      lineHeight: 23,
      color: colors.textPrimary,
    },

    groupContent: {
      gap: 12,
    },

    compactRow: {
      flexDirection: "row",
      alignItems: "stretch",
      gap: 12,
    },

    momentCard: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderRadius: 22,
      backgroundColor: colors.white,
      overflow: "hidden",
      shadowColor: colors.textPrimary,
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.04,
      shadowRadius: 13,
      elevation: 2,
    },

    momentCardPressed: {
      opacity: 0.78,
      transform: [{ scale: 0.99 }],
    },

    fullWidthCard: {
      width: "100%",
    },

    compactMomentCard: {
      flex: 1,
      minHeight: 215,
      padding: 15,
    },

    fullWidthPhotoCard: {
      width: "100%",
    },

    compactPhotoCard: {
      flex: 1,
    },

    photoContainer: {
      position: "relative",
      width: "100%",
      aspectRatio: 1.55,
      backgroundColor: colors.selectedBackground,
    },

    photo: {
      width: "100%",
      height: "100%",
    },

    photoPlaceholder: {
      alignItems: "center",
      justifyContent: "center",
    },

    photoContent: {
      paddingHorizontal: 15,
      paddingTop: 13,
      paddingBottom: 15,
    },

    photoTitleRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
    },

    photoTitle: {
      flex: 1,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 15,
      lineHeight: 21,
      color: colors.textPrimary,
    },

    photoTitleSpacer: {
      flex: 1,
    },

    photoDescription: {
      marginTop: 5,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 12,
      lineHeight: 18,
      color: colors.textSecondary,
    },

    momentMetadata: {
      marginTop: 6,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 10,
      lineHeight: 15,
      color: colors.textSecondary,
    },

    ageBadge: {
      alignSelf: "flex-start",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 11,
      backgroundColor: colors.selectedBackground,
    },

    ageBadgeText: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 9,
      lineHeight: 12,
      color: colors.primary,
    },

    cardTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    milestoneCard: {
      borderColor: "#F1DCA7",
      backgroundColor: "#FFF9E9",
    },

    milestoneTypeIcon: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 18,
      backgroundColor: "#FFF1C8",
    },

    milestoneIllustration: {
      width: 62,
      height: 62,
      alignSelf: "center",
      alignItems: "center",
      justifyContent: "center",
      marginTop: 13,
      borderRadius: 31,
      backgroundColor: "#FFF1C8",
    },

    milestoneIcon: {
      color: "#EAAA2B",
    },

    milestoneTitle: {
      marginTop: 13,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 17,
      lineHeight: 23,
      textAlign: "center",
      color: colors.textPrimary,
    },

    noteCard: {
      borderColor: `${colors.primary}26`,
      backgroundColor: colors.selectedBackground,
    },

    noteText: {
      flex: 1,
      marginTop: 18,
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 15,
      lineHeight: 24,
      color: colors.textPrimary,
    },

    noteBottomRow: {
      marginTop: 14,
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
      gap: 8,
    },

    noteAuthor: {
      flex: 1,
      minWidth: 0,
    },

    retryButton: {
      alignSelf: "flex-start",
      paddingVertical: 12,
    },

    disabled: {
      opacity: 0.5,
    },
  });
