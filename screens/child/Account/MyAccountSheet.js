import { forwardRef, useCallback, useMemo, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useThemeColors } from "../../../theme/useThemeColors.js";

function AccountRow({
  icon,
  title,
  value,
  danger = false,
  isLast = false,
  onPress,
  colors,
  styles,
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [
        styles.accountRow,
        !isLast && styles.accountRowBorder,
        pressed && styles.accountRowPressed,
      ]}
    >
      <View
        style={[
          styles.accountIconContainer,
          danger && styles.accountIconContainerDanger,
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={danger ? colors.error : colors.primary}
        />
      </View>

      <View style={styles.accountInformation}>
        <Text
          style={[styles.accountTitle, danger && styles.accountTitleDanger]}
        >
          {title}
        </Text>

        {value ? (
          <Text style={styles.accountValue} numberOfLines={1}>
            {value}
          </Text>
        ) : null}
      </View>

      <Ionicons
        name="chevron-forward"
        size={17}
        color={danger ? colors.error : colors.textSecondary}
      />
    </Pressable>
  );
}

const MyAccountSheet = forwardRef(function MyAccountSheet(
  { firstName, email, onEditFirstName, onEditEmail, onDeleteAccount },
  ref,
) {
  const { t } = useTranslation();

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  /*
   * Une ref est préférable ici :
   * sa valeur est modifiée immédiatement avant dismiss().
   */
  const pendingActionRef = useRef(null);

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

  const handleOpenAction = useCallback(
    (action) => {
      pendingActionRef.current = action;
      ref?.current?.dismiss();
    },
    [ref],
  );

  const handleDismiss = useCallback(() => {
    const pendingAction = pendingActionRef.current;

    pendingActionRef.current = null;

    if (pendingAction === "firstName") {
      onEditFirstName?.();
      return;
    }

    if (pendingAction === "email") {
      onEditEmail?.();
      return;
    }

    if (pendingAction === "deleteAccount") {
      onDeleteAccount?.();
    }
  }, [onDeleteAccount, onEditEmail, onEditFirstName]);

  return (
    <BottomSheetModal
      ref={ref}
      index={0}
      enableDynamicSizing
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBackground}
      handleStyle={styles.handle}
      handleIndicatorStyle={styles.handleIndicator}
      onDismiss={handleDismiss}
    >
      <BottomSheetView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{t("My account")}</Text>

          <Text style={styles.description}>
            {t("Manage your personal information and account")}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>{t("Personal information")}</Text>

        <View style={styles.settingsCard}>
          <AccountRow
            icon="person-outline"
            title={t("First name")}
            value={firstName}
            onPress={() => {
              handleOpenAction("firstName");
            }}
            colors={colors}
            styles={styles}
          />

          <AccountRow
            icon="mail-outline"
            title={t("Email address")}
            value={email}
            isLast
            onPress={() => {
              handleOpenAction("email");
            }}
            colors={colors}
            styles={styles}
          />
        </View>

        <Text style={[styles.sectionTitle, styles.dangerSectionTitle]}>
          {t("Danger zone")}
        </Text>

        <View style={styles.settingsCard}>
          <AccountRow
            icon="trash-outline"
            title={t("Delete account")}
            danger
            isLast
            onPress={() => {
              handleOpenAction("deleteAccount");
            }}
            colors={colors}
            styles={styles}
          />
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

export default MyAccountSheet;

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
      paddingHorizontal: 18,
      paddingBottom: 26,
    },

    header: {
      paddingHorizontal: 3,
      paddingTop: 5,
      paddingBottom: 22,
    },

    title: {
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

    sectionTitle: {
      marginBottom: 8,
      paddingHorizontal: 3,
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 13,
      lineHeight: 18,
      color: colors.textSecondary,
    },

    dangerSectionTitle: {
      marginTop: 21,
    },

    settingsCard: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderRadius: 22,
      backgroundColor: colors.white,
      overflow: "hidden",
    },

    accountRow: {
      minHeight: 72,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      paddingVertical: 11,
    },

    accountRowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },

    accountRowPressed: {
      backgroundColor: colors.selectedBackground,
    },

    accountIconContainer: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
      borderRadius: 20,
      backgroundColor: colors.selectedBackground,
    },

    accountIconContainerDanger: {
      backgroundColor: `${colors.error}10`,
    },

    accountInformation: {
      flex: 1,
      minWidth: 0,
      marginRight: 10,
    },

    accountTitle: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 14,
      lineHeight: 20,
      color: colors.textPrimary,
    },

    accountTitleDanger: {
      color: colors.error,
    },

    accountValue: {
      marginTop: 2,
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 11,
      lineHeight: 16,
      color: colors.textSecondary,
    },
  });
