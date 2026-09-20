import { forwardRef, useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import PrimaryButton from "../../../components/ui/PrimaryButton";

import { useThemeColors } from "../../../theme/useThemeColors";

function formatExpirationDate(value, locale) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  try {
    return new Intl.DateTimeFormat(locale || "en", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  } catch {
    return date.toLocaleDateString();
  }
}

const PendingInvitationDetailsSheet = forwardRef(
  function PendingInvitationDetailsSheet(
    {
      invitation,
      childName,
      isResending = false,
      isCancelling = false,
      onResend,
      onBack,
      onCancel,
    },
    ref,
  ) {
    const { t, i18n } = useTranslation();

    const colors = useThemeColors();

    const styles = useMemo(() => createStyles(colors), [colors]);

    const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);

    const isLoading = isResending || isCancelling;

    const expirationDate = useMemo(
      () =>
        formatExpirationDate(
          invitation?.expiresAt,
          i18n.resolvedLanguage || i18n.language || "en",
        ),
      [invitation?.expiresAt, i18n.language, i18n.resolvedLanguage],
    );

    const renderBackdrop = useCallback(
      (props) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          pressBehavior="close"
          opacity={0.42}
        />
      ),
      [],
    );

    const handleDismiss = useCallback(() => {
      setShowCancelConfirmation(false);
    }, []);

    const handleResend = async () => {
      if (!invitation || isLoading) {
        return;
      }

      await onResend?.(invitation);
    };

    const handleShowCancelConfirmation = () => {
      if (isLoading) {
        return;
      }

      setShowCancelConfirmation(true);
    };

    const handleHideCancelConfirmation = () => {
      if (isLoading) {
        return;
      }

      setShowCancelConfirmation(false);
    };

    const handleConfirmCancel = async () => {
      if (!invitation || isLoading) {
        return;
      }

      const invitationCancelled = await onCancel?.(invitation);

      if (invitationCancelled === false) {
        return;
      }

      ref?.current?.dismiss();
    };

    return (
      <BottomSheetModal
        ref={ref}
        index={0}
        enablePanDownToClose
        enableDynamicSizing
        maxDynamicContentSize={620}
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBackground}
        handleStyle={styles.handle}
        handleIndicatorStyle={styles.handleIndicator}
        onDismiss={handleDismiss}
      >
        <BottomSheetView style={styles.container}>
          {showCancelConfirmation ? (
            <View style={styles.confirmationContent}>
              <Text style={styles.confirmationTitle}>
                {t("Cancel invitation")}
              </Text>

              <Text style={styles.confirmationDescription}>
                {t("Cancel invitation confirmation message", {
                  email: invitation?.email,
                  childName,
                })}
              </Text>

              <View style={styles.confirmationInformationCard}>
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color={colors.error}
                />

                <Text style={styles.confirmationInformationText}>
                  {t("Cancelled invitation link will no longer work")}
                </Text>
              </View>

              <View style={styles.confirmationActions}>
                <PrimaryButton
                  title={t("Cancel invitation")}
                  accessibilityLabel={t("Confirm invitation cancellation")}
                  onPress={handleConfirmCancel}
                  loading={isCancelling}
                  disabled={isLoading}
                  variant="destructive"
                  icon="close-circle-outline"
                />

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("Keep invitation")}
                  disabled={isLoading}
                  onPress={handleHideCancelConfirmation}
                  style={({ pressed }) => [
                    styles.keepInvitationButton,
                    pressed && styles.keepInvitationButtonPressed,
                    isLoading && styles.actionButtonDisabled,
                  ]}
                >
                  <Text style={styles.keepInvitationButtonText}>
                    {t("Keep invitation")}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.header}>
                <View style={styles.headerInformation}>
                  <View style={styles.headerRow}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t("Back")}
                      hitSlop={10}
                      onPress={onBack}
                      style={({ pressed }) => [
                        styles.backButton,
                        pressed && styles.backButtonPressed,
                      ]}
                    >
                      <Ionicons
                        name="arrow-back"
                        size={21}
                        color={colors.textPrimary}
                      />
                    </Pressable>

                    <Text style={styles.title} numberOfLines={1}>
                      {t("Invitation pending")}
                    </Text>
                  </View>

                  <Text style={styles.description}>
                    {t("Invitation pending for child profile", {
                      childName,
                    })}
                  </Text>
                </View>
              </View>

              <View style={styles.invitationCard}>
                <View style={styles.emailRow}>
                  <View style={styles.detailIconContainer}>
                    <Ionicons
                      name="mail-outline"
                      size={18}
                      color={colors.primary}
                    />
                  </View>

                  <View style={styles.detailInformation}>
                    <Text style={styles.detailLabel}>{t("Email address")}</Text>

                    <Text style={styles.detailValue} numberOfLines={1}>
                      {invitation?.email}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailDivider} />

                <View style={styles.expirationRow}>
                  <View style={styles.detailIconContainer}>
                    <Ionicons
                      name="time-outline"
                      size={18}
                      color={colors.primary}
                    />
                  </View>

                  <View style={styles.detailInformation}>
                    <Text style={styles.detailLabel}>
                      {t("Expiration date")}
                    </Text>

                    <Text style={styles.detailValue} numberOfLines={1}>
                      {expirationDate || t("Expiration date unavailable")}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.statusCard}>
                <View style={styles.pendingDot} />

                <Text style={styles.statusText}>
                  {t("Waiting for invited person to accept")}
                </Text>
              </View>

              <View style={styles.actions}>
                <PrimaryButton
                  title={t("Cancel")}
                  variant="destructive"
                  disabled={isLoading}
                  onPress={handleShowCancelConfirmation}
                  style={styles.actionButton}
                  icon={
                    <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
                  }
                />

                <PrimaryButton
                  title={t("Resend")}
                  loading={isResending}
                  disabled={isLoading}
                  onPress={handleResend}
                  style={styles.actionButton}
                  icon={
                    !isResending ? (
                      <Ionicons
                        name="refresh-outline"
                        size={18}
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
  },
);

