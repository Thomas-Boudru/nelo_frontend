import { forwardRef, useCallback, useEffect, useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import PrimaryButton from "../../components/ui/PrimaryButton.js";

import { useThemeColors } from "../../theme/useThemeColors.js";

const BOTTLE_IMAGE = require("../../assets/illustrations/tracking/bottle.png");

const SLEEP_IMAGE = require("../../assets/illustrations/tracking/night.png");

const DIAPER_IMAGE = require("../../assets/illustrations/tracking/diaper.png");

const MOOD_IMAGE = require("../../assets/illustrations/tracking/mood.png");

const MEDICATION_IMAGE = require("../../assets/illustrations/tracking/medication.png");

const TEMPERATURE_IMAGE = require("../../assets/illustrations/tracking/temperature.png");

const SYMPTOMS_IMAGE = require("../../assets/illustrations/tracking/symptom.png");

const TEETHING_IMAGE = require("../../assets/illustrations/tracking/tooth.png");

const WEIGHT_IMAGE = require("../../assets/illustrations/tracking/weight.png");

const HEIGHT_IMAGE = require("../../assets/illustrations/tracking/height.png");

const HEAD_CIRCUMFERENCE_IMAGE = require("../../assets/illustrations/tracking/headBlue.png");

const NOTE_IMAGE = require("../../assets/illustrations/tracking/note.png");

const TRACKING_SECTIONS = [
  {
    id: "daily",
    titleKey: "Daily tracking",
    items: [
      {
        id: "feeding",
        titleKey: "Feeding",
        descriptionKey: "Bottle breastfeeding and solid foods",
        image: BOTTLE_IMAGE,
        backgroundColor: "#F0F3FF",
      },
      {
        id: "sleep",
        titleKey: "Sleep",
        descriptionKey: "Naps and nighttime sleep",
        image: SLEEP_IMAGE,
        backgroundColor: "#F2F0FF",
      },
      {
        id: "diaper",
        titleKey: "Diaper",
        descriptionKey: "Wet dirty or mixed diapers",
        image: DIAPER_IMAGE,
        backgroundColor: "#EAF9F3",
      },
      {
        id: "mood",
        titleKey: "Mood",
        descriptionKey: "Track mood and behavior",
        image: MOOD_IMAGE,
        backgroundColor: "#FFF0F5",
      },
    ],
  },
  {
    id: "health",
    titleKey: "Health",
    items: [
      {
        id: "medication",
        titleKey: "Medication",
        descriptionKey: "Medicines and supplements",
        image: MEDICATION_IMAGE,
        backgroundColor: "#FFF6E7",
      },
      {
        id: "temperature",
        titleKey: "Temperature",
        descriptionKey: "Body temperature",
        image: TEMPERATURE_IMAGE,
        backgroundColor: "#FFF0EE",
      },
      {
        id: "symptoms",
        titleKey: "Symptoms",
        descriptionKey: "Illness and symptoms",
        image: SYMPTOMS_IMAGE,
        backgroundColor: "#EDF6FF",
      },
      {
        id: "teething",
        titleKey: "Teething",
        descriptionKey: "Teething signs and new teeth",
        image: TEETHING_IMAGE,
        backgroundColor: "#FFF0F6",
      },
    ],
  },
  {
    id: "growth",
    titleKey: "Growth and notes",
    items: [
      {
        id: "weight",
        titleKey: "Weight",
        descriptionKey: "Track weight measurements",
        image: WEIGHT_IMAGE,
        backgroundColor: "#EAF9F3",
      },
      {
        id: "height",
        titleKey: "Height",
        descriptionKey: "Track height measurements",
        image: HEIGHT_IMAGE,
        backgroundColor: "#EDF6FF",
      },
      {
        id: "headCircumference",
        titleKey: "Head circumference",
        descriptionKey: "Track head circumference measurements",
        image: HEAD_CIRCUMFERENCE_IMAGE,
        backgroundColor: "#F1F0FF",
      },
      {
        id: "note",
        titleKey: "Note",
        descriptionKey: "Add personal notes",
        image: NOTE_IMAGE,
        backgroundColor: "#FFF7E8",
      },
    ],
  },
];

const DEFAULT_VISIBLE_TRACKING_IDS = [
  "feeding",
  "sleep",
  "diaper",
  "medication",
  "temperature",
  "weight",
  "height",
  "headCircumference",
  "note",
];

function TrackingPreferenceRow({ item, selected, onToggle, styles, t }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={t(item.titleKey)}
      accessibilityState={{ checked: selected }}
      onPress={() => onToggle(item.id)}
      style={({ pressed }) => [
        styles.preferenceRow,
        pressed && styles.preferenceRowPressed,
      ]}
    >
      <View
        style={[
          styles.imageContainer,
          {
            backgroundColor: item.backgroundColor,
          },
        ]}
      >
        <Image
          source={item.image}
          resizeMode="contain"
          style={styles.preferenceImage}
        />
      </View>

      <View style={styles.preferenceInformation}>
        <Text style={styles.preferenceTitle}>{t(item.titleKey)}</Text>

        <Text style={styles.preferenceDescription} numberOfLines={1}>
          {t(item.descriptionKey)}
        </Text>
      </View>

      <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
        {selected ? (
          <Ionicons name="checkmark" size={16} color="#FFFFFF" />
        ) : null}
      </View>
    </Pressable>
  );
}

