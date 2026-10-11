import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";

import {
  createLocalSymptomsEntry,
  updateLocalSymptomsEntry,
} from "../../../database/tracking/symptoms/symptomsRepository.js";

import { useAuth } from "../../../auth/AuthProvider.js";
import { processSyncQueue } from "../../../sync/processSyncQueue.js";

import PrimaryButton from "../../../components/ui/PrimaryButton.js";
import DateTimeRow from "../../../components/addTracking/DateTimeRow.js";
import NoteSheet from "../Feeding/NoteSheet.js";
import TrackingHistoryButton from "../../../components/addTracking/TrackingHistoryButton.js";
import { useThemeColors } from "../../../theme/useThemeColors.js";

const SYMPTOM_OPTIONS = [
  {
    id: "irritability",
    label: "Irritability",
    illustration: require("../../../assets/illustrations/tracking/symptoms/irritability.png"),
  },
  {
    id: "skinRash",
    label: "Skin rash",
    illustration: require("../../../assets/illustrations/tracking/symptoms/skinRash.png"),
  },
  {
    id: "runnyNose",
    label: "Runny nose",
    illustration: require("../../../assets/illustrations/tracking/symptoms/runnyNose.png"),
  },
  {
    id: "cough",
    label: "Cough",
    illustration: require("../../../assets/illustrations/tracking/symptoms/cough.png"),
  },
  {
    id: "fever",
    label: "Fever",
    illustration: require("../../../assets/illustrations/tracking/symptoms/fever.png"),
  },
  {
    id: "unusualBreathing",
    label: "Unusual breathing",
    illustration: require("../../../assets/illustrations/tracking/symptoms/breathing.png"),
  },
  {
    id: "lowEnergy",
    label: "Low energy",
    illustration: require("../../../assets/illustrations/tracking/symptoms/lowEnergy.png"),
  },
  {
    id: "lackOfAppetite",
    label: "Lack of appetite",
    illustration: require("../../../assets/illustrations/tracking/symptoms/lackAppetite.png"),
  },
  {
    id: "regurgitation",
    label: "Regurgitation",
    illustration: require("../../../assets/illustrations/tracking/symptoms/regurgitation.png"),
  },
  {
    id: "vomiting",
    label: "Vomiting",
    illustration: require("../../../assets/illustrations/tracking/symptoms/vomiting.png"),
  },
  {
    id: "diarrhea",
    label: "Diarrhea",
    illustration: require("../../../assets/illustrations/tracking/symptoms/diarrhea.png"),
  },
  {
    id: "constipation",
    label: "Constipation",
    illustration: require("../../../assets/illustrations/tracking/symptoms/constipation.png"),
  },
];

const SYMPTOM_ID_ALIASES = {
  "skin-rash": "skinRash",
  "runny-nose": "runnyNose",
  "unusual-breathing": "unusualBreathing",
  "low-energy": "lowEnergy",
  "lack-of-appetite": "lackOfAppetite",
};

function normalizeSymptomId(symptomId) {
  return SYMPTOM_ID_ALIASES[symptomId] ?? symptomId;
}

function createSymptomsStateFromTrackingEntry(entry) {
  const entryData = entry?.data ?? entry ?? {};

  const symptoms = Array.isArray(entryData.symptoms)
    ? entryData.symptoms.map(normalizeSymptomId)
    : [];

  const validSymptomIds = new Set(SYMPTOM_OPTIONS.map((symptom) => symptom.id));

  const dateValue =
    entryData.observedAt ??
    entry?.observedAt ??
    entry?.occurredAt ??
    entry?.startedAt ??
    entry?.date;

  const parsedDate = dateValue ? new Date(dateValue) : null;

  const hasValidDate =
    parsedDate !== null && !Number.isNaN(parsedDate.getTime());

  return {
    selectedSymptoms: symptoms.filter((symptomId) =>
      validSymptomIds.has(symptomId),
    ),

    note: entryData.note ?? "",

    observedAt: hasValidDate ? parsedDate : new Date(),
  };
}

