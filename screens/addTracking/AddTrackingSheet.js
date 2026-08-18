import { forwardRef, useCallback, useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useThemeColors } from "../../theme/useThemeColors.js";

const BOTTLE_IMAGE = require("../../assets/illustrations/tracking/bottle.png");

const SLEEP_IMAGE = require("../../assets/illustrations/tracking/night.png");

const DIAPER_IMAGE = require("../../assets/illustrations/tracking/diaper.png");

const MOOD_IMAGE = require("../../assets/illustrations/tracking/mood.png");

const MEDICATION_IMAGE = require("../../assets/illustrations/tracking/medication.png");

const TEMPERATURE_IMAGE = require("../../assets/illustrations/tracking/temperature.png");

const SYMPTOMS_IMAGE = require("../../assets/illustrations/tracking/symptom.png");

const TEETHING_IMAGE = require("../../assets/illustrations/tracking/tooth.png");

/*
 * On conserve l’ancienne illustration de taille pour représenter
 * maintenant l’ensemble de la croissance.
 */
const GROWTH_IMAGE = require("../../assets/illustrations/tracking/height.png");

const NOTE_IMAGE = require("../../assets/illustrations/tracking/note.png");

const DAILY_TRACKING_ITEMS = [
  {
    id: "feeding",
    titleKey: "Feeding",
    type: "image",
    image: BOTTLE_IMAGE,
    backgroundColor: "#F0F3FF",
  },
  {
    id: "sleep",
    titleKey: "Sleep",
    type: "image",
    image: SLEEP_IMAGE,
    backgroundColor: "#F2F0FF",
  },
  {
    id: "diaper",
    titleKey: "Diaper",
    type: "image",
    image: DIAPER_IMAGE,
    backgroundColor: "#EAF9F3",
  },
  {
    id: "mood",
    titleKey: "Mood",
    type: "image",
    image: MOOD_IMAGE,
    backgroundColor: "#FFF0F5",
  },
];

const HEALTH_ITEMS = [
  {
    id: "medication",
    titleKey: "Medication",
    type: "image",
    image: MEDICATION_IMAGE,
    backgroundColor: "#FFF6E7",
  },
  {
    id: "temperature",
    titleKey: "Temperature",
    type: "image",
    image: TEMPERATURE_IMAGE,
    backgroundColor: "#FFF0EE",
  },
  {
    id: "symptoms",
    titleKey: "Symptoms",
    type: "image",
    image: SYMPTOMS_IMAGE,
    backgroundColor: "#EDF6FF",
  },
  {
    id: "teething",
    titleKey: "Teething",
    type: "image",
    image: TEETHING_IMAGE,
    backgroundColor: "#FFF0F6",
  },
];

const GROWTH_AND_NOTES_ITEMS = [
  {
    id: "growth",
    titleKey: "Growth",
    type: "image",
    image: GROWTH_IMAGE,
    backgroundColor: "#EDF6FF",
  },
  {
    id: "note",
    titleKey: "Note",
    type: "image",
    image: NOTE_IMAGE,
    backgroundColor: "#FFF7E8",
  },
];

const WAVE_HEIGHTS = [8, 18, 38, 29, 24, 14, 6];

function TrackingIcon({ item, styles }) {
  if (item.type === "image") {
    return (
      <Image
        source={item.image}
        resizeMode="contain"
        style={styles.trackingImage}
      />
    );
  }

  return <Ionicons name={item.icon} size={27} color={item.iconColor} />;
}

function TrackingOption({ item, onPress, styles, t }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t(item.titleKey)}
      onPress={() => onPress?.(item.id)}
      style={({ pressed }) => [
        styles.optionCard,
        pressed && styles.optionCardPressed,
      ]}
    >
      <View
        style={[
          styles.optionIconContainer,
          {
            backgroundColor: item.backgroundColor,
          },
        ]}
      >
        <TrackingIcon item={item} styles={styles} />
      </View>

      <Text
        style={styles.optionTitle}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
      >
        {t(item.titleKey)}
      </Text>
    </Pressable>
  );
}

function TrackingSection({ title, items, onPressItem, styles, t }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>

      <View style={styles.optionsGrid}>
        {items.map((item) => (
          <TrackingOption
            key={item.id}
            item={item}
            onPress={onPressItem}
            styles={styles}
            t={t}
          />
        ))}
      </View>
    </View>
  );
}

function VoiceWave({ styles, reversed = false }) {
  const heights = reversed ? [...WAVE_HEIGHTS].reverse() : WAVE_HEIGHTS;

  return (
    <View style={styles.voiceWave}>
      {heights.map((height, index) => (
        <View
          key={`${height}-${index}`}
          style={[
            styles.voiceWaveBar,
            {
              height,
            },
          ]}
        />
      ))}
    </View>
  );
}

