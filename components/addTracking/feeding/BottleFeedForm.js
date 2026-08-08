import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import FeedingTimeRow from "./FeedingTimeRow.js";
import {
  BOTTLE_PORTIONS,
  DEFAULT_BOTTLE_CAPACITY_ML,
  formatBottleAmount,
  getBottleAmountMl,
  getBottleEntryAmountMl,
  getBottleFillRatio,
} from "./feedingUnits.js";
import { useThemeColors } from "../../../theme/useThemeColors.js";

const BOTTLE_IMAGE = require("../../../assets/illustrations/tracking/bottleEmpty.png");

// Mesuré directement sur bottleEmpty.png (779 x 1356) : ratio de l'image et
// position de l'intérieur du verre, en fraction de l'image affichée.
const BOTTLE_ASPECT_RATIO = 779 / 1356;

const GLASS_INSET = {
  top: 0.345,
  bottom: 0.041,
  side: 0.211,
};

// Un biberon ne se remplit pas jusqu'au col : on réserve de l'air au-dessus du
// niveau « plein ». Exprimé en fraction de la hauteur du biberon, donc
// identique quelle que soit la taille d'écran.
const FILL_HEADROOM_RATIO = 0.05;

const MARKER_COLUMN_WIDTH = 66;
const DRAG_STEP_ML = 5;
const PORTION_SNAP_RATIO = 0.035;
const GRID_GAP = 12;

// Les cards suivent la place disponible, mais sans jamais s'étirer au point
// d'écraser la ligne lait / note au-dessus et le volume total en dessous.
const CARD_MIN_HEIGHT = 72;
const CARD_MAX_HEIGHT = 104;

const MILK_TOP_COLOR = "#FFFDF4";
const MILK_GRADIENT = [MILK_TOP_COLOR, "#F7EFD6", "#F0E4C1"];

// Les deux vagues sont du lait : la vague arrière prend simplement le ton
// intermédiaire du dégradé pour rester lisible sans éclaircir la surface.
const MILK_SURFACE_COLOR = MILK_TOP_COLOR;
const MILK_SHADE_COLOR = MILK_GRADIENT[1];

// La surface est dessinée dans une boîte de 6 x amplitude : la ligne moyenne
// est au milieu, ce qui laisse de la marge aux crêtes quand elles grossissent.
const WAVE_BOX_RATIO = 6;
const MAX_SLOSH_SCALE = 1.7;
const SLOSH_VELOCITY_REFERENCE = 1500;

const LEVEL_SPRING = { damping: 17, stiffness: 120, mass: 0.85 };

