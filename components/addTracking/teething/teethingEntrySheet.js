import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Path } from "react-native-svg";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";

import PrimaryButton from "../../../components/ui/PrimaryButton.js";
import DateTimeRow from "../../../components/addTracking/DateTimeRow.js";
import NoteSheet from "../../../screens/addTracking/Feeding/NoteSheet.js";
import { useThemeColors } from "../../../theme/useThemeColors.js";

const mouthBackground = require("../../../assets/illustrations/tracking/teething/mouth.png");

const TOOTH_ILLUSTRATIONS = {
  centralIncisor: require("../../../assets/illustrations/tracking/teething/centralIncisor.png"),
  lateralIncisor: require("../../../assets/illustrations/tracking/teething/lateralIncisor.png"),
  canine: require("../../../assets/illustrations/tracking/teething/canine.png"),
  firstMolar: require("../../../assets/illustrations/tracking/teething/firstMolar.png"),
  secondMolar: require("../../../assets/illustrations/tracking/teething/secondMolar.png"),
};

const TOOTH_ALPHA_BOUNDS = {
  centralIncisor: {
    x: 119,
    y: 70,
    width: 261,
    height: 337,
  },

  lateralIncisor: {
    x: 140,
    y: 65,
    width: 214,
    height: 367,
  },

  canine: {
    x: 150,
    y: 63,
    width: 199,
    height: 348,
  },

  firstMolar: {
    x: 88,
    y: 103,
    width: 326,
    height: 298,
  },

  secondMolar: {
    x: 60,
    y: 41,
    width: 382,
    height: 410,
  },
};

const BASE_CANVAS_SIZE = 1000;
const TOOTH_ASSET_SIZE = 500;

const TOOTH_OUTLINE_PATHS = {
  centralIncisor:
    "M243 69.8 L300 73.5 L328 80.4 L346 88.4 L359.2 99 L369.7 115 L374.5 129 L378.5 154 L378.5 195 L371.2 253 L356.7 316 L341.7 361 L331 379.6 L314 393.5 L294 401.2 L270 405.2 L232 405.6 L203 401.2 L181 392.2 L163.4 376 L151.8 352 L137.5 305 L124.5 243 L119.8 205 L120.5 143 L126.8 118 L137.8 100 L153 87.8 L175 78.8 L205 72.4 Z",

  lateralIncisor:
    "M259 64.8 L287 65.8 L309 71.4 L324 79.4 L335 90.2 L342.6 103 L348.5 121 L352.5 149 L353.6 183 L350.5 232 L342.5 284 L325.6 357 L311.5 398 L300 414.6 L289 423.5 L274 429.5 L252 431.6 L230 428.5 L214 422.2 L197.4 408 L186.8 390 L168.8 333 L153.8 269 L141.5 196 L139.8 160 L142.5 136 L148.5 117 L155.4 105 L166 93.8 L187 80.8 L209 72.8 Z",

  canine:
    "M252 62.8 L298 68.5 L312 73.2 L327 82.8 L335.2 93 L342.6 110 L347.8 151 L345.2 201 L339.2 248 L331.5 281 L315.5 330 L300.5 364 L279.5 395 L262 407.6 L247 410.5 L231 405.6 L212.4 388 L197.5 364 L181.8 328 L168.8 289 L158.4 245 L151.8 192 L149.4 150 L151.8 126 L157.4 104 L163.8 91 L172.2 82 L184 74.5 L198 69.8 L226 64.5 Z",

  firstMolar:
    "M162 103.8 L187 103.5 L255 111.4 L314 104.4 L347 104.4 L376 113.2 L387 120.8 L396.2 131 L405.6 150 L412.2 184 L412.6 224 L408.8 259 L398.2 311 L385.5 349 L373.5 371 L356 388.5 L347 393.5 L333 396.6 L322 396.5 L301 389.8 L292 389.6 L260 400.5 L242 399.5 L212 389.5 L181 396.5 L166 396.5 L146 389.5 L136 382.2 L125.4 370 L110.8 341 L95.8 286 L88.5 233 L88.5 185 L97.8 147 L111.8 125 L133 110.4 Z",

  secondMolar:
    "M164 41.8 L197 42.5 L254 54.2 L281 52.7 L330 44.8 L362 46.8 L379 52.4 L396 62.8 L410.2 76 L423.2 95 L434.5 123 L440.8 154 L440.6 194 L433.6 242 L410.5 363 L401.6 396 L386.6 422 L376 432.6 L364 440.2 L348 445.5 L336 445.5 L305 433.8 L297 433.6 L286 436.8 L267 447.2 L248 450.2 L234 447.5 L213 436.6 L203 434.2 L171 445.5 L155 445.5 L142 441.2 L130.2 434 L117.7 422 L108.2 408 L96.5 377 L66.8 243 L59.8 185 L61.8 150 L72.5 112 L81.8 93 L92.4 78 L105.7 65 L123 53.5 L144 45.5 Z",
};

