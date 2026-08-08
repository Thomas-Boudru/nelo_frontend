import { useMemo, useState } from "react";
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import BackButton from "../../components/ui/BackButton.js";
import { useThemeColors } from "../../theme/useThemeColors.js";

function NotificationSettingRow({
  icon,
  title,
  description,
  value,
  disabled = false,
  isLast = false,
  onValueChange,
  colors,
  styles,
}) {
  return (
    <View
      style={[
        styles.settingRow,
        !isLast && styles.settingRowBorder,
        disabled && styles.settingRowDisabled,
      ]}
    >
      <View style={styles.settingIconContainer}>
        <Ionicons
          name={icon}
          size={20}
          color={disabled ? colors.textSecondary : colors.primary}
        />
      </View>

      <View style={styles.settingInformation}>
        <Text style={styles.settingTitle}>{title}</Text>

        {description ? (
          <Text style={styles.settingDescription}>{description}</Text>
        ) : null}
      </View>

      <Switch
        accessibilityRole="switch"
        accessibilityLabel={title}
        accessibilityState={{
          checked: value,
          disabled,
        }}
        value={value}
        disabled={disabled}
        onValueChange={onValueChange}
        trackColor={{
          false: colors.border,
          true: colors.primary,
        }}
        thumbColor={colors.white}
        ios_backgroundColor={colors.border}
      />
    </View>
  );
}

function SettingsSection({ title, children, styles }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>

      <View style={styles.settingsCard}>{children}</View>
    </View>
  );
}

