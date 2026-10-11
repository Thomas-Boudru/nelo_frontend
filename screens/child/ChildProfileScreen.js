import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { getLatestLocalGrowthMeasurements } from "../../database/tracking/growth/growthRepository.js";

import { useDispatch, useSelector } from "react-redux";
import {
  getLocalUserPreferences,
  saveUserLanguageLocally,
  saveUserMeasurementUnitLocally,
} from "../../database/user/userPreferencesRepository.js";
import {
  requestEmailChange,
  updatePreferredName,
  verifyEmailChange,
} from "../../api/user/userApi.js";

import {
  measurementUnitChanged,
  measurementUnitsReset,
} from "../../store/slices/measurementUnitsSlice.js";

import { enqueueSyncOperation } from "../../sync/syncQueueRepository.js";

import { resetOnboarding } from "../../store/slices/onboardingSlice.js";

import { clearInvitations } from "../../store/slices/invitationsSlice.js";

import { Image as ExpoImage } from "expo-image";

import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { MaterialIcons } from "@expo/vector-icons";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import ChildSelectorSheet from "./ChildSelectorSheet.js";
import ChildThemeSheet from "./ChildThemeSheet.js";
import FeedingPreferencesSheet from "./PrimaryFeedingMethodSheet.js";
import TrackingPreferencesSheet from "./TrackingPreferencesSheet.js";
import ShareChildProfileSheet from "./Share/ShareChildProfileSheet.js";
import InviteMemberSheet from "./Share/InviteMemberSheet.js";
import { useThemeColors } from "../../theme/useThemeColors.js";
import MemberDetailsSheet from "./Share/MemberDetailsSheet.js";
import LanguageSelectionSheet, { LANGUAGES } from "./LanguageSelectionSheet.js";
import { useToast } from "../../components/ui/toast/useToast.js";
import MeasurementUnitsSheet from "./MeasurementUnitsSheet.js";
import MyAccountSheet from "./Account/MyAccountSheet.js";
import EditFirstNameSheet from "./Account/EditFirstNameSheet.js";
import EditEmailSheet from "./Account/EditEmailSheet.js";
import DeleteAccountSheet from "./Account/DeleteAccountSheet.js";
import * as WebBrowser from "expo-web-browser";
import DeleteChildProfileSheet from "./DeleteChildProfileSheet.js";
import ChildPictureSheet from "./ChildPictureScreen.js";
import BabyFaceIcon from "../../assets/icons/header/faceBaby.svg";
import ShareChildDataSheet from "./Share/ShareChildDataSheet.js";
import { navigateToTrackingHistory } from "../../navigation/trackingHistoryDestinations.js";
import RelationshipSettingsSheet from "./RelationshipSettingsSheet.js";

import { deleteCurrentAccount } from "../../api/user/userApi.js";
import { deleteLocalUserData } from "../../database/user/deleteLocalUserData.js";

import {
  createChildInvitation,
  getChildSharing,
  removeChildMember,
  resendChildInvitation,
  revokeChildInvitation,
  makeChildMemberOwner,
  deleteChild,
} from "../../api/children/childrenApi.js";
import { useAuth } from "../../auth/AuthProvider.js";
import PendingInvitationDetailsSheet from "./Share/PendingInvitationDetailsSheet.js";

import {
  loadChildren,
  removeChildAvatar,
  selectChild,
  updateChildAvatar,
  updateChildPreferences,
  updateCurrentUserRelationship,
  removeDeletedChild,
  clearChildren,
} from "../../store/slices/childrenSlice.js";

import { useFocusEffect } from "@react-navigation/native";

import { processSyncQueue } from "../../sync/processSyncQueue.js";

import { setThemeMode } from "../../store/slices/themeSlice.js";

const WEIGHT_IMAGE = require("../../assets/illustrations/tracking/weightBlue.png");

const HEIGHT_IMAGE = require("../../assets/illustrations/tracking/height.png");

const HEAD_CIRCUMFERENCE_IMAGE = require("../../assets/illustrations/tracking/headBlue.png");

const DEFAULT_VISIBLE_TRACKING_TYPES = [
  "feeding",
  "sleep",
  "diaper",
  "mood",
  "medication",
  "temperature",
  "symptoms",
  "teething",
  "weight",
  "height",
  "headCircumference",
  "note",
];

const DEFAULT_VISIBLE_FEEDING_METHODS = [
  "breastfeeding",
  "bottle",
  "solids",
  "pumping",
];

const BABY_FALLBACK_IMAGES = {
  blue: require("../../assets/icons/header/babyBlue.png"),
  pink: require("../../assets/icons/header/babyPink.png"),
  green: require("../../assets/icons/header/babyGreen.png"),
};

function ProfileSettingRow({
  icon,
  title,
  value,
  badge,
  danger = false,
  showChevron = true,
  showThemeDot = false,
  themeColor,
  onPress,
  isLast = false,
  loading = false,
  colors,
  styles,
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: loading, busy: loading }}
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.settingRow,
        !isLast && styles.settingRowBorder,
        pressed && styles.settingRowPressed,
        loading && styles.settingRowLoading,
      ]}
    >
      <View style={styles.settingIconContainer}>
        <Ionicons
          name={icon}
          size={21}
          color={danger ? colors.error : styles.settingIcon.color}
        />
      </View>

      <Text
        style={[styles.settingTitle, danger && styles.settingTitleDanger]}
        numberOfLines={1}
      >
        {title}
      </Text>

      <View style={styles.settingRight}>
        {showThemeDot ? (
          <View
            style={[
              styles.themeDot,
              {
                backgroundColor: themeColor ?? colors.primary,
              },
            ]}
          />
        ) : null}

        {value ? (
          <Text style={styles.settingValue} numberOfLines={1}>
            {value}
          </Text>
        ) : null}

        {badge ? (
          <View style={styles.settingBadge}>
            <Text style={styles.settingBadgeText}>{badge}</Text>
          </View>
        ) : null}

        {loading ? (
          <ActivityIndicator
            size="small"
            color={danger ? colors.error : colors.textSecondary}
          />
        ) : showChevron ? (
          <Ionicons
            name="chevron-forward"
            size={15}
            color={colors.textSecondary}
          />
        ) : null}
      </View>
    </Pressable>
  );
}

function MeasurementItem({
  image,
  label,
  value,
  isLast = false,
  onPress,
  styles,
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.measurementItem,
        !isLast && styles.measurementItemBorder,
        pressed && styles.measurementPressed,
      ]}
    >
      <View style={styles.measurementIconContainer}>
        <Image
          source={image}
          resizeMode="contain"
          style={styles.measurementIcon}
        />
      </View>

      <Text style={styles.measurementValue}>{value}</Text>
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

function calculateAgeInMonths(birthDate) {
  if (!birthDate) {
    return null;
  }

  const [year, month, day] = birthDate.slice(0, 10).split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  const today = new Date();

  let ageInMonths =
    (today.getFullYear() - year) * 12 + today.getMonth() - (month - 1);

  if (today.getDate() < day) {
    ageInMonths -= 1;
  }

  return Math.max(0, ageInMonths);
}

