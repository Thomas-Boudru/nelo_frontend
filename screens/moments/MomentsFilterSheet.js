import { forwardRef, useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import PrimaryButton from "../../components/ui/PrimaryButton.js";
import { useThemeColors } from "../../theme/useThemeColors.js";

const TYPE_OPTIONS = [
  {
    id: "photo",
    label: "Photos",
    icon: "images-outline",
  },
  {
    id: "note",
    label: "Notes",
    icon: "create-outline",
  },
  {
    id: "milestone",
    label: "Milestones",
    icon: "star-outline",
  },
];

const DATE_OPTIONS = [
  {
    id: "all",
    label: "Any time",
  },
  {
    id: "today",
    label: "Today",
  },
  {
    id: "last-7-days",
    label: "Last 7 days",
  },
  {
    id: "last-30-days",
    label: "Last 30 days",
  },
];

const createEmptyFilters = () => ({
  types: [],
  dateRange: "all",
  authorIds: [],
});

function normalizeFilters(filters) {
  return {
    types: Array.isArray(filters?.types) ? [...filters.types] : [],
    dateRange: filters?.dateRange ?? "all",
    authorIds: Array.isArray(filters?.authorIds) ? [...filters.authorIds] : [],
  };
}

const MomentsFilterSheet = forwardRef(function MomentsFilterSheet(
  { filters, members = [], onApply },
  ref,
) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [draftFilters, setDraftFilters] = useState(() =>
    normalizeFilters(filters),
  );

  useEffect(() => {
    setDraftFilters(normalizeFilters(filters));
  }, [filters]);

  const renderBackdrop = useCallback(
    (props) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
        opacity={0.42}
      />
    ),
    [],
  );

  const handleDismiss = useCallback(() => {
    setDraftFilters(normalizeFilters(filters));
  }, [filters]);

  const handleToggleType = useCallback((typeId) => {
    setDraftFilters((current) => {
      const selected = current.types.includes(typeId);

      return {
        ...current,
        types: selected
          ? current.types.filter((id) => id !== typeId)
          : [...current.types, typeId],
      };
    });
  }, []);

  const handleSelectDate = useCallback((dateRange) => {
    setDraftFilters((current) => ({
      ...current,
      dateRange,
    }));
  }, []);

  const handleToggleAuthor = useCallback((authorId) => {
    setDraftFilters((current) => {
      const selected = current.authorIds.includes(authorId);

      return {
        ...current,
        authorIds: selected
          ? current.authorIds.filter((id) => id !== authorId)
          : [...current.authorIds, authorId],
      };
    });
  }, []);

  const handleReset = useCallback(() => {
    setDraftFilters(createEmptyFilters());
  }, []);

  const handleApply = useCallback(() => {
    onApply?.(normalizeFilters(draftFilters));
    ref?.current?.dismiss();
  }, [draftFilters, onApply, ref]);

  return (
    <BottomSheetModal
      ref={ref}
      index={0}
      enableDynamicSizing
      maxDynamicContentSize={screenHeight * 0.9}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      onDismiss={handleDismiss}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <BottomSheetScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{t("Filters")}</Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("Reset filters")}
            onPress={handleReset}
            hitSlop={8}
            style={({ pressed }) => [
              styles.resetButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.resetButtonText}>{t("Reset")}</Text>
          </Pressable>
        </View>

        <FilterSection title={t("Moment type")} styles={styles}>
          <View style={styles.chips}>
            {TYPE_OPTIONS.map((option) => {
              const selected = draftFilters.types.includes(option.id);

              return (
                <FilterChip
                  key={option.id}
                  label={t(option.label)}
                  icon={option.icon}
                  selected={selected}
                  onPress={() => handleToggleType(option.id)}
                  colors={colors}
                  styles={styles}
                />
              );
            })}
          </View>
        </FilterSection>

        <FilterSection title={t("Date")} styles={styles}>
          <View style={styles.radioGroup}>
            {DATE_OPTIONS.map((option, index) => {
              const selected = draftFilters.dateRange === option.id;
              const isLast = index === DATE_OPTIONS.length - 1;

              return (
                <Pressable
                  key={option.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={t(option.label)}
                  onPress={() => handleSelectDate(option.id)}
                  style={({ pressed }) => [
                    styles.radioRow,
                    !isLast && styles.radioRowBorder,
                    selected && styles.radioRowSelected,
                    pressed && styles.radioRowPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.radioLabel,
                      selected && styles.radioLabelSelected,
                    ]}
                  >
                    {t(option.label)}
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
        </FilterSection>

        {members.length > 0 ? (
          <FilterSection title={t("Added by")} styles={styles}>
            <View style={styles.chips}>
              {members.map((member) => {
                const selected = draftFilters.authorIds.includes(member.id);

                return (
                  <FilterChip
                    key={member.id}
                    label={member.firstName}
                    selected={selected}
                    onPress={() => handleToggleAuthor(member.id)}
                    colors={colors}
                    styles={styles}
                  />
                );
              })}
            </View>
          </FilterSection>
        ) : null}

        <View style={styles.applyButtonContainer}>
          <PrimaryButton title={t("Apply filters")} onPress={handleApply} />
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});

function FilterSection({ title, children, styles }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>

      {children}
    </View>
  );
}

function FilterChip({ label, icon, selected, onPress, colors, styles }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && styles.buttonPressed,
      ]}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={16}
          color={selected ? colors.primary : colors.textSecondary}
        />
      ) : null}

      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

export default MomentsFilterSheet;

const createStyles = (colors) =>
  StyleSheet.create({
    sheetBackground: {
      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,

      backgroundColor: colors.white,
    },

    handleIndicator: {
      width: 44,

      backgroundColor: colors.textSecondary,

      opacity: 0.25,
    },

    scrollContent: {
      paddingHorizontal: 22,
      paddingTop: 4,
    },

    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",

      marginBottom: 24,
    },

    title: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 22,
      lineHeight: 29,

      color: colors.textPrimary,
    },

    resetButton: {
      minHeight: 40,

      alignItems: "center",
      justifyContent: "center",

      paddingHorizontal: 8,
    },

    resetButtonText: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 13,
      lineHeight: 18,

      color: colors.primary,
    },

    section: {
      marginBottom: 26,
    },

    sectionTitle: {
      marginBottom: 12,

      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 14,
      lineHeight: 20,

      color: colors.textPrimary,
    },

    chips: {
      flexDirection: "row",
      flexWrap: "wrap",

      gap: 9,
    },

    chip: {
      minHeight: 42,

      flexDirection: "row",
      alignItems: "center",

      gap: 7,

      paddingHorizontal: 14,

      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderRadius: 21,

      backgroundColor: colors.white,
    },

    chipSelected: {
      borderColor: `${colors.primary}70`,
      backgroundColor: colors.selectedBackground,
    },

    chipText: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 12,
      lineHeight: 17,

      color: colors.textSecondary,
    },

    chipTextSelected: {
      color: colors.primary,
    },

    radioGroup: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderRadius: 19,

      backgroundColor: colors.white,

      overflow: "hidden",
    },

    radioRow: {
      minHeight: 52,

      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",

      paddingHorizontal: 15,
    },

    radioRowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },

    radioRowSelected: {
      backgroundColor: colors.selectedBackground,
    },

    radioRowPressed: {
      opacity: 0.72,
    },

    radioLabel: {
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 13,
      lineHeight: 19,

      color: colors.textPrimary,
    },

    radioLabelSelected: {
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

    applyButtonContainer: {
      paddingTop: 2,
    },

    buttonPressed: {
      opacity: 0.7,
    },
  });
