import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Alert, Keyboard, StyleSheet, Text, View } from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetTextInput,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { useTranslation } from "react-i18next";

import PrimaryButton from "../../../components/ui/PrimaryButton.js";
import { useThemeColors } from "../../../theme/useThemeColors.js";
import ConfirmActionSheet from "../../ConfirmActionSheet.js";

const EditBottleCapacitySheet = forwardRef(function EditBottleCapacitySheet(
  { existingCapacities = [], onSave, onDelete },
  ref,
) {
  const { t } = useTranslation();
  const modalRef = useRef(null);
  const confirmActionSheetRef = useRef(null);

  const colors = useThemeColors();

  const styles = useMemo(() => createStyles(colors), [colors]);

  const [originalCapacityMl, setOriginalCapacityMl] = useState(null);

  const [capacity, setCapacity] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useImperativeHandle(ref, () => ({
    present(capacityMl) {
      setOriginalCapacityMl(capacityMl);
      setCapacity(String(capacityMl));
      setError("");
      setIsSaving(false);
      setIsDeleting(false);

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
        pressBehavior={isSaving || isDeleting ? "none" : "close"}
        opacity={0.28}
      />
    ),
    [isDeleting, isSaving],
  );

  const normalizedCapacity = capacity.replace(",", ".").trim();

  const numericCapacity = Number(normalizedCapacity);

  const roundedCapacity = Math.round(numericCapacity);

  const isDuplicate =
    Number.isFinite(roundedCapacity) &&
    existingCapacities.some(
      (capacityMl) =>
        capacityMl !== originalCapacityMl && capacityMl === roundedCapacity,
    );

  const isValidCapacity =
    Number.isFinite(numericCapacity) &&
    roundedCapacity > 0 &&
    roundedCapacity <= 1000 &&
    !isDuplicate;

  function handleCapacityChange(value) {
    const numericValue = value.replace(/[^0-9]/g, "").slice(0, 4);

    setCapacity(numericValue);

    if (error) {
      setError("");
    }
  }

  async function handleSave() {
    if (!isValidCapacity || isSaving) {
      return;
    }

    Keyboard.dismiss();

    try {
      setIsSaving(true);
      setError("");

      const saved = await onSave?.({
        previousCapacityMl: originalCapacityMl,
        capacityMl: roundedCapacity,
      });

      if (saved === false) {
        return;
      }

      modalRef.current?.dismiss();
    } catch (saveError) {
      console.error("Unable to update bottle capacity", saveError);

      setError(
        saveError?.message ||
          t("Unable to update this bottle. Please try again."),
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleDeletePress() {
    if (originalCapacityMl === null || isDeleting) {
      return;
    }

    Keyboard.dismiss();

    confirmActionSheetRef.current?.present({
      title: t("Delete custom bottle"),
      description: t(
        "This bottle will no longer appear in your list. Previously recorded entries will not be deleted.",
      ),
      confirmLabel: t("Delete"),
      cancelLabel: t("Cancel"),
      errorMessage: t("Unable to delete this bottle. Please try again."),
      icon: "trash-outline",
      variant: "destructive",
      onConfirm: handleConfirmDelete,
    });
  }

  async function handleConfirmDelete() {
    if (originalCapacityMl === null || isDeleting) {
      return false;
    }

    try {
      setIsDeleting(true);
      setError("");

      const deleted = await onDelete?.({
        capacityMl: originalCapacityMl,
      });

      if (deleted === false) {
        return false;
      }

      /*
       * On ferme également la sheet d’édition.
       * ConfirmActionSheet se ferme automatiquement
       * lorsque le callback retourne true.
       */
      modalRef.current?.dismiss();

      return true;
    } catch (deleteError) {
      console.error("Unable to delete custom bottle", deleteError);

      /*
       * L’erreur sera capturée et affichée directement
       * dans ConfirmActionSheet.
       */
      throw new Error(
        deleteError?.message ||
          t("Unable to delete this bottle. Please try again."),
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <BottomSheetModal
        ref={modalRef}
        index={0}
        enableDynamicSizing
        enablePanDownToClose={!isSaving && !isDeleting}
        stackBehavior="push"
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.handle}
      >
        <BottomSheetView style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>{t("Edit custom bottle")}</Text>

            <Text style={styles.description}>
              {t("Change the capacity of this bottle.")}
            </Text>
          </View>

          <View style={styles.fieldSection}>
            <Text style={styles.fieldLabel}>{t("Bottle capacity")}</Text>

            <View
              style={[styles.capacityField, error && styles.capacityFieldError]}
            >
              <BottomSheetTextInput
                value={capacity}
                onChangeText={handleCapacityChange}
                placeholder={t("Amount in ml")}
                placeholderTextColor={colors.textSecondary}
                keyboardType="number-pad"
                autoFocus
                selectTextOnFocus
                editable={!isSaving && !isDeleting}
                onSubmitEditing={handleSave}
                style={styles.input}
              />

              <Text style={styles.unit}>ml</Text>
            </View>

            {isDuplicate ? (
              <Text style={styles.errorText}>
                {t("This bottle capacity already exists.")}
              </Text>
            ) : error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : null}
          </View>

          <View style={styles.actions}>
            <PrimaryButton
              title={t("Delete")}
              variant="destructive"
              onPress={handleDeletePress}
              disabled={isSaving || isDeleting}
              loading={isDeleting}
              style={styles.actionButton}
            />

            <PrimaryButton
              title={t("Save changes")}
              onPress={handleSave}
              disabled={
                !isValidCapacity ||
                isDeleting ||
                roundedCapacity === originalCapacityMl
              }
              loading={isSaving}
              style={styles.actionButton}
            />
          </View>
        </BottomSheetView>
      </BottomSheetModal>
      <ConfirmActionSheet ref={confirmActionSheetRef} />
    </>
  );
});

export default EditBottleCapacitySheet;

const createStyles = (colors) =>
  StyleSheet.create({
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

    header: {
      paddingTop: 4,
    },

    title: {
      color: colors.textPrimary,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 20,
      lineHeight: 28,
    },

    description: {
      marginTop: 5,
      color: colors.textSecondary,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 13,
      lineHeight: 19,
    },

    fieldSection: {
      marginTop: 22,
    },

    fieldLabel: {
      marginBottom: 8,
      color: colors.textPrimary,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 13,
      lineHeight: 19,
    },

    capacityField: {
      height: 56,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      backgroundColor: colors.lightBlue,
    },

    capacityFieldError: {
      borderColor: colors.error,
    },

    input: {
      flex: 1,
      height: 54,
      paddingVertical: 0,
      color: colors.textPrimary,
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 17,
    },

    unit: {
      color: colors.textSecondary,
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 14,
    },

    errorText: {
      marginTop: 7,
      color: colors.error,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 12,
      lineHeight: 18,
    },

    actions: {
      flexDirection: "row",
      gap: 10,
      marginTop: 22,
    },

    actionButton: {
      flex: 1,
    },
  });