function formatChildDate(dateValue, language) {
  if (!dateValue) {
    return null;
  }

  const [year, month, day] = dateValue.slice(0, 10).split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return new Intl.DateTimeFormat(language, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

export default function ChildProfileScreen({ navigation }) {
  const { t, i18n } = useTranslation();

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { showToast } = useToast();
  const languageSelectionSheetRef = useRef(null);

  const [latestMeasurements, setLatestMeasurements] = useState({
    weight: null,
    height: null,
    headCircumference: null,
  });

  const [selectedLanguage, setSelectedLanguage] = useState(
    i18n.resolvedLanguage || i18n.language || "en",
  );
  const { user, accessToken, logout, refreshSession, updateAuthenticatedUser } =
    useAuth();

  const [isSendingInvitation, setIsSendingInvitation] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!user?.id) {
      return undefined;
    }

    getLocalUserPreferences(user.id)
      .then((preferences) => {
        if (cancelled || !preferences) {
          return;
        }

        if (preferences.languageCode) {
          setSelectedLanguage(preferences.languageCode);
          return i18n.changeLanguage(preferences.languageCode);
        }

        setSelectedLanguage(i18n.resolvedLanguage || i18n.language || "en");
      })
      .catch((error) => {
        console.error("Unable to load local language preference:", error);
      });

    return () => {
      cancelled = true;
    };
  }, [i18n, user?.id]);

  const dispatch = useDispatch();

  const reduxChildren = useSelector((state) => state.children.children);

  const reduxSelectedChildId = useSelector(
    (state) => state.children.selectedChildId,
  );
  const children = useMemo(
    () =>
      reduxChildren.map((reduxChild) => {
        const ageInMonths =
          reduxChild.status === "born"
            ? calculateAgeInMonths(reduxChild.birthDate)
            : null;

        const relevantDate =
          reduxChild.status === "expected"
            ? reduxChild.expectedDueDate
            : reduxChild.birthDate;

        return {
          ...reduxChild,

          firstName: reduxChild.displayName || t("Baby"),

          ageInMonths,

          ageLabel:
            reduxChild.status === "expected"
              ? t("Expected date of birth")
              : ageInMonths !== null
                ? t("Child age in months", {
                    count: ageInMonths,
                  })
                : t("Age not specified"),

          birthDateLabel: relevantDate
            ? formatChildDate(relevantDate, i18n.language)
            : t("Date not specified"),

          profilePicture: reduxChild.avatar?.url
            ? {
                uri: reduxChild.avatar.url,
                cacheKey:
                  `child-avatar:${reduxChild.id}:` +
                  reduxChild.avatar.attachmentId,
              }
            : null,

          sharedPeopleCount: reduxChild.sharedPeopleCount ?? 0,

          currentUserRelationship: reduxChild.currentUserRelationship ?? null,

          currentUserRole: reduxChild.role || "contributor",
        };
      }),
    [i18n.language, reduxChildren, t],
  );

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);

    try {
      dispatch(clearInvitations());
      dispatch(resetOnboarding());
      dispatch(measurementUnitsReset());

      await logout();
    } catch (error) {
      console.error("Unable to log out:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };
  const childSelectorSheetRef = useRef(null);
  const childThemeSheetRef = useRef(null);
  const feedingMethodSheetRef = useRef(null);
  const trackingPreferencesSheetRef = useRef(null);
  const shareChildProfileSheetRef = useRef(null);
  const inviteMemberSheetRef = useRef(null);
  const memberDetailsSheetRef = useRef(null);
  const measurementUnitsSheetRef = useRef(null);
  const shareChildDataSheetRef = useRef(null);
  const pendingInvitationDetailsSheetRef = useRef(null);

  const myAccountSheetRef = useRef(null);
  const editFirstNameSheetRef = useRef(null);
  const editEmailSheetRef = useRef(null);
  const deleteAccountSheetRef = useRef(null);
  const deleteChildProfileSheetRef = useRef(null);
  const childPictureSheetRef = useRef(null);
  const relationshipSettingsSheetRef = useRef(null);

  const [isDeletingChildProfile, setIsDeletingChildProfile] = useState(false);

  const [isSavingFirstName, setIsSavingFirstName] = useState(false);
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isUpdatingChildPicture, setIsUpdatingChildPicture] = useState(false);
  const [activeShareLinks, setActiveShareLinks] = useState([]);
  const [isSavingRelationship, setIsSavingRelationship] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const measurementUnits = useSelector((state) => state.measurementUnits);

  const [selectedMember, setSelectedMember] = useState(null);
  const [isRemovingMember, setIsRemovingMember] = useState(false);
  const [isAssigningOwner, setIsAssigningOwner] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [members, setMembers] = useState([]);
  const [isLoadingSharing, setIsLoadingSharing] = useState(false);

  const child =
    children.find((item) => item.id === reduxSelectedChildId) ?? children[0];

  const canEditChild = child?.currentUserRole === "owner";

  const [selectedInvitation, setSelectedInvitation] = useState(null);

  const [isResendingInvitation, setIsResendingInvitation] = useState(false);

  const [isCancellingInvitation, setIsCancellingInvitation] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!user?.id || !child?.id) {
        return undefined;
      }

      let cancelled = false;

      async function loadLatestMeasurements() {
        try {
          const measurements = await getLatestLocalGrowthMeasurements({
            userId: user.id,
            childId: child.id,
          });

          if (cancelled) {
            return;
          }

          setLatestMeasurements(measurements);
        } catch (error) {
          console.error("Unable to load latest growth measurements:", error);
        }
      }

      loadLatestMeasurements();

      return () => {
        cancelled = true;
      };
    }, [child?.id, user?.id]),
  );

  const handleRefresh = async () => {
    if (isRefreshing || !user?.id || !accessToken) {
      return;
    }

    setIsRefreshing(true);

    try {
      /*
       * Envoie d'abord les modifications locales
       * qui attendent une synchronisation.
       */
      await processSyncQueue({
        userId: user.id,
        accessToken,
        refreshSession,
      });

      /*
       * Recharge ensuite les données éventuellement
       * modifiées par un autre membre.
       */
      await dispatch(
        loadChildren({
          userId: user.id,
          accessToken,
          refreshSession,
        }),
      ).unwrap();
    } catch (error) {
      console.error("Unable to refresh child profile:", error);

      showToast({
        type: "error",
        title: t("Unable to refresh child profile"),
        message: t("Check your internet connection and try again."),
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleChangeMeasurementUnit = async ({ unitType, unitValue }) => {
    if (!user?.id) {
      return false;
    }

    const fieldByUnitType = {
      weight: "weightUnit",
      length: "lengthUnit",
      temperature: "temperatureUnit",
      volume: "volumeUnit",
    };

    const field = fieldByUnitType[unitType];

    if (!field) {
      return false;
    }

    const databaseValue =
      unitType === "temperature"
        ? unitValue === "fahrenheit"
          ? "f"
          : "c"
        : unitValue;

    try {
      const savedPreferences = await saveUserMeasurementUnitLocally({
        userId: user.id,
        unitType,
        unitValue: databaseValue,
      });

      await enqueueSyncOperation({
        userId: user.id,
        entityType: "user_preferences",
        entityId: user.id,
        operation: `update_unit:${savedPreferences.updatedAt}`,
        endpoint: "/api/users/me/preferences",
        method: "PATCH",
        payload: {
          [field]: databaseValue,
        },
      });

      dispatch(
        measurementUnitChanged({
          type: unitType,
          unit: unitValue,
        }),
      );

      processSyncQueue({
        userId: user.id,
        accessToken,
        refreshSession,
      }).catch((error) => {
        console.error("Unable to synchronize measurement unit:", error);
      });

      return true;
    } catch (error) {
      console.error("Unable to save measurement unit:", error);

      showToast({
        type: "error",
        title: t("Unable to save preference"),
        message: t("Please try again"),
      });

      return false;
    }
  };

  const handleEditChild = () => {
    if (!canEditChild) {
      showToast({
        type: "info",
        title: t("Read-only child profile"),
        message: t("Only an owner can edit this child’s profile."),
      });

      return;
    }

    navigation.navigate("ChildProfileForm", {
      mode: "edit",
      child,
    });
  };

  if (!child) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const visibleTrackingTypes =
    child.visibleTrackingTypes ?? DEFAULT_VISIBLE_TRACKING_TYPES;

  const displayedProfilePicture = child?.profilePicture || null;

  const relationshipLabels = {
    mother: "Mother",
    father: "Father",
    parent: "Parent",
    grandparent: "Grandparent",
    family_or_friend: "Family or close friend",
    caregiver: "Caregiver",
    other: "Other",
  };

  const currentRelationshipLabel = t(
    relationshipLabels[child?.currentUserRelationship] || "Not specified",
  );

  const babyFallbackImage =
    BABY_FALLBACK_IMAGES[child.themeMode] ?? BABY_FALLBACK_IMAGES.blue;

  const genderLabel =
    child.gender === "female"
      ? t("Girl")
      : child.gender === "male"
        ? t("Boy")
        : t("Not specified");

  const visibleFeedingMethods =
    child.visibleFeedingMethods ?? DEFAULT_VISIBLE_FEEDING_METHODS;

  const feedingPreferencesLabel =
    visibleFeedingMethods.length === 1
      ? t(
          {
            breastfeeding: "Breastfeeding",
            bottle: "Bottle",
            solids: "Solid foods",
            pumping: "Pumping",
          }[visibleFeedingMethods[0]],
        )
      : t("Number of feeding methods selected", {
          count: visibleFeedingMethods.length,
        });
  const handleOpenGrowth = () => {
    console.log("Ouvrir l’écran de croissance");
  };

  const handleOpenFeedingPreferences = () => {
    feedingMethodSheetRef.current?.present();
  };

  const handleSaveFeedingPreferences = async (nextVisibleFeedingMethods) => {
    try {
      await dispatch(
        updateChildPreferences({
          userId: user.id,
          childId: child.id,

          preferences: {
            visibleFeedingMethods: nextVisibleFeedingMethods,
          },

          accessToken,
          refreshSession,
        }),
      ).unwrap();

      return true;
    } catch (error) {
      const message =
        error?.code === "NETWORK_ERROR"
          ? t("Unable to contact the server. Check your internet connection.")
          : t("Unable to update the feeding preferences.");

      showToast({
        type: "error",
        title: t("Feeding preferences not updated"),
        message,
      });

      return false;
    }
  };

  const handleChangePicture = () => {
    childPictureSheetRef.current?.present();
  };
  const handleOpenTheme = () => {
    childThemeSheetRef.current?.present();
  };

  const executeWithValidAccessToken = useCallback(
    async (request) => {
      try {
        return await request(accessToken);
      } catch (error) {
        if (error?.code !== "ACCESS_TOKEN_EXPIRED") {
          throw error;
        }

        const refreshedAccessToken = await refreshSession();

        if (!refreshedAccessToken) {
          const authenticationError = new Error(t("Your session has expired"));

          authenticationError.code = "AUTHENTICATION_REQUIRED";

          throw authenticationError;
        }

        return request(refreshedAccessToken);
      }
    },
    [accessToken, refreshSession, t],
  );

  const handleResendInvitation = useCallback(
    async (invitation) => {
      if (!child?.id || !invitation?.id) {
        return false;
      }

      setIsResendingInvitation(true);

      try {
        const response = await executeWithValidAccessToken((token) =>
          resendChildInvitation({
            childId: child.id,
            invitationId: invitation.id,
            locale: i18n.resolvedLanguage || i18n.language || "en",
            accessToken: token,
          }),
        );

        const updatedInvitation = response.invitation;

        setPendingInvitations((currentInvitations) =>
          currentInvitations.map((currentInvitation) =>
            currentInvitation.id === updatedInvitation.id
              ? {
                  ...currentInvitation,
                  ...updatedInvitation,
                }
              : currentInvitation,
          ),
        );

        setSelectedInvitation((currentInvitation) =>
          currentInvitation?.id === updatedInvitation.id
            ? {
                ...currentInvitation,
                ...updatedInvitation,
              }
            : currentInvitation,
        );

        showToast({
          type: "success",
          title: t("Invitation resent"),
          message: t("A new invitation was sent to email", {
            email: updatedInvitation.email,
          }),
        });

        return true;
      } catch (error) {
        showToast({
          type: "error",
          title: t("Unable to resend invitation"),
          message: error?.message || t("An unexpected error occurred"),
        });

        return false;
      } finally {
        setIsResendingInvitation(false);
      }
    },
    [
      child?.id,
      executeWithValidAccessToken,
      i18n.language,
      i18n.resolvedLanguage,
      showToast,
      t,
    ],
  );

  const handleCancelInvitation = useCallback(
    async (invitation) => {
      if (!child?.id || !invitation?.id) {
        return false;
      }

      setIsCancellingInvitation(true);

      try {
        await executeWithValidAccessToken((token) =>
          revokeChildInvitation({
            childId: child.id,
            invitationId: invitation.id,
            accessToken: token,
          }),
        );

        setPendingInvitations((currentInvitations) =>
          currentInvitations.filter(
            (currentInvitation) => currentInvitation.id !== invitation.id,
          ),
        );

        pendingInvitationDetailsSheetRef.current?.dismiss();

        showToast({
          type: "success",
          title: t("Invitation cancelled"),
          message: t("Invitation for email was cancelled", {
            email: invitation.email,
          }),
        });

        setSelectedInvitation(null);

        return true;
      } catch (error) {
        showToast({
          type: "error",
          title: t("Unable to cancel invitation"),
          message: error?.message || t("An unexpected error occurred"),
        });

        return false;
      } finally {
        setIsCancellingInvitation(false);
      }
    },
    [child?.id, executeWithValidAccessToken, showToast, t],
  );

  const handlePressInvitation = (invitation) => {
    setSelectedInvitation(invitation);

    shareChildProfileSheetRef.current?.dismiss();

    setTimeout(() => {
      pendingInvitationDetailsSheetRef.current?.present();
    }, 250);
  };

  const handleSelectTheme = async (themeMode) => {
    if (themeMode === child.themeMode) {
      return true;
    }

    try {
      await dispatch(
        updateChildPreferences({
          userId: user.id,
          childId: child.id,

          preferences: {
            themeMode,
          },

          accessToken,
          refreshSession,
        }),
      ).unwrap();

      dispatch(setThemeMode(themeMode));

      return true;
    } catch (error) {
      const message =
        error?.code === "NETWORK_ERROR"
          ? t("Unable to contact the server. Check your internet connection.")
          : t("Unable to update the child theme.");

      showToast({
        type: "error",
        title: t("Theme not updated"),
        message,
      });

      return false;
    }
  };

  const handleOpenChildSelector = () => {
    childSelectorSheetRef.current?.present();
  };

  function handleOpenRelationshipSettings() {
    relationshipSettingsSheetRef.current?.present();
  }

  async function handleSaveRelationship({ relationship }) {
    if (relationship === child.currentUserRelationship) {
      return true;
    }

    setIsSavingRelationship(true);

    try {
      await dispatch(
        updateCurrentUserRelationship({
          userId: user.id,
          childId: child.id,
          relationship,
          accessToken,
          refreshSession,
        }),
      ).unwrap();

      return true;
    } catch (error) {
      console.error("Unable to update relationship:", error);

      throw error;
    } finally {
      setIsSavingRelationship(false);
    }
  }

  /*
   * Les dernières mesures renvoient vers l'onglet Tracking, sur la courbe
   * de croissance, déjà positionnée sur la mesure touchée.
   */
  const handleOpenGrowthHistory = (measurement) => {
    navigateToTrackingHistory(navigation, "growth", {
      measurement,
    });
  };

  const handleSelectChild = (selectedChild) => {
    dispatch(selectChild(selectedChild.id));
  };

  const handleAddChild = () => {
    navigation.navigate("ChildProfileForm", {
      mode: "create",
    });
  };

  const handleOpenTrackingPreferences = () => {
    trackingPreferencesSheetRef.current?.present();
  };

  const handleSaveTrackingPreferences = async (nextVisibleTrackingTypes) => {
    try {
      await dispatch(
        updateChildPreferences({
          userId: user.id,
          childId: child.id,

          preferences: {
            visibleTrackingTypes: nextVisibleTrackingTypes,
          },

          accessToken,
          refreshSession,
        }),
      ).unwrap();

      return true;
    } catch (error) {
      const message =
        error?.code === "NETWORK_ERROR"
          ? t("Unable to contact the server. Check your internet connection.")
          : t("Unable to update the tracking preferences.");

      showToast({
        type: "error",
        title: t("Tracking preferences not updated"),
        message,
      });

      return false;
    }
  };

  const handleLeaveChildProfile = () => {
    console.log(`Quitter le profil de ${child.firstName}`);

    // Plus tard, ouvrir une confirmation :
    // leaveChildProfileSheetRef.current?.present();
  };

  const handleOpenShareChildProfile = async (childId = child?.id) => {
    if (!childId || isLoadingSharing) {
      return;
    }

    setIsLoadingSharing(true);

    try {
      const response = await executeWithValidAccessToken((token) =>
        getChildSharing({
          childId,
          accessToken: token,
        }),
      );

      const sharing = response.sharing;

      setMembers(sharing.members ?? []);
      setPendingInvitations(sharing.pendingInvitations ?? []);

      shareChildProfileSheetRef.current?.present();
    } catch (error) {
      showToast({
        type: "error",
        title: t("Unable to load sharing information"),
        message: error?.message || t("An unexpected error occurred"),
      });
    } finally {
      setIsLoadingSharing(false);
    }
  };

  const handleBackToSharing = useCallback(() => {
    pendingInvitationDetailsSheetRef.current?.dismiss();

    setTimeout(() => {
      shareChildProfileSheetRef.current?.present();
    }, 250);
  }, []);

  const handleBackFromMemberDetails = useCallback(() => {
    memberDetailsSheetRef.current?.dismiss();

    setTimeout(() => {
      shareChildProfileSheetRef.current?.present();
    }, 250);
  }, []);

  const handlePressMember = (member) => {
    setSelectedMember(member);

    shareChildProfileSheetRef.current?.dismiss();

    setTimeout(() => {
      memberDetailsSheetRef.current?.present();
    }, 250);
  };

  const handleOpenShareTrackingData = () => {
    shareChildDataSheetRef.current?.present();
  };

  const handleCreateTrackingLink = async ({
    period,
    periodLabel,
    includeAttachments,
  }) => {
    const now = new Date();
    const expiryDate = new Date();

    expiryDate.setDate(expiryDate.getDate() + 7);

    const newLink = {
      id: `link-${Date.now()}`,
      label: periodLabel ?? "Last 7 days",

      createdDateLabel: new Intl.DateTimeFormat("en", {
        day: "numeric",
        month: "short",
      }).format(now),

      expiryDateLabel: new Intl.DateTimeFormat("en", {
        day: "numeric",
        month: "short",
      }).format(expiryDate),

      url: `https://nelo.app/share/${Date.now()}`,

      period,
      includeAttachments,
    };

    console.log("[Child profile] Create tracking link:", newLink);

    setActiveShareLinks((currentLinks) => [newLink, ...currentLinks]);

    return newLink;
  };

  const handleCopyTrackingLink = async (link) => {
    console.log("[Child profile] Copy tracking link:", link?.url);

    showToast({
      type: "success",
      title: t("Link copied"),
      message: t("The secure link has been copied"),
    });

    return true;
  };

  const handleDisableTrackingLink = async (link) => {
    if (!link?.id) {
      return false;
    }

    console.log("[Child profile] Disable tracking link:", link.id);

    setActiveShareLinks((currentLinks) =>
      currentLinks.filter((currentLink) => currentLink.id !== link.id),
    );

    showToast({
      type: "success",
      title: t("Link disabled"),
      message: t("The secure link is no longer accessible"),
    });

    return true;
  };

  const handleSelectCustomSharePeriod = () => {
    console.log("[Child profile] Open custom share period picker");

    showToast({
      type: "info",
      title: t("Custom period"),
      message: t("Custom period selection will be added later"),
    });
  };

  const handleRemoveMember = async () => {
    if (!child?.id || !selectedMember?.childMemberId || isRemovingMember) {
      return false;
    }

    setIsRemovingMember(true);

    try {
      await executeWithValidAccessToken((token) =>
        removeChildMember({
          childId: child.id,
          childMemberId: selectedMember.childMemberId,
          accessToken: token,
        }),
      );

      setMembers((currentMembers) =>
        currentMembers.filter(
          (member) => member.childMemberId !== selectedMember.childMemberId,
        ),
      );

      /*
       * Recharge les enfants afin que memberCount soit également
       * mis à jour dans Redux et dans la ligne du profil.
       */
      await dispatch(
        loadChildren({
          userId: user.id,
          accessToken,
          refreshSession,
        }),
      ).unwrap();

      return true;
    } catch (error) {
      console.error("Unable to remove child member:", error);

      throw new Error(error?.message || t("Unable to remove member"));
    } finally {
      setIsRemovingMember(false);
    }
  };

  const handleInviteSomeone = () => {
    setTimeout(() => {
      inviteMemberSheetRef.current?.present();
    }, 250);
  };

  const handleOpenLanguageSelection = () => {
    languageSelectionSheetRef.current?.present();
  };

  const handleSelectLanguage = async (language) => {
    if (!user?.id) {
      return false;
    }

    if (language.id === selectedLanguage) {
      return true;
    }

    try {
      const savedPreferences = await saveUserLanguageLocally({
        userId: user.id,
        languageCode: language.id,
      });

      await enqueueSyncOperation({
        userId: user.id,
        entityType: "user_preferences",
        entityId: user.id,
        operation: `update_language:${savedPreferences.updatedAt}`,
        endpoint: "/api/users/me/preferences",
        method: "PATCH",
        payload: {
          languageCode: language.id,
        },
      });

      await i18n.changeLanguage(language.id);
      setSelectedLanguage(language.id);

      processSyncQueue({
        userId: user.id,
        accessToken,
        refreshSession,
      }).catch((error) => {
        console.error("Unable to synchronize language preference:", error);
      });

      return true;
    } catch (error) {
      console.error("Unable to save language preference:", error);

      showToast({
        type: "error",
        title: t("Unable to save preference"),
        message: t("Please try again"),
      });

      return false;
    }
  };

  function formatWeightMeasurement(value, unit) {
    if (value == null) {
      return "—";
    }

    if (unit === "lb") {
      const pounds = value * 2.2046226218;
      return `${Number(pounds.toFixed(1))} lb`;
    }

    return `${Number(value.toFixed(2))} kg`;
  }

  function formatLengthMeasurement(value, unit) {
    if (value == null) {
      return "—";
    }

    if (unit === "in") {
      const inches = value / 2.54;
      return `${Number(inches.toFixed(1))} in`;
    }

    return `${Number(value.toFixed(1))} cm`;
  }

  const visibleMeasurements = [
    {
      id: "weight",
      image: WEIGHT_IMAGE,
      label: t("Weight"),
      value: formatWeightMeasurement(
        latestMeasurements.weight,
        measurementUnits.weight,
      ),
    },
    {
      id: "height",
      image: HEIGHT_IMAGE,
      label: t("Height"),
      value: formatLengthMeasurement(
        latestMeasurements.height,
        measurementUnits.length,
      ),
    },
    {
      id: "headCircumference",
      image: HEAD_CIRCUMFERENCE_IMAGE,
      label: t("Head circumference"),
      value: formatLengthMeasurement(
        latestMeasurements.headCircumference,
        measurementUnits.length,
      ),
    },
  ].filter((measurement) => visibleTrackingTypes.includes(measurement.id));

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <View style={styles.profileHeader}>
          <View pointerEvents="none" style={styles.headerDecorations}>
            {/*<Image
              source={STAR_YELLOW_IMAGE}
              resizeMode="contain"
              style={styles.starYellow}
            />

            <Image
              source={STAR_PINK_IMAGE}
              resizeMode="contain"
              style={styles.starPink}
            />*/}
          </View>

          <View style={styles.profileTopRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("Change child picture")}
              onPress={handleChangePicture}
              style={({ pressed }) => [
                styles.avatarWrapper,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.avatarContainer}>
                {displayedProfilePicture ? (
                  <ExpoImage
                    source={displayedProfilePicture}
                    cachePolicy="memory-disk"
                    contentFit="cover"
                    transition={180}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={styles.avatarFallback}>
                    <BabyFaceIcon
                      width={82}
                      height={82}
                      color={colors.primary}
                    />
                  </View>
                )}
              </View>

              <View style={styles.cameraButton}>
                <Ionicons
                  name="camera-outline"
                  size={20}
                  color={colors.primary}
                />
              </View>
            </Pressable>

            <View style={styles.profileInformation}>
              <View style={styles.nameRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("Switch child profile")}
                  onPress={handleOpenChildSelector}
                  style={({ pressed }) => [
                    styles.childSelectorHeader,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.childName}>{child.firstName}</Text>

                  <View style={styles.childSelectorChevron}>
                    <Ionicons
                      name="chevron-down"
                      size={17}
                      color={colors.primary}
                    />
                  </View>
                </Pressable>
              </View>

              <View style={styles.profileDetailRow}>
                <Ionicons
                  name="calendar-outline"
                  size={15}
                  color={colors.textPrimary}
                />

                <Text style={styles.profileDetailText}>
                  {child.birthDateLabel}
                </Text>
              </View>

              <View style={styles.profileDetailRow}>
                <Ionicons
                  name={
                    child.gender === "female"
                      ? "female-outline"
                      : child.gender === "male"
                        ? "male-outline"
                        : "person-outline"
                  }
                  size={15}
                  color={colors.textPrimary}
                />

                <Text style={styles.profileDetailText}>{genderLabel}</Text>
              </View>

              <View style={styles.ageBadge}>
                <Text style={styles.ageBadgeText}>
                  {child.status === "expected"
                    ? t("Baby expected")
                    : child.ageInMonths !== null
                      ? t("Child age in months", {
                          count: child.ageInMonths,
                        })
                      : t("Age not specified")}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {visibleMeasurements.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("Latest measurements")}</Text>

            <View style={styles.measurementsCard}>
              {visibleMeasurements.map((measurement, index) => (
                <MeasurementItem
                  key={measurement.id}
                  image={measurement.image}
                  value={measurement.value}
                  label={measurement.label}
                  onPress={() => handleOpenGrowthHistory(measurement.id)}
                  isLast={index === visibleMeasurements.length - 1}
                  styles={styles}
                />
              ))}
            </View>
          </View>
        ) : null}

        <SettingsSection
          title={t("Child preferences", {
            childName: child.firstName,
          })}
          styles={styles}
        >
          {canEditChild ? (
            <ProfileSettingRow
              icon="person-outline"
              title={t("Edit child profile")}
              value={t("Personal information")}
              onPress={handleEditChild}
              colors={colors}
              styles={styles}
            />
          ) : (
            <ProfileSettingRow
              icon="lock-closed-outline"
              title={t("Child profile")}
              value={t("Owner access only")}
              showChevron={false}
              colors={colors}
              styles={styles}
            />
          )}
          <ProfileSettingRow
            icon="color-palette-outline"
            title={t("Child theme", {
              childName: child.firstName,
            })}
            value={t(`Theme ${child.themeMode}`)}
            showThemeDot
            onPress={handleOpenTheme}
            colors={colors}
            styles={styles}
          />

          <ProfileSettingRow
            icon="checkbox-outline"
            title={t("Tracking preferences")}
            value={t("Customize")}
            onPress={handleOpenTrackingPreferences}
            colors={colors}
            styles={styles}
          />

          <ProfileSettingRow
            icon="nutrition-outline"
            title={t("Feeding preferences")}
            value={feedingPreferencesLabel}
            onPress={handleOpenFeedingPreferences}
            colors={colors}
            styles={styles}
          />

          <ProfileSettingRow
            icon="link-outline"
            title={t("Share tracking data")}
            value={t("Secure link")}
            onPress={handleOpenShareTrackingData}
            colors={colors}
            styles={styles}
          />

          <ProfileSettingRow
            icon="heart-outline"
            title={t("Your relationship with {{childName}}", {
              childName: child.firstName,
            })}
            value={currentRelationshipLabel}
            onPress={handleOpenRelationshipSettings}
            colors={colors}
            styles={styles}
          />

          <ProfileSettingRow
            icon="people-outline"
            title={t("Share child profile", {
              childName: child.firstName,
            })}
            value={t("Shared people count", {
              count: child.memberCount ?? 1,
            })}
            isLast
            loading={isLoadingSharing}
            onPress={() => handleOpenShareChildProfile()}
            colors={colors}
            styles={styles}
          />
        </SettingsSection>

        <SettingsSection title={t("Application settings")} styles={styles}>
          <ProfileSettingRow
            icon="notifications-outline"
            title={t("Notifications")}
            onPress={() => {
              navigation.navigate("NotificationSettings");
            }}
            colors={colors}
            styles={styles}
          />

          <ProfileSettingRow
            icon="language-outline"
            title={t("Language")}
            value={
              LANGUAGES.find((language) => language.id === selectedLanguage)
                ?.label
            }
            onPress={handleOpenLanguageSelection}
            colors={colors}
            styles={styles}
          />
          <ProfileSettingRow
            icon="resize-outline"
            title={t("Measurement units")}
            value={[
              measurementUnits.weight,
              measurementUnits.length,
              measurementUnits.temperature === "fahrenheit" ? "°F" : "°C",
              measurementUnits.volume === "fl_oz" ? "fl oz" : "ml",
            ].join(", ")}
            onPress={() => {
              measurementUnitsSheetRef.current?.present();
            }}
            colors={colors}
            styles={styles}
          />
          <ProfileSettingRow
            icon="shield-checkmark-outline"
            title={t("Privacy and data")}
            onPress={() => {
              navigation.navigate("PrivacyData");
            }}
            colors={colors}
            styles={styles}
          />

          <ProfileSettingRow
            icon="diamond-outline"
            title={t("Subscription")}
            badge={t("Premium")}
            isLast
            onPress={() => {
              navigation.navigate("Subscription");
            }}
            colors={colors}
            styles={styles}
          />
        </SettingsSection>

        <SettingsSection title={t("Account")} styles={styles}>
          <ProfileSettingRow
            icon="person-outline"
            title={t("My account")}
            onPress={() => {
              myAccountSheetRef.current?.present();
            }}
            colors={colors}
            styles={styles}
          />

          {/*<ProfileSettingRow
            icon="lock-closed-outline"
            title={t("Security")}
            onPress={() => {
              console.log("Sécurité");
            }}
            colors={colors}
            styles={styles}
          />
*/}
          <ProfileSettingRow
            icon="help-circle-outline"
            title={t("Help center")}
            onPress={() => {
              WebBrowser.openBrowserAsync("https://www.joinnelo.app");
            }}
            colors={colors}
            styles={styles}
          />

          <ProfileSettingRow
            icon="log-out-outline"
            title={t("Log out")}
            danger
            isLast
            loading={isLoggingOut}
            onPress={handleLogout}
            colors={colors}
            styles={styles}
          />
        </SettingsSection>

        <SettingsSection
          title={
            child.currentUserRole === "owner"
              ? t("Danger zone")
              : t("Profile access")
          }
          styles={styles}
        >
          {child.currentUserRole === "owner" ? (
            <ProfileSettingRow
              icon="trash-outline"
              title={t("Delete child profile", {
                childName: child.firstName,
              })}
              danger
              isLast
              onPress={() => {
                deleteChildProfileSheetRef.current?.present();
              }}
              colors={colors}
              styles={styles}
            />
          ) : (
            <ProfileSettingRow
              icon="exit-outline"
              title={t("Leave child profile", {
                childName: child.firstName,
              })}
              danger
              isLast
              onPress={handleLeaveChildProfile}
              colors={colors}
              styles={styles}
            />
          )}
        </SettingsSection>

        <Text style={styles.versionText}>
          {t("App version", {
            version: "1.0.0",
          })}
        </Text>
      </ScrollView>

      <ChildSelectorSheet
        ref={childSelectorSheetRef}
        children={children}
        selectedChildId={reduxSelectedChildId}
        onSelectChild={handleSelectChild}
        onAddChild={handleAddChild}
      />

      <ChildThemeSheet
        ref={childThemeSheetRef}
        selectedTheme={child.themeMode ?? "blue"}
        onSelectTheme={handleSelectTheme}
      />

      <FeedingPreferencesSheet
        ref={feedingMethodSheetRef}
        selectedMethods={visibleFeedingMethods}
        themeMode={child.themeMode ?? "blue"}
        onSave={handleSaveFeedingPreferences}
      />

      <TrackingPreferencesSheet
        ref={trackingPreferencesSheetRef}
        visibleTrackingIds={visibleTrackingTypes}
        onSave={handleSaveTrackingPreferences}
      />

      <ShareChildDataSheet
        ref={shareChildDataSheetRef}
        child={{
          ...child,
          name: child.firstName,
        }}
        activeLinks={activeShareLinks}
        onCreateLink={handleCreateTrackingLink}
        onSelectCustomPeriod={handleSelectCustomSharePeriod}
        onCopyLink={handleCopyTrackingLink}
        onDisableLink={handleDisableTrackingLink}
      />

      <ShareChildProfileSheet
        ref={shareChildProfileSheetRef}
        childName={child.firstName}
        members={members}
        pendingInvitations={pendingInvitations}
        currentUserId={user?.id}
        canManageMembers={child.currentUserRole === "owner"}
        onPressMember={handlePressMember}
        onPressInvitation={handlePressInvitation}
        onInviteSomeone={handleInviteSomeone}
      />

      <PendingInvitationDetailsSheet
        ref={pendingInvitationDetailsSheetRef}
        invitation={selectedInvitation}
        childName={child.firstName}
        isResending={isResendingInvitation}
        isCancelling={isCancellingInvitation}
        onBack={handleBackToSharing}
        onResend={handleResendInvitation}
        onCancel={handleCancelInvitation}
      />

      <InviteMemberSheet
        ref={inviteMemberSheetRef}
        childName={child.firstName}
        isSubmitting={isSendingInvitation}
        onSendInvitation={async ({ email }) => {
          if (isSendingInvitation) {
            return false;
          }

          setIsSendingInvitation(true);

          const sendInvitation = (token) =>
            createChildInvitation({
              childId: child.id,
              email,
              locale: i18n.resolvedLanguage || i18n.language || "en",
              accessToken: token,
            });

          try {
            let response;

            try {
              response = await sendInvitation(accessToken);
            } catch (error) {
              if (error?.code !== "ACCESS_TOKEN_EXPIRED") {
                throw error;
              }

              const refreshedAccessToken = await refreshSession();

              if (!refreshedAccessToken) {
                const authenticationError = new Error(
                  t("Your session has expired. Please sign in again."),
                );

                authenticationError.code = "AUTHENTICATION_REQUIRED";

                throw authenticationError;
              }

              response = await sendInvitation(refreshedAccessToken);
            }

            return response.invitation;
          } catch (error) {
            const invitationError = new Error(
              error?.code === "NETWORK_ERROR"
                ? t("An internet connection is required to send an invitation")
                : error?.message || t("Unable to send invitation"),
            );

            invitationError.code = error?.code;

            throw invitationError;
          } finally {
            setIsSendingInvitation(false);
          }
        }}
        onInvitationSent={(invitation) => {
          setPendingInvitations((currentInvitations) => {
            const otherInvitations = currentInvitations.filter(
              (item) =>
                item.email.toLowerCase() !== invitation.email.toLowerCase(),
            );

            return [...otherInvitations, invitation];
          });

          showToast({
            type: "success",
            title: t("Invitation sent"),
            message: t("Invitation sent to email for child profile", {
              email: invitation.email,
              childName: invitation.childName,
            }),
          });
        }}
      />

      <LanguageSelectionSheet
        ref={languageSelectionSheetRef}
        selectedLanguage={selectedLanguage}
        onSelectLanguage={handleSelectLanguage}
      />

      <MemberDetailsSheet
        ref={memberDetailsSheetRef}
        member={selectedMember}
        onBack={handleBackFromMemberDetails}
        childName={child.firstName}
        currentUserId={user?.id}
        canManageMembers={child.currentUserRole === "owner"}
        isRemoving={isRemovingMember}
        isAssigningOwner={isAssigningOwner}
        onAssignOwner={async (member) => {
          if (!child?.id || !member?.childMemberId) {
            return false;
          }

          setIsAssigningOwner(true);

          try {
            await executeWithValidAccessToken((token) =>
              makeChildMemberOwner({
                childId: child.id,
                childMemberId: member.childMemberId,
                accessToken: token,
              }),
            );

            setMembers((current) =>
              current.map((item) =>
                item.childMemberId === member.childMemberId
                  ? { ...item, role: "owner" }
                  : item,
              ),
            );

            return true;
          } finally {
            setIsAssigningOwner(false);
          }
        }}
        onOwnerAssigned={(member) => {
          setSelectedMember(null);

          showToast({
            type: "success",
            title: t("New owner assigned"),
            message: t("Member is now an owner of the child profile", {
              memberName: member.firstName,
              childName: child.firstName,
            }),
          });
        }}
        onRemoveMember={handleRemoveMember}
        onMemberRemoved={({ member, childName }) => {
          showToast({
            type: "success",
            title: t("Access removed"),
            message: t("Member no longer has access to child profile", {
              memberName: member.firstName,
              childName,
            }),
          });

          setSelectedMember(null);
        }}
      />

      <MeasurementUnitsSheet
        ref={measurementUnitsSheetRef}
        initialUnits={measurementUnits}
        onChangeUnits={handleChangeMeasurementUnit}
      />

      <MyAccountSheet
        ref={myAccountSheetRef}
        firstName={user?.displayName ?? ""}
        email={user?.email ?? ""}
        onEditFirstName={() => {
          editFirstNameSheetRef.current?.present();
        }}
        onEditEmail={() => {
          editEmailSheetRef.current?.present();
        }}
        onDeleteAccount={() => {
          deleteAccountSheetRef.current?.present();
        }}
      />

      <EditFirstNameSheet
        ref={editFirstNameSheetRef}
        firstName={user?.displayName ?? ""}
        isSaving={isSavingFirstName}
        onSave={async ({ firstName }) => {
          setIsSavingFirstName(true);

          try {
            const response = await executeWithValidAccessToken((token) =>
              updatePreferredName({
                displayName: firstName,
                accessToken: token,
              }),
            );

            updateAuthenticatedUser(response.user);

            return true;
          } finally {
            setIsSavingFirstName(false);
          }
        }}
        onSaved={({ firstName }) => {
          setTimeout(() => {
            showToast({
              type: "success",
              title: t("First name updated"),
              message: t("Your first name is now first name", {
                firstName,
              }),
            });
          }, 250);
        }}
      />

      <EditEmailSheet
        ref={editEmailSheetRef}
        currentEmail={user?.email ?? ""}
        isSubmitting={isUpdatingEmail}
        onRequestCode={async ({ email }) => {
          setIsUpdatingEmail(true);

          try {
            await executeWithValidAccessToken((token) =>
              requestEmailChange({
                email,
                locale: i18n.resolvedLanguage || i18n.language || "en",
                accessToken: token,
              }),
            );

            return true;
          } finally {
            setIsUpdatingEmail(false);
          }
        }}
        onVerifyCode={async ({ email, code }) => {
          setIsUpdatingEmail(true);

          try {
            const response = await executeWithValidAccessToken((token) =>
              verifyEmailChange({
                email,
                code,
                accessToken: token,
              }),
            );

            updateAuthenticatedUser(response.user);

            return true;
          } finally {
            setIsUpdatingEmail(false);
          }
        }}
        onEmailUpdated={({ email }) => {
          setTimeout(() => {
            showToast({
              type: "success",
              title: t("Email address updated"),
              message: t("Your new email address is email", { email }),
            });
          }, 250);
        }}
      />

      <DeleteAccountSheet
        ref={deleteAccountSheetRef}
        isDeleting={isDeletingAccount}
        onCheckDeletion={() =>
          executeWithValidAccessToken((token) =>
            getAccountDeletionCheck({ accessToken: token }),
          )
        }
        onOpenOwnershipTransfer={(targetChild) => {
          deleteAccountSheetRef.current?.dismiss();
          dispatch(selectChild(targetChild.id));

          setTimeout(() => {
            handleOpenShareChildProfile(targetChild.id);
          }, 300);
        }}
        onDeleteAccount={async () => {
          if (isDeletingAccount || !user?.id) {
            return false;
          }

          const userId = user.id;
          setIsDeletingAccount(true);

          try {
            await executeWithValidAccessToken((token) =>
              deleteCurrentAccount({ accessToken: token }),
            );

            // La suppression serveur a réussi : il faut retirer la session locale
            // même si le nettoyage SQLite rencontre ensuite une erreur.
            try {
              await deleteLocalUserData(userId);
            } catch (localError) {
              console.error(
                "Unable to clear deleted account data:",
                localError,
              );
            }

            dispatch(clearChildren());
            dispatch(clearInvitations());
            dispatch(resetOnboarding());

            // Les sessions serveur sont déjà révoquées. logout() retire aussi
            // le refresh token du téléphone et vide AuthProvider.
            await logout();

            return true;
          } finally {
            setIsDeletingAccount(false);
          }
        }}
      />

      <DeleteChildProfileSheet
        ref={deleteChildProfileSheetRef}
        childName={child.firstName}
        isDeleting={isDeletingChildProfile}
        onDeleteChildProfile={async () => {
          if (!child?.id || isDeletingChildProfile) {
            return false;
          }

          const childId = child.id;
          setIsDeletingChildProfile(true);

          try {
            await executeWithValidAccessToken((token) =>
              deleteChild({
                childId,
                accessToken: token,
              }),
            );

            await dispatch(removeDeletedChild(childId));
            return true;
          } finally {
            setIsDeletingChildProfile(false);
          }
        }}
        onChildProfileDeleted={({ childName }) => {
          showToast({
            type: "success",
            title: t("Child profile deleted"),
            message: t("Child profile is no longer accessible", { childName }),
          });
        }}
      />

      <RelationshipSettingsSheet
        ref={relationshipSettingsSheetRef}
        childName={child.firstName}
        currentRelationship={child.currentUserRelationship}
        isSaving={isSavingRelationship}
        onSave={handleSaveRelationship}
      />
      <ChildPictureSheet
        ref={childPictureSheetRef}
        childName={child.firstName}
        hasPicture={Boolean(displayedProfilePicture)}
        isUpdating={isUpdatingChildPicture}
        onPictureSelected={async (image) => {
          if (!reduxSelectedChildId) {
            throw new Error(t("No child is currently selected"));
          }

          setIsUpdatingChildPicture(true);

          try {
            const result = await dispatch(
              updateChildAvatar({
                childId: reduxSelectedChildId,
                image,
                accessToken,
                refreshSession,
              }),
            ).unwrap();

            /*
             * Redux already contains the server avatar.
             * This local update keeps the still-mocked profile screen
             * visually synchronized until all profile data uses Redux.
             */
            setChildren((currentChildren) =>
              currentChildren.map((currentChild) =>
                currentChild.id === child.id
                  ? {
                      ...currentChild,

                      profilePicture: {
                        uri: result.avatar.url,
                        cacheKey: result.avatar.cacheKey,
                      },
                    }
                  : currentChild,
              ),
            );

            showToast({
              type: "success",
              title: t("Profile picture updated"),
              message: t("Child profile picture has been updated", {
                childName: child.firstName,
              }),
            });

            return true;
          } catch (error) {
            throw new Error(
              error?.message || t("Unable to update the profile picture"),
            );
          } finally {
            setIsUpdatingChildPicture(false);
          }
        }}
        onPictureRemoved={async () => {
          if (!reduxSelectedChildId) {
            throw new Error(t("No child is currently selected"));
          }

          setIsUpdatingChildPicture(true);

          try {
            await dispatch(
              removeChildAvatar({
                childId: reduxSelectedChildId,
                accessToken,
                refreshSession,
              }),
            ).unwrap();

            /*
             * Redux already contains avatar: null.
             * This local update synchronizes the still-mocked
             * profile screen until it fully uses Redux.
             */
            setChildren((currentChildren) =>
              currentChildren.map((currentChild) =>
                currentChild.id === child.id
                  ? {
                      ...currentChild,
                      profilePicture: null,
                    }
                  : currentChild,
              ),
            );

            showToast({
              type: "success",
              title: t("Profile picture removed"),
              message: t("The default illustration is now being used"),
            });

            return true;
          } catch (error) {
            throw new Error(
              error?.message || t("Unable to remove the profile picture"),
            );
          } finally {
            setIsUpdatingChildPicture(false);
          }
        }}
      />
    </SafeAreaView>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },

    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 125,
    },

    profileHeader: {
      position: "relative",

      minHeight: 150,

      justifyContent: "center",

      marginBottom: 10,
      paddingHorizontal: 12,

      overflow: "visible",
    },

    headerDecorations: {
      ...StyleSheet.absoluteFillObject,

      overflow: "visible",
    },

    starYellow: {
      position: "absolute",

      top: 45,
      right: 0,

      width: 21,
      height: 21,

      transform: [{ rotate: "-12deg" }],
    },

    starPink: {
      position: "absolute",

      bottom: 50,
      right: 50,

      width: 15,
      height: 15,

      transform: [{ rotate: "12deg" }],
    },

    cloudDecoration: {
      position: "absolute",

      top: 4,
      right: -6,

      width: 126,
      height: 100,

      opacity: 0.58,
    },

    profileTopRow: {
      zIndex: 2,

      flexDirection: "row",
      alignItems: "center",
    },

    avatarWrapper: {
      position: "relative",

      marginRight: 22,
    },

    avatarContainer: {
      width: 120,
      height: 120,

      borderWidth: 5,
      borderColor: colors.white,
      borderRadius: 66,

      backgroundColor: colors.selectedBackground,

      overflow: "hidden",

      shadowColor: colors.textPrimary,
      shadowOffset: {
        width: 0,
        height: 7,
      },
      shadowOpacity: 0.08,
      shadowRadius: 15,

      elevation: 4,
    },

    avatar: {
      width: "100%",
      height: "100%",

      resizeMode: "cover",
    },

    avatarFallback: {
      flex: 1,

      alignItems: "center",
      justifyContent: "center",

      backgroundColor: colors.selectedBackground,
    },

    avatarFallbackImage: {
      width: 50,
      height: 50,
    },

    cameraButton: {
      position: "absolute",

      right: -10,
      bottom: -10,

      width: 42,
      height: 42,

      alignItems: "center",
      justifyContent: "center",

      borderWidth: 3,
      borderColor: colors.white,
      borderRadius: 21,

      backgroundColor: colors.white,

      shadowColor: colors.primary,
      shadowOffset: {
        width: 0,
        height: 3,
      },
      shadowOpacity: 0.22,
      shadowRadius: 7,

      elevation: 5,
    },

    profileInformation: {
      flex: 1,

      minWidth: 0,
    },

    nameRow: {
      flexDirection: "row",
      alignItems: "center",

      gap: 9,
    },

    childName: {
      flexShrink: 1,

      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 28,
      lineHeight: 35,

      color: colors.textPrimary,
    },

    profileDetailRow: {
      flexDirection: "row",
      alignItems: "center",

      gap: 8,

      marginTop: 7,
    },

    profileDetailText: {
      flex: 1,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 14,
      lineHeight: 19,

      color: colors.textSecondary,
    },

    ageBadge: {
      alignSelf: "flex-start",

      marginTop: 9,
      paddingHorizontal: 11,
      paddingVertical: 5,

      borderRadius: 14,

      backgroundColor: colors.selectedBackground,
    },

    ageBadgeText: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 12,
      lineHeight: 16,

      color: colors.textPrimary,
    },

    measurementsCard: {
      flexDirection: "row",

      marginTop: 8,
      paddingVertical: 18,

      borderRadius: 24,
      backgroundColor: colors.white,

      shadowColor: colors.textPrimary,
      shadowOffset: {
        width: 0,
        height: 7,
      },
      shadowOpacity: 0.05,
      shadowRadius: 18,

      elevation: 3,
    },

    measurementsHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",

      gap: 10,

      marginBottom: 17,
    },

    measurementsTitle: {
      flex: 1,

      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 15,
      lineHeight: 20,

      color: colors.textPrimary,
    },

    viewGrowthButton: {
      flexDirection: "row",
      alignItems: "center",

      gap: 2,

      paddingHorizontal: 10,
      paddingVertical: 7,

      borderRadius: 16,

      backgroundColor: colors.selectedBackground,
    },

    viewGrowthText: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 10,
      lineHeight: 14,

      color: colors.primary,
    },

    measurementsRow: {
      flexDirection: "row",
      alignItems: "stretch",
    },

    measurementItem: {
      flex: 1,

      alignItems: "center",
      justifyContent: "center",

      paddingHorizontal: 8,
    },
    measurementItemBorder: {
      borderRightWidth: StyleSheet.hairlineWidth,
      borderRightColor: colors.border,
    },
    measurementIconContainer: {
      width: 56,
      height: 56,

      justifyContent: "center",
      alignItems: "center",

      borderRadius: 28,

      backgroundColor: colors.selectedBackground,

      marginBottom: 2,
    },

    measurementIcon: {
      width: 55,
      height: 55,

      resizeMode: "contain",
    },

    measurementLabel: {
      marginTop: 2,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 11,
      lineHeight: 15,

      color: colors.textSecondary,

      textAlign: "center",
    },

    measurementValue: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 18,
      lineHeight: 24,

      color: colors.textPrimary,
    },
    measurementDate: {
      width: "100%",

      marginTop: 4,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 8,
      lineHeight: 12,
      textAlign: "center",

      color: colors.textSecondary,
    },

    section: {
      marginBottom: 22,
    },

    sectionTitle: {
      marginBottom: 9,
      paddingHorizontal: 3,

      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 15,
      lineHeight: 20,

      color: colors.textPrimary,
    },

    settingsCard: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderRadius: 23,

      backgroundColor: colors.white,

      overflow: "hidden",

      shadowColor: colors.textPrimary,
      shadowOffset: {
        width: 0,
        height: 5,
      },
      shadowOpacity: 0.035,
      shadowRadius: 14,

      elevation: 2,
    },

    settingRow: {
      minHeight: 50,

      flexDirection: "row",
      alignItems: "center",

      paddingHorizontal: 16,
    },

    settingRowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },

    settingRowPressed: {
      backgroundColor: colors.selectedBackground,
    },

    settingIconContainer: {
      width: 34,
      height: 34,

      alignItems: "center",
      justifyContent: "center",

      marginRight: 12,

      borderRadius: 17,
    },

    settingIcon: {
      color: colors.textSecondary,
    },

    settingTitle: {
      flex: 1,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 14,
      lineHeight: 20,

      color: colors.textPrimary,
    },

    settingTitleDanger: {
      color: colors.error,
    },

    settingRight: {
      maxWidth: "48%",

      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",

      gap: 7,

      marginLeft: 10,
    },

    settingValue: {
      flexShrink: 1,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 12,
      lineHeight: 17,
      textAlign: "right",

      color: colors.textSecondary,
    },

    themeDot: {
      width: 18,
      height: 18,

      borderWidth: 3,
      borderColor: colors.selectedBackground,
      borderRadius: 9,
    },

    settingBadge: {
      paddingHorizontal: 9,
      paddingVertical: 4,

      borderRadius: 12,

      backgroundColor: colors.selectedBackground,
    },

    settingBadgeText: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 10,
      lineHeight: 13,

      color: colors.primary,
    },

    measurementPressed: {
      opacity: 0.7,
    },

    versionText: {
      marginTop: -4,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 11,
      lineHeight: 16,
      textAlign: "center",

      color: colors.textSecondary,
    },

    pressed: {
      opacity: 0.72,
      transform: [{ scale: 0.97 }],
    },
    childSelectorHeader: {
      alignSelf: "flex-start",

      flexDirection: "row",
      alignItems: "center",

      gap: 8,
    },

    childSelectorChevron: {
      width: 28,
      height: 28,

      alignItems: "center",
      justifyContent: "center",

      borderRadius: 14,
      backgroundColor: colors.selectedBackground,
    },
  });
