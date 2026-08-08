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

function isValidEmail(value = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

const EditEmailSheet = forwardRef(function EditEmailSheet(
  {
    currentEmail,
    isSubmitting = false,
    onRequestCode,
    onVerifyCode,
    onEmailUpdated,
  },
  ref,
) {
  const { t } = useTranslation();

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [step, setStep] = useState("email");

  const [email, setEmail] = useState(currentEmail ?? "");
  const [code, setCode] = useState("");

  const [error, setError] = useState("");

  useEffect(() => {
    setEmail(currentEmail ?? "");
  }, [currentEmail]);

  const renderBackdrop = useCallback(
    (props) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior={isSubmitting ? "none" : "close"}
        opacity={0.42}
      />
    ),
    [isSubmitting],
  );

  const resetSheet = () => {
    Keyboard.dismiss();

    setStep("email");
    setEmail(currentEmail ?? "");
    setCode("");
    setError("");
  };

  const handleSendCode = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError(t("Email address is required"));
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setError(t("Enter a valid email address"));
      return;
    }

    setError("");

    try {
      const sent = await onRequestCode?.({
        email: normalizedEmail,
      });

      if (sent === false) {
        return;
      }

      Keyboard.dismiss();

      setTimeout(() => {
        setStep("verification");
      }, 180);
    } catch (requestError) {
      setError(requestError?.message || t("Unable to send verification code"));
    }
  };
  const handleVerify = async () => {
    if (!code.trim()) {
      setError(t("Verification code is required"));
      return;
    }

    Keyboard.dismiss();
    setError("");

    try {
      const verified = await onVerifyCode?.({
        email: email.trim().toLowerCase(),
        code: code.trim(),
      });

      if (verified === false) {
        return;
      }

      ref?.current?.dismiss();

      onEmailUpdated?.({
        email: email.trim().toLowerCase(),
      });
    } catch (verificationError) {
      setError(verificationError?.message || t("Invalid verification code"));
    }
  };

  return (
    <BottomSheetModal
      ref={ref}
      index={0}
      enableDynamicSizing
      maxDynamicContentSize={560}
      enablePanDownToClose={!isSubmitting}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      enableBlurKeyboardOnGesture
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBackground}
      handleStyle={styles.handle}
      handleIndicatorStyle={styles.handleIndicator}
      onDismiss={resetSheet}
    >
      <BottomSheetView style={styles.container}>
        {step === "email" ? (
          <>
            <Text style={styles.title}>{t("Change email address")}</Text>

            <Text style={styles.description}>
              {t(
                "Enter your new email address. We'll send you a verification code.",
              )}
            </Text>

            <FormField
              InputComponent={BottomSheetTextInput}
              label={t("Email address")}
              value={email}
              onChangeText={(value) => {
                setEmail(value);

                if (error) {
                  setError("");
                }
              }}
              placeholder={t("Email address placeholder")}
              error={error}
              iconName="mail-outline"
              editable={!isSubmitting}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="emailAddress"
              autoComplete="email"
              returnKeyType="send"
              onSubmitEditing={handleSendCode}
              containerStyle={styles.form}
            />

            <PrimaryButton
              title={t("Send verification code")}
              loading={isSubmitting}
              disabled={!email.trim()}
              onPress={handleSendCode}
              style={styles.button}
            />
          </>
        ) : (
          <>
            <Text style={styles.title}>{t("Verify your email")}</Text>

            <Text style={styles.description}>
              {t("Enter the verification code sent to your new email address.")}
            </Text>

            <FormField
              InputComponent={BottomSheetTextInput}
              label={t("Verification code")}
              value={code}
              onChangeText={(value) => {
                setCode(value);

                if (error) {
                  setError("");
                }
              }}
              placeholder="123456"
              error={error}
              iconName="key-outline"
              editable={!isSubmitting}
              keyboardType="number-pad"
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={handleVerify}
              containerStyle={styles.form}
            />

            <PrimaryButton
              title={t("Confirm email address")}
              loading={isSubmitting}
              disabled={!code.trim()}
              onPress={handleVerify}
              style={styles.button}
            />
          </>
        )}
      </BottomSheetView>
    </BottomSheetModal>
  );
});

export default EditEmailSheet;

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