/*
 * Les positions sont exprimées dans un canevas logique de 1000 × 1000.
 *
 * Ce sont uniquement ces valeurs qu’il faudra ajuster :
 * - x : horizontal ;
 * - y : vertical ;
 * - width : largeur ;
 * - height : hauteur ;
 * - rotation : inclinaison.
 */
const TEETH = [
  // Supérieures gauches

  {
    id: "upperLeftSecondMolar",
    type: "secondMolar",
    x: 199,
    y: 366,
    width: 120,
    height: 111,
    rotation: "-75deg",
    mirrored: false,
  },
  {
    id: "upperLeftFirstMolar",
    type: "firstMolar",
    x: 210,
    y: 255,
    width: 160,
    height: 140,
    rotation: "-70deg",
    mirrored: false,
  },
  {
    id: "upperLeftCanine",
    type: "canine",
    x: 260,
    y: 168,
    width: 150,
    height: 150,
    rotation: "-45deg",
    mirrored: false,
  },
  {
    id: "upperLeftLateralIncisor",
    type: "lateralIncisor",
    x: 320,
    y: 121,
    width: 140,
    height: 140,
    rotation: "-18deg",
    mirrored: false,
  },
  {
    id: "upperLeftCentralIncisor",
    type: "centralIncisor",
    x: 390,
    y: 90,
    width: 140,
    height: 140,
    rotation: "-2deg",
    mirrored: false,
  },

  // Supérieures droites

  {
    id: "upperRightCentralIncisor",
    type: "centralIncisor",
    x: 470,
    y: 90,
    width: 140,
    height: 140,
    rotation: "2deg",
    mirrored: true,
  },
  {
    id: "upperRightLateralIncisor",
    type: "lateralIncisor",
    x: 545,
    y: 121,
    width: 140,
    height: 140,
    rotation: "18deg",
    mirrored: true,
  },
  {
    id: "upperRightCanine",
    type: "canine",
    x: 590,
    y: 165,
    width: 150,
    height: 150,
    rotation: "45deg",
    mirrored: true,
  },
  {
    id: "upperRightFirstMolar",
    type: "firstMolar",
    x: 637,
    y: 250,
    width: 160,
    height: 140,
    rotation: "70deg",
    mirrored: true,
  },
  {
    id: "upperRightSecondMolar",
    type: "secondMolar",
    x: 685,
    y: 370,
    width: 120,
    height: 111,
    rotation: "75deg",
    mirrored: true,
  },

  // Inférieures gauches

  {
    id: "lowerLeftSecondMolar",
    type: "secondMolar",
    x: 200,
    y: 565,
    width: 120,
    height: 111,
    rotation: "-100deg",
    mirrored: false,
  },
  {
    id: "lowerLeftFirstMolar",
    type: "firstMolar",
    x: 215,
    y: 650,
    width: 160,
    height: 140,
    rotation: "-120deg",
    mirrored: false,
  },
  {
    id: "lowerLeftCanine",
    type: "canine",
    x: 285,
    y: 705,
    width: 150,
    height: 150,
    rotation: "-130deg",
    mirrored: false,
  },
  {
    id: "lowerLeftLateralIncisor",
    type: "lateralIncisor",
    x: 330,
    y: 760,
    width: 140,
    height: 140,
    rotation: "-150deg",
    mirrored: false,
  },
  {
    id: "lowerLeftCentralIncisor",
    type: "centralIncisor",
    x: 395,
    y: 780,
    width: 135,
    height: 135,
    rotation: "184deg",
    mirrored: false,
  },

  // Inférieures droites

  {
    id: "lowerRightCentralIncisor",
    type: "centralIncisor",
    x: 470,
    y: 780,
    width: 135,
    height: 135,
    rotation: "-184deg",
    mirrored: true,
  },
  {
    id: "lowerRightLateralIncisor",
    type: "lateralIncisor",
    x: 525,
    y: 760,
    width: 140,
    height: 140,
    rotation: "160deg",
    mirrored: true,
  },
  {
    id: "lowerRightCanine",
    type: "canine",
    x: 565,
    y: 705,
    width: 150,
    height: 150,
    rotation: "130deg",
    mirrored: true,
  },
  {
    id: "lowerRightFirstMolar",
    type: "firstMolar",
    x: 630,
    y: 650,
    width: 160,
    height: 140,
    rotation: "120deg",
    mirrored: true,
  },
  {
    id: "lowerRightSecondMolar",
    type: "secondMolar",
    x: 675,
    y: 565,
    width: 120,
    height: 111,
    rotation: "100deg",
    mirrored: true,
  },
];

