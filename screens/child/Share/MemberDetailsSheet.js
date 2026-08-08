import { forwardRef, useCallback, useEffect, useMemo, useState } from "react";
import { Keyboard, Pressable, StyleSheet, Text, View } from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import PrimaryButton from "../../../components/ui/PrimaryButton";
import { useThemeColors } from "../../../theme/useThemeColors";

function getInitial(name = "") {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function getRoleLabel(role, t) {
  if (role === "owner") {
    return t("Owner");
  }

  if (role === "contributor") {
    return t("Contributor");
  }

  return t("Viewer");
}

const MemberDetailsSheet = forwardRef(function MemberDetailsSheet(
  {
    member,
    childName,
    currentUserId,
    canManageMembers = false,
    isRemoving = false,
    onRemoveMember,
    onMemberRemoved,
  },
  ref,
) {
  const { t } = useTranslation();

  const colors = useThemeColors();

  const styles = useMemo(() => createStyles(colors), [colors]);

  const [step, setStep] = useState("details");
  const [error, setError] = useState("");

  const snapPoints = useMemo(
    () => (step === "confirmRemove" ? ["38%"] : ["43%"]),
    [step],
  );

  const isCurrentUser = member?.id === currentUserId;
  const isOwner = member?.role === "owner";

  const canRemoveMember =
    Boolean(member) && canManageMembers && !isCurrentUser && !isOwner;

  useEffect(() => {
    setStep("details");
    setError("");
  }, [member?.id]);

  const renderBackdrop = useCallback(
    (props) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior={isRemoving ? "none" : "close"}
        opacity={0.42}
      />
    ),
    [isRemoving],
  );

  const resetSheet = useCallback(() => {
    Keyboard.dismiss();
    setStep("details");
    setError("");
  }, []);

  const handleDismiss = useCallback(() => {
    resetSheet();
  }, [resetSheet]);

  const handleOpenRemoveConfirmation = () => {
    if (!canRemoveMember) {
      return;
    }

    setError("");
    setStep("confirmRemove");
  };

  const handleCancelRemove = () => {
    setError("");
    setStep("details");
  };

  const handleRemoveMember = async () => {
    if (!member?.id || !canRemoveMember) {
      return;
    }

    setError("");

    try {
      const removed = await onRemoveMember?.({
        memberId: member.id,
        member,
        childName,
      });

      if (removed === false) {
        return;
      }

      ref?.current?.dismiss();

      onMemberRemoved?.({
        memberId: member.id,
        member,
        childName,
      });
    } catch (removeError) {
      setError(removeError?.message || t("Unable to remove member"));
    }
  };

  if (!member) {
    return null;
  }

  return (
    <BottomSheetModal
      ref={ref}
      index={0}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      enablePanDownToClose={!isRemoving}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBackground}
      handleStyle={styles.handle}
      handleIndicatorStyle={styles.handleIndicator}
      onDismiss={handleDismiss}
    >
      <BottomSheetView style={styles.container}>
        {step === "details" ? (
          <>
            <View style={styles.memberHeader}>
              <View style={styles.avatarContainer}>
                <Text style={styles.avatarInitial}>
                  {getInitial(member.firstName)}
                </Text>
              </View>

              <View style={styles.memberInformation}>
                <View style={styles.memberNameRow}>
                  <Text style={styles.memberName} numberOfLines={1}>
                    {member.firstName}
                  </Text>

                  {isOwner ? (
                    <View style={styles.ownerBadge}>
                      <Text style={styles.ownerBadgeText}>{t("Owner")}</Text>
                    </View>
                  ) : null}
                </View>

                <Text style={styles.memberRole}>
                  {isCurrentUser ? t("You") : getRoleLabel(member.role, t)}
                </Text>
              </View>
            </View>

            <View style={styles.accessCard}>
              <View style={styles.accessIconContainer}>
                <Ionicons
                  name="people-outline"
                  size={19}
                  color={colors.primary}
                />
              </View>

              <View style={styles.accessInformation}>
                <Text style={styles.accessTitle}>
                  {t("Access to child profile", {
                    childName,
                  })}
                </Text>

                <Text style={styles.accessDescription}>
                  {member.role === "viewer"
                    ? t(
                        "This member can view information from the child profile",
                        {
                          childName,
                        },
                      )
                    : t(
                        "This member can view and add information to the child profile",
                        {
                          childName,
                        },
                      )}
                </Text>
              </View>
            </View>

            {canRemoveMember ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("Remove access")}
                onPress={handleOpenRemoveConfirmation}
                style={({ pressed }) => [
                  styles.removeAccessButton,
                  pressed && styles.removeAccessButtonPressed,
                ]}
              >
                <View style={styles.removeIconContainer}>
                  <Ionicons
                    name="person-remove-outline"
                    size={20}
                    color={colors.error}
                  />
                </View>

                <View style={styles.removeInformation}>
                  <Text style={styles.removeTitle}>{t("Remove access")}</Text>

                  <Text style={styles.removeDescription}>
                    {t("Remove member from child profile", {
                      memberName: member.firstName,
                      childName,
                    })}
                  </Text>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={17}
                  color={colors.error}
                />
              </Pressable>
            ) : (
              <View style={styles.protectedCard}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={19}
                  color={colors.primary}
                />

                <Text style={styles.protectedText}>
                  {isOwner
                    ? t("The profile owner cannot be removed")
                    : t("You cannot remove your own access here")}
                </Text>
              </View>
            )}
          </>
        ) : (
          <>
            <View style={styles.confirmationHeader}>
              <View style={styles.warningIconContainer}>
                <Ionicons
                  name="person-remove-outline"
                  size={25}
                  color={colors.error}
                />
              </View>

              <Text style={styles.confirmationTitle}>
                {t("Remove member confirmation title", {
                  memberName: member.firstName,
                })}
              </Text>

              <Text style={styles.confirmationDescription}>
                {t("Remove member confirmation description", {
                  memberName: member.firstName,
                  childName,
                })}
              </Text>
            </View>

            {error ? (
              <View style={styles.errorCard}>
                <Ionicons
                  name="alert-circle-outline"
                  size={18}
                  color={colors.error}
                />

                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.confirmationActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("Cancel")}
                disabled={isRemoving}
                onPress={handleCancelRemove}
                style={({ pressed }) => [
                  styles.cancelButton,
                  pressed && !isRemoving && styles.cancelButtonPressed,
                  isRemoving && styles.cancelButtonDisabled,
                ]}
              >
                <Text style={styles.cancelButtonText}>{t("Cancel")}</Text>
              </Pressable>

              <View style={styles.removeButtonContainer}>
                <PrimaryButton
                  title={t("Remove")}
                  variant="destructive"
                  loading={isRemoving}
                  onPress={handleRemoveMember}
                />
              </View>
            </View>
          </>
        )}
      </BottomSheetView>
    </BottomSheetModal>
  );
});