export default function NotificationSettingsScreen({ navigation }) {
  const { t } = useTranslation();

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [systemPermissionGranted, setSystemPermissionGranted] = useState(true);

  const [settings, setSettings] = useState({
    notificationsEnabled: true,
    trackingReminders: false,
    dailyNeloMessage: true,
    invitationAccepted: true,
    importantSharedActivity: false,
  });

  const notificationsEnabled =
    settings.notificationsEnabled && systemPermissionGranted;

  const updateSetting = (settingName, value) => {
    setSettings((currentSettings) => ({
      ...currentSettings,
      [settingName]: value,
    }));
  };

  const handleToggleNotifications = async (enabled) => {
    if (!enabled) {
      updateSetting("notificationsEnabled", false);
      return;
    }

    /*
     * Plus tard :
     *
     * const permission =
     *   await Notifications.requestPermissionsAsync();
     *
     * const granted =
     *   permission.status === "granted";
     *
     * setSystemPermissionGranted(granted);
     *
     * if (granted) {
     *   updateSetting("notificationsEnabled", true);
     * }
     */

    setSystemPermissionGranted(true);
    updateSetting("notificationsEnabled", true);
  };

  const handleOpenPhoneSettings = async () => {
    try {
      await Linking.openSettings();
    } catch (error) {
      console.log("Unable to open phone settings:", error);
    }
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.header}>
        <BackButton
          onPress={() => {
            navigation.goBack();
          }}
        />

        <Text style={styles.headerTitle}>{t("Notifications")}</Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {!systemPermissionGranted ? (
          <View style={styles.permissionCard}>
            <View style={styles.permissionIconContainer}>
              <Ionicons
                name="notifications-off-outline"
                size={21}
                color={colors.primary}
              />
            </View>

            <View style={styles.permissionInformation}>
              <Text style={styles.permissionTitle}>
                {t("Notifications are disabled on this device")}
              </Text>

              <Text style={styles.permissionDescription}>
                {t(
                  "Enable notifications in your phone settings to receive updates from Nelo",
                )}
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("Open settings")}
              onPress={handleOpenPhoneSettings}
              style={({ pressed }) => [
                styles.openSettingsButton,
                pressed && styles.openSettingsButtonPressed,
              ]}
            >
              <Text style={styles.openSettingsButtonText}>
                {t("Open settings")}
              </Text>
            </Pressable>
          </View>
        ) : null}

        <SettingsSection title={t("General")} styles={styles}>
          <NotificationSettingRow
            icon="notifications-outline"
            title={t("Allow notifications")}
            description={t("Receive notifications from Nelo")}
            value={settings.notificationsEnabled}
            onValueChange={handleToggleNotifications}
            isLast
            colors={colors}
            styles={styles}
          />
        </SettingsSection>

        <SettingsSection title={t("Child tracking")} styles={styles}>
          <NotificationSettingRow
            icon="time-outline"
            title={t("Tracking reminders")}
            description={t(
              "Remind me if I have not logged anything for a while",
            )}
            value={settings.trackingReminders}
            disabled={!notificationsEnabled}
            onValueChange={(value) => {
              updateSetting("trackingReminders", value);
            }}
            isLast
            colors={colors}
            styles={styles}
          />
        </SettingsSection>

        <SettingsSection title={t("Nelo messages")} styles={styles}>
          <NotificationSettingRow
            icon="sparkles-outline"
            title={t("Daily tip and reassurance")}
            description={t(
              "Receive an occasional parenting tip or reassuring message",
            )}
            value={settings.dailyNeloMessage}
            disabled={!notificationsEnabled}
            onValueChange={(value) => {
              updateSetting("dailyNeloMessage", value);
            }}
            isLast
            colors={colors}
            styles={styles}
          />
        </SettingsSection>

        <SettingsSection title={t("Family and sharing")} styles={styles}>
          <NotificationSettingRow
            icon="person-add-outline"
            title={t("Invitation accepted")}
            description={t("Someone joined a child profile you shared")}
            value={settings.invitationAccepted}
            disabled={!notificationsEnabled}
            onValueChange={(value) => {
              updateSetting("invitationAccepted", value);
            }}
            colors={colors}
            styles={styles}
          />

          <NotificationSettingRow
            icon="people-outline"
            title={t("Important shared activity")}
            description={t("Another member added important information")}
            value={settings.importantSharedActivity}
            disabled={!notificationsEnabled}
            onValueChange={(value) => {
              updateSetting("importantSharedActivity", value);
            }}
            isLast
            colors={colors}
            styles={styles}
          />
        </SettingsSection>

        <View style={styles.footerInformation}>
          <Ionicons
            name="information-circle-outline"
            size={17}
            color={colors.textSecondary}
          />

          <Text style={styles.footerInformationText}>
            {t(
              "Nelo will not notify you for every bottle diaper or tracking entry",
            )}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,

      backgroundColor: colors.background,
    },

    header: {
      minHeight: 64,

      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",

      paddingHorizontal: 20,
    },

    headerTitle: {
      flex: 1,

      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 19,
      lineHeight: 26,
      textAlign: "center",

      color: colors.textPrimary,
    },

    headerSpacer: {
      width: 40,
      height: 40,
    },

    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 40,
    },

    section: {
      marginBottom: 20,
    },

    sectionTitle: {
      marginBottom: 8,
      paddingHorizontal: 3,

      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 13,
      lineHeight: 18,

      color: colors.textSecondary,
    },

    settingsCard: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderRadius: 22,

      backgroundColor: colors.white,

      overflow: "hidden",

      shadowColor: colors.textPrimary,
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.03,
      shadowRadius: 12,

      elevation: 2,
    },

    settingRow: {
      minHeight: 74,

      flexDirection: "row",
      alignItems: "center",

      paddingHorizontal: 14,
      paddingVertical: 11,
    },

    settingRowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },

    settingRowDisabled: {
      opacity: 0.45,
    },

    settingIconContainer: {
      width: 38,
      height: 38,

      alignItems: "center",
      justifyContent: "center",

      marginRight: 11,

      borderRadius: 19,

      backgroundColor: colors.selectedBackground,
    },

    settingInformation: {
      flex: 1,

      minWidth: 0,
      marginRight: 10,
    },

    settingTitle: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 14,
      lineHeight: 20,

      color: colors.textPrimary,
    },

    settingDescription: {
      marginTop: 2,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 11,
      lineHeight: 16,

      color: colors.textSecondary,
    },

    permissionCard: {
      flexDirection: "row",
      alignItems: "center",

      padding: 13,
      marginBottom: 20,

      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,

      backgroundColor: colors.selectedBackground,
    },

    permissionIconContainer: {
      width: 40,
      height: 40,

      alignItems: "center",
      justifyContent: "center",

      marginRight: 10,

      borderRadius: 20,

      backgroundColor: colors.white,
    },

    permissionInformation: {
      flex: 1,

      minWidth: 0,
      marginRight: 9,
    },

    permissionTitle: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 12,
      lineHeight: 17,

      color: colors.textPrimary,
    },

    permissionDescription: {
      marginTop: 2,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 10,
      lineHeight: 15,

      color: colors.textSecondary,
    },

    openSettingsButton: {
      paddingHorizontal: 10,
      paddingVertical: 8,

      borderRadius: 14,

      backgroundColor: colors.white,
    },

    openSettingsButtonPressed: {
      opacity: 0.7,
    },

    openSettingsButtonText: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 10,
      lineHeight: 14,

      color: colors.primary,
    },

    footerInformation: {
      flexDirection: "row",
      alignItems: "flex-start",

      gap: 8,

      paddingHorizontal: 4,
      marginTop: -2,
    },

    footerInformationText: {
      flex: 1,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 11,
      lineHeight: 16,

      color: colors.textSecondary,
    },
  });