function ToothSlot({ tooth, scale, isErupted, isSelected, selectedColor }) {
  const animatedScale = useRef(new Animated.Value(isErupted ? 1 : 0)).current;

  const animatedOpacity = useRef(new Animated.Value(isErupted ? 1 : 0)).current;

  const [renderSelectedTooth, setRenderSelectedTooth] = useState(isSelected);

  useEffect(() => {
    if (isErupted) {
      setRenderSelectedTooth(false);
      animatedScale.setValue(1);
      animatedOpacity.setValue(1);
      return;
    }

    if (isSelected) {
      setRenderSelectedTooth(true);

      animatedScale.stopAnimation();
      animatedOpacity.stopAnimation();

      animatedScale.setValue(0.74);
      animatedOpacity.setValue(0);

      Animated.parallel([
        Animated.spring(animatedScale, {
          toValue: 1,
          damping: 12,
          stiffness: 230,
          mass: 0.7,
          useNativeDriver: true,
        }),

        Animated.timing(animatedOpacity, {
          toValue: 1,
          duration: 130,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();

      return;
    }

    if (renderSelectedTooth) {
      animatedScale.stopAnimation();
      animatedOpacity.stopAnimation();

      Animated.parallel([
        Animated.timing(animatedScale, {
          toValue: 0.74,
          duration: 140,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),

        Animated.timing(animatedOpacity, {
          toValue: 0,
          duration: 120,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          setRenderSelectedTooth(false);
        }
      });
    }
  }, [
    animatedOpacity,
    animatedScale,
    isErupted,
    isSelected,
    renderSelectedTooth,
  ]);

  const shouldRenderTooth = isErupted || renderSelectedTooth;

  if (!shouldRenderTooth) {
    return null;
  }

  const width = tooth.width * scale;
  const height = tooth.height * scale;

  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: tooth.x * scale,
        top: tooth.y * scale,
        width,
        height,
        transform: [{ rotate: tooth.rotation }],
        zIndex: isSelected ? 5 : isErupted ? 3 : 2,
      }}
    >
      <Animated.View
        style={[
          styles.animatedTooth,
          {
            opacity: animatedOpacity,
            transform: [{ scale: animatedScale }],
          },
        ]}
      >
        <View
          style={[
            styles.toothVisual,
            tooth.mirrored && styles.toothVisualMirrored,
          ]}
        >
          <Image
            source={TOOTH_ILLUSTRATIONS[tooth.type]}
            resizeMode="contain"
            style={styles.toothImage}
          />

          {renderSelectedTooth && !isErupted ? (
            <Svg
              pointerEvents="none"
              viewBox="0 0 500 500"
              preserveAspectRatio="xMidYMid meet"
              style={StyleSheet.absoluteFillObject}
            >
              <Path
                d={TOOTH_OUTLINE_PATHS[tooth.type]}
                fill="none"
                stroke={selectedColor}
                strokeWidth={7}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </Svg>
          ) : null}
        </View>
      </Animated.View>
    </View>
  );
}

function findClosestTooth({ locationX, locationY, scale }) {
  let closestTooth = null;
  let closestScore = Number.POSITIVE_INFINITY;

  TEETH.forEach((tooth) => {
    const bounds = TOOTH_ALPHA_BOUNDS[tooth.type];

    /*
     * Centre réel de la matière visible à l’intérieur du PNG.
     */
    const centerX =
      (tooth.x +
        tooth.width * ((bounds.x + bounds.width / 2) / TOOTH_ASSET_SIZE)) *
      scale;

    const centerY =
      (tooth.y +
        tooth.height * ((bounds.y + bounds.height / 2) / TOOTH_ASSET_SIZE)) *
      scale;

    /*
     * Dimensions visibles de la dent à l’écran.
     */
    const visibleWidth =
      tooth.width * (bounds.width / TOOTH_ASSET_SIZE) * scale;

    const visibleHeight =
      tooth.height * (bounds.height / TOOTH_ASSET_SIZE) * scale;

    /*
     * Zone tactile minimale d’environ 40 px.
     * Les zones peuvent se croiser, mais ce n’est plus un problème :
     * la dent mathématiquement la plus proche sera retenue.
     */
    const radiusX = Math.max(20, visibleWidth / 2 + 9);

    const radiusY = Math.max(20, visibleHeight / 2 + 9);

    const distanceX = locationX - centerX;
    const distanceY = locationY - centerY;

    /*
     * Distance elliptique normalisée.
     * Une valeur inférieure à 1 signifie que le toucher est
     * à l’intérieur de la zone estimée de la dent.
     */
    const score =
      (distanceX * distanceX) / (radiusX * radiusX) +
      (distanceY * distanceY) / (radiusY * radiusY);

    if (score < closestScore) {
      closestScore = score;
      closestTooth = tooth;
    }
  });

  /*
   * Évite qu’un toucher au centre de la langue sélectionne une dent.
   * 1.35 permet une légère tolérance autour de chaque illustration.
   */
  if (closestScore > 1.35) {
    return null;
  }

  return closestTooth;
}

function ResponsiveTeethingMouth({
  eruptedTeeth,
  selectedTeeth,
  onToggleTooth,
  selectedColor,
}) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const canvasSize = Math.round(
    Math.min(screenWidth * 1.05, screenHeight * 1.0, 450),
  );

  const scale = canvasSize / BASE_CANVAS_SIZE;

  const handleMouthPress = useCallback(
    (event) => {
      const { locationX, locationY } = event.nativeEvent;

      const touchedTooth = findClosestTooth({
        locationX,
        locationY,
        scale,
      });

      if (!touchedTooth) {
        return;
      }

      onToggleTooth(touchedTooth.id);
    },
    [onToggleTooth, scale],
  );

  return (
    <Pressable
      accessibilityRole="group"
      accessibilityLabel="Select a tooth"
      onPress={handleMouthPress}
      style={[
        styles.mouthCanvas,
        {
          width: canvasSize,
          height: canvasSize,
        },
      ]}
    >
      <Image
        pointerEvents="none"
        source={mouthBackground}
        resizeMode="contain"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: canvasSize,
          height: canvasSize,
        }}
      />

      {TEETH.map((tooth) => (
        <ToothSlot
          key={tooth.id}
          tooth={tooth}
          scale={scale}
          isErupted={eruptedTeeth.includes(tooth.id)}
          isSelected={selectedTeeth.includes(tooth.id)}
          selectedColor={selectedColor}
        />
      ))}
    </Pressable>
  );
}

