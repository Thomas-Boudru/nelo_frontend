import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useEffect,
  useRef,
  useState,
} from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";

import PrimaryButton from "../../../components/ui/PrimaryButton.js";
import DateTimeRow from "../../../components/addTracking/DateTimeRow.js";
import TrackingHistoryButton from "../../../components/addTracking/TrackingHistoryButton.js";
import { useThemeColors } from "../../../theme/useThemeColors.js";

import NoteSheet from "../Feeding/NoteSheet.js";
import MeasurementPickerSheet from "./MeasurementPickerSheet.js";

import { useAuth } from "../../../auth/AuthProvider.js";
import { processSyncQueue } from "../../../sync/processSyncQueue.js";

import {
  createLocalGrowthEntry,
  updateLocalGrowthEntry,
  getLatestLocalGrowthMeasurements,
} from "../../../database/tracking/growth/growthRepository.js";

import {
  DEFAULT_GROWTH_UNIT_PREFERENCES,
  getGrowthMeasurementConfig,
  toGrowthDisplayValue,
  formatGrowthDate,
  parseGrowthDate,
} from "../../../utils/growthMeasurementUtils.js";

const EMPTY_MEASUREMENTS = {
  weight: null,
  height: null,
  headCircumference: null,
};

const DEFAULT_VISIBLE_MEASUREMENT_TYPES = [
  "weight",
  "height",
  "headCircumference",
];

const WEIGHT_IMAGE = require("../../../assets/illustrations/tracking/weightBlue.png");

const HEIGHT_IMAGE = require("../../../assets/illustrations/tracking/height.png");

const HEAD_CIRCUMFERENCE_IMAGE = require("../../../assets/illustrations/tracking/head.png");

const MEASUREMENT_OPTIONS = [
  {
    id: "weight",
    title: "Weight",
    description: "Record the current weight",
    image: WEIGHT_IMAGE,
  },
  {
    id: "height",
    title: "Height",
    description: "Record the current height",
    image: HEIGHT_IMAGE,
  },
  {
    id: "headCircumference",
    title: "Head circumference",
    description: "Record the head measurement",
    image: HEAD_CIRCUMFERENCE_IMAGE,
  },
];

function createGrowthStateFromTrackingEntry(entry) {
  const entryData = entry?.data ?? entry ?? {};
  const date = parseGrowthDate(entryData.measurementDate);

  return {
    measurements: {
      weight: entryData.weightKg ?? null,
      height: entryData.heightCm ?? null,
      headCircumference: entryData.headCircumferenceCm ?? null,
    },
    measuredAt: date ?? new Date(),
    hasRecordedDate: date !== null,
    note: entryData.note ?? "",
  };
}
function isDefined(value) {
  return value !== null && value !== undefined;
}

function normalizeMeasurements(measurements = {}) {
  return {
    weight: measurements.weight ?? null,
    height: measurements.height ?? null,
    headCircumference: measurements.headCircumference ?? null,
  };
}

