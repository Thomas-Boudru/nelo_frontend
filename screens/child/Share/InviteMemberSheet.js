import { forwardRef, useCallback, useEffect, useMemo, useState } from "react";
import {
  Keyboard,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetTextInput,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import QRCode from "react-native-qrcode-svg";

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

  const [step, setStep] = useState("form");
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const [invitation, setInvitation] = useState(null);
  const [isSharing, setIsSharing] = useState(false);

  const normalizedEmail = email.trim().toLowerCase();

  const isSuccessStep = step === "success";
  const inviteUrl = invitation?.inviteUrl ?? "";

  const resetSheet = useCallback(() => {
    setStep("form");
    setEmail("");
    setError("");
    setInvitation(null);
    setIsSharing(false);
  }, []);

  const renderBackdrop = useCallback(
    (props) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior={isSubmitting || isSharing ? "none" : "close"}
        opacity={0.42}
      />
    ),
    [isSharing, isSubmitting],
  );

  const handleDismiss = useCallback(() => {
    Keyboard.dismiss();
    resetSheet();
  }, [resetSheet]);

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

  const handleSendInvitation = async () => {
    if (isSubmitting) {
      return;
    }

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
      const createdInvitation = await onSendInvitation?.({
        email: normalizedEmail,
        childName,
      });

      if (createdInvitation === false || !createdInvitation) {
        return;
      }

      if (!createdInvitation.inviteUrl) {
        setError(t("Invitation link is missing"));
        return;
      }

      const invitationData = {
        ...createdInvitation,
        email: createdInvitation.email ?? normalizedEmail,
      };

      setInvitation(invitationData);
      setStep("success");

      onInvitationSent?.({
        ...invitationData,
        childName,
      });
    } catch (invitationError) {
      setError(invitationError?.message || t("Unable to send invitation"));
    }
  };

  const handleShareInvitation = async () => {
    if (!inviteUrl || isSharing) {
      return;
    }

    setIsSharing(true);

    try {
      await Share.share({
        title: t("Join child profile on Nelo", {
          childName,
        }),
        message: t("Child profile invitation sharing message", {
          childName,
          inviteUrl,
        }),
        url: inviteUrl,
      });
    } catch (shareError) {
      console.error("Unable to share invitation:", shareError);
    } finally {
      setIsSharing(false);
    }
  };

  const handleDone = () => {
    if (isSubmitting || isSharing) {
      return;
    }

    ref?.current?.dismiss();
  };

  return (
    <BottomSheetModal
      ref={ref}
      index={0}
      enablePanDownToClose={!isSubmitting && !isSharing}
      enableDynamicSizing
      maxDynamicContentSize={700}
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
          keyboardVisible && !isSuccessStep
            ? styles.containerKeyboardVisible
            : styles.containerKeyboardHidden,
        ]}
      >
        {isSuccessStep ? (
          <View style={styles.successContent}>
            <Text style={styles.successTitle}>{t("Invitation sent")}</Text>

            <Text style={styles.successDescription}>
              {t("Invitation sent for child profile to")}
            </Text>

            <View style={styles.emailContainer}>
              <Ionicons name="mail-outline" size={18} color={colors.primary} />

              <Text style={styles.emailText} numberOfLines={1}>
                {invitation?.email}
              </Text>
            </View>

            <View style={styles.qrSection}>
              <View style={styles.qrCodeContainer}>
                <QRCode
                  value={inviteUrl}
                  size={190}
                  color={colors.textPrimary}
                  backgroundColor={colors.white}
                  quietZone={4}
                />
              </View>

              <Text style={styles.qrTitle}>
                {t("Scan to join child profile", {
                  childName,
                })}
              </Text>

              <Text style={styles.qrDescription}>
                {t("Ask the invited person to scan this QR code")}
              </Text>
            </View>

            <View style={styles.securityCard}>
              <View style={styles.securityIconContainer}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={19}
                  color={colors.primary}
                />
              </View>

              <Text style={styles.securityText}>
                {t("Invitation intended for email", {
                  email: invitation?.email,
                })}
              </Text>
            </View>

            <View style={styles.successActions}>
              <PrimaryButton
                title={t("Share invitation")}
                loading={isSharing}
                disabled={!inviteUrl || isSharing}
                onPress={handleShareInvitation}
                icon={
                  !isSharing ? (
                    <Ionicons
                      name="share-social-outline"
                      size={19}
                      color="#FFFFFF"
                    />
                  ) : null
                }
              />
            </View>
          </View>
        ) : (
          <>
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
                disabled={!normalizedEmail || isSubmitting}
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
          </>
        )}
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

    successContent: {
      alignItems: "center",

      paddingTop: 6,
    },

    successIconContainer: {
      width: 66,
      height: 66,

      alignItems: "center",
      justifyContent: "center",

      borderRadius: 33,

      backgroundColor: colors.selectedBackground,
    },

    successTitle: {
      marginTop: 14,

      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 22,
      lineHeight: 30,

      color: colors.textPrimary,
    },

    successDescription: {
      maxWidth: 340,

      marginTop: 15,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 13,
      lineHeight: 20,

      textAlign: "center",

      color: colors.textSecondary,
    },

    emailContainer: {
      maxWidth: "100%",

      flexDirection: "row",
      alignItems: "center",

      marginTop: 5,
      paddingHorizontal: 14,
      paddingVertical: 9,

      borderRadius: 15,

      backgroundColor: colors.selectedBackground,
    },

    emailText: {
      flexShrink: 1,

      marginLeft: 8,

      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 12,
      lineHeight: 18,

      color: colors.primary,
    },

    qrSection: {
      width: "100%",

      alignItems: "center",

      marginTop: 18,
      paddingHorizontal: 16,
      paddingVertical: 18,

      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 22,

      backgroundColor: colors.white,
    },

    qrCodeContainer: {
      padding: 10,

      borderRadius: 16,

      backgroundColor: colors.white,
    },

    qrTitle: {
      marginTop: 12,

      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 14,
      lineHeight: 20,

      textAlign: "center",

      color: colors.textPrimary,
    },

    qrDescription: {
      maxWidth: 280,

      marginTop: 3,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 11,
      lineHeight: 17,

      textAlign: "center",

      color: colors.textSecondary,
    },

    securityCard: {
      width: "100%",

      flexDirection: "row",
      alignItems: "center",

      marginTop: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,

      borderRadius: 17,

      backgroundColor: colors.selectedBackground,
    },

    securityIconContainer: {
      width: 30,
      height: 30,

      alignItems: "center",
      justifyContent: "center",

      marginRight: 10,

      borderRadius: 15,

      backgroundColor: colors.white,
    },

    securityText: {
      flex: 1,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 11,
      lineHeight: 17,

      color: colors.textSecondary,
    },

    successActions: {
      width: "100%",

      marginTop: 16,

      gap: 9,
    },

    doneButton: {
      minHeight: 48,

      alignItems: "center",
      justifyContent: "center",

      borderRadius: 16,
    },

    doneButtonPressed: {
      backgroundColor: colors.selectedBackground,
    },

    doneButtonDisabled: {
      opacity: 0.5,
    },

    doneButtonText: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 14,
      lineHeight: 20,

      color: colors.primary,
    },
  });
