import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Image,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";

import PrimaryButton from "../../../components/ui/PrimaryButton.js";
import DateTimeRow from "../../../components/addTracking/DateTimeRow.js";
import TrackingHistoryButton from "../../../components/addTracking/TrackingHistoryButton.js";
import { useThemeColors } from "../../../theme/useThemeColors.js";

import MeasurementLocationSheet from "./MeasurementLocationSheet.js";

import {
  createLocalTemperatureEntry,
  updateLocalTemperatureEntry,
} from "../../../database/tracking/temperature/temperatureRepository.js";

import { useSelector } from "react-redux";

import { useAuth } from "../../../auth/AuthProvider.js";
import { processSyncQueue } from "../../../sync/processSyncQueue.js";

import {
  getTemperatureUnit,
  getTemperatureUnitLabel,
  temperatureToCelsius,
  temperatureFromCelsius,
  formatTemperatureValue,
  parseTemperatureInput,
} from "../../../utils/temperatureUnits.js";

const thermometerImage = require("../../../assets/illustrations/tracking/temperature/thermometer.png");

const minusButtonImage = require("../../../assets/illustrations/tracking/temperature/thermometerMinus.png");

const plusButtonImage = require("../../../assets/illustrations/tracking/temperature/thermometerPlus.png");

const MIN_TEMPERATURE = 34;
const MAX_TEMPERATURE = 42;
const DEFAULT_TEMPERATURE = 37;

const MEASUREMENT_LOCATION_LABELS = {
  forehead: "Forehead",
  armpit: "Armpit",
  rectal: "Rectal",
  ear: "Ear",
};

const THERMOMETER_DESIGN_WIDTH = 290;
const THERMOMETER_DESIGN_HEIGHT = 335;

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function normalizeTemperature(value) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return DEFAULT_TEMPERATURE;
  }

  return clamp(parsed, MIN_TEMPERATURE, MAX_TEMPERATURE);
}

function createTemperatureStateFromTrackingEntry(entry) {
  const entryData = entry?.data ?? entry ?? {};
  const storedCelsius =
    entryData.temperatureCelsius ??
    entryData.temperature_celsius ??
    entry?.temperatureCelsius ??
    entry?.temperature_celsius;

  const originalValue =
    entryData.inputValue ??
    entryData.input_value ??
    entry?.inputValue ??
    entry?.input_value;

  const originalUnit =
    entryData.inputUnit ??
    entryData.input_unit ??
    entry?.inputUnit ??
    entry?.input_unit;

  const legacyValue =
    entryData.temperature ??
    entryData.value ??
    entry?.temperature ??
    entry?.value ??
    DEFAULT_TEMPERATURE;

  const legacyUnit = entryData.unit ?? entry?.unit ?? "celsius";

  const rawTemperature =
    storedCelsius != null
      ? Number(storedCelsius)
      : originalValue != null && originalUnit != null
        ? temperatureToCelsius(Number(originalValue), originalUnit)
        : temperatureToCelsius(Number(legacyValue), legacyUnit);

  const normalizedTemperature = normalizeTemperature(rawTemperature);

  const dateValue =
    entryData.measuredAt ??
    entryData.temperatureDate ??
    entry?.measuredAt ??
    entry?.temperatureDate ??
    entry?.occurredAt ??
    entry?.startedAt ??
    entry?.date;

  const parsedDate = dateValue ? new Date(dateValue) : null;

  const hasValidDate =
    parsedDate !== null && !Number.isNaN(parsedDate.getTime());

  return {
    temperature: normalizedTemperature,
    measuredAt: hasValidDate ? parsedDate : new Date(),

    location:
      entryData.measurementSite ??
      entryData.measurement_site ??
      entryData.location ??
      entryData.measurementLocation ??
      entry?.measurementSite ??
      entry?.measurement_site ??
      entry?.location ??
      entry?.measurementLocation ??
      "forehead",
  };
}

function getTemperatureStatus(temperature) {
  if (temperature >= 38) {
    return {
      label: "Fever",
      icon: "thermometer-outline",
      color: "#D96565",
      backgroundColor: "#FDEEEE",
    };
  }

  if (temperature < 36) {
    return {
      label: "Low temperature",
      icon: "snow-outline",
      color: "#5788C7",
      backgroundColor: "#EDF5FF",
    };
  }

  return {
    label: "Normal temperature",
    icon: "checkmark-circle-outline",
    color: "#4B9A79",
    backgroundColor: "#ECF8F2",
  };
}