const TeethingEntrySheet = forwardRef(function TeethingEntrySheet(
  { childName, eruptedTeeth = [], onSave },
  ref,
) {
  const { t } = useTranslation();
  const colors = useThemeColors();

  const modalRef = useRef(null);
  const noteSheetRef = useRef(null);

  const dynamicStyles = useMemo(() => createDynamicStyles(colors), [colors]);

  const snapPoints = useMemo(() => ["92%"], []);

  const [selectedTeeth, setSelectedTeeth] = useState([]);
  const [teethingDate, setTeethingDate] = useState(new Date());
  const [isTeethingDateToday, setIsTeethingDateToday] = useState(true);
  const [note, setNote] = useState("");

  const canSave = selectedTeeth.length > 0;

  const resetForm = useCallback(() => {
    setSelectedTeeth([]);
    setTeethingDate(new Date());
    setIsTeethingDateToday(true);
    setNote("");
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

  const handleToggleTooth = useCallback(
    (toothId) => {
      if (eruptedTeeth.includes(toothId)) {
        return;
      }

      Haptics.selectionAsync().catch(() => {});

      setSelectedTeeth((currentTeeth) => {
        if (currentTeeth.includes(toothId)) {
          return currentTeeth.filter((id) => id !== toothId);
        }

        return [...currentTeeth, toothId];
      });
    },
    [eruptedTeeth],
  );

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
      type: "teething",
      teeth: selectedTeeth,
      date: teethingDate,
      note: note.trim() || null,
    });

    modalRef.current?.dismiss();
  }, [canSave, note, onSave, selectedTeeth, teethingDate]);

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
        backgroundStyle={dynamicStyles.sheetBackground}
        handleIndicatorStyle={dynamicStyles.handle}
        stackBehavior="push"
        onDismiss={resetForm}
      >
        <View style={dynamicStyles.content}>
          <View style={dynamicStyles.header}>
            <Text style={dynamicStyles.title}>{t("Add teething")}</Text>

            <Text style={dynamicStyles.subtitle}>
              {t("Select the teeth that have appeared.")}
            </Text>
          </View>

          <View style={dynamicStyles.scrollArea}>
            <BottomSheetScrollView
              style={dynamicStyles.scrollView}
              contentContainerStyle={dynamicStyles.scrollContent}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
            >
              <View style={dynamicStyles.mouthSection}>
                <ResponsiveTeethingMouth
                  eruptedTeeth={eruptedTeeth}
                  selectedTeeth={selectedTeeth}
                  onToggleTooth={handleToggleTooth}
                  selectedColor={colors.primary}
                />
              </View>

              <View style={dynamicStyles.fields}>
                <DateTimeRow
                  value={teethingDate}
                  isNow={isTeethingDateToday}
                  onChange={(nextDate) => {
                    setTeethingDate(nextDate);
                    setIsTeethingDateToday(false);
                  }}
                  title="Teething date"
                  mode="date"
                  emptyLabel="Today"
                  maximumDate={new Date()}
                />

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={note ? t("Edit note") : t("Add a note")}
                  onPress={handleOpenNote}
                  style={({ pressed }) => [
                    dynamicStyles.noteRow,
                    pressed && dynamicStyles.pressed,
                  ]}
                >
                  <View style={dynamicStyles.noteIcon}>
                    <Ionicons
                      name="document-text-outline"
                      size={20}
                      color={colors.primary}
                    />
                  </View>

                  <View style={dynamicStyles.noteContent}>
                    <Text style={dynamicStyles.noteTitle}>
                      {note ? t("Edit note") : t("Add a note")}
                    </Text>

                    <Text
                      numberOfLines={2}
                      style={[
                        dynamicStyles.noteDescription,
                        note && dynamicStyles.noteDescriptionFilled,
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
            </BottomSheetScrollView>
          </View>

          <View style={dynamicStyles.footer}>
            <PrimaryButton
              title={t("Save teething")}
              onPress={handleSave}
              disabled={!canSave}
            />
          </View>
        </View>
      </BottomSheetModal>

      <NoteSheet
        ref={noteSheetRef}
        title={t("Teething note")}
        description={t("Add an optional detail about these new teeth")}
        placeholder={t("For example, when you first noticed them")}
        onSave={setNote}
      />
    </>
  );
});

export default TeethingEntrySheet;

const styles = StyleSheet.create({
  mouthCanvas: {
    position: "relative",
    alignSelf: "center",
    overflow: "visible",
  },

  animatedTooth: {
    width: "100%",
    height: "100%",
  },

  toothVisual: {
    ...StyleSheet.absoluteFillObject,
  },

  toothVisualMirrored: {
    transform: [{ scaleX: -1 }],
  },

  toothImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
});

function createDynamicStyles(colors) {
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
      paddingBottom: 8,
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
      paddingTop: 8,
      paddingBottom: 24,
    },

    mouthSection: {
      width: "100%",
      alignItems: "center",
      justifyContent: "center",
      paddingTop: 4,
      paddingBottom: 18,
    },

    fields: {
      width: "100%",
      gap: 12,
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
      opacity: 0.72,
    },
  });
}
