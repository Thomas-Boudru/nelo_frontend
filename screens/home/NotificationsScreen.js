import { useMemo, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import BackButton from "../../components/ui/BackButton.js";
import { useThemeColors } from "../../theme/useThemeColors.js";

const SLEEP_IMAGE = require("../../assets/illustrations/tracking/night.png");

const MEDICATION_IMAGE = require("../../assets/illustrations/tracking/medication.png");

const GROWTH_IMAGE = require("../../assets/illustrations/tracking/height.png");

const NOTE_IMAGE = require("../../assets/illustrations/tracking/note.png");

const MOOD_IMAGE = require("../../assets/illustrations/tracking/mood.png");

const ONE_DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
const NOTIFICATION_RETENTION_DAYS = 30;

function createMockDate(daysAgo, hoursAgo = 0) {
  return new Date(
    Date.now() - daysAgo * ONE_DAY_IN_MILLISECONDS - hoursAgo * 60 * 60 * 1000,
  ).toISOString();
}

/*
 * Ces mocks sont déjà rédigés en français.
 * Leur contenu ne passe donc pas dans t().
 *
 * Plus tard, ils seront remplacés par les notifications
 * récupérées depuis le backend.
 */
const MOCK_NOTIFICATIONS = [
  {
    id: "sleep-ready",
    section: "today",
    type: "sleep",
    title: "Emma semble prête pour sa sieste",
    description: "Elle est éveillée depuis 2 h 05.",
    time: "Il y a 8 min",
    createdAt: createMockDate(0),
    isRead: false,
    action: {
      type: "OPEN_SLEEP",
    },
  },
  {
    id: "medication-dose",
    section: "today",
    type: "medication",
    title: "Prochaine dose prévue",
    description: "Le paracétamol est prévu à 16:30.",
    time: "Il y a 25 min",
    createdAt: createMockDate(0, 1),
    isRead: false,
    action: {
      type: "OPEN_MEDICATION",
      medicationId: "paracetamol",
    },
  },
  {
    id: "daily-summary",
    section: "yesterday",
    type: "summary",
    title: "Votre résumé est prêt",
    description: "Découvrez les moments clés de la journée d’Emma.",
    time: "20:05",
    createdAt: createMockDate(1),
    isRead: true,
    action: {
      type: "OPEN_DAILY_SUMMARY",
    },
  },
  {
    id: "relative-activity",
    section: "yesterday",
    type: "activity",
    title: "Marie a ajouté 4 entrées",
    description: "Les activités ont été ajoutées au suivi d’Emma.",
    time: "18:42",
    createdAt: createMockDate(1, 2),
    isRead: true,
    action: {
      type: "OPEN_TRACKING",
    },
  },
  {
    id: "growth-update",
    section: "yesterday",
    type: "growth",
    title: "Un nouveau point de croissance",
    description: "La courbe de croissance d’Emma a été mise à jour.",
    time: "11:20",
    createdAt: createMockDate(1, 6),
    isRead: true,
    action: {
      type: "OPEN_GROWTH",
    },
  },
];

const NOTIFICATION_TYPE_CONFIG = {
  sleep: {
    image: SLEEP_IMAGE,
    backgroundColor: "#F2F0FF",
  },

  medication: {
    image: MEDICATION_IMAGE,
    backgroundColor: "#FFF6E7",
  },

  summary: {
    image: NOTE_IMAGE,
    backgroundColor: "#FFF7E8",
  },

  activity: {
    image: MOOD_IMAGE,
    backgroundColor: "#EAF9F3",
  },

  growth: {
    image: GROWTH_IMAGE,
    backgroundColor: "#EDF6FF",
  },
};

function isNotificationStillVisible(notification) {
  const createdAtTimestamp = new Date(notification.createdAt).getTime();

  if (Number.isNaN(createdAtTimestamp)) {
    return true;
  }

  const notificationAge = Date.now() - createdAtTimestamp;

  return (
    notificationAge < NOTIFICATION_RETENTION_DAYS * ONE_DAY_IN_MILLISECONDS
  );
}

function NotificationItem({
  notification,
  onPress,
  styles,
  unreadAccessibilityLabel,
}) {
  const typeConfig =
    NOTIFICATION_TYPE_CONFIG[notification.type] ??
    NOTIFICATION_TYPE_CONFIG.summary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={notification.title}
      onPress={() => onPress(notification)}
      style={({ pressed }) => [
        styles.notificationCard,
        !notification.isRead && styles.unreadNotificationCard,
        pressed && styles.notificationCardPressed,
      ]}
    >
      <View
        style={[
          styles.illustrationContainer,
          {
            backgroundColor: typeConfig.backgroundColor,
          },
        ]}
      >
        <Image
          source={typeConfig.image}
          resizeMode="contain"
          style={styles.notificationIllustration}
        />
      </View>

      <View style={styles.notificationContent}>
        <View style={styles.titleRow}>
          {!notification.isRead ? (
            <View
              accessibilityLabel={unreadAccessibilityLabel}
              style={styles.unreadDot}
            />
          ) : null}

          <Text
            numberOfLines={2}
            style={[
              styles.notificationTitle,
              notification.isRead && styles.readNotificationTitle,
            ]}
          >
            {notification.title}
          </Text>
        </View>

        <Text numberOfLines={2} style={styles.notificationDescription}>
          {notification.description}
        </Text>
      </View>

      <Text style={styles.notificationTime}>{notification.time}</Text>
    </Pressable>
  );
}

