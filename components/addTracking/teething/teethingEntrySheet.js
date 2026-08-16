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

const BASE_CANVAS_SIZE = 1000;

/*
 * Les positions utilisent le même canevas logique que l’image de la bouche :
 * 1000 × 1000.
 *
 * Il faudra éventuellement ajuster légèrement x, y, width et height après
 * avoir rogné définitivement tes PNG.
 *
 */

const MOUTH_LAYOUT = {
  widthPercent: "65%",
  maxWidth: 250,
  marginTop: 4,
  marginBottom: 18,
};

const TEETH = [
  // DENTS SUPÉRIEURES — CÔTÉ GAUCHE

  {
    id: "upperLeftSecondMolar",
    type: "secondMolar",
    x: 187,
    y: 360,
    width: 113,
    height: 111,
    rotation: "-16deg",
    mirrored: false,
  },
  {
    id: "upperLeftFirstMolar",
    type: "firstMolar",
    x: 214,
    y: 265,
    width: 108,
    height: 105,
    rotation: "-20deg",
    mirrored: false,
  },
  {
    id: "upperLeftCanine",
    type: "canine",
    x: 267,
    y: 179,
    width: 95,
    height: 111,
    rotation: "-23deg",
    mirrored: false,
  },
  {
    id: "upperLeftLateralIncisor",
    type: "lateralIncisor",
    x: 338,
    y: 121,
    width: 91,
    height: 105,
    rotation: "-13deg",
    mirrored: false,
  },
  {
    id: "upperLeftCentralIncisor",
    type: "centralIncisor",
    x: 418,
    y: 101,
    width: 89,
    height: 102,
    rotation: "-2deg",
    mirrored: false,
  },

  // DENTS SUPÉRIEURES — CÔTÉ DROIT

  {
    id: "upperRightCentralIncisor",
    type: "centralIncisor",
    x: 503,
    y: 101,
    width: 89,
    height: 102,
    rotation: "2deg",
    mirrored: true,
  },
  {
    id: "upperRightLateralIncisor",
    type: "lateralIncisor",
    x: 581,
    y: 121,
    width: 91,
    height: 105,
    rotation: "13deg",
    mirrored: true,
  },
  {
    id: "upperRightCanine",
    type: "canine",
    x: 647,
    y: 179,
    width: 95,
    height: 111,
    rotation: "23deg",
    mirrored: true,
  },
  {
    id: "upperRightFirstMolar",
    type: "firstMolar",
    x: 690,
    y: 265,
    width: 108,
    height: 105,
    rotation: "20deg",
    mirrored: true,
  },
  {
    id: "upperRightSecondMolar",
    type: "secondMolar",
    x: 713,
    y: 360,
    width: 113,
    height: 111,
    rotation: "16deg",
    mirrored: true,
  },

  // DENTS INFÉRIEURES — CÔTÉ GAUCHE

  {
    id: "lowerLeftSecondMolar",
    type: "secondMolar",
    x: 195,
    y: 570,
    width: 112,
    height: 112,
    rotation: "9deg",
    mirrored: false,
  },
  {
    id: "lowerLeftFirstMolar",
    type: "firstMolar",
    x: 226,
    y: 663,
    width: 106,
    height: 108,
    rotation: "18deg",
    mirrored: false,
  },
  {
    id: "lowerLeftCanine",
    type: "canine",
    x: 287,
    y: 742,
    width: 91,
    height: 107,
    rotation: "24deg",
    mirrored: false,
  },
  {
    id: "lowerLeftLateralIncisor",
    type: "lateralIncisor",
    x: 357,
    y: 790,
    width: 84,
    height: 103,
    rotation: "13deg",
    mirrored: false,
  },
  {
    id: "lowerLeftCentralIncisor",
    type: "centralIncisor",
    x: 424,
    y: 808,
    width: 78,
    height: 99,
    rotation: "2deg",
    mirrored: false,
  },

  // DENTS INFÉRIEURES — CÔTÉ DROIT

  {
    id: "lowerRightCentralIncisor",
    type: "centralIncisor",
    x: 502,
    y: 808,
    width: 78,
    height: 99,
    rotation: "-2deg",
    mirrored: true,
  },
  {
    id: "lowerRightLateralIncisor",
    type: "lateralIncisor",
    x: 563,
    y: 790,
    width: 84,
    height: 103,
    rotation: "-13deg",
    mirrored: true,
  },
  {
    id: "lowerRightCanine",
    type: "canine",
    x: 626,
    y: 742,
    width: 91,
    height: 107,
    rotation: "-24deg",
    mirrored: true,
  },
  {
    id: "lowerRightFirstMolar",
    type: "firstMolar",
    x: 676,
    y: 663,
    width: 106,
    height: 108,
    rotation: "-18deg",
    mirrored: true,
  },
  {
    id: "lowerRightSecondMolar",
    type: "secondMolar",
    x: 703,
    y: 570,
    width: 112,
    height: 112,
    rotation: "-9deg",
    mirrored: true,
  },
];

/*
 * Ces chemins servent uniquement à créer le contour coloré de sélection.
 * Chaque chemin est dessiné dans un viewBox 100 × 120.
 */
