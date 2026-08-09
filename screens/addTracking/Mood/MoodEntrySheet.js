import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import PrimaryButton from "../../../components/ui/PrimaryButton.js";
import DateTimeRow from "../../../components/addTracking/DateTimeRow.js";
import { useThemeColors } from "../../../theme/useThemeColors.js";

const happyIllustration = require("../../../assets/illustrations/tracking/mood/happy.png");
const calmIllustration = require("../../../assets/illustrations/tracking/mood/calm.png");
const fussyIllustration = require("../../../assets/illustrations/tracking/mood/fussy.png");
const cryingIllustration = require("../../../assets/illustrations/tracking/mood/crying.png");
const unwellIllustration = require("../../../assets/illustrations/tracking/mood/unwell.png");

const MOOD_OPTIONS = [
  {
    id: "happy",
    label: "Happy",
    illustration: happyIllustration,
    color: "#E2A52E",
    backgroundColor: "#FFF8E8",
  },
  {
    id: "calm",
    label: "Calm",
    illustration: calmIllustration,
    color: "#54A884",
    backgroundColor: "#EDF9F4",
  },
  {
    id: "fussy",
    label: "Fussy",
    illustration: fussyIllustration,
    color: "#D48A53",
    backgroundColor: "#FFF3EA",
  },
  {
    id: "crying",
    label: "Crying",
    illustration: cryingIllustration,
    color: "#5C8FEF",
    backgroundColor: "#EEF5FF",
  },
  {
    id: "unwell",
    label: "Unwell",
    illustration: unwellIllustration,
    color: "#D96B74",
    backgroundColor: "#FFF0F2",
  },
];

const createInitialEntry = () => ({
  mood: null,
  date: new Date(),
  isDateEdited: false,
});

const MoodEntrySheet = forwardRef(function MoodEntrySheet(
  { childName, onSave },
  ref,
) {
  const { t } = useTranslation();

  const modalRef = useRef(null);

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const snapPoints = useMemo(() => ["78%"], []);

  const [entry, setEntry] = useState(createInitialEntry);

  useImperativeHandle(ref, () => ({
    present() {
      setEntry(createInitialEntry());
      modalRef.current?.present();
    },

    dismiss() {
      modalRef.current?.dismiss();
    },
  }));

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

  const patchEntry = (patch) => {
    setEntry((currentEntry) => ({
      ...currentEntry,
      ...patch,
    }));
  };

  const canSave = Boolean(entry.mood);

  const handleSave = async () => {
    if (!canSave) {
      return;
    }

    await onSave?.({
      type: "mood",
      mood: entry.mood,
      date: entry.date,
    });

    modalRef.current?.dismiss();
  };

  return (
    <BottomSheetModal
      ref={modalRef}
      index={0}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handle}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {t("How is child feeling?", {
              childName,
            })}
          </Text>

          <Text style={styles.subtitle}>
            {t("Choose the mood that best describes child right now", {
              childName,
            })}
          </Text>
        </View>

        <BottomSheetScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.moodGrid}>
            {MOOD_OPTIONS.map((option) => {
              const isSelected = entry.mood === option.id;

              return (
                <Pressable
                  key={option.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={t(option.label)}
                  onPress={() => patchEntry({ mood: option.id })}
                  style={({ pressed }) => [
                    styles.moodCard,
                    {
                      backgroundColor: option.backgroundColor,
                    },
                    isSelected && {
                      borderColor: option.color,
                    },
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.illustrationContainer}>
                    <Image
                      source={option.illustration}
                      style={styles.illustration}
                      resizeMode="contain"
                    />
                  </View>

                  <Text
                    style={[
                      styles.moodLabel,
                      isSelected && {
                        color: option.color,
                      },
                    ]}
                  >
                    {t(option.label)}
                  </Text>

                  {isSelected ? (
                    <View
                      style={[
                        styles.checkBadge,
                        {
                          backgroundColor: option.color,
                        },
                      ]}
                    >
                      <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>

          <DateTimeRow
            value={entry.date}
            isNow={!entry.isDateEdited}
            onChange={(date) =>
              patchEntry({
                date,
                isDateEdited: true,
              })
            }
          />
        </BottomSheetScrollView>

        <View style={styles.footer}>
          <PrimaryButton
            title={t("Save mood")}
            onPress={handleSave}
            disabled={!canSave}
          />
        </View>
      </View>
    </BottomSheetModal>
  );
});

export default MoodEntrySheet;

function createStyles(colors) {
  return StyleSheet.create({
    sheetBackground: {
      backgroundColor: colors.white,
      borderRadius: 32,
    },

    handle: {
      width: 38,
      height: 4,
      borderRadius: 999,
      backgroundColor: colors.border,
    },

    content: {
      flex: 1,
    },

    header: {
      paddingHorizontal: 20,
      paddingTop: 4,
      paddingBottom: 18,
    },

    title: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 21,
      color: colors.textPrimary,
    },

    subtitle: {
      marginTop: 6,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 13,
      lineHeight: 19,
      color: colors.textSecondary,
    },

    scrollView: {
      flex: 1,
    },

    scrollContent: {
      paddingHorizontal: 20,
      paddingBottom: 22,
      gap: 22,
    },

    moodGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      gap: 10,
    },

    moodCard: {
      position: "relative",
      alignItems: "center",
      justifyContent: "center",
      width: "48%",
      minHeight: 100,
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: "transparent",
    },

    illustrationContainer: {
      alignItems: "center",
      justifyContent: "center",
      width: 70,
      height: 64,
    },

    illustration: {
      width: 68,
      height: 68,
    },
    moodLabel: {
      marginTop: 2,
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 13,
      color: colors.textPrimary,
    },
    checkBadge: {
      position: "absolute",
      top: 10,
      right: 10,
      alignItems: "center",
      justifyContent: "center",
      width: 21,
      height: 21,
      borderRadius: 11,
    },

    footer: {
      flexShrink: 0,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 14,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.white,
    },

    pressed: {
      opacity: 0.78,
    },
  });
}