function IllustratedControlButton({
  accessibilityLabel,
  direction,
  imageSource,
  onStep,
  size,
}) {
  const handlePress = useCallback(() => {
    onStep(direction);

    Haptics.selectionAsync().catch(() => {});
  }, [direction, onStep]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={10}
      onPress={handlePress}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        pressed && styles.controlButtonPressed,
      ]}
    >
      <Image
        source={imageSource}
        resizeMode="contain"
        style={styles.controlButtonImage}
      />
    </Pressable>
  );
}

const TemperatureEntrySheet = forwardRef(function TemperatureEntrySheet(
  {
    userId,
    childId,
    childName,
    initialLocation = "forehead",
    initialTemperature = DEFAULT_TEMPERATURE,
    onSave,
    onRequestDelete,
    onPressHistory,
  },
  ref,
) {
  const { t } = useTranslation();
  const { accessToken, refreshSession } = useAuth();
  const colors = useThemeColors();
  const { width: screenWidth } = useWindowDimensions();

  const temperaturePreference = useSelector(
    (state) => state.measurementUnits?.temperature,
  );

  const preferredUnit = getTemperatureUnit(temperaturePreference);

  const sheetRef = useRef(null);
  const locationSheetRef = useRef(null);
  const inputRef = useRef(null);

  const snapPoints = useMemo(() => ["94%"], []);

  const initialNormalizedTemperature = normalizeTemperature(initialTemperature);

  const [temperature, setTemperature] = useState(initialNormalizedTemperature);

  const [draftTemperature, setDraftTemperature] = useState(
    formatTemperatureValue(initialNormalizedTemperature, preferredUnit),
  );

  const [measuredAt, setMeasuredAt] = useState(new Date());
  const [location, setLocation] = useState(initialLocation);
  const [isEditing, setIsEditing] = useState(false);

  const [editingUnit, setEditingUnit] = useState(preferredUnit);
  const [isSaving, setIsSaving] = useState(false);

  const temperatureRef = useRef(initialNormalizedTemperature);
  const savingRef = useRef(false);

  // L'unité reste stable pendant une saisie en cours.
  const displayUnit = isEditing ? editingUnit : preferredUnit;

  const unitLabel = getTemperatureUnitLabel(displayUnit);

  const displayedTemperature = formatTemperatureValue(temperature, displayUnit);

  const updateTemperature = useCallback((nextTemperature) => {
    temperatureRef.current = nextTemperature;
    setTemperature(nextTemperature);
  }, []);

  const [sheetMode, setSheetMode] = useState("create");
  const [editingEntry, setEditingEntry] = useState(null);

  const isEditMode = sheetMode === "edit";

  const thermometerWidth = Math.min(
    Math.max(screenWidth - 48, 250),
    THERMOMETER_DESIGN_WIDTH,
  );

  const thermometerScale = thermometerWidth / THERMOMETER_DESIGN_WIDTH;

  const thermometerHeight = THERMOMETER_DESIGN_HEIGHT * thermometerScale;

  const controlButtonSize = 70 * thermometerScale;
  const temperatureFontSize = 55 * thermometerScale;
  const unitFontSize = 20 * thermometerScale;
  const temperatureTextOffsetY = 12 * thermometerScale;

  const dynamicStyles = useMemo(() => createDynamicStyles(colors), [colors]);

  const status = useMemo(
    () => getTemperatureStatus(temperature),
    [temperature],
  );

  const reset = useCallback(() => {
    const nextTemperature = normalizeTemperature(initialTemperature);

    updateTemperature(nextTemperature);

    setDraftTemperature(formatTemperatureValue(nextTemperature, preferredUnit));
    setMeasuredAt(new Date());
    setLocation(initialLocation);
    setIsEditing(false);

    setSheetMode("create");
    setEditingEntry(null);

    locationSheetRef.current?.dismiss();
  }, [initialLocation, initialTemperature, preferredUnit, updateTemperature]);

  useImperativeHandle(
    ref,
    () => ({
      present(options = {}) {
        /*
         * Compatibilité avec l’appel existant :
         * temperatureSheetRef.current?.present()
         */
        if (!options || typeof options !== "object") {
          reset();
          sheetRef.current?.present();
          return;
        }

        const { mode = "create", entry = null } = options;

        setSheetMode(mode);
        setIsEditing(false);

        if (mode === "edit" && entry) {
          const nextState = createTemperatureStateFromTrackingEntry(entry);

          setEditingEntry(entry);

          updateTemperature(nextState.temperature);

          setDraftTemperature(
            formatTemperatureValue(nextState.temperature, preferredUnit),
          );
          setMeasuredAt(nextState.measuredAt);
          setLocation(nextState.location);
        } else {
          const nextTemperature = normalizeTemperature(initialTemperature);

          setEditingEntry(null);

          updateTemperature(nextTemperature);

          setDraftTemperature(
            formatTemperatureValue(nextTemperature, preferredUnit),
          );
          setMeasuredAt(new Date());
          setLocation(initialLocation);
        }

        locationSheetRef.current?.dismiss();
        sheetRef.current?.present();
      },

      dismiss() {
        locationSheetRef.current?.dismiss();
        sheetRef.current?.dismiss();
      },
    }),
    [
      initialLocation,
      initialTemperature,
      preferredUnit,
      reset,
      updateTemperature,
    ],
  );

  const beginEditing = useCallback(() => {
    if (savingRef.current) {
      return;
    }

    setEditingUnit(preferredUnit);

    setDraftTemperature(
      formatTemperatureValue(temperatureRef.current, preferredUnit),
    );

    setIsEditing(true);

    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, [preferredUnit]);

  const changeDraftTemperature = useCallback((value) => {
    const normalized = value.replace(",", ".");

    if (/^\d{0,3}(?:\.\d{0,1})?$/.test(normalized)) {
      setDraftTemperature(normalized);
    }
  }, []);

  const resolveTemperature = useCallback(() => {
    if (!isEditing) {
      return temperatureRef.current;
    }

    const parsed = parseTemperatureInput(draftTemperature);

    if (parsed === null) {
      return null;
    }

    const celsius = temperatureToCelsius(parsed, editingUnit);

    if (
      celsius < MIN_TEMPERATURE - 0.000001 ||
      celsius > MAX_TEMPERATURE + 0.000001
    ) {
      return null;
    }

    return clamp(celsius, MIN_TEMPERATURE, MAX_TEMPERATURE);
  }, [draftTemperature, editingUnit, isEditing]);

  const showInvalidTemperature = useCallback(() => {
    Alert.alert(
      t("Invalid temperature"),
      t("Enter a temperature between {{min}} and {{max}} {{unit}}.", {
        min: formatTemperatureValue(MIN_TEMPERATURE, displayUnit),
        max: formatTemperatureValue(MAX_TEMPERATURE, displayUnit),
        unit: unitLabel,
      }),
    );
  }, [displayUnit, t, unitLabel]);

  const commitDraft = useCallback(() => {
    const nextTemperature = resolveTemperature();

    if (nextTemperature === null) {
      // On conserve la saisie pour permettre sa correction.
      return null;
    }

    updateTemperature(nextTemperature);

    setDraftTemperature(formatTemperatureValue(nextTemperature, preferredUnit));

    setIsEditing(false);
    Keyboard.dismiss();

    return nextTemperature;
  }, [preferredUnit, resolveTemperature, updateTemperature]);

  const changeTemperature = useCallback(
    (direction) => {
      if (savingRef.current) {
        return;
      }

      const currentCelsius = resolveTemperature();

      if (currentCelsius === null) {
        showInvalidTemperature();
        return;
      }

      const currentDisplayed = temperatureFromCelsius(
        currentCelsius,
        displayUnit,
      );

      // Un cran représente 0,1 dans l'unité affichée.
      const nextDisplayed =
        (Math.round(currentDisplayed * 10) + direction) / 10;

      const nextCelsius = clamp(
        temperatureToCelsius(nextDisplayed, displayUnit),
        MIN_TEMPERATURE,
        MAX_TEMPERATURE,
      );

      updateTemperature(nextCelsius);

      setDraftTemperature(formatTemperatureValue(nextCelsius, preferredUnit));

      setIsEditing(false);
      Keyboard.dismiss();
    },
    [
      displayUnit,
      preferredUnit,
      resolveTemperature,
      showInvalidTemperature,
      updateTemperature,
    ],
  );

  const handleRequestDelete = useCallback(() => {
    if (savingRef.current || !isEditMode || !editingEntry) {
      return;
    }

    onRequestDelete?.(editingEntry);
  }, [editingEntry, isEditMode, onRequestDelete]);

  const handleOpenHistory = useCallback(() => {
    sheetRef.current?.dismiss();

    setTimeout(() => {
      onPressHistory?.("temperature");
    }, 220);
  }, [onPressHistory]);

  const handleSave = useCallback(async () => {
    if (savingRef.current) {
      return;
    }

    if (!userId || !childId) {
      Alert.alert(
        t("Unable to save temperature"),
        t("Missing user ID or child ID."),
      );
      return;
    }

    if (isEditMode && !editingEntry?.id) {
      Alert.alert(
        t("Unable to save temperature"),
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
        t("Unable to save temperature"),
        t("This entry belongs to another child."),
      );
      return;
    }

    const nextTemperature = resolveTemperature();

    if (nextTemperature === null) {
      showInvalidTemperature();
      return;
    }

    savingRef.current = true;
    setIsSaving(true);

    let savedEntry;

    try {
      const originalData = editingEntry?.data ?? editingEntry ?? {};

      const originalInputValue =
        originalData.inputValue ??
        originalData.input_value ??
        editingEntry?.inputValue ??
        editingEntry?.input_value;

      const originalInputUnit =
        originalData.inputUnit ??
        originalData.input_unit ??
        editingEntry?.inputUnit ??
        editingEntry?.input_unit;

      const parsedOriginalValue =
        originalInputValue == null
          ? null
          : parseTemperatureInput(originalInputValue);

      const keepOriginalInput =
        isEditMode &&
        parsedOriginalValue !== null &&
        originalInputUnit != null &&
        Math.abs(
          temperatureToCelsius(parsedOriginalValue, originalInputUnit) -
            nextTemperature,
        ) <= 0.005001;

      const inputUnit = keepOriginalInput
        ? getTemperatureUnit(originalInputUnit)
        : displayUnit;

      const inputValue = keepOriginalInput
        ? parsedOriginalValue
        : Number(formatTemperatureValue(nextTemperature, inputUnit));

      const data = {
        inputValue,
        inputUnit,
        measurementSite: location,
        measuredAt,
      };

      savedEntry = isEditMode
        ? await updateLocalTemperatureEntry({
            userId,
            childId,
            entryId: editingEntry.id,
            data,
          })
        : await createLocalTemperatureEntry({
            userId,
            childId,
            data,
          });
    } catch (error) {
      console.warn("[Temperature] Local save failed:", error);

      savingRef.current = false;
      setIsSaving(false);

      Alert.alert(t("Unable to save temperature"), t("Please try again."));
      return;
    }

    // La sauvegarde est acquise. Une erreur de notification
    // ne doit pas proposer de recréer la même entrée.
    try {
      updateTemperature(savedEntry.temperatureCelsius);
      setIsEditing(false);
      Keyboard.dismiss();

      // Si la sheet reste momentanément ouverte, un nouvel
      // enregistrement modifiera cette entrée au lieu de la dupliquer.
      setEditingEntry(savedEntry);
      setSheetMode("edit");

      try {
        await onSave?.({
          ...savedEntry,
          mode: isEditMode ? "edit" : "create",
        });
      } catch (error) {
        console.warn("[Temperature] Save notification failed:", error);
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

      sheetRef.current?.dismiss();
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  }, [
    userId,
    childId,
    displayUnit,
    editingEntry,
    isEditMode,
    location,
    measuredAt,
    onSave,
    accessToken,
    refreshSession,
    resolveTemperature,
    showInvalidTemperature,
    t,
    updateTemperature,
  ]);

  const renderBackdrop = useCallback(
    (backdropProps) => (
      <BottomSheetBackdrop
        {...backdropProps}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.35}
        pressBehavior="close"
      />
    ),
    [],
  );

  return (
    <>
      <BottomSheetModal
        ref={sheetRef}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        enablePanDownToClose
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        backgroundStyle={dynamicStyles.sheetBackground}
        handleIndicatorStyle={dynamicStyles.handleIndicator}
      >
        <BottomSheetScrollView
          contentContainerStyle={dynamicStyles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={dynamicStyles.header}>
            <View style={dynamicStyles.headerText}>
              <Text style={dynamicStyles.title}>
                {isEditMode ? t("Edit temperature") : t("Temperature")}
              </Text>

              <Text style={dynamicStyles.subtitle}>
                {isEditMode
                  ? t("Update child's temperature", {
                      childName,
                    })
                  : t("Record your baby's temperature")}
              </Text>
            </View>

            <TrackingHistoryButton
              accessibilityLabel={t("View temperature history")}
              onPress={handleOpenHistory}
            />
          </View>

          <View
            style={[
              styles.thermometerArea,
              {
                width: thermometerWidth,
                height: thermometerHeight,
              },
            ]}
          >
            <Image
              source={thermometerImage}
              resizeMode="contain"
              style={styles.thermometerImage}
            />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("Enter temperature manually")}
              onPress={beginEditing}
              style={styles.displayTouchArea}
            >
              {isEditing ? (
                <View style={styles.editingRow}>
                  <TextInput
                    ref={inputRef}
                    value={draftTemperature}
                    onChangeText={changeDraftTemperature}
                    onBlur={commitDraft}
                    onSubmitEditing={commitDraft}
                    selectTextOnFocus
                    keyboardType="decimal-pad"
                    maxLength={5}
                    editable={!isSaving}
                    style={[
                      styles.temperatureInput,
                      {
                        minWidth: 126 * thermometerScale,
                        fontSize: 52 * thermometerScale,
                      },
                    ]}
                  />

                  <Text
                    style={[
                      styles.unit,
                      {
                        fontSize: unitFontSize,
                        marginTop: 4 * thermometerScale,
                      },
                    ]}
                  >
                    {unitLabel}
                  </Text>
                </View>
              ) : (
                <View style={styles.temperatureRow}>
                  <Text
                    style={[
                      styles.temperatureValue,
                      {
                        fontSize: temperatureFontSize,
                        lineHeight: temperatureFontSize,
                        transform: [
                          {
                            translateY: temperatureTextOffsetY,
                          },
                        ],
                      },
                    ]}
                  >
                    {displayedTemperature}
                  </Text>

                  <Text
                    style={[
                      styles.unit,
                      {
                        fontSize: unitFontSize,
                        lineHeight: unitFontSize + 2,
                        transform: [
                          {
                            translateY:
                              temperatureTextOffsetY + 2 * thermometerScale,
                          },
                        ],
                      },
                    ]}
                  >
                    {unitLabel}
                  </Text>
                </View>
              )}
            </Pressable>

            <View style={styles.controlsRow}>
              <IllustratedControlButton
                accessibilityLabel={t("Decrease temperature")}
                direction={-1}
                imageSource={minusButtonImage}
                onStep={changeTemperature}
                size={controlButtonSize}
              />

              <IllustratedControlButton
                accessibilityLabel={t("Increase temperature")}
                direction={1}
                imageSource={plusButtonImage}
                onStep={changeTemperature}
                size={controlButtonSize}
              />
            </View>
          </View>

          <Text style={dynamicStyles.editHint}>
            {t("Tap the temperature to edit")}
          </Text>

          <View
            style={[
              dynamicStyles.statusBadge,
              {
                backgroundColor: status.backgroundColor,
              },
            ]}
          >
            <Ionicons name={status.icon} size={17} color={status.color} />

            <Text
              style={[
                dynamicStyles.statusText,
                {
                  color: status.color,
                },
              ]}
            >
              {t(status.label)}
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("Choose measurement location")}
            onPress={() => {
              locationSheetRef.current?.present();
            }}
            style={({ pressed }) => [
              dynamicStyles.infoRow,
              pressed && dynamicStyles.infoRowPressed,
            ]}
          >
            <View style={dynamicStyles.infoIcon}>
              <Ionicons
                name="location-outline"
                size={20}
                color={colors.primary ?? "#4479C4"}
              />
            </View>

            <View style={dynamicStyles.infoTextContainer}>
              <Text style={dynamicStyles.infoLabel}>{t("Measured at")}</Text>

              <Text style={dynamicStyles.infoValue}>
                {t(
                  MEASUREMENT_LOCATION_LABELS[location] ??
                    MEASUREMENT_LOCATION_LABELS.forehead,
                )}
              </Text>
            </View>

            <Ionicons name="chevron-forward" size={19} color="#91A0B5" />
          </Pressable>

          <DateTimeRow
            value={measuredAt}
            onChange={setMeasuredAt}
            maximumDate={new Date()}
          />

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
                  disabled={isSaving}
                />
              </View>
            </View>
          ) : (
            <PrimaryButton
              title={t("Save temperature")}
              onPress={handleSave}
              style={dynamicStyles.saveButton}
              disabled={isSaving}
            />
          )}
        </BottomSheetScrollView>
      </BottomSheetModal>

      <MeasurementLocationSheet
        ref={locationSheetRef}
        selectedLocation={location}
        onSelect={setLocation}
      />
    </>
  );
});

