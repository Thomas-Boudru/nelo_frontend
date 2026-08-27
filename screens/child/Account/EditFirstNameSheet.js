import { forwardRef, useCallback, useEffect, useMemo, useState } from "react";
import { Keyboard, StyleSheet, Text } from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetTextInput,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { useTranslation } from "react-i18next";

import FormField from "../../../components/onboarding/FormField.js";
import PrimaryButton from "../../../components/ui/PrimaryButton.js";
import { useThemeColors } from "../../../theme/useThemeColors.js";

const EditFirstNameSheet = forwardRef(function EditFirstNameSheet(
  { firstName, isSaving = false, onSave, onSaved },
  ref,
) {
  const { t } = useTranslation();

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [value, setValue] = useState(firstName ?? "");
  const [error, setError] = useState("");

  useEffect(() => {
    setValue(firstName ?? "");
  }, [firstName]);

  const renderBackdrop = useCallback(
    (props) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior={isSaving ? "none" : "close"}
        opacity={0.42}
      />
    ),
    [isSaving],
  );

  const handleSave = async () => {
    const normalizedValue = value.trim();

    if (!normalizedValue) {
      setError(t("Preferred name is required"));
      return;
    }

    Keyboard.dismiss();
    setError("");

    try {
      const saved = await onSave?.({
        firstName: normalizedValue,
      });

      if (saved === false) {
        return;
      }

      ref?.current?.dismiss();

      onSaved?.({
        firstName: normalizedValue,
      });
    } catch (saveError) {
      setError(saveError?.message || t("Unable to update preferred name"));
    }
  };

  return (
    <BottomSheetModal
      ref={ref}
      index={0}
      enableDynamicSizing
      enablePanDownToClose={!isSaving}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBackground}
      handleStyle={styles.handle}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <BottomSheetView style={styles.container}>
        <Text style={styles.title}>{t("Edit preferred name")}</Text>

        <Text style={styles.description}>
          {t("This name will be displayed throughout Nelo")}
        </Text>

        <FormField
          InputComponent={BottomSheetTextInput}
          label={t("Preferred name")}
          value={value}
          onChangeText={(nextValue) => {
            setValue(nextValue);

            if (error) {
              setError("");
            }
          }}
          error={error}
          iconName="person-outline"
          editable={!isSaving}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={handleSave}
          containerStyle={styles.form}
        />

        <PrimaryButton
          title={t("Save changes")}
          loading={isSaving}
          disabled={!value.trim()}
          onPress={handleSave}
          style={styles.button}
        />
      </BottomSheetView>
    </BottomSheetModal>
  );
});

export default EditFirstNameSheet;

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

    title: {
      paddingTop: 6,
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 21,
      lineHeight: 29,
      color: colors.textPrimary,
    },

    description: {
      marginTop: 5,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 12,
      lineHeight: 18,
      color: colors.textSecondary,
    },

    form: {
      marginTop: 24,
    },

    button: {
      marginTop: 22,
    },
  });
