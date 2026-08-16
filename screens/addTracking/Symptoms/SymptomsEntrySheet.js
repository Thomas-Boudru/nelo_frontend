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
import * as Haptics from "expo-haptics";

import PrimaryButton from "../../../components/ui/PrimaryButton.js";
import DateTimeRow from "../../../components/addTracking/DateTimeRow.js";
import NoteSheet from "../Feeding/NoteSheet.js";
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

const SymptomsEntrySheet = forwardRef(function SymptomsEntrySheet(
  { childName, onSave },
  ref,
) {
  const { t } = useTranslation();
  const colors = useThemeColors();

  const modalRef = useRef(null);
  const noteSheetRef = useRef(null);

  const styles = useMemo(() => createStyles(colors), [colors]);
  const snapPoints = useMemo(() => ["92%"], []);

  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [note, setNote] = useState("");
  const [observedAt, setObservedAt] = useState(new Date());

  const canSave = selectedSymptoms.length > 0;

  const resetForm = useCallback(() => {
    setSelectedSymptoms([]);
    setNote("");
    setObservedAt(new Date());
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      present() {
        resetForm();
        modalRef.current?.present();
      },

      dismiss() {
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
        pressBehavior="close"
        opacity={0.42}
      />
    ),
    [],
  );

  const handleToggleSymptom = useCallback((symptomId) => {
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
    noteSheetRef.current?.present(note);
  }, [note]);

  const handleSave = useCallback(async () => {
    if (!canSave) {
      return;
    }

    await Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success,
    ).catch(() => {});

    await onSave?.({
      type: "symptoms",
      symptoms: selectedSymptoms,
      note: note.trim() || null,
      observedAt,
    });

    modalRef.current?.dismiss();
  }, [canSave, selectedSymptoms, note, observedAt, onSave]);

  return (
    <>
      <BottomSheetModal
        ref={modalRef}
        index={0}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        enablePanDownToClose
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
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>{t("Add symptoms")}</Text>

            <Text style={styles.subtitle}>
              {childName
                ? t("Select the symptoms observed for child", {
                    childName,
                  })
                : t("Select all symptoms you noticed.")}
            </Text>
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
                <DateTimeRow date={observedAt} onChange={setObservedAt} />
              </View>
            </BottomSheetScrollView>
          </View>

          <View style={styles.footerContainer}>
            <PrimaryButton
              title={t("Save symptoms")}
              onPress={handleSave}
              disabled={!canSave}
            />
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
      borderRadius: 20,
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
  });
}