function NotificationSection({
  title,
  notifications,
  onPressNotification,
  styles,
  unreadAccessibilityLabel,
}) {
  if (notifications.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>

      <View style={styles.notificationList}>
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onPress={onPressNotification}
            styles={styles}
            unreadAccessibilityLabel={unreadAccessibilityLabel}
          />
        ))}
      </View>
    </View>
  );
}

export default function NotificationsScreen({
  navigation,
  onPressNotification,
}) {
  const { t } = useTranslation();

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [notifications, setNotifications] = useState(() =>
    MOCK_NOTIFICATIONS.filter(isNotificationStillVisible),
  );

  const todayNotifications = useMemo(
    () =>
      notifications.filter((notification) => notification.section === "today"),
    [notifications],
  );

  const yesterdayNotifications = useMemo(
    () =>
      notifications.filter(
        (notification) => notification.section === "yesterday",
      ),
    [notifications],
  );

  const hasUnreadNotifications = useMemo(
    () => notifications.some((notification) => notification.isRead === false),
    [notifications],
  );

  const hasNotifications = notifications.length > 0;

  const handleMarkAllAsRead = () => {
    setNotifications((currentNotifications) =>
      currentNotifications.map((notification) => ({
        ...notification,
        isRead: true,
      })),
    );
  };

  const markNotificationAsRead = (notificationId) => {
    setNotifications((currentNotifications) =>
      currentNotifications.map((notification) =>
        notification.id === notificationId
          ? {
              ...notification,
              isRead: true,
            }
          : notification,
      ),
    );
  };

  const handlePressNotification = (notification) => {
    markNotificationAsRead(notification.id);

    if (onPressNotification) {
      onPressNotification(notification);
      return;
    }

    switch (notification.action?.type) {
      case "OPEN_SLEEP":
        navigation?.navigate("TrackingTypeHistory", {
          trackingType: "sleep",
        });
        break;

      case "OPEN_MEDICATION":
        navigation?.navigate("TrackingTypeHistory", {
          trackingType: "medication",
          medicationId: notification.action.medicationId,
        });
        break;

      case "OPEN_DAILY_SUMMARY":
        /*
         * Remplace DailySummary par le nom exact de ta route
         * lorsque l’écran du résumé sera connecté.
         */
        navigation?.navigate("DailySummary");
        break;

      case "OPEN_TRACKING":
        navigation?.navigate("Tracking");
        break;

      case "OPEN_GROWTH":
        navigation?.navigate("TrackingTypeHistory", {
          trackingType: "growth",
        });
        break;

      default:
        break;
    }
  };

  const handlePressPreferences = () => {
    navigation?.navigate("NotificationSettings");
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <BackButton onPress={() => navigation?.goBack()} />
          </View>

          <Text
            pointerEvents="none"
            numberOfLines={1}
            style={styles.screenTitle}
          >
            {t("Notifications")}
          </Text>

          <View style={styles.headerRight}>
            {hasUnreadNotifications ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("Mark all notifications as read")}
                hitSlop={10}
                onPress={handleMarkAllAsRead}
                style={({ pressed }) => [
                  styles.markAllButton,
                  pressed && styles.markAllButtonPressed,
                ]}
              >
                <Text style={styles.markAllText}>{t("Mark all as read")}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {hasNotifications ? (
            <>
              <NotificationSection
                title={t("Today")}
                notifications={todayNotifications}
                onPressNotification={handlePressNotification}
                styles={styles}
                unreadAccessibilityLabel={t("Unread notification")}
              />

              <NotificationSection
                title={t("Yesterday")}
                notifications={yesterdayNotifications}
                onPressNotification={handlePressNotification}
                styles={styles}
                unreadAccessibilityLabel={t("Unread notification")}
              />
            </>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Ionicons
                  name="notifications-outline"
                  size={25}
                  color={colors.primary}
                />
              </View>

              <Text style={styles.emptyTitle}>
                {t("Everything is quiet for now")}
              </Text>

              <Text style={styles.emptyDescription}>
                {t("Your reminders and important updates will appear here")}
              </Text>
            </View>
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("Notification preferences")}
            hitSlop={10}
            onPress={handlePressPreferences}
            style={({ pressed }) => [
              styles.preferencesLink,
              pressed && styles.preferencesLinkPressed,
            ]}
          >
            <Ionicons
              name="settings-outline"
              size={15}
              color={colors.textSecondary}
            />

            <Text style={styles.preferencesLinkText}>
              {t("Notification preferences")}
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.white,
    },

    screen: {
      flex: 1,
      backgroundColor: colors.white,
    },

    header: {
      position: "relative",

      minHeight: 68,

      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",

      paddingHorizontal: 20,
    },

    headerLeft: {
      zIndex: 2,

      width: 110,

      alignItems: "flex-start",
      justifyContent: "center",
    },

    headerRight: {
      zIndex: 2,

      width: 110,

      alignItems: "flex-end",
      justifyContent: "center",
    },

    screenTitle: {
      position: "absolute",

      left: 120,
      right: 120,

      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 20,
      lineHeight: 27,
      textAlign: "center",

      color: colors.textPrimary,
    },

    markAllButton: {
      paddingVertical: 8,
    },

    markAllButtonPressed: {
      opacity: 0.55,
    },

    markAllText: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 11,
      lineHeight: 15,
      textAlign: "right",

      color: colors.primary,
    },

    scrollContent: {
      flexGrow: 1,

      paddingHorizontal: 20,
      paddingTop: 14,
      paddingBottom: 36,
    },

    section: {
      marginBottom: 26,
    },

    sectionTitle: {
      marginBottom: 12,

      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 20,
      lineHeight: 27,

      color: colors.textPrimary,
    },

    notificationList: {
      gap: 10,
    },

    notificationCard: {
      minHeight: 88,

      flexDirection: "row",
      alignItems: "center",

      paddingHorizontal: 12,
      paddingVertical: 11,

      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,

      backgroundColor: colors.white,
    },

    unreadNotificationCard: {
      borderColor: colors.primarySoft,
      backgroundColor: colors.selectedBackground,
    },

    notificationCardPressed: {
      opacity: 0.72,
      transform: [{ scale: 0.995 }],
    },

    illustrationContainer: {
      width: 46,
      height: 46,

      alignItems: "center",
      justifyContent: "center",

      marginRight: 11,

      borderRadius: 14,
    },

    notificationIllustration: {
      width: 34,
      height: 34,
    },

    notificationContent: {
      flex: 1,

      minWidth: 0,
    },

    titleRow: {
      flexDirection: "row",
      alignItems: "center",
    },

    unreadDot: {
      width: 7,
      height: 7,

      marginRight: 7,

      borderRadius: 4,

      backgroundColor: colors.primary,
    },

    notificationTitle: {
      flex: 1,

      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 13,
      lineHeight: 18,

      color: colors.textPrimary,
    },

    readNotificationTitle: {
      fontFamily: "PlusJakartaSans_600SemiBold",
    },

    notificationDescription: {
      marginTop: 3,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 11,
      lineHeight: 16,

      color: colors.textSecondary,
    },

    notificationTime: {
      alignSelf: "flex-start",

      marginLeft: 8,
      paddingTop: 2,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 9,
      lineHeight: 13,
      textAlign: "right",

      color: colors.textSecondary,
    },

    preferencesLink: {
      alignSelf: "center",

      flexDirection: "row",
      alignItems: "center",

      gap: 6,

      paddingHorizontal: 8,
      paddingVertical: 8,
      marginTop: -4,
    },

    preferencesLinkPressed: {
      opacity: 0.55,
    },

    preferencesLinkText: {
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 12,
      lineHeight: 17,

      color: colors.textSecondary,
    },

    emptyState: {
      flex: 1,

      alignItems: "center",
      justifyContent: "center",

      paddingHorizontal: 30,
      paddingVertical: 80,
    },

    emptyIconContainer: {
      width: 52,
      height: 52,

      alignItems: "center",
      justifyContent: "center",

      marginBottom: 14,

      borderRadius: 26,

      backgroundColor: colors.selectedBackground,
    },

    emptyTitle: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 16,
      lineHeight: 22,
      textAlign: "center",

      color: colors.textPrimary,
    },

    emptyDescription: {
      maxWidth: 280,

      marginTop: 6,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 12,
      lineHeight: 18,
      textAlign: "center",

      color: colors.textSecondary,
    },
  });
