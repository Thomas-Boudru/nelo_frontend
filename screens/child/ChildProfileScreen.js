import { useMemo, useRef, useState } from "react";
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
import EditChildProfileScreen from "./ChildProfileFormScreen.js";
import ChildPictureSheet from "./ChildPictureScreen.js";
import BabyFaceIcon from "../../assets/icons/header/faceBaby.svg";
import ShareChildDataSheet from "./Share/ShareChildDataSheet.js";
import { navigateToTrackingHistory } from "../../navigation/trackingHistoryDestinations.js";
import RelationshipSettingsSheet from "./RelationshipSettingsSheet.js";

const STAR_PINK_IMAGE = require("../../assets/illustrations/onboarding/starPink.png");

const STAR_YELLOW_IMAGE = require("../../assets/illustrations/onboarding/starYellow.png");

const CLOUD_IMAGE = require("../../assets/illustrations/onboarding/cloud.png");

const WEIGHT_IMAGE = require("../../assets/illustrations/tracking/weightBlue.png");

const HEIGHT_IMAGE = require("../../assets/illustrations/tracking/height.png");

const HEAD_CIRCUMFERENCE_IMAGE = require("../../assets/illustrations/tracking/headBlue.png");

const BABY_FALLBACK_IMAGES = {
  blue: require("../../assets/icons/header/babyBlue.png"),
  pink: require("../../assets/icons/header/babyPink.png"),
  green: require("../../assets/icons/header/babyGreen.png"),
};

const mockMembers = [
  {
    id: "thomas",
    firstName: "Thomas",
    role: "owner",
  },
  {
    id: "julie",
    firstName: "Julie",
    role: "contributor",
  },
];

const mockChild = {
  firstName: "Emma",
  birthDate: "12 juillet 2024",
  ageInMonths: 9,
  gender: "female",
  themeMode: "blue",
  profilePicture: null,

  measurements: {
    weight: {
      value: "8,2 kg",
      date: "12 août 2025",
    },
    height: {
      value: "72 cm",
      date: "12 août 2025",
    },
    headCircumference: {
      value: "45 cm",
      date: "12 août 2025",
    },
  },

  feedingMethods: ["breastfeeding", "bottle", "solids"],
  sharedPeopleCount: 2,
};