const TOOTH_OUTLINE_PATHS = {
  centralIncisor:
    "M18 8 Q50 1 82 8 Q91 12 89 35 L84 88 Q81 109 50 114 Q19 109 16 88 L11 35 Q9 12 18 8 Z",

  lateralIncisor:
    "M24 7 Q51 1 77 10 Q86 17 83 39 L78 88 Q75 108 51 114 Q26 109 22 88 L16 39 Q13 16 24 7 Z",

  canine:
    "M25 8 Q51 1 75 10 Q84 18 80 42 Q76 73 68 92 Q60 107 50 115 Q39 106 31 92 Q23 73 19 42 Q16 18 25 8 Z",

  firstMolar:
    "M13 16 Q24 4 40 10 Q50 3 61 10 Q76 3 87 16 Q93 25 89 49 L85 88 Q82 104 68 109 Q58 115 49 108 Q38 115 28 109 Q15 104 12 88 L8 49 Q5 25 13 16 Z",

  secondMolar:
    "M10 16 Q22 3 37 10 Q49 2 61 10 Q76 2 90 16 Q96 26 92 51 L89 87 Q86 103 74 109 Q64 115 52 109 Q42 116 31 109 Q16 104 12 87 L8 51 Q4 26 10 16 Z",
};

function ToothSlot({
  tooth,
  scale,
  isErupted,
  isSelected,
  selectedColor,
  onPress,
}) {
  const animatedScale = useRef(new Animated.Value(isErupted ? 1 : 0)).current;

  const animatedOpacity = useRef(new Animated.Value(isErupted ? 1 : 0)).current;

  const [renderSelectedTooth, setRenderSelectedTooth] = useState(isSelected);

  useEffect(() => {
    if (isErupted) {
      animatedScale.setValue(1);
      animatedOpacity.setValue(1);
      return;
    }

    if (isSelected) {
      setRenderSelectedTooth(true);

      animatedScale.stopAnimation();
      animatedOpacity.stopAnimation();

      animatedScale.setValue(0.72);
      animatedOpacity.setValue(0);

      Animated.parallel([
        Animated.spring(animatedScale, {
          toValue: 1,
          damping: 11,
          stiffness: 220,
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
      Animated.parallel([
        Animated.timing(animatedScale, {
          toValue: 0.72,
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
    isSelected,
    isErupted,
    renderSelectedTooth,
    animatedOpacity,
    animatedScale,
  ]);

  const shouldRenderTooth = isErupted || renderSelectedTooth;

  const width = tooth.width * scale;
  const height = tooth.height * scale;

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={tooth.id}
      accessibilityState={{
        checked: isErupted || isSelected,
        disabled: isErupted,
      }}
      disabled={isErupted}
      hitSlop={6}
      onPress={() => onPress(tooth.id)}
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
      {shouldRenderTooth && (
        <Animated.View
          style={{
            width: "100%",
            height: "100%",
            opacity: animatedOpacity,
            transform: [{ scale: animatedScale }],
          }}
        >
          <Image
            source={TOOTH_ILLUSTRATIONS[tooth.type]}
            resizeMode="contain"
            style={[styles.toothImage, tooth.mirrored && styles.mirroredTooth]}
          />

          {renderSelectedTooth && !isErupted && (
            <>
              <Svg
                pointerEvents="none"
                viewBox="0 0 100 120"
                preserveAspectRatio="none"
                style={StyleSheet.absoluteFill}
              >
                <Path
                  d={TOOTH_OUTLINE_PATHS[tooth.type]}
                  fill="transparent"
                  stroke={selectedColor}
                  strokeWidth={3}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </Svg>

              <View
                style={[
                  styles.checkBadge,
                  {
                    width: Math.max(19, 23 * scale),
                    height: Math.max(19, 23 * scale),
                    borderRadius: Math.max(10, 12 * scale),
                    backgroundColor: selectedColor,
                  },
                ]}
              >
                <Ionicons
                  name="checkmark"
                  size={Math.max(12, 14 * scale)}
                  color="#FFFFFF"
                />
              </View>
            </>
          )}
        </Animated.View>
      )}
    </Pressable>
  );
}

function ResponsiveTeethingMouth({
  eruptedTeeth,
  selectedTeeth,
  onToggleTooth,
  selectedColor,
}) {
  const [canvasSize, setCanvasSize] = useState(0);

  const scale = canvasSize > 0 ? canvasSize / BASE_CANVAS_SIZE : 0;

  return (
    <View
      onLayout={(event) => {
        const nextWidth = event.nativeEvent.layout.width;

        setCanvasSize((currentWidth) =>
          Math.abs(currentWidth - nextWidth) > 1 ? nextWidth : currentWidth,
        );
      }}
      style={styles.mouthCanvas}
    >
      {canvasSize > 0 && (
        <>
          <Image
            source={mouthBackground}
            resizeMode="contain"
            style={StyleSheet.absoluteFill}
          />

          {TEETH.map((tooth) => (
            <ToothSlot
              key={tooth.id}
              tooth={tooth}
              scale={scale}
              isErupted={eruptedTeeth.includes(tooth.id)}
              isSelected={selectedTeeth.includes(tooth.id)}
              selectedColor={selectedColor}
              onPress={onToggleTooth}
            />
          ))}
        </>
      )}
    </View>
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
  }, [canSave, selectedTeeth, teethingDate, note, onSave]);

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
              <ResponsiveTeethingMouth
                eruptedTeeth={eruptedTeeth}
                selectedTeeth={selectedTeeth}
                onToggleTooth={handleToggleTooth}
                selectedColor={colors.primary}
              />

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
    width: MOUTH_LAYOUT.widthPercent,
    maxWidth: MOUTH_LAYOUT.maxWidth,
    aspectRatio: 1,
    alignSelf: "center",
    marginTop: MOUTH_LAYOUT.marginTop,
    marginBottom: MOUTH_LAYOUT.marginBottom,
  },
  toothImage: {
    width: "100%",
    height: "100%",
  },

  mirroredTooth: {
    transform: [{ scaleX: -1 }],
  },

  checkBadge: {
    position: "absolute",
    right: -4,
    bottom: -4,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
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

    fields: {
      gap: 12,
      marginTop: 4,
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