const GrowthEntrySheet = forwardRef(function GrowthEntrySheet(
  {
    childName,
    userId,
    childId,
    unitPreferences = DEFAULT_GROWTH_UNIT_PREFERENCES,

    visibleMeasurementTypes = DEFAULT_VISIBLE_MEASUREMENT_TYPES,

    onSave,
    onDismiss,
    onRequestDelete,
    onPressHistory,
  },
  ref,
) {
  const { t, i18n } = useTranslation();
  const colors = useThemeColors();

  const modalRef = useRef(null);
  const noteSheetRef = useRef(null);
  const measurementPickerRef = useRef(null);

  const { accessToken, refreshSession } = useAuth();

  const isSavingRef = useRef(false);

  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const [previousMeasurements, setPreviousMeasurements] =
    useState(EMPTY_MEASUREMENTS);

  const [isLoadingPreviousMeasurements, setIsLoadingPreviousMeasurements] =
    useState(true);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const [measurements, setMeasurements] = useState(EMPTY_MEASUREMENTS);
  const [measurementDate, setMeasurementDate] = useState(new Date());
  const [isNow, setIsNow] = useState(true);
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [sheetMode, setSheetMode] = useState("create");
  const [editingEntry, setEditingEntry] = useState(null);

  const isEditMode = sheetMode === "edit";

  const editingEntryId = isEditMode ? editingEntry?.id : null;

  const selectedMeasurementDate = formatGrowthDate(
    isNow ? new Date() : measurementDate,
  );

  useEffect(() => {
    if (!isSheetOpen || !userId || !childId) {
      return undefined;
    }

    let cancelled = false;

    setIsLoadingPreviousMeasurements(true);
    setPreviousMeasurements(EMPTY_MEASUREMENTS);

    async function loadPreviousMeasurements() {
      try {
        const previous = await getLatestLocalGrowthMeasurements({
          userId,
          childId,
          onOrBefore: selectedMeasurementDate,
          excludeEntryId: editingEntryId,
        });

        if (!cancelled) {
          setPreviousMeasurements(previous);
        }
      } catch (error) {
        console.warn("Unable to load previous growth measurements:", error);

        // La saisie manuelle reste disponible sans suggestion.
      } finally {
        if (!cancelled) {
          setIsLoadingPreviousMeasurements(false);
        }
      }
    }

    void loadPreviousMeasurements();

    return () => {
      cancelled = true;
    };
  }, [isSheetOpen, userId, childId, selectedMeasurementDate, editingEntryId]);

  const availableMeasurementTypes = useMemo(() => {
    const validMeasurementTypes = DEFAULT_VISIBLE_MEASUREMENT_TYPES;

    if (!Array.isArray(visibleMeasurementTypes)) {
      return validMeasurementTypes;
    }

    const filteredMeasurementTypes = visibleMeasurementTypes.filter((type) =>
      validMeasurementTypes.includes(type),
    );

    return filteredMeasurementTypes.length > 0
      ? filteredMeasurementTypes
      : validMeasurementTypes;
  }, [visibleMeasurementTypes]);

  const displayedMeasurementOptions = useMemo(() => {
    return MEASUREMENT_OPTIONS.filter((option) => {
      /*
       * En création, seules les préférences choisies
       * sont affichées.
       */
      if (!isEditMode) {
        return availableMeasurementTypes.includes(option.id);
      }

      /*
       * En édition, on affiche également une ancienne
       * mesure déjà présente, même si elle a depuis été
       * masquée dans les préférences.
       */
      return (
        availableMeasurementTypes.includes(option.id) ||
        isDefined(measurements[option.id])
      );
    });
  }, [availableMeasurementTypes, isEditMode, measurements]);

  const hasMeasurement = useMemo(
    () => Object.values(measurements).some(isDefined),
    [measurements],
  );

  const resetForm = useCallback(
    ({
      values = EMPTY_MEASUREMENTS,
      date = new Date(),
      isToday = true,
      initialNote = "",
    } = {}) => {
      setMeasurements(normalizeMeasurements(values));
      setMeasurementDate(date instanceof Date ? date : new Date(date));
      setIsNow(isToday);
      setNote(initialNote ?? "");
      setIsSaving(false);
    },
    [],
  );

  useImperativeHandle(
    ref,
    () => ({
      present(parameters = {}) {
        if (isSavingRef.current) {
          return;
        }

        if (!parameters || typeof parameters !== "object") {
          parameters = {};
        }

        setPreviousMeasurements(EMPTY_MEASUREMENTS);
        setIsLoadingPreviousMeasurements(true);

        const {
          mode = "create",
          entry = null,

          measurements: initialMeasurements = EMPTY_MEASUREMENTS,

          measuredAt,
          note: initialNote = "",
        } = parameters;

        setSheetMode(mode);

        if (mode === "edit" && entry) {
          const nextState = createGrowthStateFromTrackingEntry(entry);

          setEditingEntry(entry);

          resetForm({
            values: nextState.measurements,
            date: nextState.measuredAt,
            isToday: !nextState.hasRecordedDate,
            initialNote: nextState.note,
          });
        } else {
          setEditingEntry(null);

          resetForm({
            values: initialMeasurements,
            date: measuredAt ? new Date(measuredAt) : new Date(),
            isToday: !measuredAt,
            initialNote,
          });
        }

        setIsSheetOpen(true);

        requestAnimationFrame(() => {
          modalRef.current?.present();
        });
      },

      dismiss() {
        if (isSavingRef.current) {
          return;
        }

        noteSheetRef.current?.dismiss();
        measurementPickerRef.current?.dismiss();
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
        opacity={0.35}
      />
    ),
    [isSaving],
  );

  const handleSheetDismiss = useCallback(() => {
    setIsSheetOpen(false);
    setPreviousMeasurements(EMPTY_MEASUREMENTS);

    onDismiss?.();
  }, [onDismiss]);

  const handleOpenMeasurement = useCallback(
    (type) => {
      if (
        isSavingRef.current ||
        isLoadingPreviousMeasurements ||
        !userId ||
        !childId ||
        !DEFAULT_VISIBLE_MEASUREMENT_TYPES.includes(type)
      ) {
        return;
      }

      const config = getGrowthMeasurementConfig(type, unitPreferences);

      void Haptics.selectionAsync().catch(() => {});

      measurementPickerRef.current?.present({
        type,
        value: measurements[type],
        previousValue: previousMeasurements[type],
        config,
      });
    },
    [
      isLoadingPreviousMeasurements,
      userId,
      childId,
      measurements,
      previousMeasurements,
      unitPreferences,
    ],
  );

  const handleConfirmMeasurement = useCallback(({ type, value } = {}) => {
    if (!type || !isDefined(value)) {
      return;
    }

    setMeasurements((currentMeasurements) => ({
      ...currentMeasurements,
      [type]: value,
    }));
  }, []);

  const handleRemoveMeasurement = useCallback((type) => {
    if (!type) {
      return;
    }

    setMeasurements((currentMeasurements) => ({
      ...currentMeasurements,
      [type]: null,
    }));
  }, []);

  const handleChangeDate = useCallback(
    (nextDate) => {
      if (
        isSavingRef.current ||
        !(nextDate instanceof Date) ||
        !Number.isFinite(nextDate.getTime())
      ) {
        return;
      }

      const nextDateKey = formatGrowthDate(nextDate);

      if (nextDateKey !== selectedMeasurementDate) {
        setIsLoadingPreviousMeasurements(true);
      }

      setMeasurementDate(nextDate);
      setIsNow(false);
    },
    [selectedMeasurementDate],
  );

  const handleOpenNote = useCallback(() => {
    if (isSavingRef.current) {
      return;
    }

    Haptics.selectionAsync().catch(() => {});

    noteSheetRef.current?.present(note);
  }, [note]);

  const handleConfirmNote = useCallback((nextNote) => {
    /*
     * Compatible avec un NoteSheet qui renvoie directement une chaîne,
     * ou un objet comme { note } ou { value }.
     */
    const normalizedNote =
      typeof nextNote === "string"
        ? nextNote
        : (nextNote?.note ?? nextNote?.value ?? "");

    setNote(normalizedNote.trim());
  }, []);

  const handleRequestDelete = useCallback(() => {
    if (isSavingRef.current) {
      return;
    }

    if (!isEditMode || !editingEntry || isSaving) {
      return;
    }

    onRequestDelete?.(editingEntry);
  }, [editingEntry, isEditMode, isSaving, onRequestDelete]);

  const handleOpenHistory = useCallback(() => {
    if (isSavingRef.current) {
      return;
    }

    modalRef.current?.dismiss();

    setTimeout(() => {
      onPressHistory?.("growth");
    }, 220);
  }, [onPressHistory]);

  const handleSave = useCallback(async () => {
    if (isSavingRef.current || !hasMeasurement || !userId || !childId) {
      return;
    }

    const measurementDateValue = formatGrowthDate(
      isNow ? new Date() : measurementDate,
    );

    if (measurementDateValue > formatGrowthDate(new Date())) {
      Alert.alert(
        t("Invalid measurement date"),
        t("The measurement date cannot be in the future."),
      );
      return;
    }

    isSavingRef.current = true;
    setIsSaving(true);

    let savedEntry;

    try {
      const data = {
        measurementDate: measurementDateValue,
        weightKg: measurements.weight,
        heightCm: measurements.height,
        headCircumferenceCm: measurements.headCircumference,
        note: note.trim() || null,
      };

      savedEntry = isEditMode
        ? await updateLocalGrowthEntry({
            userId,
            childId,
            entryId: editingEntry?.id,
            data,
          })
        : await createLocalGrowthEntry({
            userId,
            childId,
            data,
          });
    } catch (error) {
      console.warn("Unable to save growth measurements:", error);

      Alert.alert(t("Unable to save growth"), t("Please try again."));

      isSavingRef.current = false;
      setIsSaving(false);
      return;
    }

    // Déclenchement immédiat après l'écriture SQLite.
    if (accessToken) {
      void processSyncQueue({
        userId,
        accessToken,
        refreshSession,
      }).catch((error) => {
        console.warn("Unable to synchronize tracking entries:", error);
      });
    }

    void Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success,
    ).catch(() => {});

    try {
      await onSave?.({
        ...savedEntry,
        mode: isEditMode ? "edit" : "create",
      });
    } catch (error) {
      // La sauvegarde a déjà réussi : ne pas la refaire.
      console.warn("Unable to display growth save confirmation:", error);
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);

      modalRef.current?.dismiss();
    }
  }, [
    hasMeasurement,
    userId,
    childId,
    isNow,
    measurementDate,
    measurements,
    note,
    isEditMode,
    editingEntry?.id,
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
        // Pas de snap point : la hauteur suit le contenu. Il faut donc que
        // tout le contenu soit dans un seul BottomSheetView, sinon gorhom
        // n'en mesure qu'une partie et la sheet s'ouvre trop bas.
        enableDynamicSizing
        enablePanDownToClose={!isSaving}
        stackBehavior="push"
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.handle}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        onDismiss={handleSheetDismiss}
      >
        <BottomSheetView style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Text style={styles.title}>
                {isEditMode ? t("Edit growth") : t("Add growth")}
              </Text>

              <Text style={styles.subtitle}>
                {isEditMode
                  ? t("Update child's growth measurements", {
                      childName,
                    })
                  : t("Record one or more measurements")}
              </Text>
            </View>

            <TrackingHistoryButton
              accessibilityLabel={t("View growth history")}
              onPress={handleOpenHistory}
            />
          </View>

          <View style={styles.body} pointerEvents={isSaving ? "none" : "auto"}>
            <View style={styles.measurementList}>
              {displayedMeasurementOptions.map((option) => (
                <MeasurementRow
                  key={option.id}
                  option={option}
                  value={measurements[option.id]}
                  unitPreferences={unitPreferences}
                  language={i18n.language}
                  onPress={() => handleOpenMeasurement(option.id)}
                  t={t}
                  styles={styles}
                  colors={colors}
                />
              ))}
            </View>

            <View style={styles.details}>
              <DateTimeRow
                value={measurementDate}
                isNow={isNow}
                onChange={handleChangeDate}
                title="Measurement date"
                mode="date"
                emptyLabel="Today"
                maximumDate={new Date()}
              />

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t(note ? "Edit note" : "Add a note")}
                onPress={handleOpenNote}
                style={({ pressed }) => [
                  styles.noteRow,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.rowLeft}>
                  <View style={styles.noteIcon}>
                    <Ionicons
                      name="document-text-outline"
                      size={20}
                      color={colors.primary}
                    />
                  </View>

                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle}>
                      {t(note ? "Edit note" : "Add a note")}
                    </Text>

                    <Text numberOfLines={1} style={styles.rowDescription}>
                      {note || t("Add an optional detail")}
                    </Text>
                  </View>
                </View>

                <Ionicons name="chevron-forward" size={19} color="#91A0B5" />
              </Pressable>
            </View>
          </View>

          <View style={styles.footer}>
            {isEditMode ? (
              <View style={styles.editFooterRow}>
                <View style={styles.footerButton}>
                  <PrimaryButton
                    title={t("Delete")}
                    variant="destructive"
                    onPress={handleRequestDelete}
                    disabled={isSaving}
                  />
                </View>

                <View style={styles.footerButton}>
                  <PrimaryButton
                    title={t("Save changes")}
                    onPress={handleSave}
                    disabled={
                      !hasMeasurement || isSaving || !userId || !childId
                    }
                    loading={isSaving}
                  />
                </View>
              </View>
            ) : (
              <PrimaryButton
                title={t("Save growth")}
                onPress={handleSave}
                disabled={!hasMeasurement || isSaving || !userId || !childId}
                loading={isSaving}
              />
            )}
          </View>
        </BottomSheetView>
      </BottomSheetModal>

      <MeasurementPickerSheet
        ref={measurementPickerRef}
        onConfirm={handleConfirmMeasurement}
        onRemove={handleRemoveMeasurement}
      />

      <NoteSheet
        ref={noteSheetRef}
        title="Growth note"
        description="Add an optional detail about these measurements"
        onSave={handleConfirmNote}
      />
    </>
  );
});

