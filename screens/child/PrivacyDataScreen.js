import { useMemo, useState } from "react";
import {
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
import { useToast } from "../../components/ui/toast/useToast.js";

function PrivacySwitchRow({
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

function PrivacyActionRow({
  icon,
  title,
  description,
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
        styles.settingRow,
        !isLast && styles.settingRowBorder,
        pressed && styles.actionRowPressed,
      ]}
    >
      <View
        style={[
          styles.settingIconContainer,
          danger && styles.settingIconContainerDanger,
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={danger ? colors.error : colors.primary}
        />
      </View>

      <View style={styles.settingInformation}>
        <Text
          style={[styles.settingTitle, danger && styles.settingTitleDanger]}
        >
          {title}
        </Text>

        {description ? (
          <Text style={styles.settingDescription}>{description}</Text>
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

function SettingsSection({ title, children, styles }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>

      <View style={styles.settingsCard}>{children}</View>
    </View>
  );
}

export default function PrivacyDataScreen({ navigation }) {
  const { t } = useTranslation();
  const { showToast } = useToast();

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  /*
   * Plus tard, ces valeurs viendront du backend,
   * du stockage local ou du store Redux.
   */
  const [settings, setSettings] = useState({
    usageAnalytics: true,
    crashReports: true,
    improveAiResponses: false,
  });

  const updateSetting = async (settingName, value) => {
    const previousValue = settings[settingName];

    setSettings((currentSettings) => ({
      ...currentSettings,
      [settingName]: value,
    }));

    try {
      /*
       * Plus tard :
       *
       * await api.patch("/users/privacy-preferences", {
       *   [settingName]: value,
       * });
       */

      showToast({
        type: "success",
        title: t("Privacy preference updated"),
        message: t("Your preference has been saved"),
        duration: 2200,
      });
    } catch (error) {
      setSettings((currentSettings) => ({
        ...currentSettings,
        [settingName]: previousValue,
      }));

      showToast({
        type: "error",
        title: t("Unable to save preference"),
        message: t("Please try again"),
      });
    }
  };

  const handleExportData = () => {
    /*
     * Plus tard :
     *
     * navigation.navigate("ExportData");
     *
     * ou :
     *
     * const exportFile = await api.post("/users/data-export");
     */

    showToast({
      type: "info",
      title: t("Data export"),
      message: t("This feature will be available soon"),
    });
  };

  const handleDeleteAccount = () => {
    /*
     * Plus tard, ouvrir une bottom sheet de confirmation.
     *
     * deleteAccountSheetRef.current?.present();
     */

    console.log("Ouvrir la confirmation de suppression du compte");
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.header}>
        <BackButton
          onPress={() => {
            navigation.goBack();
          }}
        />

        <Text style={styles.headerTitle}>{t("Privacy and data")}</Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.privacyCard}>
          <View style={styles.privacyIconContainer}>
            <Ionicons
              name="shield-checkmark-outline"
              size={25}
              color={colors.primary}
            />
          </View>

          <View style={styles.privacyInformation}>
            <Text style={styles.privacyTitle}>
              {t("Your family data is private")}
            </Text>

            <Text style={styles.privacyDescription}>
              {t(
                "Only people you explicitly invite can access your child profile",
              )}
            </Text>
          </View>
        </View>

        <SettingsSection title={t("Data and diagnostics")} styles={styles}>
          <PrivacySwitchRow
            icon="analytics-outline"
            title={t("Usage analytics")}
            description={t("Help improve Nelo with anonymous usage statistics")}
            value={settings.usageAnalytics}
            onValueChange={(value) => {
              updateSetting("usageAnalytics", value);
            }}
            colors={colors}
            styles={styles}
          />

          <PrivacySwitchRow
            icon="bug-outline"
            title={t("Crash reports")}
            description={t(
              "Automatically send reports when an unexpected error occurs",
            )}
            value={settings.crashReports}
            onValueChange={(value) => {
              updateSetting("crashReports", value);
            }}
            colors={colors}
            styles={styles}
          />

          <PrivacySwitchRow
            icon="sparkles-outline"
            title={t("Improve AI responses")}
            description={t(
              "Allow anonymous questions to help improve future responses",
            )}
            value={settings.improveAiResponses}
            onValueChange={(value) => {
              updateSetting("improveAiResponses", value);
            }}
            isLast
            colors={colors}
            styles={styles}
          />
        </SettingsSection>

        <SettingsSection title={t("Your data")} styles={styles}>
          <PrivacyActionRow
            icon="download-outline"
            title={t("Export your data")}
            description={t(
              "Download the information associated with your account",
            )}
            onPress={handleExportData}
            colors={colors}
            styles={styles}
          />
        </SettingsSection>

        <View style={styles.footerInformation}>
          <Ionicons
            name="lock-closed-outline"
            size={17}
            color={colors.textSecondary}
          />

          <Text style={styles.footerInformationText}>
            {t(
              "You remain in control of your information and privacy preferences",
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
      paddingBottom: 42,
    },

    privacyCard: {
      flexDirection: "row",
      alignItems: "center",

      paddingHorizontal: 16,
      paddingVertical: 16,
      marginBottom: 24,

      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 22,

      backgroundColor: colors.selectedBackground,
    },

    privacyIconContainer: {
      width: 48,
      height: 48,

      alignItems: "center",
      justifyContent: "center",

      marginRight: 13,

      borderRadius: 24,

      backgroundColor: colors.white,
    },

    privacyInformation: {
      flex: 1,
      minWidth: 0,
    },

    privacyTitle: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 14,
      lineHeight: 20,

      color: colors.textPrimary,
    },

    privacyDescription: {
      marginTop: 4,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 11,
      lineHeight: 17,

      color: colors.textSecondary,
    },

    section: {
      marginBottom: 22,
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
      minHeight: 78,

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

    actionRowPressed: {
      backgroundColor: colors.selectedBackground,
    },

    settingIconContainer: {
      width: 40,
      height: 40,

      alignItems: "center",
      justifyContent: "center",

      marginRight: 11,

      borderRadius: 20,

      backgroundColor: colors.selectedBackground,
    },

    settingIconContainerDanger: {
      backgroundColor: `${colors.error}10`,
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

    settingTitleDanger: {
      color: colors.error,
    },

    settingDescription: {
      marginTop: 2,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 11,
      lineHeight: 16,

      color: colors.textSecondary,
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
