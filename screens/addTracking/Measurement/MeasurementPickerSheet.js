import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Keyboard, Pressable, StyleSheet, Text, View } from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetTextInput,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";

import PrimaryButton from "../../../components/ui/PrimaryButton.js";
import { useThemeColors } from "../../../theme/useThemeColors.js";

/*
 * Deux décimales pour toutes les mesures : c'est ce que la saisie autorise,
 * donc arrondir plus court afficherait une valeur différente de celle tapée.
 */
const MAX_DECIMALS = 2;

const MEASUREMENT_CONFIG = {
  weight: {
    title: "Weight",
    unit: "kg",
    step: 0.01,
    decimals: MAX_DECIMALS,
    placeholder: "0.00",
  },

  height: {
    title: "Height",
    unit: "cm",
    step: 0.1,
    decimals: MAX_DECIMALS,
    placeholder: "0.00",
  },

  headCircumference: {
    title: "Head circumference",
    unit: "cm",
    step: 0.1,
    decimals: MAX_DECIMALS,
    placeholder: "0.00",
  },
};

function parseMeasurement(value) {
  const parsedValue = Number(String(value).trim().replace(",", "."));

  return Number.isFinite(parsedValue) ? parsedValue : null;
}

/*
 * Le pavé décimal laisse taper autant de chiffres et de séparateurs que
 * voulu : on ne garde que des chiffres, un seul séparateur et deux décimales.
 */
function sanitizeMeasurementInput(text) {
  const [integerPart, ...decimalParts] = String(text)
    .replace(/[^0-9.,]/g, "")
    .replace(/,/g, ".")
    .split(".");

  if (!decimalParts.length) {
    return integerPart;
  }

  const decimals = decimalParts.join("").slice(0, MAX_DECIMALS);

  return `${integerPart || "0"}.${decimals}`;
}

function formatMeasurement(value, decimals) {
  if (value === null || value === undefined) {
    return "";
  }

  return Number(value).toFixed(decimals);
}

function roundMeasurement(value, decimals) {
  return Number(Number(value).toFixed(decimals));
}

