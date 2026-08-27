import { useMemo, useRef, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import ChildSelectorButton from "../../components/home/ChildSelectorButton.js";
import ChildSelectorSheet from "../child/ChildSelectorSheet.js";
import AddMomentSheet from "./AddMomentSheet.js";
import { useThemeColors } from "../../theme/useThemeColors.js";
import MomentsFilterSheet from "./MomentsFilterSheet.js";

const MOCK_CHILDREN = [
  {
    id: "emma",
    firstName: "Emma",
    ageLabel: "9 months old",
    themeMode: "blue",
    profilePicture: null,
  },
  {
    id: "leo",
    firstName: "Léo",
    ageLabel: "2 years old",
    themeMode: "green",
    profilePicture: null,
  },
];

const MOCK_MEMBERS = [
  {
    id: "thomas",
    firstName: "Thomas",
  },
  {
    id: "julie",
    firstName: "Julie",
  },
  {
    id: "grandma",
    firstName: "Grandma",
  },
];

const MOCK_MOMENT_IMAGES = {
  bath: require("../../assets/images/moments/bath.jpg"),
  tummy: require("../../assets/images/moments/tummy.jpeg"),
  picnic: require("../../assets/images/moments/picnic.jpg"),
};

const MOCK_MOMENT_GROUPS = [
  {
    id: "today",
    label: "Today",
    moments: [
      {
        id: "bath-time",
        type: "photo",
        title: "Bath time giggles",
        description: "She couldn't stop laughing with her yellow duck.",
        authorName: "Thomas",
        timeLabel: "18:42",
        childAgeLabel: "9m",
        image: MOCK_MOMENT_IMAGES.bath,
      },
      {
        id: "first-tooth",
        type: "milestone",
        milestoneIcon: "tooth-outline",
        title: "First tooth",
        description: null,
        authorName: "Grandma",
        timeLabel: "16:20",
        childAgeLabel: "9m",
        backgroundTone: "yellow",
      },
    ],
  },
  {
    id: "yesterday",
    label: "Yesterday",
    moments: [
      {
        id: "bottle-note",
        type: "note",
        title: null,
        description: "She fell asleep in my arms after her bottle.",
        authorName: "Grandma",
        timeLabel: "14:20",
        childAgeLabel: "9m",
        backgroundTone: "purple",
      },
      {
        id: "tummy-time",
        type: "photo",
        title: "Morning tummy time",
        description: null,
        authorName: "Julie",
        timeLabel: "10:15",
        childAgeLabel: "9m",
        image: MOCK_MOMENT_IMAGES.tummy,
        compact: true,
      },
    ],
  },
  {
    id: "august-3",
    label: "August 3, 2026",
    moments: [
      {
        id: "picnic",
        type: "photo",
        title: "Our first picnic together",
        description: "A beautiful afternoon at the park ☀️",
        authorName: "Julie",
        timeLabel: "10:15",
        childAgeLabel: "8m",
        image: MOCK_MOMENT_IMAGES.picnic,
      },
    ],
  },
];

const EMPTY_FILTERS = {
  types: [],
  dateRange: "all",
  authorIds: [],
};

export default function MomentsScreen({ navigation }) {
  const { t } = useTranslation();

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const childSelectorSheetRef = useRef(null);

  const [filters, setFilters] = useState(EMPTY_FILTERS);

  const momentsFilterSheetRef = useRef(null);

  const [children] = useState(MOCK_CHILDREN);
  const [selectedChildId, setSelectedChildId] = useState("emma");
  const addMomentSheetRef = useRef(null);

  const selectedChild =
    children.find((child) => child.id === selectedChildId) ?? children[0];

  const handleOpenChildSelector = () => {
    childSelectorSheetRef.current?.present();
  };

  const handleSelectChild = (child) => {
    setSelectedChildId(child.id);
  };

  const handleAddChild = () => {
    navigation.navigate("ChildProfileForm", {
      mode: "create",
    });
  };

  const handleAddMoment = () => {
    addMomentSheetRef.current?.present();
  };

  const handleSelectPhotoMoment = () => {
    navigation.navigate("MomentEditor", {
      mode: "create",
      type: "photo",
      childId: selectedChild.id,
      childName: selectedChild.firstName,
    });
  };

  const handleSelectNoteMoment = () => {
    navigation.navigate("MomentEditor", {
      mode: "create",
      type: "note",
      childId: selectedChild.id,
      childName: selectedChild.firstName,
    });
  };

  const handleSelectMilestoneMoment = () => {
    navigation.navigate("MomentEditor", {
      mode: "create",
      type: "milestone",
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
      childId: selectedChild.id,
    });
  };

  const activeFilters = useMemo(() => {
    const result = [];

    filters.types.forEach((typeId) => {
      const labels = {
        photo: t("Photos"),
        note: t("Notes"),
        milestone: t("Milestones"),
      };

      result.push({
        id: `type-${typeId}`,
        category: "type",
        value: typeId,
        label: labels[typeId],
      });
    });

    if (filters.dateRange !== "all") {
      const labels = {
        today: t("Today"),
        "last-7-days": t("Last 7 days"),
        "last-30-days": t("Last 30 days"),
      };

      result.push({
        id: `date-${filters.dateRange}`,
        category: "date",
        value: filters.dateRange,
        label: labels[filters.dateRange],
      });
    }

    filters.authorIds.forEach((authorId) => {
      const member = MOCK_MEMBERS.find((item) => item.id === authorId);

      if (member) {
        result.push({
          id: `author-${authorId}`,
          category: "author",
          value: authorId,
          label: member.firstName,
        });
      }
    });

    return result;
  }, [filters, t]);

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

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>{t("Moments")}</Text>

            <Text style={styles.subtitle}>
              {t("Child memories", {
                childName: selectedChild.firstName,
              })}
            </Text>
          </View>

          <ChildSelectorButton
            child={selectedChild}
            onPress={handleOpenChildSelector}
          />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("Add a moment")}
          onPress={handleAddMoment}
          style={({ pressed }) => [
            styles.addMomentCard,
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
          {MOCK_MOMENT_GROUPS.map((group) => (
            <MomentGroup
              key={group.id}
              group={group}
              onPressMoment={handleOpenMoment}
              colors={colors}
              styles={styles}
              t={t}
            />
          ))}
        </View>
      </ScrollView>

      <ChildSelectorSheet
        ref={childSelectorSheetRef}
        children={children}
        selectedChildId={selectedChildId}
        onSelectChild={handleSelectChild}
        onAddChild={handleAddChild}
      />

      <AddMomentSheet
        ref={addMomentSheetRef}
        childName={selectedChild.firstName}
        onSelectPhoto={handleSelectPhotoMoment}
        onSelectNote={handleSelectNoteMoment}
        onSelectMilestone={handleSelectMilestoneMoment}
      />

      <MomentsFilterSheet
        ref={momentsFilterSheetRef}
        filters={filters}
        members={MOCK_MEMBERS}
        onApply={setFilters}
      />
    </SafeAreaView>
  );
}

function MomentGroup({ group, onPressMoment, colors, styles, t }) {
  const rows = buildMomentRows(group.moments);

  return (
    <View style={styles.momentGroup}>
      <Text style={styles.groupTitle}>{t(group.label)}</Text>

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

function MomentCard({ moment, fullWidth = false, onPress, colors, styles, t }) {
  if (moment.type === "milestone") {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={moment.title}
        onPress={onPress}
        style={({ pressed }) => [
          styles.momentCard,
          styles.compactMomentCard,
          styles.milestoneCard,
          fullWidth && styles.fullWidthCard,
          pressed && styles.momentCardPressed,
        ]}
      >
        <View style={styles.cardTopRow}>
          <View style={styles.milestoneTypeIcon}>
            <Ionicons
              name="star"
              size={18}
              color={styles.milestoneIcon.color}
            />
          </View>
        </View>

        <View style={styles.milestoneIllustration}>
          <Ionicons
            name="happy-outline"
            size={35}
            color={styles.milestoneIcon.color}
          />
        </View>

        <Text style={styles.milestoneTitle}>{moment.title}</Text>

        <Text style={styles.momentMetadata}>
          {t("By author at time", {
            authorName: moment.authorName,
            timeLabel: moment.timeLabel,
          })}
        </Text>

        <View style={styles.ageBadge}>
          <Text style={styles.ageBadgeText}>{moment.childAgeLabel}</Text>
        </View>
      </Pressable>
    );
  }

  if (moment.type === "note") {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={moment.description}
        onPress={onPress}
        style={({ pressed }) => [
          styles.momentCard,
          styles.compactMomentCard,
          styles.noteCard,
          fullWidth && styles.fullWidthCard,
          pressed && styles.momentCardPressed,
        ]}
      >
        <View style={styles.cardTopRow}></View>

        <Text style={styles.noteText} numberOfLines={5}>
          {moment.description}
        </Text>

        <View style={styles.noteBottomRow}>
          <Text style={styles.momentMetadata} numberOfLines={1}>
            {t("By author at time", {
              authorName: moment.authorName,
              timeLabel: moment.timeLabel,
            })}
          </Text>

          <View style={styles.ageBadge}>
            <Text style={styles.ageBadgeText}>{moment.childAgeLabel}</Text>
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={moment.title}
      onPress={onPress}
      style={({ pressed }) => [
        styles.momentCard,
        fullWidth ? styles.fullWidthPhotoCard : styles.compactPhotoCard,
        pressed && styles.momentCardPressed,
      ]}
    >
      <View style={styles.photoContainer}>
        <Image source={moment.image} resizeMode="cover" style={styles.photo} />
      </View>

      <View style={styles.photoContent}>
        <View style={styles.photoTitleRow}>
          <Text style={styles.photoTitle} numberOfLines={2}>
            {moment.title}
          </Text>

          <View style={styles.ageBadge}>
            <Text style={styles.ageBadgeText}>{moment.childAgeLabel}</Text>
          </View>
        </View>

        {moment.description ? (
          <Text style={styles.photoDescription} numberOfLines={2}>
            {moment.description}
          </Text>
        ) : null}

        <Text style={styles.momentMetadata}>
          {t("By author at time", {
            authorName: moment.authorName,
            timeLabel: moment.timeLabel,
          })}
        </Text>
      </View>
    </Pressable>
  );
}

function buildMomentRows(moments) {
  const rows = [];
  let compactRow = [];

  moments.forEach((moment) => {
    const shouldUseFullWidth = moment.type === "photo" && !moment.compact;

    if (shouldUseFullWidth) {
      if (compactRow.length > 0) {
        rows.push(compactRow);
        compactRow = [];
      }

      rows.push([moment]);
      return;
    }

    compactRow.push(moment);

    if (compactRow.length === 2) {
      rows.push(compactRow);
      compactRow = [];
    }
  });

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

      // Indispensable, car la tab bar est flottante.
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
      shadowOffset: {
        width: 0,
        height: 5,
      },
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
      shadowOffset: {
        width: 0,
        height: 5,
      },
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

    photoTypeIcon: {
      position: "absolute",

      top: 12,
      left: 12,

      width: 36,
      height: 36,

      alignItems: "center",
      justifyContent: "center",

      borderRadius: 18,

      backgroundColor: `${colors.white}E8`,
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

    noteTypeIcon: {
      width: 36,
      height: 36,

      alignItems: "center",
      justifyContent: "center",

      borderRadius: 18,

      backgroundColor: colors.white,
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

    pressed: {
      opacity: 0.75,
      transform: [{ scale: 0.98 }],
    },
  });
