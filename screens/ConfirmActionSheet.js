import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import PrimaryButton from "../components/ui/PrimaryButton.js";
import { useThemeColors } from "../theme/useThemeColors.js";

const DEFAULT_CONFIG = {
  title: "",
  description: "",
  confirmLabel: "",
  cancelLabel: "",
  errorMessage: "",
  icon: "trash-outline",
  variant: "destructive",
};

const ConfirmActionSheet = forwardRef(function ConfirmActionSheet(_, ref) {
  const { t } = useTranslation();

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const modalRef = useRef(null);
  const confirmCallbackRef = useRef(null);

  const [config, setConfig] = useState(DEFAULT_CONFIG);

  const [isConfirming, setIsConfirming] = useState(false);

  const [error, setError] = useState("");

  const resetSheet = useCallback(() => {
    setConfig(DEFAULT_CONFIG);
    setIsConfirming(false);
    setError("");
    confirmCallbackRef.current = null;
  }, []);

  const dismiss = useCallback(() => {
    if (isConfirming) {
      return;
    }

    modalRef.current?.dismiss();
  }, [isConfirming]);

  useImperativeHandle(
    ref,
    () => ({
      present({
        title,
        description,
        confirmLabel,
        cancelLabel,
        errorMessage,
        icon = "trash-outline",
        variant = "destructive",
        onConfirm,
      }) {
        setConfig({
          title: title ?? "",
          description: description ?? "",
          confirmLabel: confirmLabel ?? t("Confirm"),
          cancelLabel: cancelLabel ?? t("Cancel"),
          errorMessage:
            errorMessage ??
            t("The action could not be completed. Please try again."),
          icon,
          variant,
        });

        confirmCallbackRef.current =
          typeof onConfirm === "function" ? onConfirm : null;

        setError("");
        setIsConfirming(false);

        /*
         * On attend que les nouveaux textes soient rendus
         * avant d’ouvrir la sheet.
         */
        requestAnimationFrame(() => {
          modalRef.current?.present();
        });
      },

      dismiss,
    }),
    [dismiss, t],
  );

  const renderBackdrop = useCallback(
    (props) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior={isConfirming ? "none" : "close"}
        opacity={0.42}
      />
    ),
    [isConfirming],
  );

  const handleConfirm = useCallback(async () => {
    if (isConfirming || !confirmCallbackRef.current) {
      return;
    }

    setError("");
    setIsConfirming(true);

    try {
      const result = await confirmCallbackRef.current();

      /*
       * Le callback peut retourner false pour empêcher
       * la fermeture, par exemple si une API refuse
       * la suppression sans lancer d’erreur.
       */
      if (result === false) {
        setIsConfirming(false);
        return;
      }

      modalRef.current?.dismiss();
    } catch (confirmationError) {
      setError(confirmationError?.message || config.errorMessage);

      setIsConfirming(false);
    }
  }, [config.errorMessage, isConfirming]);

  return (
    <BottomSheetModal
      ref={modalRef}
      index={0}
      enableDynamicSizing
      stackBehavior="push"
      enablePanDownToClose={!isConfirming}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBackground}
      handleStyle={styles.handle}
      handleIndicatorStyle={styles.handleIndicator}
      onDismiss={resetSheet}
    >
      <BottomSheetView style={styles.container}>
        <Text style={styles.title}>{config.title}</Text>

        {config.description ? (
          <Text style={styles.description}>{config.description}</Text>
        ) : null}

        {error ? (
          <View style={styles.errorContainer}>
            <Ionicons
              name="alert-circle-outline"
              size={18}
              color={colors.error}
            />

            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <PrimaryButton
          title={config.confirmLabel}
          variant={config.variant}
          loading={isConfirming}
          disabled={isConfirming}
          onPress={handleConfirm}
          style={styles.confirmButton}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={config.cancelLabel}
          disabled={isConfirming}
          onPress={dismiss}
          style={({ pressed }) => [
            styles.cancelButton,
            pressed && !isConfirming && styles.cancelButtonPressed,
            isConfirming && styles.cancelButtonDisabled,
          ]}
        >
          <Text style={styles.cancelButtonText}>{config.cancelLabel}</Text>
        </Pressable>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

export default ConfirmActionSheet;

const createStyles = (colors) =>
  StyleSheet.create({
    sheetBackground: {
      backgroundColor: colors.white,

      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,
    },

    handle: {
      paddingTop: 10,
      paddingBottom: 5,
    },

    handleIndicator: {
      width: 42,
      height: 4,

      borderRadius: 2,

      backgroundColor: colors.textSecondary,

      opacity: 0.24,
    },

    container: {
      paddingHorizontal: 22,
      paddingTop: 4,
      paddingBottom: 24,
    },

    title: {
      width: "100%",

      marginTop: 14,

      textAlign: "left",

      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 20,
      lineHeight: 28,

      color: colors.textPrimary,
    },

    description: {
      width: "100%",

      marginTop: 6,

      textAlign: "left",

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 12,
      lineHeight: 19,

      color: colors.textSecondary,
    },

    errorContainer: {
      flexDirection: "row",
      alignItems: "flex-start",

      gap: 8,

      marginTop: 16,
      padding: 12,

      borderRadius: 14,

      backgroundColor: `${colors.error}0D`,
    },

    errorText: {
      flex: 1,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 12,
      lineHeight: 18,

      color: colors.error,
    },

    confirmButton: {
      marginTop: 22,
    },

    cancelButton: {
      minHeight: 46,

      alignItems: "center",
      justifyContent: "center",

      marginTop: 7,

      borderRadius: 15,
    },

    cancelButtonPressed: {
      backgroundColor: colors.selectedBackground,
    },

    cancelButtonDisabled: {
      opacity: 0.5,
    },

    cancelButtonText: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 13,
      lineHeight: 18,

      color: colors.textSecondary,
    },
  });