export default TemperatureEntrySheet;

const styles = StyleSheet.create({
  thermometerArea: {
    alignSelf: "center",
    position: "relative",
    marginTop: 2,
  },

  thermometerImage: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },

  editFooterRow: {
    width: "100%",

    flexDirection: "row",
    alignItems: "center",

    gap: 10,
    marginTop: 18,
  },

  footerButton: {
    flex: 1,
    minWidth: 0,
  },

  displayTouchArea: {
    position: "absolute",
    top: "20.5%",
    left: "17%",
    width: "66%",
    height: "27%",
    alignItems: "center",
    justifyContent: "center",
  },

  temperatureRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  editingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  temperatureValue: {
    color: "#263D3A",
    fontFamily: "DSEG7Classic-Bold",
    letterSpacing: 2,
    includeFontPadding: false,
    textAlignVertical: "center",
  },

  temperatureInput: {
    padding: 0,
    color: "#263D3A",
    fontFamily: "DSEG7Classic-Bold",
    textAlign: "center",
    letterSpacing: 2,
  },

  unit: {
    color: "#263D3A",
    fontFamily: "PlusJakartaSans_700Bold",
    marginLeft: 3,
    includeFontPadding: false,
    textAlignVertical: "center",
  },

  controlsRow: {
    position: "absolute",
    left: "22%",
    right: "22%",
    bottom: "19%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  controlButtonPressed: {
    transform: [
      {
        translateY: 3,
      },
      {
        scale: 0.97,
      },
    ],
    opacity: 0.91,
  },

  controlButtonImage: {
    width: "100%",
    height: "100%",
  },
});

