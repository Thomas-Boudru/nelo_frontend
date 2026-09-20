import { forwardRef, useCallback, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetFlatList,
  BottomSheetModal,
} from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

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

function MemberRow({ member, currentUserId, onPress, colors, styles, t }) {
  const isCurrentUser = member.id === currentUserId;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={member.firstName}
      onPress={() => onPress?.(member)}
      style={({ pressed }) => [
        styles.memberRow,
        pressed && styles.memberRowPressed,
      ]}
    >
      <View
        style={[
          styles.avatarContainer,
          {
            backgroundColor: colors.selectedBackground,
          },
        ]}
      >
        <Text style={styles.avatarInitial}>{getInitial(member.firstName)}</Text>
      </View>

      <View style={styles.memberInformation}>
        <View style={styles.memberNameRow}>
          <Text style={styles.memberName} numberOfLines={1}>
            {member.firstName}
          </Text>

          {member.role === "owner" ? (
            <View style={styles.ownerBadge}>
              <Text style={styles.ownerBadgeText}>{t("Owner")}</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.memberDetails} numberOfLines={1}>
          {isCurrentUser ? t("You") : getRoleLabel(member.role, t)}
        </Text>
      </View>

      <View style={styles.memberRight}>
        <Ionicons
          name="chevron-forward"
          size={17}
          color={colors.textSecondary}
        />
      </View>
    </Pressable>
  );
}

function PendingInvitationRow({ invitation, onPress, colors, styles, t }) {
  const canOpenInvitation = typeof onPress === "function";

  return (
    <Pressable
      accessibilityRole={canOpenInvitation ? "button" : undefined}
      accessibilityLabel={invitation.email}
      disabled={!canOpenInvitation}
      onPress={() => onPress?.(invitation)}
      style={({ pressed }) => [
        styles.invitationRow,
        pressed && styles.invitationRowPressed,
      ]}
    >
      <View style={styles.invitationIconContainer}>
        <Ionicons name="mail-unread-outline" size={21} color={colors.primary} />
      </View>

      <View style={styles.invitationInformation}>
        <Text style={styles.invitationEmail} numberOfLines={1}>
          {invitation.email}
        </Text>

        <View style={styles.invitationStatusRow}>
          <View style={styles.pendingDot} />

          <Text style={styles.invitationStatus} numberOfLines={1}>
            {t("Invitation pending")}
          </Text>
        </View>
      </View>

      {canOpenInvitation ? (
        <Ionicons
          name="chevron-forward"
          size={17}
          color={colors.textSecondary}
        />
      ) : null}
    </Pressable>
  );
}

const ShareChildProfileSheet = forwardRef(function ShareChildProfileSheet(
  {
    childName,
    members = [],
    pendingInvitations = [],
    currentUserId,
    canManageMembers = false,
    onPressMember,
    onPressInvitation,
    onInviteSomeone,
  },
  ref,
) {
  const { t } = useTranslation();

  const colors = useThemeColors();

  const styles = useMemo(() => createStyles(colors), [colors]);

  const totalItems = members.length + pendingInvitations.length;

  const snapPoints = useMemo(() => {
    if (totalItems <= 1) {
      return ["35%"];
    }

    if (totalItems === 2) {
      return ["43%"];
    }

    if (totalItems === 3) {
      return ["51%"];
    }

    if (totalItems === 4) {
      return ["60%"];
    }

    return ["70%"];
  }, [totalItems]);

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

  const renderMember = ({ item }) => (
    <MemberRow
      member={item}
      currentUserId={currentUserId}
      onPress={onPressMember}
      colors={colors}
      styles={styles}
      t={t}
    />
  );

  const renderPendingInvitations = () => {
    if (pendingInvitations.length === 0) {
      return null;
    }

    return (
      <View style={styles.pendingSection}>
        <Text style={styles.sectionTitle}>{t("Pending invitations")}</Text>

        {pendingInvitations.map((invitation) => (
          <PendingInvitationRow
            key={invitation.id}
            invitation={invitation}
            onPress={onPressInvitation}
            colors={colors}
            styles={styles}
            t={t}
          />
        ))}
      </View>
    );
  };

  const handleInviteSomeone = () => {
    ref?.current?.dismiss();
    onInviteSomeone?.();
  };

  return (
    <BottomSheetModal
      ref={ref}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose
      enableDynamicSizing={false}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBackground}
      handleStyle={styles.handle}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {t("Share child profile", {
              childName,
            })}
          </Text>
        </View>

        <BottomSheetFlatList
          data={members}
          keyExtractor={(item) => item.id}
          renderItem={renderMember}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            members.length > 0 ? (
              <Text style={styles.sectionTitle}>{t("People with access")}</Text>
            ) : null
          }
          ListFooterComponent={renderPendingInvitations}
        />

        {canManageMembers ? (
          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("Invite someone")}
              onPress={handleInviteSomeone}
              style={({ pressed }) => [
                styles.inviteButton,
                pressed && styles.inviteButtonPressed,
              ]}
            >
              <View style={styles.inviteIconContainer}>
                <Ionicons
                  name="person-add-outline"
                  size={21}
                  color={colors.primary}
                />
              </View>

              <View style={styles.inviteInformation}>
                <Text style={styles.inviteTitle}>{t("Invite someone")}</Text>

                <Text style={styles.inviteDescription}>
                  {t("Invite someone by email")}
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={17}
                color={colors.textSecondary}
              />
            </Pressable>
          </View>
        ) : null}
      </View>
    </BottomSheetModal>
  );
});