export default PendingInvitationDetailsSheet;

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
      paddingTop: 6,
      paddingBottom: 24,
    },

    header: {
      flexDirection: "row",
      alignItems: "center",
    },

    pendingIconContainer: {
      width: 54,
      height: 54,

      alignItems: "center",
      justifyContent: "center",

      marginRight: 13,

      borderWidth: 1.5,
      borderStyle: "dashed",
      borderColor: colors.primary,
      borderRadius: 27,

      backgroundColor: colors.selectedBackground,
    },

    headerInformation: {
      flex: 1,

      minWidth: 0,
    },

    title: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 20,
      lineHeight: 28,

      color: colors.textPrimary,
    },

    description: {
      marginTop: 2,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 12,
      lineHeight: 18,

      color: colors.textSecondary,
    },

    invitationCard: {
      marginTop: 22,
      paddingHorizontal: 14,

      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,

      backgroundColor: colors.white,
    },

    emailRow: {
      minHeight: 70,

      flexDirection: "row",
      alignItems: "center",
    },

    expirationRow: {
      minHeight: 70,

      flexDirection: "row",
      alignItems: "center",
    },

    detailIconContainer: {
      width: 38,
      height: 38,

      alignItems: "center",
      justifyContent: "center",

      marginRight: 11,

      borderRadius: 19,

      backgroundColor: colors.selectedBackground,
    },

    detailInformation: {
      flex: 1,

      minWidth: 0,
    },

    detailLabel: {
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 10,
      lineHeight: 15,

      color: colors.textSecondary,
    },

    detailValue: {
      marginTop: 2,

      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 13,
      lineHeight: 19,

      color: colors.textPrimary,
    },

    detailDivider: {
      height: StyleSheet.hairlineWidth,

      marginLeft: 49,

      backgroundColor: colors.border,
    },

    statusCard: {
      flexDirection: "row",
      alignItems: "center",

      marginTop: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,

      borderRadius: 17,

      backgroundColor: colors.selectedBackground,
    },

    pendingDot: {
      width: 8,
      height: 8,

      marginRight: 9,

      borderRadius: 4,

      backgroundColor: colors.primary,
    },

    statusText: {
      flex: 1,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 11,
      lineHeight: 17,

      color: colors.textSecondary,
    },

    actions: {
      flexDirection: "row",
      alignItems: "center",

      marginTop: 18,

      gap: 10,
    },

    actionButton: {
      flex: 1,

      width: undefined,
    },

    actionButtonDisabled: {
      opacity: 0.5,
    },

    confirmationContent: {
      alignItems: "stretch",
    },

    dangerIconContainer: {
      width: 64,
      height: 64,

      alignItems: "center",
      justifyContent: "center",

      borderRadius: 32,

      backgroundColor: `${colors.error}12`,
    },

    confirmationTitle: {
      marginTop: 14,

      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 21,
      lineHeight: 29,

      color: colors.textPrimary,
      textAlign: "left",
    },

    confirmationDescription: {
      maxWidth: 340,

      marginTop: 7,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 13,
      lineHeight: 20,

      color: colors.textSecondary,
      textAlign: "left",
    },

    confirmationInformationCard: {
      width: "100%",

      flexDirection: "row",
      alignItems: "center",

      marginTop: 18,
      paddingHorizontal: 14,
      paddingVertical: 13,

      borderRadius: 17,

      backgroundColor: `${colors.error}0D`,
    },

    confirmationInformationText: {
      flex: 1,

      marginLeft: 9,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 11,
      lineHeight: 17,

      color: colors.textSecondary,
    },

    confirmationActions: {
      width: "100%",

      marginTop: 18,

      gap: 9,
    },

    confirmCancelButton: {
      minHeight: 50,

      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",

      gap: 8,

      borderRadius: 16,

      backgroundColor: colors.error,
    },

    confirmCancelButtonPressed: {
      opacity: 0.85,
    },

    confirmCancelButtonText: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 14,
      lineHeight: 20,

      color: "#FFFFFF",
    },

    keepInvitationButton: {
      minHeight: 48,

      alignItems: "center",
      justifyContent: "center",

      borderRadius: 16,
    },

    keepInvitationButtonPressed: {
      backgroundColor: colors.selectedBackground,
    },

    keepInvitationButtonText: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 14,
      lineHeight: 20,

      color: colors.primary,
    },

    headerRow: {
      minHeight: 44,

      flexDirection: "row",
      alignItems: "center",

      gap: 10,
    },

    backButton: {
      width: 38,
      height: 38,

      alignItems: "center",
      justifyContent: "center",

      borderRadius: 19,

      backgroundColor: colors.selectedBackground,
    },

    backButtonPressed: {
      opacity: 0.7,

      transform: [{ scale: 0.96 }],
    },

    title: {
      flex: 1,

      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 21,
      lineHeight: 29,

      color: colors.textPrimary,
    },
  });
