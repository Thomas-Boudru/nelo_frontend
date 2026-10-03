import {
  forwardRef,
  useCallback,
  useEffect,
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

import FormField from "../../../components/onboarding/FormField.js";
import PrimaryButton from "../../../components/ui/PrimaryButton.js";
import { useThemeColors } from "../../../theme/useThemeColors.js";

const CODE_LENGTH = 6;

function isValidEmail(value = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function getEmailChangeErrorMessage(error, t, fallbackKey) {
  const translationKeyByCode = {
    INVALID_EMAIL: "Enter a valid email address",
    EMAIL_UNCHANGED: "This is already your email address",
    EMAIL_ALREADY_IN_USE:
      "This email address is already associated with an account",
    EMAIL_CHANGE_RATE_LIMITED: "Please wait before requesting another code",
    EMAIL_DELIVERY_FAILED:
      "Unable to send the verification code. Please try again",
    INVALID_EMAIL_CHANGE_CODE:
      "The verification code is invalid or has expired",
    EMAIL_CHANGE_ATTEMPTS_EXCEEDED:
      "Too many incorrect attempts. Request a new code",
  };

  return t(translationKeyByCode[error?.code] || fallbackKey);
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

  const codeInputRef = useRef(null);
  const stepTimerRef = useRef(null);

  const [step, setStep] = useState("email");
  const [email, setEmail] = useState(currentEmail ?? "");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isCodeFocused, setIsCodeFocused] = useState(false);

  useEffect(() => {
    setEmail(currentEmail ?? "");
  }, [currentEmail]);

  useEffect(() => {
    if (step !== "verification") {
      return undefined;
    }

    const focusTimer = setTimeout(() => {
      codeInputRef.current?.focus();
    }, 300);

    return () => clearTimeout(focusTimer);
  }, [step]);

  useEffect(
    () => () => {
      if (stepTimerRef.current) {
        clearTimeout(stepTimerRef.current);
      }
    },
    [],
  );

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
    if (stepTimerRef.current) {
      clearTimeout(stepTimerRef.current);
      stepTimerRef.current = null;
    }

    Keyboard.dismiss();
    setStep("email");
    setEmail(currentEmail ?? "");
    setCode("");
    setError("");
    setIsCodeFocused(false);
  };

  const handleSendCode = async () => {
    if (isSubmitting) {
      return;
    }

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
      setCode("");

      stepTimerRef.current = setTimeout(() => {
        setStep("verification");
        stepTimerRef.current = null;
      }, 180);
    } catch (requestError) {
      setError(
        getEmailChangeErrorMessage(
          requestError,
          t,
          "Unable to send verification code",
        ),
      );
    }
  };

  const handleCodeChange = (value) => {
    setCode(value.replace(/\D/g, "").slice(0, CODE_LENGTH));

    if (error) {
      setError("");
    }
  };

  const handleVerify = async () => {
    if (isSubmitting) {
      return;
    }

    if (code.length !== CODE_LENGTH) {
      setError(t("Enter your six-digit verification code"));
      return;
    }

    Keyboard.dismiss();
    setError("");

    try {
      const normalizedEmail = email.trim().toLowerCase();

      const verified = await onVerifyCode?.({
        email: normalizedEmail,
        code,
      });

      if (verified === false) {
        return;
      }

      ref?.current?.dismiss();
      onEmailUpdated?.({ email: normalizedEmail });
    } catch (verificationError) {
      setError(
        getEmailChangeErrorMessage(
          verificationError,
          t,
          "Invalid verification code",
        ),
      );
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
              disabled={!email.trim() || isSubmitting}
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

            <Text style={styles.verificationEmail} numberOfLines={1}>
              {email.trim().toLowerCase()}
            </Text>

            <View style={styles.codeSection}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("Enter your six-digit verification code")}
                onPress={() => codeInputRef.current?.focus()}
                style={styles.codeBoxes}
              >
                {Array.from({ length: CODE_LENGTH }).map((_, index) => {
                  const isActive =
                    isCodeFocused &&
                    (index === code.length ||
                      (code.length === CODE_LENGTH &&
                        index === CODE_LENGTH - 1));

                  return (
                    <View
                      key={index}
                      style={[
                        styles.codeBox,
                        isActive && styles.codeBoxFocused,
                        error && styles.codeBoxError,
                      ]}
                    >
                      <Text style={styles.codeDigit}>{code[index] || ""}</Text>
                    </View>
                  );
                })}
              </Pressable>

              <BottomSheetTextInput
                ref={codeInputRef}
                value={code}
                onChangeText={handleCodeChange}
                onFocus={() => setIsCodeFocused(true)}
                onBlur={() => setIsCodeFocused(false)}
                onSubmitEditing={handleVerify}
                editable={!isSubmitting}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
                maxLength={CODE_LENGTH}
                caretHidden
                style={styles.hiddenCodeInput}
              />

              {error ? <Text style={styles.codeError}>{error}</Text> : null}
            </View>

            <PrimaryButton
              title={t("Confirm email address")}
              loading={isSubmitting}
              disabled={code.length !== CODE_LENGTH || isSubmitting}
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

    verificationEmail: {
      marginTop: 8,
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 13,
      lineHeight: 19,
      color: colors.textPrimary,
    },

    codeSection: {
      position: "relative",
      marginTop: 26,
    },

    codeBoxes: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 6,
    },

    codeBox: {
      flex: 1,
      height: 52,
      maxWidth: 48,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 14,
      backgroundColor: colors.white,
    },

    codeBoxFocused: {
      borderColor: colors.primary,
    },

    codeBoxError: {
      borderColor: colors.error,
    },

    codeDigit: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 21,
      lineHeight: 27,
      color: colors.textPrimary,
    },

    hiddenCodeInput: {
      position: "absolute",
      width: 1,
      height: 1,
      opacity: 0,
    },

    codeError: {
      marginTop: 12,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 12,
      lineHeight: 18,
      color: colors.error,
    },

    button: {
      marginTop: 22,
    },
  });