const MeasurementPickerSheet = forwardRef(function MeasurementPickerSheet(
  { onConfirm, onRemove },
  ref,
) {
  const { t } = useTranslation();
  const colors = useThemeColors();

  const modalRef = useRef(null);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const [measurementType, setMeasurementType] = useState("weight");

  const [draftValue, setDraftValue] = useState("");
  const [hasExistingValue, setHasExistingValue] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSubscription = Keyboard.addListener("keyboardDidShow", () => {
      setKeyboardVisible(true);
    });

    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const config = MEASUREMENT_CONFIG[measurementType];

  const parsedValue = parseMeasurement(draftValue);

  const canConfirm = parsedValue !== null && parsedValue > 0;

  useImperativeHandle(ref, () => ({
    present({ type, value, previousValue }) {
      const nextType = MEASUREMENT_CONFIG[type] ? type : "weight";

      const nextConfig = MEASUREMENT_CONFIG[nextType];

      setMeasurementType(nextType);
      setHasExistingValue(value !== null && value !== undefined);

      /*
       * Si la mesure n’est pas encore renseignée,
       * on préremplit avec la précédente.
       */
      const initialValue = value ?? previousValue ?? null;

      setDraftValue(formatMeasurement(initialValue, nextConfig.decimals));

      requestAnimationFrame(() => {
        modalRef.current?.present();
      });
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
        /*
         * Clavier ouvert : le tap referme seulement le clavier plutôt que la
         * sheet. `0` = on reste sur le détent courant, donc rien ne bouge.
         */
        pressBehavior={keyboardVisible ? 0 : "close"}
        onPress={Keyboard.dismiss}
        opacity={0.35}
      />
    ),
    [keyboardVisible],
  );

  const handleChangeDraftValue = useCallback((text) => {
    setDraftValue(sanitizeMeasurementInput(text));
  }, []);

  const handleChangeValue = useCallback(
    (direction) => {
      Haptics.selectionAsync().catch(() => {});

      const currentValue = parseMeasurement(draftValue) ?? 0;

      const nextValue = Math.max(0, currentValue + config.step * direction);

      setDraftValue(
        formatMeasurement(
          roundMeasurement(nextValue, config.decimals),
          config.decimals,
        ),
      );
    },
    [config, draftValue],
  );

  const handleConfirm = useCallback(() => {
    if (!canConfirm) {
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {},
    );

    onConfirm?.({
      type: measurementType,
      value: roundMeasurement(parsedValue, config.decimals),
    });

    modalRef.current?.dismiss();
  }, [canConfirm, config.decimals, measurementType, onConfirm, parsedValue]);

  const handleRemove = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});

    onRemove?.(measurementType);
    modalRef.current?.dismiss();
  }, [measurementType, onRemove]);

  return (
    <BottomSheetModal
      ref={modalRef}
      index={0}
      // La hauteur suit le contenu : il faut donc un BottomSheetView,
      // sinon gorhom ne mesure jamais le contenu et la sheet reste invisible.
      enableDynamicSizing
      enablePanDownToClose
      // Faire glisser la sheet referme aussi le clavier.
      enableBlurKeyboardOnGesture
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handle}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      stackBehavior="push"
    >
      <BottomSheetView style={styles.content}>
        {/*
         * Un tap en dehors du champ referme le clavier : les enfants
         * pressables captent le toucher avant, donc ils marchent toujours.
         */}
        <Pressable
          accessible={false}
          onPress={Keyboard.dismiss}
          style={styles.header}
        >
          <Text style={styles.title}>{t(config.title)}</Text>

          <Text style={styles.subtitle}>{t("Enter the new measurement")}</Text>
        </Pressable>

        <Pressable
          accessible={false}
          onPress={Keyboard.dismiss}
          style={styles.valueSection}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("Decrease measurement")}
            onPress={() => handleChangeValue(-1)}
            style={({ pressed }) => [
              styles.stepButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.stepSymbol}>−</Text>
          </Pressable>

          <View style={styles.inputContainer}>
            <BottomSheetTextInput
              value={draftValue}
              onChangeText={handleChangeDraftValue}
              placeholder={config.placeholder}
              placeholderTextColor={colors.textSecondary}
              keyboardType="decimal-pad"
              selectTextOnFocus
              maxLength={7}
              style={styles.valueInput}
            />

            <Text style={styles.unit}>{config.unit}</Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("Increase measurement")}
            onPress={() => handleChangeValue(1)}
            style={({ pressed }) => [
              styles.stepButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.stepSymbol}>+</Text>
          </Pressable>
        </Pressable>

        <View style={styles.footer}>
          <PrimaryButton
            title={t("Confirm measurement")}
            onPress={handleConfirm}
            disabled={!canConfirm}
          />

          {hasExistingValue ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("Remove measurement")}
              onPress={handleRemove}
              style={({ pressed }) => [
                styles.removeButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.removeLabel}>{t("Remove measurement")}</Text>
            </Pressable>
          ) : null}
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

export default MeasurementPickerSheet;

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
    content: {
      paddingHorizontal: 20,
      paddingBottom: 18,
    },

    header: {
      alignItems: "center",
      paddingTop: 4,
    },

    valueSection: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 16,
      paddingTop: 38,
      paddingBottom: 38,
    },

    inputContainer: {
      width: 142,
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "center",
    },

    valueInput: {
      minWidth: 100,
      paddingHorizontal: 0,
      paddingVertical: 2,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 43,
      lineHeight: 53,
      textAlign: "center",
      color: colors.textPrimary,
    },

    unit: {
      marginLeft: 4,
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 16,
      color: colors.textSecondary,
    },

    footer: {
      gap: 5,
    },

    removeButton: {
      minHeight: 34,
      alignItems: "center",
      justifyContent: "center",
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
      color: colors.textSecondary,
    },

    stepButton: {
      width: 50,
      height: 50,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 25,
      backgroundColor: colors.white,
    },

    stepSymbol: {
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 29,
      lineHeight: 28,
      color: colors.primary,
    },

    removeLabel: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 13,
      color: colors.error || "#D95555",
    },

    pressed: {
      opacity: 0.65,
    },
  });
}
