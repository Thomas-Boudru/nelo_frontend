import { forwardRef, useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import PrimaryButton from "../../../components/ui/PrimaryButton.js";
import { useThemeColors } from "../../../theme/useThemeColors.js";

const DELETED_ITEMS = [
  "Child profiles",
  "Tracking history",
  "Moments and photos",
  "Account settings",
];

const DeleteAccountSheet = forwardRef(function DeleteAccountSheet(
  { isDeleting = false, onDeleteAccount, onAccountDeleted },
  ref,
) {
  const { t } = useTranslation();

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [step, setStep] = useState("warning");
  const [error, setError] = useState("");

  const renderBackdrop = useCallback(
    (props) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior={isDeleting ? "none" : "close"}
        opacity={0.42}
      />
    ),
    [isDeleting],
  );

  const resetSheet = useCallback(() => {
    setStep("warning");
    setError("");
  }, []);

  const handleContinue = () => {
    setError("");
    setStep("confirmation");
  };

  const handleGoBack = () => {
    if (isDeleting) {
      return;
    }

    setError("");
    setStep("warning");
  };

  const handleDismiss = () => {
    if (isDeleting) {
      return;
    }

    ref?.current?.dismiss();
  };

  const handleDelete = async () => {
    if (isDeleting) {
      return;
    }

    setError("");

    try {
      const deleted = await onDeleteAccount?.();

      if (deleted === false) {
        return;
      }

      ref?.current?.dismiss();
      onAccountDeleted?.();
    } catch (deleteError) {
      setError(deleteError?.message || t("Unable to delete account"));
    }
  };

  return (
    <BottomSheetModal
      ref={ref}
      index={0}
      enableDynamicSizing
      enablePanDownToClose={!isDeleting}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBackground}
      handleStyle={styles.handle}
      handleIndicatorStyle={styles.handleIndicator}
      onDismiss={resetSheet}
    >
      <BottomSheetView style={styles.container}>
        {step === "warning" ? (
          <>
            <View style={styles.warningIconContainer}>
              <Ionicons name="trash-outline" size={26} color={colors.error} />
            </View>

            <Text style={styles.centeredTitle}>{t("Delete your account")}</Text>

            <Text style={styles.centeredDescription}>
              {t(
                "Deleting your account will permanently remove all associated information",
              )}
            </Text>

            <View style={styles.deletedItemsCard}>
              {DELETED_ITEMS.map((item) => (
                <View key={item} style={styles.deletedItem}>
                  <Ionicons
                    name="close-circle-outline"
                    size={18}
                    color={colors.error}
                  />

                  <Text style={styles.deletedItemText}>{t(item)}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.warningText}>
              {t("This action cannot be undone")}
            </Text>

            <PrimaryButton
              title={t("Continue")}
              variant="destructive"
              onPress={handleContinue}
              style={styles.button}
            />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("Cancel")}
              onPress={handleDismiss}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.secondaryButtonPressed,
              ]}
            >
              <Text style={styles.secondaryButtonText}>{t("Cancel")}</Text>
            </Pressable>
          </>
        ) : (
          <>
            <View style={styles.confirmationIconContainer}>
              <Ionicons name="warning-outline" size={28} color={colors.error} />
            </View>

            <Text style={styles.centeredTitle}>
              {t("Delete your account permanently?")}
            </Text>

            <Text style={styles.centeredDescription}>
              {t(
                "Your account, child profiles and all associated data will be permanently deleted",
              )}
            </Text>

            <View style={styles.finalWarningCard}>
              <Ionicons
                name="alert-circle-outline"
                size={20}
                color={colors.error}
              />

              <Text style={styles.finalWarningText}>
                {t(
                  "You will not be able to recover your account or its data after deletion",
                )}
              </Text>
            </View>

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
              title={t("Delete account permanently")}
              variant="destructive"
              loading={isDeleting}
              disabled={isDeleting}
              onPress={handleDelete}
              style={styles.button}
            />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("Go back")}
              disabled={isDeleting}
              onPress={handleGoBack}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && !isDeleting && styles.secondaryButtonPressed,
                isDeleting && styles.secondaryButtonDisabled,
              ]}
            >
              <Text style={styles.secondaryButtonText}>{t("Go back")}</Text>
            </Pressable>
          </>
        )}
      </BottomSheetView>
    </BottomSheetModal>
  );
});

export default DeleteAccountSheet;

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
      width: 44,
      height: 5,
      borderRadius: 3,
      backgroundColor: colors.textSecondary,
      opacity: 0.25,
    },

    container: {
      paddingHorizontal: 22,
      paddingBottom: 24,
    },

    warningIconContainer: {
      width: 62,
      height: 62,
      alignSelf: "center",
      alignItems: "center",
      justifyContent: "center",
      marginTop: 6,
      borderRadius: 31,
      backgroundColor: `${colors.error}10`,
    },

    confirmationIconContainer: {
      width: 62,
      height: 62,
      alignSelf: "center",
      alignItems: "center",
      justifyContent: "center",
      marginTop: 6,
      borderWidth: 1,
      borderColor: `${colors.error}22`,
      borderRadius: 31,
      backgroundColor: `${colors.error}10`,
    },

    centeredTitle: {
      marginTop: 15,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 21,
      lineHeight: 29,
      textAlign: "center",
      color: colors.textPrimary,
    },

    centeredDescription: {
      maxWidth: 340,
      alignSelf: "center",
      marginTop: 6,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 12,
      lineHeight: 19,
      textAlign: "center",
      color: colors.textSecondary,
    },

    deletedItemsCard: {
      gap: 10,
      padding: 14,
      marginTop: 20,
      borderRadius: 18,
      backgroundColor: `${colors.error}08`,
    },

    deletedItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
    },

    deletedItemText: {
      flex: 1,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 12,
      lineHeight: 17,
      color: colors.textPrimary,
    },

    warningText: {
      marginTop: 13,
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 11,
      lineHeight: 17,
      textAlign: "center",
      color: colors.error,
    },

    finalWarningCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      padding: 14,
      marginTop: 20,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: `${colors.error}28`,
      borderRadius: 18,
      backgroundColor: `${colors.error}08`,
    },

    finalWarningText: {
      flex: 1,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 12,
      lineHeight: 18,
      color: colors.textPrimary,
    },

    errorContainer: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
      marginTop: 14,
      paddingHorizontal: 4,
    },

    errorText: {
      flex: 1,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 12,
      lineHeight: 18,
      color: colors.error,
    },

    button: {
      marginTop: 22,
    },

    secondaryButton: {
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 7,
      borderRadius: 15,
    },

    secondaryButtonPressed: {
      backgroundColor: colors.selectedBackground,
    },

    secondaryButtonDisabled: {
      opacity: 0.5,
    },

    secondaryButtonText: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 13,
      lineHeight: 18,
      color: colors.textSecondary,
    },
  });