const createDynamicStyles = (colors) =>
  StyleSheet.create({
    sheetBackground: {
      backgroundColor: colors.white ?? "#FFFFFF",
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
    },

    handleIndicator: {
      width: 42,
      backgroundColor: "#C8D2E2",
    },

    content: {
      paddingHorizontal: 20,
      paddingBottom: 36,
    },

    header: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      marginBottom: 8,
    },

    headerText: {
      flex: 1,
      paddingRight: 12,
    },

    title: {
      color: colors.text ?? "#20304A",
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 25,
    },

    subtitle: {
      color: colors.textSecondary ?? "#7A879A",
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 13,
      marginTop: 4,
    },

    editHint: {
      marginTop: -15,
      marginBottom: 10,
      textAlign: "center",
      color: "#B8C1CE",
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 11,
    },

    statusBadge: {
      minHeight: 36,
      paddingHorizontal: 13,
      borderRadius: 18,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      alignSelf: "center",
      gap: 6,
      marginBottom: 14,
    },

    statusText: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 13,
    },

    infoRow: {
      minHeight: 68,
      paddingHorizontal: 14,
      flexDirection: "row",
      alignItems: "center",

      borderWidth: 1,
      borderColor: colors.border ?? "#E4EAF2",
      borderRadius: 18,

      backgroundColor: colors.card ?? "#FFFFFF",
      marginBottom: 12,

      shadowColor: "#28466F",
      shadowOffset: {
        width: 0,
        height: 3,
      },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },

    infoRowPressed: {
      transform: [
        {
          scale: 0.992,
        },
      ],
      opacity: 0.9,
    },

    infoIcon: {
      width: 38,
      height: 38,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.lightBlue ?? "#EAF2FF",
      marginRight: 12,
    },

    infoTextContainer: {
      flex: 1,
    },

    infoLabel: {
      color: colors.textSecondary ?? "#7A879A",
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 11.5,
      marginBottom: 2,
    },

    infoValue: {
      color: colors.text ?? "#20304A",
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 14,
    },

    saveButton: {
      marginTop: 18,
    },
  });