export default MemberDetailsSheet;

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
      paddingHorizontal: 20,
      paddingBottom: 24,
    },

    memberHeader: {
      flexDirection: "row",
      alignItems: "center",

      paddingTop: 8,
    },

    avatarContainer: {
      width: 58,
      height: 58,

      alignItems: "center",
      justifyContent: "center",

      marginRight: 14,

      borderWidth: 3,
      borderColor: colors.white,
      borderRadius: 29,

      backgroundColor: colors.selectedBackground,
    },

    avatarInitial: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 21,
      lineHeight: 28,

      color: colors.primary,
    },

    memberInformation: {
      flex: 1,

      minWidth: 0,
    },

    memberNameRow: {
      flexDirection: "row",
      alignItems: "center",

      gap: 8,
    },

    memberName: {
      flexShrink: 1,

      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 20,
      lineHeight: 27,

      color: colors.textPrimary,
    },

    memberRole: {
      marginTop: 3,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 13,
      lineHeight: 18,

      color: colors.textSecondary,
    },

    ownerBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,

      borderRadius: 10,

      backgroundColor: colors.selectedBackground,
    },

    ownerBadgeText: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 9,
      lineHeight: 12,

      color: colors.primary,
    },

    accessCard: {
      flexDirection: "row",
      alignItems: "flex-start",

      paddingHorizontal: 14,
      paddingVertical: 14,
      marginTop: 22,

      borderRadius: 18,

      backgroundColor: colors.selectedBackground,
    },

    accessIconContainer: {
      width: 32,
      height: 32,

      alignItems: "center",
      justifyContent: "center",

      marginRight: 11,

      borderRadius: 16,

      backgroundColor: colors.white,
    },

    accessInformation: {
      flex: 1,

      minWidth: 0,
    },

    accessTitle: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 13,
      lineHeight: 18,

      color: colors.textPrimary,
    },

    accessDescription: {
      marginTop: 3,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 11,
      lineHeight: 17,

      color: colors.textSecondary,
    },

    removeAccessButton: {
      minHeight: 70,

      flexDirection: "row",
      alignItems: "center",

      paddingHorizontal: 12,
      marginTop: 16,

      borderWidth: 1,
      borderColor: `${colors.error}25`,
      borderRadius: 19,

      backgroundColor: `${colors.error}08`,
    },

    removeAccessButtonPressed: {
      opacity: 0.72,

      transform: [{ scale: 0.99 }],
    },

    removeIconContainer: {
      width: 42,
      height: 42,

      alignItems: "center",
      justifyContent: "center",

      marginRight: 12,

      borderRadius: 21,

      backgroundColor: `${colors.error}12`,
    },

    removeInformation: {
      flex: 1,

      minWidth: 0,
    },

    removeTitle: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 14,
      lineHeight: 20,

      color: colors.error,
    },

    removeDescription: {
      marginTop: 2,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 10,
      lineHeight: 15,

      color: colors.textSecondary,
    },

    protectedCard: {
      flexDirection: "row",
      alignItems: "center",

      gap: 10,

      paddingHorizontal: 14,
      paddingVertical: 13,
      marginTop: 16,

      borderRadius: 17,

      backgroundColor: colors.selectedBackground,
    },

    protectedText: {
      flex: 1,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 11,
      lineHeight: 17,

      color: colors.textSecondary,
    },

    confirmationHeader: {
      alignItems: "center",

      paddingTop: 8,
    },

    warningIconContainer: {
      width: 58,
      height: 58,

      alignItems: "center",
      justifyContent: "center",

      borderRadius: 29,

      backgroundColor: `${colors.error}12`,
    },

    confirmationTitle: {
      marginTop: 16,

      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 20,
      lineHeight: 28,
      textAlign: "center",

      color: colors.textPrimary,
    },

    confirmationDescription: {
      maxWidth: 330,

      marginTop: 7,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 13,
      lineHeight: 20,
      textAlign: "center",

      color: colors.textSecondary,
    },

    errorCard: {
      flexDirection: "row",
      alignItems: "flex-start",

      gap: 9,

      paddingHorizontal: 13,
      paddingVertical: 12,
      marginTop: 14,

      borderRadius: 16,

      backgroundColor: `${colors.error}10`,
    },

    errorText: {
      flex: 1,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 11,
      lineHeight: 17,

      color: colors.error,
    },

    confirmationActions: {
      flexDirection: "row",
      alignItems: "center",

      gap: 12,

      marginTop: 24,
    },

    cancelButton: {
      minHeight: 56,

      flex: 1,
      alignItems: "center",
      justifyContent: "center",

      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 19,

      backgroundColor: colors.white,
    },

    cancelButtonPressed: {
      backgroundColor: colors.selectedBackground,

      transform: [{ scale: 0.985 }],
    },

    cancelButtonDisabled: {
      opacity: 0.55,
    },

    cancelButtonText: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 15,
      lineHeight: 21,

      color: colors.textPrimary,
    },

    removeButtonContainer: {
      flex: 1,
    },
  });