function MeasurementRow({
  option,
  value,
  unitPreferences,
  language,
  onPress,
  t,
  styles,
  colors,
}) {
  const hasValue = isDefined(value);

  const config = getGrowthMeasurementConfig(option.id, unitPreferences);

  const formattedValue = useMemo(() => {
    if (!hasValue) {
      return "";
    }

    const displayValue = toGrowthDisplayValue(value, option.id, config.unit);

    return new Intl.NumberFormat(language, {
      minimumFractionDigits: 0,
      maximumFractionDigits: config.decimals,
    }).format(displayValue);
  }, [hasValue, value, option.id, config.unit, config.decimals, language]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t(option.title)}
      accessibilityHint={t("Opens the measurement selector")}
      accessibilityState={{ selected: hasValue }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.measurementRow,
        hasValue && styles.measurementRowSelected,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.rowLeft}>
        <View style={styles.measurementImageContainer}>
          <Image
            source={option.image}
            resizeMode="contain"
            style={styles.measurementImage}
          />
        </View>

        <View style={styles.rowText}>
          <Text style={styles.rowTitle}>{t(option.title)}</Text>

          <Text
            numberOfLines={1}
            style={[
              styles.rowDescription,
              hasValue && styles.selectedDescription,
            ]}
          >
            {hasValue ? t("Measurement added") : t(option.description)}
          </Text>
        </View>
      </View>

      <View style={styles.measurementAction}>
        {hasValue ? (
          <View style={styles.valuePill}>
            <Text style={styles.valueLabel}>{formattedValue}</Text>

            <Text style={styles.unitLabel}>{config.unit}</Text>
          </View>
        ) : (
          <View style={styles.addButton}>
            <Ionicons name="add" size={20} color={colors.primary} />
          </View>
        )}
      </View>
    </Pressable>
  );
}