const AddTrackingSheet = forwardRef(function AddTrackingSheet(
  {
    childName,
    isPremiumUser = false,

    /*
     * Exemple :
     * hiddenTrackingItems={["mood", "teething"]}
     */
    hiddenTrackingItems = [],

    onPressPremium,
    onPressVoiceStart,
    onPressVoiceEnd,
    onPressTrackingItem,
  },
  ref,
) {
  const { t } = useTranslation();
  const colors = useThemeColors();

  const styles = useMemo(() => createStyles(colors), [colors]);

  const snapPoints = useMemo(() => ["92%"], []);

  const [isRecording, setIsRecording] = useState(false);

  const hiddenItemIds = useMemo(
    () => new Set(hiddenTrackingItems),
    [hiddenTrackingItems],
  );

  const visibleDailyItems = useMemo(
    () => DAILY_TRACKING_ITEMS.filter((item) => !hiddenItemIds.has(item.id)),
    [hiddenItemIds],
  );

  const visibleHealthItems = useMemo(
    () => HEALTH_ITEMS.filter((item) => !hiddenItemIds.has(item.id)),
    [hiddenItemIds],
  );

  const visibleGrowthAndNotesItems = useMemo(
    () => GROWTH_AND_NOTES_ITEMS.filter((item) => !hiddenItemIds.has(item.id)),
    [hiddenItemIds],
  );

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

  const handleVoicePressIn = () => {
    if (!isPremiumUser) {
      onPressPremium?.();
      return;
    }

    setIsRecording(true);
    onPressVoiceStart?.();
  };

  const handleVoicePressOut = () => {
    if (!isPremiumUser || !isRecording) {
      return;
    }

    setIsRecording(false);
    onPressVoiceEnd?.();
  };

  return (
    <BottomSheetModal
      ref={ref}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose
      enableHandlePanningGesture
      enableContentPanningGesture
      enableOverDrag
      enableDynamicSizing={false}
      overDragResistanceFactor={1.8}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBackground}
      handleStyle={styles.handle}
      handleIndicatorStyle={styles.handleIndicator}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      enableBlurKeyboardOnGesture
    >
      <BottomSheetScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{t("Add tracking")}</Text>

          <Text style={styles.subtitle}>
            {t("What would you like to record")}
          </Text>
        </View>

        <View style={styles.voiceCard}>
          {!isPremiumUser ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("Discover Premium")}
              onPress={onPressPremium}
              hitSlop={8}
              style={({ pressed }) => [
                styles.premiumBadge,
                pressed && styles.premiumBadgePressed,
              ]}
            >
              <Ionicons name="sparkles" size={11} color={colors.primary} />

              <Text style={styles.premiumBadgeText}>{t("Premium")}</Text>
            </Pressable>
          ) : null}

          <View style={styles.voiceHeader}>
            <Text style={styles.voiceTitle}>{t("Talk to Nelo")}</Text>

            <Text style={styles.voiceDescription}>
              {t("Describe what child just did and Nelo handles the rest", {
                childName,
              })}
            </Text>
          </View>

          <View style={styles.voiceInteraction}>
            <VoiceWave styles={styles} />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("Hold to talk")}
              accessibilityHint={t(
                "Hold the button while you describe what happened",
              )}
              onPressIn={handleVoicePressIn}
              onPressOut={handleVoicePressOut}
              style={({ pressed }) => [
                styles.voiceButtonOuter,
                isRecording && styles.voiceButtonOuterRecording,
                pressed && styles.voiceButtonPressed,
              ]}
            >
              <View style={styles.voiceButtonMiddle}>
                <View style={styles.voiceButton}>
                  <Ionicons name="mic" size={32} color={colors.white} />
                </View>
              </View>
            </Pressable>

            <VoiceWave styles={styles} reversed />
          </View>
        </View>

        <TrackingSection
          title={t("Daily tracking")}
          items={visibleDailyItems}
          onPressItem={onPressTrackingItem}
          styles={styles}
          t={t}
        />

        <TrackingSection
          title={t("Health")}
          items={visibleHealthItems}
          onPressItem={onPressTrackingItem}
          styles={styles}
          t={t}
        />

        <TrackingSection
          title={t("Growth and notes")}
          items={visibleGrowthAndNotesItems}
          onPressItem={onPressTrackingItem}
          styles={styles}
          t={t}
        />

        <View style={styles.informationCard}>
          <Ionicons
            name="information-circle-outline"
            size={17}
            color={colors.primary}
          />

          <Text style={styles.informationText}>
            {t("You can edit or delete a tracking entry later")}
          </Text>
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});