export default function BottleFeedForm({
  value,
  onChange,
  onPressCapacity,
  onPressMilkType,
  onPressNote,
  gestureRef,
}) {
  const { t } = useTranslation();

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [viewMode, setViewMode] = useState("bottle");
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });

  const capacityMl =
    Number(value?.bottleCapacityMl) || DEFAULT_BOTTLE_CAPACITY_ML;
  const amountMl = getBottleEntryAmountMl(value);
  const fillRatio = getBottleFillRatio(value);
  const isExactAmountMode = Boolean(value?.isExactAmountMode);

  const bottleHeight = useMemo(() => {
    if (!stageSize.width || !stageSize.height) {
      return 0;
    }

    const widthLimit = Math.max(stageSize.width - MARKER_COLUMN_WIDTH * 2, 130);

    return Math.min(stageSize.height, widthLimit / BOTTLE_ASPECT_RATIO);
  }, [stageSize]);

  const geometry = useMemo(() => {
    const width = bottleHeight * BOTTLE_ASPECT_RATIO;
    const windowTop = bottleHeight * (GLASS_INSET.top + FILL_HEADROOM_RATIO);
    const windowHeight =
      bottleHeight *
      (1 - GLASS_INSET.top - FILL_HEADROOM_RATIO - GLASS_INSET.bottom);
    const waveAmplitude = clamp(width * 0.028, 3.5, 6);

    return {
      width,
      height: bottleHeight,
      windowTop,
      windowHeight,
      windowBottom: windowTop + windowHeight,
      sideInset: width * GLASS_INSET.side,
      cornerRadius: width * 0.09,
      waveAmplitude,
      waveBoxHeight: waveAmplitude * WAVE_BOX_RATIO,
    };
  }, [bottleHeight]);

  const waves = useMemo(() => {
    const innerWidth = Math.max(geometry.width - geometry.sideInset * 2, 1);

    return {
      innerWidth,
      back: buildWave({
        containerWidth: innerWidth,
        period: innerWidth * 0.62,
        amplitude: geometry.waveAmplitude * 0.75,
        boxHeight: geometry.waveBoxHeight,
      }),
      front: buildWave({
        containerWidth: innerWidth,
        period: innerWidth * 0.95,
        amplitude: geometry.waveAmplitude,
        boxHeight: geometry.waveBoxHeight,
      }),
    };
  }, [geometry]);

  const cardMetrics = useMemo(() => {
    const available = stageSize.height
      ? (stageSize.height - GRID_GAP) / 2
      : CARD_MIN_HEIGHT;

    const cardHeight = clamp(available, CARD_MIN_HEIGHT, CARD_MAX_HEIGHT);

    return {
      cardHeight,
      labelFontSize: clamp(cardHeight * 0.32, 18, 34),
      amountFontSize: clamp(cardHeight * 0.15, 12, 17),
    };
  }, [stageSize.height]);

  const fill = useSharedValue(fillRatio);
  const isDragging = useSharedValue(false);
  const slosh = useSharedValue(0);
  const frontPhase = useSharedValue(0);
  const backPhase = useSharedValue(0);

  // Le geste ne doit jamais être recréé en cours de route, sinon le
  // GestureDetector se réattache et le glissement devient saccadé : tout ce qui
  // change à chaque render passe donc par une ref ou une shared value.
  const latestRef = useRef({ entry: value, capacityMl, onChange });
  latestRef.current = { entry: value, capacityMl, onChange };

  const windowBottomValue = useSharedValue(0);
  const windowHeightValue = useSharedValue(0);
  const capacityValue = useSharedValue(capacityMl);

  useEffect(() => {
    windowBottomValue.value = geometry.windowBottom;
    windowHeightValue.value = geometry.windowHeight;
  }, [geometry, windowBottomValue, windowHeightValue]);

  useEffect(() => {
    capacityValue.value = capacityMl;
  }, [capacityMl, capacityValue]);

  const patchEntry = useCallback((patch) => {
    const { entry, onChange: handleChange } = latestRef.current;

    handleChange?.({ ...entry, ...patch });
  }, []);

  // Pendant le geste on ne remonte une valeur au parent que quand le palier de
  // 5 ml change : le liquide, lui, suit le doigt image par image.
  const handleDragAmount = useCallback(
    (nextAmountMl) => {
      const { capacityMl: currentCapacityMl } = latestRef.current;

      patchEntry({
        isExactAmountMode: false,
        portionId: null,
        fraction: clamp(nextAmountMl / currentCapacityMl, 0, 1),
      });
    },
    [patchEntry],
  );

  const commitDragRatio = useCallback(
    (ratio) => {
      const { capacityMl: currentCapacityMl } = latestRef.current;
      const safeRatio = clamp(ratio, 0, 1);

      const snappedPortion = BOTTLE_PORTIONS.find(
        (portion) =>
          Math.abs(portion.fraction - safeRatio) <= PORTION_SNAP_RATIO,
      );

      const nextRatio = snappedPortion
        ? snappedPortion.fraction
        : clamp(
            (Math.round((safeRatio * currentCapacityMl) / DRAG_STEP_ML) *
              DRAG_STEP_ML) /
              currentCapacityMl,
            0,
            1,
          );

      fill.value = withSpring(nextRatio, LEVEL_SPRING);

      patchEntry({
        isExactAmountMode: false,
        portionId: snappedPortion?.id ?? null,
        fraction: nextRatio,
      });
    },
    [fill, patchEntry],
  );

  const dragStep = useDerivedValue(
    () => Math.round((fill.value * capacityValue.value) / DRAG_STEP_ML),
    [],
  );

  useAnimatedReaction(
    () => dragStep.value,
    (current, previous) => {
      if (!isDragging.value || previous === null || current === previous) {
        return;
      }

      runOnJS(handleDragAmount)(current * DRAG_STEP_ML);
    },
    [],
  );

  // Synchronisation quand le niveau change ailleurs (marqueurs, cards,
  // capacité, saisie exacte) : jamais pendant un glissement.
  useEffect(() => {
    if (isDragging.value) {
      return;
    }

    fill.value = withSpring(fillRatio, LEVEL_SPRING);
  }, [fill, fillRatio, isDragging]);

  useEffect(() => {
    frontPhase.value = withRepeat(
      withTiming(1, { duration: 5200, easing: Easing.linear }),
      -1,
      false,
    );

    backPhase.value = withRepeat(
      withTiming(1, { duration: 7600, easing: Easing.linear }),
      -1,
      false,
    );

    return () => {
      cancelAnimation(frontPhase);
      cancelAnimation(backPhase);
    };
  }, [backPhase, frontPhase]);

  const panGesture = useMemo(() => {
    // La sheet reçoit cette ref via sa prop `waitFor` : son pan de contenu
    // attend que ce geste échoue. Résultat : glissement du lait sur le biberon,
    // fermeture par swipe partout ailleurs.
    const gesture = Gesture.Pan()
      .minDistance(0)
        .shouldCancelWhenOutside(false)
        .onBegin((event) => {
          if (windowHeightValue.value <= 0) {
            return;
          }

          isDragging.value = true;
          fill.value = clampRatio(
            (windowBottomValue.value - event.y) / windowHeightValue.value,
          );
        })
        .onUpdate((event) => {
          if (windowHeightValue.value <= 0) {
            return;
          }

          fill.value = clampRatio(
            (windowBottomValue.value - event.y) / windowHeightValue.value,
          );

          slosh.value = Math.min(
            Math.abs(event.velocityY) / SLOSH_VELOCITY_REFERENCE,
            1,
          );
        })
        .onFinalize(() => {
          if (!isDragging.value) {
            return;
          }

          isDragging.value = false;
          slosh.value = withTiming(0, { duration: 1100 });

          runOnJS(commitDragRatio)(fill.value);
        });

    return gestureRef ? gesture.withRef(gestureRef) : gesture;
  }, [
    commitDragRatio,
    fill,
    gestureRef,
    isDragging,
    slosh,
    windowBottomValue,
    windowHeightValue,
  ]);

  const liquidStyle = useAnimatedStyle(() => {
    const levelHeight = fill.value * geometry.windowHeight;

    return {
      height: levelHeight < 1 ? 0 : levelHeight + geometry.waveBoxHeight / 2,
    };
  });

  const frontWaveStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: -frontPhase.value * waves.front.period },
      { scaleY: 1 + slosh.value * (MAX_SLOSH_SCALE - 1) },
    ],
  }));

  const backWaveStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: (backPhase.value - 1) * waves.back.period },
      { scaleY: 1 + slosh.value * (MAX_SLOSH_SCALE - 1) * 0.7 },
    ],
  }));

  const handleSelectPortion = (portion) => {
    patchEntry({
      isExactAmountMode: false,
      portionId: portion.id,
      fraction: portion.fraction,
    });
  };

  const handleStageLayout = (event) => {
    const { width, height } = event.nativeEvent.layout;

    setStageSize((current) =>
      Math.abs(current.width - width) < 1 &&
      Math.abs(current.height - height) < 1
        ? current
        : { width, height },
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.viewSwitcher}>
          <Pressable
            onPress={() => setViewMode("bottle")}
            style={({ pressed }) => [
              styles.viewModeButton,
              viewMode === "bottle" && styles.viewModeButtonSelected,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name="water-outline"
              size={18}
              color={
                viewMode === "bottle" ? colors.primary : colors.textSecondary
              }
            />
          </Pressable>

          <Pressable
            onPress={() => setViewMode("simple")}
            style={({ pressed }) => [
              styles.viewModeButton,
              viewMode === "simple" && styles.viewModeButtonSelected,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name="keypad-outline"
              size={18}
              color={
                viewMode === "simple" ? colors.primary : colors.textSecondary
              }
            />
          </Pressable>
        </View>

        <View style={styles.capacitySection}>
          <View style={styles.capacityArea}>
            <Text style={styles.capacityLabel}>{t("Bottle capacity")}</Text>

            <Pressable
              onPress={() =>
                onPressCapacity?.({ currentCapacityMl: capacityMl })
              }
              style={({ pressed }) => [
                styles.capacityButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.capacityValue}>
                {formatBottleAmount(capacityMl)}
              </Text>

              <Ionicons
                name="chevron-down"
                size={15}
                color={colors.textSecondary}
              />
            </Pressable>
          </View>
        </View>
      </View>
      {!value?.isExactAmountMode ? (
        <View
          style={[
            styles.bottleActions,
            viewMode === "simple"
              ? styles.bottleActionsForCards
              : styles.bottleActionsForBottle,
          ]}
        >
          <Pressable
            onPress={() =>
              onPressMilkType?.({
                currentMilkType: value?.milkType ?? "formula",
              })
            }
            style={({ pressed }) => [
              styles.smallActionButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.smallActionValue}>
              {t(
                {
                  formula: "Formula",
                  breast_milk: "Breast milk",
                  mixed: "Mixed milk",
                  other: "Other milk",
                }[value?.milkType ?? "formula"],
              )}
            </Text>
            <Ionicons
              name="chevron-down"
              size={14}
              color={colors.textSecondary}
            />
          </Pressable>

          <Pressable
            onPress={onPressNote}
            style={({ pressed }) => [
              styles.noteActionButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.noteActionLabel}>
              {value?.note?.trim() ? t("Edit note") : t("Add a note")}
            </Text>

            {value?.note?.trim() ? <View style={styles.noteIndicator} /> : null}
          </Pressable>
        </View>
      ) : null}
      {!value?.isExactAmountMode ? (
        <View style={styles.stage} onLayout={handleStageLayout}>
          {viewMode === "bottle" ? (
            bottleHeight > 0 ? (
              <View style={styles.bottleRow}>
                <View style={styles.markerColumnSpacer} />

                <GestureDetector gesture={panGesture}>
                  <View
                    style={[
                      styles.bottleWrap,
                      { width: geometry.width, height: geometry.height },
                    ]}
                  >
                    <View
                      style={[
                        styles.liquidWindow,
                        {
                          top: geometry.windowTop,
                          left: geometry.sideInset,
                          right: geometry.sideInset,
                          height: geometry.windowHeight,
                          borderBottomLeftRadius: geometry.cornerRadius,
                          borderBottomRightRadius: geometry.cornerRadius,
                        },
                      ]}
                    >
                      <Animated.View style={[styles.liquid, liquidStyle]}>
                        <LinearGradient
                          colors={MILK_GRADIENT}
                          start={{ x: 0.1, y: 0 }}
                          end={{ x: 0.95, y: 1 }}
                          style={[
                            styles.liquidBody,
                            { top: geometry.waveBoxHeight - 1 },
                          ]}
                        />

                        <Animated.View
                          style={[
                            styles.waveLayer,
                            {
                              width: waves.back.width,
                              height: geometry.waveBoxHeight,
                            },
                            backWaveStyle,
                          ]}
                        >
                          <Svg
                            width={waves.back.width}
                            height={geometry.waveBoxHeight}
                          >
                            <Path d={waves.back.path} fill={MILK_SHADE_COLOR} />
                          </Svg>
                        </Animated.View>

                        <Animated.View
                          style={[
                            styles.waveLayer,
                            {
                              width: waves.front.width,
                              height: geometry.waveBoxHeight,
                            },
                            frontWaveStyle,
                          ]}
                        >
                          <Svg
                            width={waves.front.width}
                            height={geometry.waveBoxHeight}
                          >
                            <Path
                              d={waves.front.path}
                              fill={MILK_SURFACE_COLOR}
                            />
                          </Svg>
                        </Animated.View>

                        <LinearGradient
                          colors={[
                            "rgba(255, 255, 255, 0.5)",
                            "rgba(255, 255, 255, 0)",
                          ]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={[
                            styles.sheen,
                            {
                              top: geometry.waveBoxHeight,
                              left: waves.innerWidth * 0.1,
                              width: waves.innerWidth * 0.26,
                            },
                          ]}
                        />
                      </Animated.View>
                    </View>

                    <Image
                      source={BOTTLE_IMAGE}
                      resizeMode="stretch"
                      style={styles.bottleImage}
                    />
                  </View>
                </GestureDetector>

                <View
                  style={[styles.markerColumn, { height: geometry.height }]}
                  pointerEvents="box-none"
                >
                  {BOTTLE_PORTIONS.map((portion) => {
                    const isSelected =
                      !isExactAmountMode &&
                      Math.abs(fillRatio - portion.fraction) < 0.006;

                    const markerCenterY =
                      geometry.windowBottom -
                      portion.fraction * geometry.windowHeight;

                    return (
                      <Pressable
                        key={portion.id}
                        onPress={() => handleSelectPortion(portion)}
                        hitSlop={6}
                        style={({ pressed }) => [
                          styles.portionMarker,
                          { top: markerCenterY - 14 },
                          isSelected && styles.portionMarkerSelected,
                          pressed && styles.pressed,
                        ]}
                      >
                        <View
                          style={[
                            styles.markerConnector,
                            isSelected && styles.markerConnectorSelected,
                          ]}
                        />

                        <Text
                          style={[
                            styles.portionMarkerLabel,
                            isSelected && styles.portionMarkerLabelSelected,
                          ]}
                        >
                          {portion.label === "Full" ? t("Full") : portion.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null
          ) : (
            <View style={styles.portionsGrid}>
              {chunkPairs(BOTTLE_PORTIONS).map((row, rowIndex) => (
                <View
                  key={rowIndex}
                  style={[styles.portionsRow, { height: cardMetrics.cardHeight }]}
                >
                  {row.map((portion) => {
                    const isSelected =
                      !isExactAmountMode && value?.portionId === portion.id;

                    return (
                      <Pressable
                        key={portion.id}
                        onPress={() => handleSelectPortion(portion)}
                        style={({ pressed }) => [
                          styles.portionCard,
                          isSelected && styles.portionCardSelected,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.portionLabel,
                            { fontSize: cardMetrics.labelFontSize },
                            isSelected && styles.portionLabelSelected,
                          ]}
                        >
                          {portion.label === "Full" ? t("Full") : portion.label}
                        </Text>

                        <Text
                          style={[
                            styles.portionAmount,
                            { fontSize: cardMetrics.amountFontSize },
                            isSelected && styles.portionAmountSelected,
                          ]}
                        >
                          {formatBottleAmount(
                            getBottleAmountMl(capacityMl, portion.fraction),
                          )}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>
          )}
        </View>
      ) : null}

      <View style={styles.summary}>
        <View style={styles.summaryTexts}>
          <Text style={styles.summaryLabel}>{t("Total volume")}</Text>

          <Text style={styles.amountValue}>
            {amountMl ? formatBottleAmount(amountMl) : "—"}
          </Text>
        </View>

        <Pressable
          onPress={() => patchEntry({ isExactAmountMode: !isExactAmountMode })}
          style={({ pressed }) => [
            styles.exactAmountButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.exactAmountButtonLabel}>
            {isExactAmountMode
              ? t("Use bottle portions")
              : t("Enter exact amount")}
          </Text>
        </Pressable>
      </View>

      {isExactAmountMode ? (
        <View style={styles.exactAmountField}>
          <BottomSheetTextInput
            value={value?.exactAmount ?? ""}
            onChangeText={(nextValue) => patchEntry({ exactAmount: nextValue })}
            placeholder={t("Amount in ml")}
            placeholderTextColor={colors.textSecondary}
            keyboardType="decimal-pad"
            autoFocus
            style={styles.exactAmountInput}
          />

          <Text style={styles.unit}>ml</Text>
        </View>
      ) : null}

      <FeedingTimeRow
        isNow={!value?.isDateEdited}
        date={value?.feedingDate ?? new Date()}
        onDateChange={(nextDate) =>
          patchEntry({ feedingDate: nextDate, isDateEdited: true })
        }
      />
    </View>
  );
}

// Une vague large de plusieurs périodes identiques : on l'anime uniquement en
// translateX sur une période, la boucle est donc invisible et rien n'est
// recalculé image par image.
function buildWave({ containerWidth, period, amplitude, boxHeight }) {
  const periodCount = Math.ceil(containerWidth / period) + 1;
  const width = period * periodCount;
  const midY = boxHeight / 2;

  // Une quadratique n'atteint que la moitié de l'offset de son point de
  // contrôle : on double donc pour obtenir l'amplitude visée.
  const control = amplitude * 2;

  let path = `M 0 ${round(midY)}`;

  for (let index = 0; index < periodCount; index += 1) {
    path += ` q ${round(period / 4)} ${round(-control)} ${round(period / 2)} 0`;
    path += ` q ${round(period / 4)} ${round(control)} ${round(period / 2)} 0`;
  }

  path += ` L ${round(width)} ${round(boxHeight)} L 0 ${round(boxHeight)} Z`;

  return { path, width, period };
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function chunkPairs(items) {
  const rows = [];

  for (let index = 0; index < items.length; index += 2) {
    rows.push(items.slice(index, index + 2));
  }

  return rows;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function clampRatio(value) {
  "worklet";

  return Math.min(Math.max(value, 0), 1);
}

function createStyles(colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      gap: 16,
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 6,
    },

    topRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    viewSwitcher: {
      flexDirection: "row",
      gap: 5,
      padding: 4,
      borderRadius: 14,
      backgroundColor: colors.selectedBackground,
    },

    viewModeButton: {
      alignItems: "center",
      justifyContent: "center",
      width: 34,
      height: 32,
      borderRadius: 10,
    },

    viewModeButtonSelected: {
      backgroundColor: colors.white,
      shadowColor: colors.textPrimary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 5,
      elevation: 2,
    },

    capacityArea: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },

    capacityLabel: {
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 12,
      color: colors.textSecondary,
    },

    capacityButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingVertical: 8,
      paddingLeft: 11,
      paddingRight: 9,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 13,
      backgroundColor: colors.white,
    },

    capacityValue: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 13,
      color: colors.textPrimary,
    },

    // Toute la place restante entre l'en-tête et le bloc du bas.
    stage: {
      flex: 1,
      minHeight: 0,
      justifyContent: "center",
    },

    bottleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },

    markerColumnSpacer: {
      width: MARKER_COLUMN_WIDTH,
    },

    markerColumn: {
      position: "relative",
      width: MARKER_COLUMN_WIDTH,
    },

    bottleWrap: {
      position: "relative",
    },

    liquidWindow: {
      position: "absolute",
      overflow: "hidden",
    },

    liquid: {
      position: "absolute",
      right: 0,
      bottom: 0,
      left: 0,
      overflow: "hidden",
    },

    liquidBody: {
      position: "absolute",
      right: 0,
      bottom: 0,
      left: 0,
    },

    waveLayer: {
      position: "absolute",
      top: 0,
      left: 0,
    },

    sheen: {
      position: "absolute",
      bottom: 0,
      borderRadius: 999,
    },

    bottleImage: {
      width: "100%",
      height: "100%",
    },

    portionMarker: {
      position: "absolute",
      left: 14,
      right: 0,
      minHeight: 28,
      justifyContent: "center",
      paddingVertical: 5,
      paddingHorizontal: 8,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.white,
    },

    portionMarkerSelected: {
      borderColor: `${colors.primary}65`,
      backgroundColor: colors.selectedBackground,
    },

    markerConnector: {
      position: "absolute",
      left: -14,
      width: 14,
      height: 1,
      backgroundColor: colors.border,
    },

    markerConnectorSelected: {
      backgroundColor: `${colors.primary}80`,
    },

    portionMarkerLabel: {
      textAlign: "center",
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 12,
      color: colors.textSecondary,
    },

    portionMarkerLabelSelected: {
      color: colors.primary,
    },

    // Grille 2 x 2 qui occupe exactement la place laissée par le stage.
    // La grille est dimensionnée par son contenu (hauteur de card bornée) et
    // reste centrée dans la place libre, elle ne s'étire plus.
    portionsGrid: {
      flexGrow: 0,
      gap: GRID_GAP,
    },

    portionsRow: {
      flexDirection: "row",
      gap: GRID_GAP,
    },

    portionCard: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 2,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      backgroundColor: colors.white,
    },

    portionCardSelected: {
      borderColor: `${colors.primary}60`,
      backgroundColor: colors.selectedBackground,
    },

    portionLabel: {
      fontFamily: "PlusJakartaSans_700Bold",
      color: colors.textPrimary,
    },

    portionLabelSelected: {
      color: colors.primary,
    },

    portionAmount: {
      fontFamily: "PlusJakartaSans_500Medium",
      color: colors.textSecondary,
    },

    portionAmountSelected: {
      color: colors.primary,
    },

    summary: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
      flexShrink: 0,
    },

    summaryTexts: {
      gap: 2,
    },

    summaryLabel: {
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 12,
      color: colors.textSecondary,
    },

    amountValue: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 30,
      letterSpacing: -0.7,
      color: colors.textPrimary,
    },

    exactAmountButton: {
      paddingVertical: 6,
      paddingLeft: 12,
    },

    exactAmountButtonLabel: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 12,
      color: colors.primary,
    },

    exactAmountField: {
      flexDirection: "row",
      alignItems: "center",
      height: 54,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 17,
      backgroundColor: colors.white,
    },

    exactAmountInput: {
      flex: 1,
      paddingVertical: 0,
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 16,
      color: colors.textPrimary,
    },

    unit: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 14,
      color: colors.textSecondary,
    },

    pressed: {
      opacity: 0.78,
    },

    capacitySection: {
      alignItems: "flex-end",
    },

    milkTypeButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginTop: 5,
      paddingVertical: 2,
      paddingHorizontal: 4,
    },

    milkTypeValue: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 12,
      color: colors.primary,
    },

    bottleActions: {
      alignSelf: "flex-end",
      flexShrink: 0,
    },

    bottleActionsForBottle: {
      position: "absolute",
      top: 66,
      right: 20,
      gap: 11,
    },

    bottleActionsForCards: {
      flexDirection: "row",
      gap: 10,
      marginTop: -4,
      marginBottom: -4,
    },
    smallActionButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      minHeight: 32,
      paddingHorizontal: 10,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      backgroundColor: colors.white,
    },

    smallActionValue: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 12,
      color: colors.textPrimary,
    },

    noteActionButton: {
      alignItems: "center",
      justifyContent: "center",
      minHeight: 32,
      paddingHorizontal: 10,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      backgroundColor: colors.white,
    },

    noteActionLabel: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 12,
      color: colors.textPrimary,
    },

    noteIndicator: {
      width: 5,
      height: 5,
      borderRadius: 999,
      marginLeft: 2,
      backgroundColor: colors.primary,
    },
  });
}
