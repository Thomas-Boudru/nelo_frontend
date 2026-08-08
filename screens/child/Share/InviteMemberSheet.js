import { forwardRef, useCallback, useMemo, useState, useEffect } from "react";
import { Keyboard, StyleSheet, Text, View } from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetTextInput,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import FormField from "../../../components/onboarding/FormField";
import PrimaryButton from "../../../components/ui/PrimaryButton";

import { useThemeColors } from "../../../theme/useThemeColors";

function isValidEmail(value = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

const InviteMemberSheet = forwardRef(function InviteMemberSheet(
  { childName, isSubmitting = false, onSendInvitation, onInvitationSent },
  ref,
) {
  const { t } = useTranslation();

  const colors = useThemeColors();

  const styles = useMemo(() => createStyles(colors), [colors]);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const normalizedEmail = email.trim().toLowerCase();

  const resetForm = useCallback(() => {
    setEmail("");
    setError("");
  }, []);

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

  const handleDismiss = useCallback(() => {
    Keyboard.dismiss();
    resetForm();
  }, [resetForm]);

  const handleChangeEmail = useCallback(
    (value) => {
      setEmail(value);

      if (error) {
        setError("");
      }
    },
    [error],
  );

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => {
      setKeyboardVisible(true);
    });

    const hide = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardVisible(false);
    });

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const handleSendInvitation = async () => {
    if (!normalizedEmail) {
      setError(t("Email address is required"));
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setError(t("Enter a valid email address"));
      return;
    }

    Keyboard.dismiss();
    setError("");

    try {
      const invitationSent = await onSendInvitation?.({
        email: normalizedEmail,
        childName,
      });

      if (invitationSent === false) {
        return;
      }

      ref?.current?.dismiss();

      onInvitationSent?.({
        email: normalizedEmail,
        childName,
      });
    } catch (invitationError) {
      setError(invitationError?.message || t("Unable to send invitation"));
    }
  };

  return (
    <BottomSheetModal
      ref={ref}
      index={0}
      enablePanDownToClose={!isSubmitting}
      enableDynamicSizing
      maxDynamicContentSize={600}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      enableBlurKeyboardOnGesture
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBackground}
      handleStyle={styles.handle}
      handleIndicatorStyle={styles.handleIndicator}
      onDismiss={handleDismiss}
    >
      <BottomSheetView
        style={[
          styles.container,
          keyboardVisible
            ? styles.containerKeyboardVisible
            : styles.containerKeyboardHidden,
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.title}>
            {t("Invite someone to child profile", {
              childName,
            })}
          </Text>

          <Text style={styles.description}>
            {t(
              "Share child profile with another parent grandparent or family member",
              {
                childName,
              },
            )}
          </Text>
        </View>

        <View style={styles.form}>
          <FormField
            InputComponent={BottomSheetTextInput}
            label={t("Email address")}
            value={email}
            onChangeText={handleChangeEmail}
            placeholder={t("Email address placeholder")}
            error={error}
            iconName="mail-outline"
            editable={!isSubmitting}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
            returnKeyType="send"
            blurOnSubmit
            onSubmitEditing={handleSendInvitation}
          />
        </View>

        <View style={styles.bottomContent}>
          <View style={styles.informationCard}>
            <View style={styles.informationIconContainer}>
              <Ionicons
                name="mail-unread-outline"
                size={19}
                color={colors.primary}
              />
            </View>

            <Text style={styles.informationText}>
              {t("Secure invitation email explanation", {
                childName,
              })}
            </Text>
          </View>

          <PrimaryButton
            title={t("Send invitation")}
            loading={isSubmitting}
            disabled={!normalizedEmail}
            onPress={handleSendInvitation}
            icon={
              !isSubmitting ? (
                <Ionicons
                  name="paper-plane-outline"
                  size={19}
                  color="#FFFFFF"
                />
              ) : null
            }
          />
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

export default InviteMemberSheet;

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
    },

    containerKeyboardHidden: {
      paddingBottom: 24,
    },

    containerKeyboardVisible: {
      paddingBottom: 8,
    },
    header: {
      paddingTop: 6,
    },

    title: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 21,
      lineHeight: 29,

      color: colors.textPrimary,
    },

    description: {
      maxWidth: 340,

      marginTop: 6,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 13,
      lineHeight: 20,

      color: colors.textSecondary,
    },

    form: {
      marginTop: 22,
    },

    bottomContent: {
      marginTop: 18,
      gap: 14,
    },

    informationCard: {
      flexDirection: "row",
      alignItems: "flex-start",

      paddingHorizontal: 14,
      paddingVertical: 13,

      borderRadius: 17,

      backgroundColor: colors.selectedBackground,
    },

    informationIconContainer: {
      width: 30,
      height: 30,

      alignItems: "center",
      justifyContent: "center",

      marginRight: 10,

      borderRadius: 15,

      backgroundColor: colors.white,
    },

    informationText: {
      flex: 1,

      paddingTop: 3,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 12,
      lineHeight: 18,

      color: colors.textSecondary,
    },
  });