const SymptomsEntrySheet = forwardRef(function SymptomsEntrySheet(
  { userId, childId, childName, onSave, onRequestDelete, onPressHistory },
  ref,
) {
  const { t } = useTranslation();
  const { accessToken, refreshSession } = useAuth();
  const colors = useThemeColors();

  const modalRef = useRef(null);
  const noteSheetRef = useRef(null);

  const styles = useMemo(() => createStyles(colors), [colors]);
  const snapPoints = useMemo(() => ["92%"], []);

  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [note, setNote] = useState("");
  const [observedAt, setObservedAt] = useState(new Date());

  const [sheetMode, setSheetMode] = useState("create");
  const [editingEntry, setEditingEntry] = useState(null);

  const isEditMode = sheetMode === "edit";

  const canSave = selectedSymptoms.length > 0;

  const savingRef = useRef(false);
  const [isSaving, setIsSaving] = useState(false);

  const resetForm = useCallback(() => {
    setSelectedSymptoms([]);
    setNote("");
    setObservedAt(new Date());

    setSheetMode("create");
    setEditingEntry(null);
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      present(options = {}) {
        if (savingRef.current) {
          return;
        }
        if (!options || typeof options !== "object") {
          resetForm();
          modalRef.current?.present();
          return;
        }

        const { mode = "create", entry = null } = options;

        setSheetMode(mode);

        if (mode === "edit" && entry) {
          const nextState = createSymptomsStateFromTrackingEntry(entry);

          setEditingEntry(entry);
          setSelectedSymptoms(nextState.selectedSymptoms);
          setNote(nextState.note);
          setObservedAt(nextState.observedAt);
        } else {
          setEditingEntry(null);
          setSelectedSymptoms([]);
          setNote("");
          setObservedAt(new Date());
        }

        modalRef.current?.present();
      },

      dismiss() {
        if (savingRef.current) {
          return;
        }

        noteSheetRef.current?.dismiss();
        modalRef.current?.dismiss();
      },
    }),
    [resetForm],
  );

  const renderBackdrop = useCallback(
    (props) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior={isSaving ? "none" : "close"}
        opacity={0.42}
      />
    ),
    [isSaving],
  );

  const handleToggleSymptom = useCallback((symptomId) => {
    if (savingRef.current) {
      return;
    }

    Haptics.selectionAsync().catch(() => {});

    setSelectedSymptoms((currentSymptoms) => {
      const isAlreadySelected = currentSymptoms.includes(symptomId);

      if (isAlreadySelected) {
        return currentSymptoms.filter((id) => id !== symptomId);
      }

      return [...currentSymptoms, symptomId];
    });
  }, []);

  const handleOpenNote = useCallback(() => {
    if (savingRef.current) {
      return;
    }

    noteSheetRef.current?.present(note);
  }, [note]);

  const handleRequestDelete = useCallback(() => {
    if (savingRef.current) {
      return;
    }

    if (!isEditMode || !editingEntry) {
      return;
    }

    onRequestDelete?.(editingEntry);
  }, [editingEntry, isEditMode, onRequestDelete]);

  const handleOpenHistory = useCallback(() => {
    if (savingRef.current) {
      return;
    }
    modalRef.current?.dismiss();

    setTimeout(() => {
      onPressHistory?.("symptoms");
    }, 220);
  }, [onPressHistory]);

  const handleSave = useCallback(async () => {
    if (savingRef.current || !canSave) {
      return;
    }

    if (!userId || !childId) {
      Alert.alert(
        t("Unable to save symptoms"),
        t("Missing user ID or child ID."),
      );
      return;
    }

    if (isEditMode && !editingEntry?.id) {
      Alert.alert(
        t("Unable to save symptoms"),
        t("Missing tracking entry ID."),
      );
      return;
    }

    if (
      isEditMode &&
      editingEntry?.childId &&
      editingEntry.childId !== childId
    ) {
      Alert.alert(
        t("Unable to save symptoms"),
        t("This entry belongs to another child."),
      );
      return;
    }

    savingRef.current = true;
    setIsSaving(true);

    let savedEntry;

    try {
      const data = {
        symptoms: selectedSymptoms,
        note,
        observedAt,
      };

      savedEntry = isEditMode
        ? await updateLocalSymptomsEntry({
            userId,
            childId,
            entryId: editingEntry.id,
            data,
          })
        : await createLocalSymptomsEntry({
            userId,
            childId,
            data,
          });
    } catch (error) {
      console.warn("[Symptoms] Local save failed:", error);

      savingRef.current = false;
      setIsSaving(false);

      Alert.alert(t("Unable to save symptoms"), t("Please try again."));
      return;
    }

    try {
      // La sauvegarde locale est acquise.
      setEditingEntry(savedEntry);
      setSheetMode("edit");

      try {
        await onSave?.({
          ...savedEntry,
          mode: isEditMode ? "edit" : "create",
        });
      } catch (error) {
        // Une erreur de notification ne doit pas entraîner
        // une deuxième création de la même entrée.
        console.warn("[Symptoms] Save notification failed:", error);
      }

      if (accessToken) {
        void processSyncQueue({
          userId,
          accessToken,
          refreshSession,
        }).catch((error) => {
          console.warn("Unable to synchronize tracking entries:", error);
        });
      }

      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      ).catch(() => {});

      modalRef.current?.dismiss();
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  }, [
    canSave,
    userId,
    childId,
    isEditMode,
    editingEntry,
    selectedSymptoms,
    note,
    observedAt,
    accessToken,
    refreshSession,
    onSave,
    t,
  ]);

  return (
    <>
      <BottomSheetModal
        ref={modalRef}
        index={0}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        enablePanDownToClose={!isSaving}
        enableContentPanningGesture
        enableHandlePanningGesture
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.handle}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        onDismiss={resetForm}
      >
        <View style={styles.content} pointerEvents={isSaving ? "none" : "auto"}>
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Text style={styles.title}>
                {isEditMode ? t("Edit symptoms") : t("Add symptoms")}
              </Text>

              <Text style={styles.subtitle}>
                {isEditMode
                  ? t("Update the symptoms observed for child", {
                      childName,
                    })
                  : childName
                    ? t("Select the symptoms observed for child", {
                        childName,
                      })
                    : t("Select all symptoms you noticed.")}
              </Text>
            </View>

            <TrackingHistoryButton
              accessibilityLabel={t("View symptoms history")}
              onPress={handleOpenHistory}
            />
          </View>

          <View style={styles.scrollArea}>
            <BottomSheetScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              nestedScrollEnabled
            >
              <View style={styles.symptomsGrid}>
                {SYMPTOM_OPTIONS.map((symptom) => {
                  const isSelected = selectedSymptoms.includes(symptom.id);

                  return (
                    <Pressable
                      key={symptom.id}
                      accessibilityRole="checkbox"
                      accessibilityState={{
                        checked: isSelected,
                      }}
                      accessibilityLabel={t(symptom.label)}
                      onPress={() => handleToggleSymptom(symptom.id)}
                      style={({ pressed }) => [
                        styles.symptomCard,
                        isSelected && styles.symptomCardSelected,
                        pressed && styles.symptomCardPressed,
                      ]}
                    >
                      <Image
                        source={symptom.illustration}
                        resizeMode="contain"
                        style={styles.illustration}
                      />

                      <Text
                        numberOfLines={2}
                        style={[
                          styles.symptomLabel,
                          isSelected && styles.symptomLabelSelected,
                        ]}
                      >
                        {t(symptom.label)}
                      </Text>

                      {isSelected && (
                        <View style={styles.checkBadge}>
                          <Ionicons
                            name="checkmark"
                            size={13}
                            color="#FFFFFF"
                          />
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.section}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={note ? t("Edit note") : t("Add a note")}
                  onPress={handleOpenNote}
                  style={({ pressed }) => [
                    styles.noteRow,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.noteIcon}>
                    <Ionicons
                      name="document-text-outline"
                      size={20}
                      color={colors.primary}
                    />
                  </View>

                  <View style={styles.noteContent}>
                    <Text style={styles.noteTitle}>
                      {note ? t("Edit note") : t("Add a note")}
                    </Text>

                    <Text
                      numberOfLines={2}
                      style={[
                        styles.noteDescription,
                        note && styles.noteDescriptionFilled,
                      ]}
                    >
                      {note || t("Add an optional detail")}
                    </Text>
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={19}
                    color={colors.textSecondary}
                  />
                </Pressable>
              </View>

              <View style={styles.dateContainer}>
                <DateTimeRow
                  value={observedAt}
                  onChange={setObservedAt}
                  maximumDate={new Date()}
                />
              </View>
            </BottomSheetScrollView>
          </View>

          <View style={styles.footerContainer}>
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
                    disabled={!canSave || isSaving}
                  />
                </View>
              </View>
            ) : (
              <PrimaryButton
                title={t("Save symptoms")}
                onPress={handleSave}
                disabled={!canSave || isSaving}
              />
            )}
          </View>
        </View>
      </BottomSheetModal>

      <NoteSheet
        ref={noteSheetRef}
        title={t("Symptoms note")}
        description={t("Add an optional detail about the symptoms observed")}
        placeholder={t(
          "For example, when the symptoms started or how they changed",
        )}
        onSave={(newNote) => {
          setNote(newNote);
        }}
      />
    </>
  );
});

export default SymptomsEntrySheet;

function createStyles(colors) {
  const cardBackground =
    colors.lightBackground || colors.background || "#F4F7FC";

  const selectedBackground =
    colors.selectedBackground || colors.lightBlue || "#EDF3FF";

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
      minHeight: 0,
    },

    header: {
      flexShrink: 0,
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: 4,
      paddingBottom: 18,
    },

    headerContent: {
      flex: 1,
      paddingRight: 12,
    },

    title: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 21,
      color: colors.textPrimary,
    },

    subtitle: {
      marginTop: 5,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 13,
      lineHeight: 19,
      color: colors.textSecondary,
    },

    scrollArea: {
      flex: 1,
      minHeight: 0,
      overflow: "hidden",
    },

    scrollView: {
      flex: 1,
    },

    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 4,
      paddingBottom: 24,
    },

    symptomsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      rowGap: 12,
    },

    symptomCard: {
      position: "relative",
      width: "31.5%",
      minHeight: 132,
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 7,
      paddingTop: 9,
      paddingBottom: 11,
      borderWidth: 1.5,
      borderColor: "transparent",
      borderRadius: 18,
      backgroundColor: cardBackground,
    },

    symptomCardSelected: {
      borderColor: colors.primary,
      backgroundColor: selectedBackground,
    },

    symptomCardPressed: {
      opacity: 0.78,
      transform: [{ scale: 0.98 }],
    },

    illustration: {
      width: "100%",
      height: 88,
      resizeMode: "contain",
    },

    symptomLabel: {
      minHeight: 32,
      paddingHorizontal: 2,
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 12,
      lineHeight: 16,
      textAlign: "center",
      textAlignVertical: "center",
      color: colors.textPrimary,
    },

    symptomLabelSelected: {
      color: colors.primary,
    },

    checkBadge: {
      position: "absolute",
      top: 7,
      right: 7,
      width: 22,
      height: 22,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 11,
      backgroundColor: colors.primary,
    },

    section: {
      marginTop: 24,
    },

    sectionTitle: {
      marginBottom: 11,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 15,
      color: colors.textPrimary,
    },

    Row: {
      flexDirection: "row",
      gap: 10,
    },

    noteRow: {
      minHeight: 72,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      backgroundColor: colors.white,
    },

    noteIcon: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
      borderRadius: 13,
      backgroundColor: selectedBackground,
    },

    noteContent: {
      flex: 1,
      paddingRight: 10,
    },

    noteTitle: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 14,
      color: colors.textPrimary,
    },

    noteDescription: {
      marginTop: 3,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 12,
      lineHeight: 17,
      color: colors.textSecondary,
    },

    noteDescriptionFilled: {
      color: colors.textPrimary,
    },

    dateContainer: {
      marginTop: 18,
    },

    footerContainer: {
      flexShrink: 0,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 14,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.white,
    },

    pressed: {
      opacity: 0.72,
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
  });
}