function TrackingPreferenceSection({
  section,
  selectedIds,
  onToggle,
  styles,
  t,
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t(section.titleKey)}</Text>

      <View style={styles.sectionCard}>
        {section.items.map((item, index) => (
          <View key={item.id}>
            <TrackingPreferenceRow
              item={item}
              selected={selectedIds.includes(item.id)}
              onToggle={onToggle}
              styles={styles}
              t={t}
            />

            {index < section.items.length - 1 ? (
              <View style={styles.rowDivider} />
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

const TrackingPreferencesSheet = forwardRef(function TrackingPreferencesSheet(
  { visibleTrackingIds = DEFAULT_VISIBLE_TRACKING_IDS, onSave },
  ref,
) {
  const { t } = useTranslation();

  const colors = useThemeColors();

  const styles = useMemo(() => createStyles(colors), [colors]);

  const [draftVisibleIds, setDraftVisibleIds] = useState(visibleTrackingIds);

  const snapPoints = useMemo(() => ["92%"], []);

  useEffect(() => {
    setDraftVisibleIds(visibleTrackingIds);
  }, [visibleTrackingIds]);

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

  const handleToggle = (trackingId) => {
    setDraftVisibleIds((currentIds) => {
      const isCurrentlyVisible = currentIds.includes(trackingId);

      if (isCurrentlyVisible) {
        return currentIds.filter((currentId) => currentId !== trackingId);
      }

      return [...currentIds, trackingId];
    });
  };

  const handleSave = () => {
    onSave?.(draftVisibleIds);
    ref?.current?.dismiss();
  };

  const hasChanges =
    JSON.stringify([...draftVisibleIds].sort()) !==
    JSON.stringify([...visibleTrackingIds].sort());

  return (
    <BottomSheetModal
      ref={ref}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose
      enableDynamicSizing={false}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBackground}
      handleStyle={styles.handle}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <View style={styles.container}>
        <BottomSheetScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.header}>
            <Text style={styles.title}>{t("Tracking preferences")}</Text>

            <Text style={styles.description}>
              {t("Choose which tracking items are shown in the app")}
            </Text>
          </View>

          {TRACKING_SECTIONS.map((section) => (
            <TrackingPreferenceSection
              key={section.id}
              section={section}
              selectedIds={draftVisibleIds}
              onToggle={handleToggle}
              styles={styles}
              t={t}
            />
          ))}

          <View style={styles.informationCard}>
            <Ionicons
              name="information-circle-outline"
              size={18}
              color={colors.primary}
            />

            <Text style={styles.informationText}>
              {t(
                "Hidden tracking items are not deleted and can be enabled again at any time",
              )}
            </Text>
          </View>
        </BottomSheetScrollView>

        <View style={styles.footer}>
          <PrimaryButton
            title={t("Save")}
            onPress={handleSave}
            disabled={!hasChanges}
          />
        </View>
      </View>
    </BottomSheetModal>
  );
});

export default TrackingPreferencesSheet;

const createStyles = (colors) =>
  StyleSheet.create({
    sheetBackground: {
      backgroundColor: colors.white,

      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,
    },

    handle: {
      paddingTop: 10,
      paddingBottom: 5,
    },

    handleIndicator: {
      width: 44,
      height: 5,

      borderRadius: 3,

      backgroundColor: colors.textSecondary,

      opacity: 0.25,
    },

    container: {
      flex: 1,
    },

    scrollContent: {
      paddingHorizontal: 18,
      paddingBottom: 120,
    },

    header: {
      paddingHorizontal: 2,
      paddingTop: 2,
      paddingBottom: 13,
    },

    title: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 21,
      lineHeight: 29,

      color: colors.textPrimary,
    },

    description: {
      maxWidth: 340,
      marginTop: 4,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 12,
      lineHeight: 18,

      color: colors.textSecondary,
    },

    section: {
      marginTop: 15,
    },

    sectionTitle: {
      marginBottom: 8,
      paddingHorizontal: 3,

      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 13,
      lineHeight: 18,

      color: colors.textPrimary,
    },

    sectionCard: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderRadius: 22,

      backgroundColor: colors.white,

      overflow: "hidden",
    },

    preferenceRow: {
      minHeight: 72,

      flexDirection: "row",
      alignItems: "center",

      paddingHorizontal: 12,
      paddingVertical: 9,
    },

    preferenceRowPressed: {
      backgroundColor: colors.selectedBackground,
    },

    imageContainer: {
      width: 50,
      height: 50,

      alignItems: "center",
      justifyContent: "center",

      marginRight: 13,

      borderRadius: 17,
    },

    preferenceImage: {
      width: 46,
      height: 46,
    },

    preferenceInformation: {
      flex: 1,

      minWidth: 0,
    },

    preferenceTitle: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 14,
      lineHeight: 20,

      color: colors.textPrimary,
    },

    preferenceDescription: {
      marginTop: 2,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 11,
      lineHeight: 16,

      color: colors.textSecondary,
    },

    checkbox: {
      width: 25,
      height: 25,

      alignItems: "center",
      justifyContent: "center",

      marginLeft: 12,

      borderWidth: 1.5,
      borderColor: colors.textSecondary,
      borderRadius: 7,
    },

    checkboxSelected: {
      borderColor: colors.primary,

      backgroundColor: colors.primary,
    },

    rowDivider: {
      height: StyleSheet.hairlineWidth,

      marginLeft: 75,

      backgroundColor: colors.border,
    },

    informationCard: {
      flexDirection: "row",
      alignItems: "flex-start",

      gap: 9,

      marginTop: 16,
      paddingHorizontal: 13,
      paddingVertical: 11,

      borderRadius: 16,

      backgroundColor: colors.selectedBackground,
    },

    informationText: {
      flex: 1,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 10,
      lineHeight: 15,

      color: colors.textSecondary,
    },

    footer: {
      position: "absolute",

      left: 0,
      right: 0,
      bottom: 0,

      paddingHorizontal: 18,
      paddingTop: 12,
      paddingBottom: 20,

      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,

      backgroundColor: colors.white,
    },

    saveButton: {
      height: 54,

      alignItems: "center",
      justifyContent: "center",

      borderRadius: 18,

      backgroundColor: colors.primary,
    },

    saveButtonDisabled: {
      backgroundColor: colors.primaryDisabled ?? "#C9D7F5",
    },

    saveButtonPressed: {
      opacity: 0.82,

      transform: [{ scale: 0.985 }],
    },

    saveButtonText: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 15,
      lineHeight: 21,

      color: colors.white,
    },
  });