const mockChildren = [
  {
    id: "emma",
    firstName: "Emma",
    birthDate: "12 juillet 2024",
    ageInMonths: 9,
    ageLabel: "9 months",
    currentUserRelationship: "father",
    gender: "female",
    themeMode: "blue",
    profilePicture: null,
    currentUserRole: "owner",

    measurements: {
      weight: {
        value: "8,2 kg",
        date: "12 août 2025",
      },
      height: {
        value: "72 cm",
        date: "12 août 2025",
      },
      headCircumference: {
        value: "45 cm",
        date: "12 août 2025",
      },
    },

    feedingPreference: "mixed",
    sharedPeopleCount: 2,
  },
  {
    id: "lucas",
    firstName: "Lucas",
    birthDate: "4 mai 2022",
    ageInMonths: 39,
    ageLabel: "3 years, 3 months",
    gender: "male",
    themeMode: "green",
    currentUserRelationship: "father",
    profilePicture: null,
    currentUserRole: "owner",

    measurements: {
      weight: {
        value: "14,8 kg",
        date: "28 juillet 2025",
      },
      height: {
        value: "96 cm",
        date: "28 juillet 2025",
      },
      headCircumference: {
        value: "50 cm",
        date: "28 juillet 2025",
      },
    },

    feedingPreference: "mixed",
    sharedPeopleCount: 2,
  },
];

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
        pressed && styles.settingRowPressed,
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

        {showChevron ? (
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

export default function ChildProfileScreen({ navigation }) {
  const { t } = useTranslation();

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { showToast } = useToast();
  const languageSelectionSheetRef = useRef(null);

  const [selectedLanguage, setSelectedLanguage] = useState("fr");

  const childSelectorSheetRef = useRef(null);
  const childThemeSheetRef = useRef(null);
  const feedingMethodSheetRef = useRef(null);
  const trackingPreferencesSheetRef = useRef(null);
  const shareChildProfileSheetRef = useRef(null);
  const inviteMemberSheetRef = useRef(null);
  const memberDetailsSheetRef = useRef(null);
  const measurementUnitsSheetRef = useRef(null);
  const shareChildDataSheetRef = useRef(null);

  const myAccountSheetRef = useRef(null);
  const editFirstNameSheetRef = useRef(null);
  const editEmailSheetRef = useRef(null);
  const deleteAccountSheetRef = useRef(null);
  const deleteChildProfileSheetRef = useRef(null);
  const editChildProfileSheetRef = useRef(null);
  const childPictureSheetRef = useRef(null);
  const relationshipSettingsSheetRef = useRef(null);

  const [isDeletingChildProfile, setIsDeletingChildProfile] = useState(false);

  const [account, setAccount] = useState({
    firstName: "Thomas",
    email: "thomas@email.com",
  });

  const [isSavingFirstName, setIsSavingFirstName] = useState(false);
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isUpdatingChildPicture, setIsUpdatingChildPicture] = useState(false);
  const [activeShareLinks, setActiveShareLinks] = useState([]);
  const [isSavingRelationship, setIsSavingRelationship] = useState(false);

  const [measurementUnits, setMeasurementUnits] = useState({
    weight: "kg",
    length: "cm",
    temperature: "celsius",
  });

  const [visibleTrackingIds, setVisibleTrackingIds] = useState([
    "feeding",
    "sleep",
    "diaper",
    "medication",
    "temperature",
    "weight",
    "height",
    "headCircumference",
    "note",
  ]);

  const [selectedMember, setSelectedMember] = useState(null);
  const [isRemovingMember, setIsRemovingMember] = useState(false);
  const [members, setMembers] = useState(mockMembers);

  const [children, setChildren] = useState(mockChildren);

  const [selectedChildId, setSelectedChildId] = useState(
    mockChildren[0]?.id ?? null,
  );

  const handleEditChild = () => {
    navigation.navigate("ChildProfileForm", {
      mode: "edit",
      child,
    });
  };

  const child =
    children.find((item) => item.id === selectedChildId) ?? children[0];

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

  const feedingMethods = child.feedingMethods ?? ["bottle"];

  const feedingPreferencesLabel =
    feedingMethods.length === 1
      ? t(
          {
            breastfeeding: "Breastfeeding",
            bottle: "Bottle",
            solids: "Solid foods",
            pumping: "Pumping",
          }[feedingMethods[0]],
        )
      : t("Number of feeding methods selected", {
          count: feedingMethods.length,
        });
  const handleOpenGrowth = () => {
    console.log("Ouvrir l’écran de croissance");
  };

  const handleOpenFeedingPreferences = () => {
    feedingMethodSheetRef.current?.present();
  };

  const handleSaveFeedingPreferences = (feedingMethods) => {
    setChildren((currentChildren) =>
      currentChildren.map((currentChild) =>
        currentChild.id === selectedChildId
          ? {
              ...currentChild,
              feedingMethods,
            }
          : currentChild,
      ),
    );
  };

  const handleChangePicture = () => {
    childPictureSheetRef.current?.present();
  };
  const handleOpenTheme = () => {
    childThemeSheetRef.current?.present();
  };

  const handleSelectTheme = (themeMode) => {
    setChildren((currentChildren) =>
      currentChildren.map((currentChild) =>
        currentChild.id === selectedChildId
          ? {
              ...currentChild,
              themeMode,
            }
          : currentChild,
      ),
    );
  };

  const handleOpenChildSelector = () => {
    childSelectorSheetRef.current?.present();
  };

  function handleOpenRelationshipSettings() {
    relationshipSettingsSheetRef.current?.present();
  }

  async function handleSaveRelationship({ relationship }) {
    setIsSavingRelationship(true);

    try {
      /*
      Plus tard :

      await api.patch(
        `/children/${child.id}/members/me`,
        {
          relationship,
        },
      );
    */

      setChildren((currentChildren) =>
        currentChildren.map((currentChild) =>
          currentChild.id === child.id
            ? {
                ...currentChild,
                currentUserRelationship: relationship,
              }
            : currentChild,
        ),
      );

      return true;
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
    setSelectedChildId(selectedChild.id);
  };

  const handleAddChild = () => {
    navigation.navigate("ChildProfileForm", {
      mode: "create",
    });
  };

  const handleOpenTrackingPreferences = () => {
    trackingPreferencesSheetRef.current?.present();
  };

  const handleSaveTrackingPreferences = (nextVisibleTrackingIds) => {
    setVisibleTrackingIds(nextVisibleTrackingIds);

    console.log("Tracking visibles :", nextVisibleTrackingIds);
  };

  const handleLeaveChildProfile = () => {
    console.log(`Quitter le profil de ${child.firstName}`);

    // Plus tard, ouvrir une confirmation :
    // leaveChildProfileSheetRef.current?.present();
  };

  const handleOpenShareChildProfile = () => {
    shareChildProfileSheetRef.current?.present();
  };

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

  const handleRemoveMember = async ({ memberId }) => {
    setIsRemovingMember(true);

    try {
      // Plus tard :
      // await api.delete(
      //   `/children/${child.id}/members/${memberId}`,
      // );

      setMembers((currentMembers) =>
        currentMembers.filter((member) => member.id !== memberId),
      );

      setChildren((currentChildren) =>
        currentChildren.map((currentChild) =>
          currentChild.id === selectedChildId
            ? {
                ...currentChild,
                sharedPeopleCount: Math.max(
                  1,
                  currentChild.sharedPeopleCount - 1,
                ),
              }
            : currentChild,
        ),
      );

      return true;
    } catch (error) {
      throw new Error(t("Unable to remove member"));
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
    setSelectedLanguage(language.id);

    await i18n.changeLanguage(language.id);
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
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
                {child.profilePicture ? (
                  <Image source={child.profilePicture} style={styles.avatar} />
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

                <Text style={styles.profileDetailText}>{child.birthDate}</Text>
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
                  {t("Child age in months", {
                    count: child.ageInMonths,
                  })}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("Latest measurements")}</Text>

          <View style={styles.measurementsCard}>
            <MeasurementItem
              image={WEIGHT_IMAGE}
              value={child.measurements.weight.value}
              label={t("Weight")}
              onPress={() => handleOpenGrowthHistory("weight")}
              styles={styles}
            />

            <MeasurementItem
              image={HEIGHT_IMAGE}
              value={child.measurements.height.value}
              label={t("Height")}
              onPress={() => handleOpenGrowthHistory("height")}
              styles={styles}
            />

            <MeasurementItem
              image={HEAD_CIRCUMFERENCE_IMAGE}
              value={child.measurements.headCircumference.value}
              label={t("Head circumference")}
              isLast
              onPress={() => handleOpenGrowthHistory("headCircumference")}
              styles={styles}
            />
          </View>
        </View>

        <SettingsSection
          title={t("Child preferences", {
            childName: child.firstName,
          })}
          styles={styles}
        >
          <ProfileSettingRow
            icon="person-outline"
            title={t("Edit child profile")}
            value={t("Personal information")}
            onPress={handleEditChild}
            colors={colors}
            styles={styles}
          />
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
              count: child.sharedPeopleCount,
            })}
            isLast
            onPress={handleOpenShareChildProfile}
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
                ?.nativeName
            }
            onPress={handleOpenLanguageSelection}
            colors={colors}
            styles={styles}
          />
          <ProfileSettingRow
            icon="resize-outline"
            title={t("Measurement units")}
            value={
              measurementUnits.weight === "kg" &&
              measurementUnits.length === "cm" &&
              measurementUnits.temperature === "celsius"
                ? t("Metric units short")
                : t("Custom")
            }
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
            onPress={() => {
              console.log("Déconnexion");
            }}
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
        selectedChildId={selectedChildId}
        onSelectChild={handleSelectChild}
        onAddChild={handleAddChild}
      />

      <ChildThemeSheet
        ref={childThemeSheetRef}
        selectedTheme={child.themeMode}
        onSelectTheme={handleSelectTheme}
      />

      <FeedingPreferencesSheet
        ref={feedingMethodSheetRef}
        selectedMethods={child.feedingMethods ?? ["bottle"]}
        themeMode={child.themeMode}
        onSave={handleSaveFeedingPreferences}
      />

      <TrackingPreferencesSheet
        ref={trackingPreferencesSheetRef}
        visibleTrackingIds={visibleTrackingIds}
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
        currentUserId="thomas"
        canManageMembers={child.currentUserRole === "owner"}
        onPressMember={handlePressMember}
        onInviteSomeone={handleInviteSomeone}
      />

      <InviteMemberSheet
        ref={inviteMemberSheetRef}
        childName={child.firstName}
        onSendInvitation={async ({ email }) => {
          console.log("Send invitation to:", email);

          return true;
        }}
        onInvitationSent={({ email, childName }) => {
          showToast({
            type: "success",
            title: t("Invitation sent"),
            message: t("Invitation sent to email for child profile", {
              email,
              childName,
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
        childName={child.firstName}
        currentUserId="thomas"
        canManageMembers={child.currentUserRole === "owner"}
        isRemoving={isRemovingMember}
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
        onChangeUnits={async ({ units }) => {
          setMeasurementUnits(units);

          // Plus tard :
          // await api.patch("/users/preferences/units", units);

          return true;
        }}
      />

      <MyAccountSheet
        ref={myAccountSheetRef}
        firstName={account.firstName}
        email={account.email}
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
        firstName={account.firstName}
        isSaving={isSavingFirstName}
        onSave={async ({ firstName }) => {
          setIsSavingFirstName(true);

          try {
            // Plus tard :
            // await api.patch("/users/me", { firstName });

            setAccount((currentAccount) => ({
              ...currentAccount,
              firstName,
            }));

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
        currentEmail={account.email}
        isSubmitting={isUpdatingEmail}
        onRequestCode={async ({ email }) => {
          setIsUpdatingEmail(true);

          try {
            // Plus tard :
            // await api.post("/users/email/change/request", { email });

            console.log("Send verification code to:", email);

            return true;
          } finally {
            setIsUpdatingEmail(false);
          }
        }}
        onVerifyCode={async ({ email, code }) => {
          setIsUpdatingEmail(true);

          try {
            // Plus tard :
            // await api.post("/users/email/change/verify", {
            //   email,
            //   code,
            // });

            console.log("Verify email code:", code);

            setAccount((currentAccount) => ({
              ...currentAccount,
              email,
            }));

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
              message: t("Your new email address is email", {
                email,
              }),
            });
          }, 250);
        }}
      />

      <DeleteAccountSheet
        ref={deleteAccountSheetRef}
        isDeleting={isDeletingAccount}
        onDeleteAccount={async () => {
          setIsDeletingAccount(true);

          try {
            // Plus tard :
            // await api.delete("/users/me");

            console.log("Delete account");

            return true;
          } finally {
            setIsDeletingAccount(false);
          }
        }}
        onAccountDeleted={() => {
          /*
           * Ici, ne montre pas forcément un toast :
           * l’utilisateur doit être déconnecté et renvoyé
           * vers l’onboarding ou l’écran de bienvenue.
           */

          console.log("Clear authentication and return to welcome screen");

          // dispatch(logout());
          // dispatch(resetOnboarding());
        }}
      />

      <DeleteChildProfileSheet
        ref={deleteChildProfileSheetRef}
        childName={child.firstName}
        isDeleting={isDeletingChildProfile}
        onDeleteChildProfile={async () => {
          setIsDeletingChildProfile(true);

          try {
            // Plus tard :
            // await api.delete(`/children/${child.id}`);

            setChildren((currentChildren) =>
              currentChildren.filter(
                (currentChild) => currentChild.id !== child.id,
              ),
            );

            return true;
          } finally {
            setIsDeletingChildProfile(false);
          }
        }}
        onChildProfileDeleted={({ childName }) => {
          const remainingChildren = children.filter(
            (currentChild) => currentChild.id !== child.id,
          );

          setSelectedChildId(remainingChildren[0]?.id ?? null);

          showToast({
            type: "success",
            title: t("Child profile deleted"),
            message: t("Child profile has been permanently deleted", {
              childName,
            }),
          });
        }}
      />

      <EditChildProfileScreen
        ref={editChildProfileSheetRef}
        child={child}
        onSave={async (updatedChild) => {
          setChildren((currentChildren) =>
            currentChildren.map((currentChild) =>
              currentChild.id === child.id
                ? {
                    ...currentChild,
                    ...updatedChild,
                  }
                : currentChild,
            ),
          );

          return true;
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
        hasPicture={Boolean(child.profilePicture)}
        isUpdating={isUpdatingChildPicture}
        onPictureSelected={async ({ uri }) => {
          setIsUpdatingChildPicture(true);

          try {
            setChildren((currentChildren) =>
              currentChildren.map((currentChild) =>
                currentChild.id === child.id
                  ? {
                      ...currentChild,
                      profilePicture: { uri },
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
          } finally {
            setIsUpdatingChildPicture(false);
          }
        }}
        onPictureRemoved={async () => {
          setIsUpdatingChildPicture(true);

          try {
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

      marginVertical: 18,
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
