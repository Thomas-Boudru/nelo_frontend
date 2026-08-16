import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
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
import { useThemeColors } from "../../../theme/useThemeColors.js";

import MeasurementLocationSheet from "./MeasurementLocationSheet.js";

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
  const clampedValue = clamp(value, MIN_TEMPERATURE, MAX_TEMPERATURE);

  return Math.round(clampedValue * 10) / 10;
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
    initialLocation = "forehead",
    initialTemperature = DEFAULT_TEMPERATURE,
    onSave,
  },
  ref,
) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { width: screenWidth } = useWindowDimensions();

  const sheetRef = useRef(null);
  const locationSheetRef = useRef(null);
  const inputRef = useRef(null);

  const snapPoints = useMemo(() => ["94%"], []);

  const initialNormalizedTemperature = normalizeTemperature(initialTemperature);

  const [temperature, setTemperature] = useState(initialNormalizedTemperature);

  const [draftTemperature, setDraftTemperature] = useState(
    initialNormalizedTemperature.toFixed(1),
  );

  const [measuredAt, setMeasuredAt] = useState(new Date());
  const [location, setLocation] = useState(initialLocation);
  const [isEditing, setIsEditing] = useState(false);

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

    setTemperature(nextTemperature);
    setDraftTemperature(nextTemperature.toFixed(1));
    setMeasuredAt(new Date());
    setLocation(initialLocation);
    setIsEditing(false);

    locationSheetRef.current?.dismiss();
  }, [initialLocation, initialTemperature]);

  useImperativeHandle(
    ref,
    () => ({
      present: () => {
        reset();
        sheetRef.current?.present();
      },

      dismiss: () => {
        locationSheetRef.current?.dismiss();
        sheetRef.current?.dismiss();
      },
    }),
    [reset],
  );

  const changeTemperature = useCallback((direction) => {
    setTemperature((currentTemperature) => {
      const nextTemperature = normalizeTemperature(
        currentTemperature + direction * 0.1,
      );

      setDraftTemperature(nextTemperature.toFixed(1));

      return nextTemperature;
    });
  }, []);

  const beginEditing = useCallback(() => {
    setDraftTemperature(temperature.toFixed(1));
    setIsEditing(true);

    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, [temperature]);

  const changeDraftTemperature = useCallback((value) => {
    const cleanedValue = value
      .replace(/[^0-9.,]/g, "")
      .replace(",", ".")
      .slice(0, 4);

    setDraftTemperature(cleanedValue);
  }, []);

  const commitDraft = useCallback(() => {
    const parsedTemperature = Number.parseFloat(
      draftTemperature.replace(",", "."),
    );

    if (!Number.isFinite(parsedTemperature)) {
      setDraftTemperature(temperature.toFixed(1));
    } else {
      const nextTemperature = normalizeTemperature(parsedTemperature);

      setTemperature(nextTemperature);
      setDraftTemperature(nextTemperature.toFixed(1));
    }

    setIsEditing(false);
    Keyboard.dismiss();
  }, [draftTemperature, temperature]);

  const handleSave = useCallback(async () => {
    if (isEditing) {
      commitDraft();
    }

    await Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success,
    ).catch(() => {});

    onSave?.({
      temperature,
      unit: "celsius",
      location,
      measuredAt,
    });

    sheetRef.current?.dismiss();
  }, [commitDraft, isEditing, location, measuredAt, onSave, temperature]);

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
              <Text style={dynamicStyles.title}>{t("Temperature")}</Text>

              <Text style={dynamicStyles.subtitle}>
                {t("Record your baby's temperature")}
              </Text>
            </View>
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
                    maxLength={4}
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
                    °C
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
                    {temperature.toFixed(1)}
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
                    °C
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

          <DateTimeRow date={measuredAt} onChange={setMeasuredAt} />

          <PrimaryButton
            title={t("Save temperature")}
            onPress={handleSave}
            style={dynamicStyles.saveButton}
          />
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