export default ShareChildProfileSheet;

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
      flex: 1,

      paddingHorizontal: 18,
      paddingBottom: 25,
    },

    header: {
      minHeight: 48,

      justifyContent: "center",

      paddingHorizontal: 2,
      marginBottom: 4,
    },

    title: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 20,
      lineHeight: 28,

      color: colors.textPrimary,
    },

    sectionTitle: {
      marginTop: 4,
      marginBottom: 8,
      paddingHorizontal: 3,

      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 11,
      lineHeight: 16,

      color: colors.textSecondary,

      textTransform: "uppercase",
      letterSpacing: 0.7,
    },

    listContent: {
      paddingBottom: 8,
    },

    memberRow: {
      minHeight: 72,

      flexDirection: "row",
      alignItems: "center",

      paddingHorizontal: 12,
      paddingVertical: 9,
      marginBottom: 7,

      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,

      backgroundColor: colors.white,
    },

    memberRowPressed: {
      backgroundColor: colors.selectedBackground,

      transform: [{ scale: 0.985 }],
    },

    avatarContainer: {
      width: 48,
      height: 48,

      alignItems: "center",
      justifyContent: "center",

      marginRight: 12,

      borderWidth: 2,
      borderColor: colors.white,
      borderRadius: 24,
    },

    avatarInitial: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 18,
      lineHeight: 24,

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
      fontSize: 15,
      lineHeight: 21,

      color: colors.textPrimary,
    },

    memberDetails: {
      marginTop: 2,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 12,
      lineHeight: 17,

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

    memberRight: {
      flexDirection: "row",
      alignItems: "center",

      gap: 8,

      marginLeft: 10,
    },

    pendingSection: {
      marginTop: 8,
    },

    invitationRow: {
      minHeight: 68,

      flexDirection: "row",
      alignItems: "center",

      paddingHorizontal: 12,
      paddingVertical: 9,
      marginBottom: 7,

      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,

      backgroundColor: colors.white,
    },

    invitationRowPressed: {
      backgroundColor: colors.selectedBackground,

      transform: [{ scale: 0.985 }],
    },

    invitationIconContainer: {
      width: 46,
      height: 46,

      alignItems: "center",
      justifyContent: "center",

      marginRight: 12,

      borderWidth: 1.5,
      borderStyle: "dashed",
      borderColor: colors.primary,
      borderRadius: 23,

      backgroundColor: colors.selectedBackground,
    },

    invitationInformation: {
      flex: 1,

      minWidth: 0,
    },

    invitationEmail: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 13,
      lineHeight: 19,

      color: colors.textPrimary,
    },

    invitationStatusRow: {
      flexDirection: "row",
      alignItems: "center",

      marginTop: 3,
    },

    pendingDot: {
      width: 6,
      height: 6,

      marginRight: 6,

      borderRadius: 3,

      backgroundColor: colors.primary,
    },

    invitationStatus: {
      flexShrink: 1,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 11,
      lineHeight: 16,

      color: colors.textSecondary,
    },

    footer: {
      paddingTop: 9,

      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },

    inviteButton: {
      minHeight: 66,

      flexDirection: "row",
      alignItems: "center",

      paddingHorizontal: 10,

      borderRadius: 18,
    },

    inviteButtonPressed: {
      backgroundColor: colors.selectedBackground,
    },

    inviteIconContainer: {
      width: 44,
      height: 44,

      alignItems: "center",
      justifyContent: "center",

      marginRight: 12,

      borderWidth: 1.5,
      borderStyle: "dashed",
      borderColor: colors.primary,
      borderRadius: 22,

      backgroundColor: colors.selectedBackground,
    },

    inviteInformation: {
      flex: 1,

      minWidth: 0,
    },

    inviteTitle: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 14,
      lineHeight: 20,

      color: colors.primary,
    },

    inviteDescription: {
      marginTop: 2,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 10,
      lineHeight: 15,

      color: colors.textSecondary,
    },
  });