export default AddTrackingSheet;

const createStyles = (colors) =>
  StyleSheet.create({
    sheetBackground: {
      backgroundColor: colors.white,
      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,
    },

    handle: {
      paddingTop: 10,
      paddingBottom: 7,
    },

    handleIndicator: {
      width: 46,
      height: 5,
      borderRadius: 3,
      backgroundColor: colors.textSecondary,
      opacity: 0.24,
    },

    scrollContent: {
      paddingHorizontal: 16,
      paddingTop: 0,
      paddingBottom: 30,
    },

    header: {
      marginBottom: 11,
      paddingHorizontal: 4,
    },

    title: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 22,
      lineHeight: 32,
      letterSpacing: -0.5,
      color: colors.textPrimary,
    },

    subtitle: {
      marginTop: 2,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 13,
      lineHeight: 18,
      color: colors.textSecondary,
    },

    voiceCard: {
      position: "relative",
      minHeight: 150,
      marginTop: 10,
      marginBottom: 10,
      paddingTop: 20,
      paddingHorizontal: 18,
      paddingBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      backgroundColor: colors.selectedBackground,
      overflow: "hidden",

      shadowColor: colors.textPrimary,
      shadowOffset: {
        width: 0,
        height: 5,
      },
      shadowOpacity: 0.035,
      shadowRadius: 14,
      elevation: 2,
    },

    voiceHeader: {
      alignItems: "flex-start",
      paddingRight: 82,
    },

    voiceTitle: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 17,
      lineHeight: 23,
      color: colors.textPrimary,
    },

    voiceDescription: {
      maxWidth: 260,
      marginTop: 5,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 12,
      lineHeight: 17,
      color: colors.textSecondary,
    },

    premiumBadge: {
      position: "absolute",
      top: 14,
      right: 14,
      zIndex: 4,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 14,
      backgroundColor: colors.white,

      shadowColor: colors.primary,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 2,
    },

    premiumBadgePressed: {
      opacity: 0.65,
      transform: [{ scale: 0.96 }],
    },

    premiumBadgeText: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 9,
      lineHeight: 12,
      textTransform: "uppercase",
      letterSpacing: 0.4,
      color: colors.primary,
    },

    voiceInteraction: {
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 8,
    },

    voiceWave: {
      width: 92,
      height: 48,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },

    voiceWaveBar: {
      width: 4,
      borderRadius: 2,
      backgroundColor: colors.primary,
      opacity: 0.15,
    },

    voiceButtonOuter: {
      width: 92,
      height: 92,
      alignItems: "center",
      justifyContent: "center",
      marginHorizontal: 10,
      borderRadius: 46,
      backgroundColor: colors.selectedBackground,

      shadowColor: colors.primary,
      shadowOffset: {
        width: 0,
        height: 5,
      },
      shadowOpacity: 0.16,
      shadowRadius: 13,
      elevation: 6,
    },

    voiceButtonMiddle: {
      width: 78,
      height: 78,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 6,
      borderColor: colors.selectedBackground,
      borderRadius: 39,
      backgroundColor: colors.lightBackground,
    },

    voiceButton: {
      width: 64,
      height: 64,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 32,
      backgroundColor: colors.primary,

      shadowColor: colors.primary,
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.22,
      shadowRadius: 8,
      elevation: 5,
    },

    voiceButtonOuterRecording: {
      transform: [{ scale: 1.06 }],
    },

    voiceButtonPressed: {
      transform: [{ scale: 0.95 }],
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

    /*
     * Toutes les lignes incomplètes sont centrées.
     * La taille des cartes reste identique.
     */
    optionsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      columnGap: 10,
      rowGap: 12,
    },

    optionCard: {
      width: "22.5%",
      minHeight: 90,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 5,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      backgroundColor: colors.white,

      shadowColor: colors.textPrimary,
      shadowOffset: {
        width: 0,
        height: 3,
      },
      shadowOpacity: 0.025,
      shadowRadius: 8,
      elevation: 1,
    },

    optionCardPressed: {
      opacity: 0.68,
      transform: [{ scale: 0.96 }],
    },

    optionIconContainer: {
      width: 48,
      height: 48,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 7,
      borderRadius: 24,
    },

    trackingImage: {
      width: 48,
      height: 48,
    },

    optionTitle: {
      width: "100%",
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 10,
      lineHeight: 14,
      textAlign: "center",
      color: colors.textPrimary,
    },

    informationCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 16,
      paddingHorizontal: 13,
      paddingVertical: 10,
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
  });
