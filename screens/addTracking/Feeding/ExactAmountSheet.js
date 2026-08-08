import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Keyboard, StyleSheet, Text, View } from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetTextInput,
  BottomSheetView,
  useBottomSheetSpringConfigs,
} from "@gorhom/bottom-sheet";
import { useTranslation } from "react-i18next";

import PrimaryButton from "../../../components/ui/PrimaryButton.js";
import { useThemeColors } from "../../../theme/useThemeColors.js";

const ExactAmountSheet = forwardRef(function ExactAmountSheet({ onSave }, ref) {
  const { t } = useTranslation();
  const modalRef = useRef(null);

  const [amount, setAmount] = useState("");
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const animationConfigs = useBottomSheetSpringConfigs({
    damping: 18,
    stiffness: 260,
    mass: 0.7,
    overshootClamping: false,
    restDisplacementThreshold: 0.1,
    restSpeedThreshold: 0.1,
  });

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

  useImperativeHandle(ref, () => ({
    present(currentAmountMl = "") {
      setAmount(currentAmountMl ? String(currentAmountMl) : "");
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
        opacity={0.18}
      />
    ),
    [],
  );

  const normalizedAmount = amount.replace(",", ".").trim();
  const numericAmount = Number(normalizedAmount);
  const isValidAmount = Number.isFinite(numericAmount) && numericAmount > 0;

  const handleSave = () => {
    if (!isValidAmount) return;

    onSave?.(normalizedAmount);
    modalRef.current?.dismiss();
  };

  return (
    <BottomSheetModal
      ref={modalRef}
      index={0}
      enableDynamicSizing
      enablePanDownToClose
      stackBehavior="push"
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      animationConfigs={animationConfigs}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetView
        style={[styles.content, keyboardVisible && styles.contentKeyboardOpen]}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{t("Enter exact amount")}</Text>

          <Text style={styles.description}>
            {t("Enter the amount your child drank")}
          </Text>
        </View>

        <View style={styles.amountField}>
          <BottomSheetTextInput
            value={amount}
            onChangeText={setAmount}
            placeholder={t("Amount in ml")}
            placeholderTextColor={colors.textSecondary}
            keyboardType="decimal-pad"
            autoFocus
            selectTextOnFocus
            onSubmitEditing={handleSave}
            style={styles.input}
          />

          <Text style={styles.unit}>ml</Text>
        </View>

        <View style={styles.footer}>
          <PrimaryButton
            title={t("Save amount")}
            onPress={handleSave}
            disabled={!isValidAmount}
          />
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

export default ExactAmountSheet;

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
      paddingBottom: 24,
    },

    contentKeyboardOpen: {
      paddingBottom: 8,
    },

    header: {
      paddingTop: 4,
      paddingBottom: 18,
    },

    title: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 20,
      color: colors.textPrimary,
    },

    description: {
      marginTop: 5,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 13,
      color: colors.textSecondary,
    },

    amountField: {
      flexDirection: "row",
      alignItems: "center",
      height: 56,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      backgroundColor: colors.lightBlue,
    },

    input: {
      flex: 1,
      paddingVertical: 0,
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 17,
      color: colors.textPrimary,
    },

    unit: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 14,
      color: colors.textSecondary,
    },

    footer: {
      paddingTop: 16,
    },
  });
}
