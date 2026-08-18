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

function createInitialEntry() {
  return {
    mood: null,
    date: new Date(),
    isDateEdited: false,
  };
}

function createMoodEntryFromTrackingEntry(trackingEntry) {
  const dateValue =
    trackingEntry?.date ??
    trackingEntry?.moodDate ??
    trackingEntry?.occurredAt ??
    trackingEntry?.startedAt;

  const parsedDate = dateValue ? new Date(dateValue) : null;

  const hasRecordedDate = !!parsedDate && !Number.isNaN(parsedDate.getTime());

  return {
    mood:
      trackingEntry?.mood ??
      trackingEntry?.details?.mood ??
      trackingEntry?.value ??
      null,

    date: hasRecordedDate ? parsedDate : new Date(),

    isDateEdited: hasRecordedDate,
  };
}

const MoodEntrySheet = forwardRef(function MoodEntrySheet(
  { childName, onSave, onRequestDelete },
  ref,
) {
  const { t } = useTranslation();

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const modalRef = useRef(null);

  const snapPoints = useMemo(() => ["78%"], []);

  const [sheetMode, setSheetMode] = useState("create");

  const [editingEntry, setEditingEntry] = useState(null);

  const [entry, setEntry] = useState(createInitialEntry);

  const isEditMode = sheetMode === "edit";

  useImperativeHandle(ref, () => ({
    present(options = {}) {
      /*
       * Compatibilité avec l’ancien appel :
       * moodSheetRef.current?.present()
       */
      if (!options || typeof options !== "object") {
        setSheetMode("create");
        setEditingEntry(null);
        setEntry(createInitialEntry());

        modalRef.current?.present();
        return;
      }

      const { mode = "create", entry: trackingEntry = null } = options;

      setSheetMode(mode);

      if (mode === "edit" && trackingEntry) {
        setEditingEntry(trackingEntry);

        setEntry(createMoodEntryFromTrackingEntry(trackingEntry));
      } else {
        setEditingEntry(null);
        setEntry(createInitialEntry());
      }

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

  const handleRequestDelete = () => {
    if (!isEditMode || !editingEntry) {
      return;
    }

    onRequestDelete?.(editingEntry);
  };

  const handleSave = async () => {
    if (!canSave) {
      return;
    }

    await onSave?.({
      ...editingEntry,
      ...entry,

      id: editingEntry?.id,

      type: "mood",
      mode: sheetMode,

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
            {isEditMode
              ? t("Edit mood")
              : t("How is child feeling?", {
                  childName,
                })}
          </Text>

          <Text style={styles.subtitle}>
            {isEditMode
              ? t("Update child's mood", {
                  childName,
                })
              : t("Choose the mood that best describes child right now", {
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
                  accessibilityState={{
                    selected: isSelected,
                  }}
                  accessibilityLabel={t(option.label)}
                  onPress={() =>
                    patchEntry({
                      mood: option.id,
                    })
                  }
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
          {isEditMode ? (
            <View style={styles.editFooterRow}>
              <View style={styles.footerButton}>
                <PrimaryButton
                  title={t("Delete")}
                  variant="destructive"
                  onPress={handleRequestDelete}
                />
              </View>

              <View style={styles.footerButton}>
                <PrimaryButton
                  title={t("Save changes")}
                  onPress={handleSave}
                  disabled={!canSave}
                />
              </View>
            </View>
          ) : (
            <PrimaryButton
              title={t("Save mood")}
              onPress={handleSave}
              disabled={!canSave}
            />
          )}
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
      gap: 22,

      paddingHorizontal: 20,
      paddingBottom: 22,
    },

    moodGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",

      gap: 10,
    },

    moodCard: {
      position: "relative",

      width: "48%",
      minHeight: 100,

      alignItems: "center",
      justifyContent: "center",

      paddingHorizontal: 12,
      paddingVertical: 12,

      borderWidth: 1.5,
      borderColor: "transparent",
      borderRadius: 20,
    },

    illustrationContainer: {
      width: 70,
      height: 64,

      alignItems: "center",
      justifyContent: "center",
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

      width: 21,
      height: 21,

      alignItems: "center",
      justifyContent: "center",

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

    editFooterRow: {
      width: "100%",

      flexDirection: "row",
      alignItems: "center",

      gap: 10,
    },

    footerButton: {
      flex: 1,
      minWidth: 0,
    },

    pressed: {
      opacity: 0.78,
    },
  });
}