export default GrowthEntrySheet;

function createStyles(colors) {
  return StyleSheet.create({
    sheetBackground: {
      backgroundColor: colors.white,
      borderRadius: 30,
    },

    handle: {
      width: 38,
      height: 4,
      borderRadius: 999,
      backgroundColor: colors.border,
    },

    header: {
      flexShrink: 0,
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingBottom: 12,
      paddingTop: 5,
    },

    headerContent: {
      flex: 1,
      paddingRight: 12,
    },

    title: {
      color: colors.textPrimary,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 25,
    },

    subtitle: {
      marginTop: 4,
      color: colors.textSecondary,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 14,
      lineHeight: 20,
    },

    /*
     * Aucun `flex: 1` ici : la sheet est dimensionnée par son contenu,
     * donc un enfant extensible la ferait s'ouvrir à zéro.
     */
    sheet: {
      paddingBottom: 8,
    },

    body: {
      paddingHorizontal: 20,
      paddingBottom: 20,
    },

    illustration: {
      minHeight: 112,
      overflow: "hidden",
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 22,
      backgroundColor: colors.lightBlue,
      paddingHorizontal: 17,
      paddingVertical: 16,
    },

    illustrationGlow: {
      position: "absolute",
      right: -30,
      top: -55,
      width: 170,
      height: 170,
      borderRadius: 85,
      backgroundColor: `${colors.primary}0D`,
    },

    illustrationIcon: {
      width: 66,
      height: 66,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 22,
      backgroundColor: `${colors.primary}12`,
    },

    illustrationText: {
      flex: 1,
      marginLeft: 15,
    },

    illustrationTitle: {
      color: colors.textPrimary,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 16,
    },

    illustrationDescription: {
      marginTop: 5,
      color: colors.textSecondary,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 12,
      lineHeight: 18,
    },

    measurementList: {
      marginTop: 17,
      gap: 10,
    },

    measurementRow: {
      minHeight: 76,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 19,
      backgroundColor: colors.white,
      paddingHorizontal: 13,
      paddingVertical: 11,
    },

    measurementRowSelected: {
      borderColor: `${colors.primary}75`,
      backgroundColor: `${colors.primary}06`,
    },

    rowLeft: {
      flex: 1,
      minWidth: 0,
      flexDirection: "row",
      alignItems: "center",
    },

    measurementImageContainer: {
      width: 48,
      height: 48,
      flexShrink: 0,
      overflow: "hidden",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 15,
      backgroundColor: colors.lightBackground,
    },

    measurementImage: {
      width: 45,
      height: 45,
    },

    rowText: {
      flex: 1,
      minWidth: 0,
      marginLeft: 12,
    },

    rowTitle: {
      color: colors.textPrimary,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 14,
    },

    rowDescription: {
      marginTop: 3,
      color: colors.textSecondary,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 11,
    },

    selectedDescription: {
      color: colors.primary,
    },

    measurementAction: {
      flexShrink: 0,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingLeft: 8,
    },

    valuePill: {
      minWidth: 75,
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "center",
      borderRadius: 13,
      backgroundColor: `${colors.primary}12`,
      paddingHorizontal: 10,
      paddingVertical: 7,
    },

    valueLabel: {
      color: colors.primary,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 14,
    },

    unitLabel: {
      marginLeft: 4,
      color: colors.primary,
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 10,
    },

    addButton: {
      width: 34,
      height: 34,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: `${colors.primary}35`,
      borderRadius: 17,
      backgroundColor: `${colors.primary}0A`,
    },

    details: {
      marginTop: 50,
      gap: 10,
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

    noteRow: {
      minHeight: 68,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      backgroundColor: colors.white,
      paddingHorizontal: 14,
    },

    noteIcon: {
      width: 40,
      height: 40,
      flexShrink: 0,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 13,
      backgroundColor: `${colors.primary}12`,
    },

    footer: {
      flexShrink: 0,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.white,
      paddingHorizontal: 20,
      paddingBottom: 16,
      paddingTop: 12,
    },

    pressed: {
      opacity: 0.68,
    },
  });
}
