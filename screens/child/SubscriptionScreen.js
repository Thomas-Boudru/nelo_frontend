import { useMemo, useState } from "react";
import {
  Image,
  Linking,
  Platform,
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
import PrimaryButton from "../../components/ui/PrimaryButton.js";

import { useThemeColors } from "../../theme/useThemeColors.js";
import { useToast } from "../../components/ui/toast/useToast.js";

const CLOUD_IMAGE = require("../../assets/illustrations/onboarding/cloudPremium.png");
const STAR_YELLOW_IMAGE = require("../../assets/illustrations/onboarding/starYellow.png");
const STAR_PINK_IMAGE = require("../../assets/illustrations/onboarding/starPink.png");

const SUBSCRIPTION_PLANS = [
  {
    id: "yearly",
    titleKey: "Yearly",
    price: "€39.99",
    periodKey: "per year",
    badgeKey: "Best value",
    discountKey: "Save 33 percent",
  },
  {
    id: "monthly",
    titleKey: "Monthly",
    price: "€4.99",
    periodKey: "per month",
  },
];

const PREMIUM_FEATURES = [
  {
    id: "copilot",
    icon: "sparkles-outline",
    titleKey: "Unlimited AI Copilot",
  },
  {
    id: "voice",
    icon: "mic-outline",
    titleKey: "Unlimited voice tracking",
  },
  {
    id: "moments",
    icon: "images-outline",
    titleKey: "Unlimited memories",
  },
  {
    id: "sleep",
    icon: "moon-outline",
    titleKey: "Advanced sleep insights",
  },
  {
    id: "recommendations",
    icon: "bulb-outline",
    titleKey: "Personalized recommendations",
  },
  {
    id: "future",
    icon: "diamond-outline",
    titleKey: "Future Premium features included",
  },
];

function PlanCard({ plan, selected, onPress, colors, styles, t }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={t(plan.titleKey)}
      accessibilityState={{ selected }}
      onPress={() => onPress(plan.id)}
      style={({ pressed }) => [
        styles.planCard,
        selected && styles.planCardSelected,
        pressed && styles.planCardPressed,
      ]}
    >
      <View style={styles.planTopRow}>
        <View style={styles.planInformation}>
          <View style={styles.planTitleRow}>
            <Text style={styles.planTitle}>{t(plan.titleKey)}</Text>

            {plan.badgeKey ? (
              <View style={styles.bestValueBadge}>
                <Ionicons name="star" size={12} color={colors.primary} />

                <Text style={styles.bestValueBadgeText}>
                  {t(plan.badgeKey)}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.planPrice}>{plan.price}</Text>

            <Text style={styles.planPeriod}>{t(plan.periodKey)}</Text>
          </View>

          {plan.discountKey ? (
            <Text style={styles.discountText}>{t(plan.discountKey)}</Text>
          ) : null}
        </View>

        <View
          style={[
            styles.selectionIndicator,
            selected && styles.selectionIndicatorSelected,
          ]}
        >
          {selected ? (
            <Ionicons name="checkmark" size={16} color={colors.white} />
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

function PremiumFeature({ feature, colors, styles, t }) {
  return (
    <View style={styles.featureItem}>
      <View style={styles.featureIconContainer}>
        <Ionicons name={feature.icon} size={20} color={colors.primary} />
      </View>

      <Text style={styles.featureTitle}>{t(feature.titleKey)}</Text>

      <View style={styles.featureCheckContainer}>
        <Ionicons name="checkmark" size={14} color={colors.primary} />
      </View>
    </View>
  );
}

function ActiveSubscription({
  subscription,
  onManageSubscription,
  onRestorePurchases,
  colors,
  styles,
  t,
}) {
  return (
    <>
      <View style={styles.activeSubscriptionCard}>
        <View style={styles.activeStatusRow}>
          <View style={styles.activeStatusIcon}>
            <Ionicons name="checkmark" size={18} color={colors.white} />
          </View>

          <Text style={styles.activeStatusText}>
            {t("Your subscription is active")}
          </Text>
        </View>

        <View style={styles.subscriptionDetailRow}>
          <Text style={styles.subscriptionDetailLabel}>
            {t("Current plan")}
          </Text>

          <Text style={styles.subscriptionDetailValue}>
            {t(subscription.plan === "yearly" ? "Yearly" : "Monthly")}
          </Text>
        </View>

        <View style={styles.subscriptionDetailDivider} />

        <View style={styles.subscriptionDetailRow}>
          <Text style={styles.subscriptionDetailLabel}>{t("Renews on")}</Text>

          <Text style={styles.subscriptionDetailValue}>
            {subscription.renewalDate}
          </Text>
        </View>
      </View>

      <PrimaryButton
        title={t("Manage subscription")}
        onPress={onManageSubscription}
        icon={
          <Ionicons name="settings-outline" size={19} color={colors.white} />
        }
        style={styles.primaryAction}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("Restore purchases")}
        onPress={onRestorePurchases}
        style={({ pressed }) => [
          styles.textButton,
          pressed && styles.textButtonPressed,
        ]}
      >
        <Text style={styles.textButtonLabel}>{t("Restore purchases")}</Text>
      </Pressable>
    </>
  );
}

export default function SubscriptionScreen({ navigation }) {
  const { t } = useTranslation();
  const { showToast } = useToast();

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [selectedPlan, setSelectedPlan] = useState("yearly");
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  /*
   * Plus tard, cette information viendra du backend,
   * de RevenueCat ou directement des stores.
   */
  const subscription = {
    isActive: false,
    plan: "yearly",
    renewalDate: "12 January 2027",
  };

  const handleSubscribe = async () => {
    if (isPurchasing) {
      return;
    }

    setIsPurchasing(true);

    try {
      /*
       * Plus tard :
       *
       * const packageToPurchase =
       *   selectedPlan === "yearly"
       *     ? yearlyPackage
       *     : monthlyPackage;
       *
       * await Purchases.purchasePackage(packageToPurchase);
       */

      console.log("Purchase selected plan:", selectedPlan);

      showToast({
        type: "info",
        title: t("Subscription purchase"),
        message: t("The store purchase screen will open here"),
      });
    } catch (error) {
      showToast({
        type: "error",
        title: t("Unable to start purchase"),
        message: t("Please try again"),
      });
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestorePurchases = async () => {
    if (isRestoring) {
      return;
    }

    setIsRestoring(true);

    try {
      /*
       * Plus tard :
       *
       * const customerInfo =
       *   await Purchases.restorePurchases();
       */

      showToast({
        type: "success",
        title: t("Purchases restored"),
        message: t("Your previous purchases have been checked"),
      });
    } catch (error) {
      showToast({
        type: "error",
        title: t("Unable to restore purchases"),
        message: t("Please try again"),
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      if (Platform.OS === "ios") {
        await Linking.openURL("https://apps.apple.com/account/subscriptions");

        return;
      }

      await Linking.openURL(
        "https://play.google.com/store/account/subscriptions",
      );
    } catch (error) {
      showToast({
        type: "error",
        title: t("Unable to open subscriptions"),
        message: t("Open your store settings to manage your subscription"),
      });
    }
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />

        <Text style={styles.headerTitle}>{t("Nelo Premium")}</Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.hero}>
          <View style={styles.illustrationContainer}>
            <Image
              source={CLOUD_IMAGE}
              resizeMode="contain"
              style={styles.cloudImage}
            />

            <Image
              source={STAR_YELLOW_IMAGE}
              resizeMode="contain"
              style={styles.starYellow}
            />

            <Image
              source={STAR_PINK_IMAGE}
              resizeMode="contain"
              style={styles.starPink}
            />
          </View>

          <Text style={styles.heroTitle}>
            {t("Unlock the full Nelo experience")}
          </Text>

          <Text style={styles.heroDescription}>
            {t("Everything you need to support your parenting journey")}
          </Text>
        </View>

        <View accessibilityRole="radiogroup" style={styles.plansContainer}>
          {SUBSCRIPTION_PLANS.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              selected={plan.id === selectedPlan}
              onPress={setSelectedPlan}
              colors={colors}
              styles={styles}
              t={t}
            />
          ))}
        </View>

        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>{t("Everything included")}</Text>

          <View style={styles.featuresCard}>
            {PREMIUM_FEATURES.map((feature, index) => (
              <View key={feature.id}>
                <PremiumFeature
                  feature={feature}
                  colors={colors}
                  styles={styles}
                  t={t}
                />

                {index < PREMIUM_FEATURES.length - 1 ? (
                  <View style={styles.featureDivider} />
                ) : null}
              </View>
            ))}
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("Restore purchases")}
          disabled={isRestoring}
          onPress={handleRestorePurchases}
          style={({ pressed }) => [
            styles.textButton,
            pressed && styles.textButtonPressed,
            isRestoring && styles.textButtonDisabled,
          ]}
        >
          <Text style={styles.textButtonLabel}>
            {isRestoring ? t("Restoring purchases") : t("Restore purchases")}
          </Text>
        </Pressable>

        <Text style={styles.legalText}>
          {t(
            "Subscriptions are managed by Apple or Google and can be cancelled at any time",
          )}
        </Text>
      </ScrollView>

      <View style={styles.fixedFooter}>
        <PrimaryButton
          title={t("Continue with selected plan", {
            plan: t(selectedPlan === "yearly" ? "Yearly" : "Monthly"),
          })}
          loading={isPurchasing}
          onPress={handleSubscribe}
          icon={
            !isPurchasing ? (
              <Ionicons name="arrow-forward" size={19} color={colors.white} />
            ) : null
          }
        />
      </View>
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
      paddingTop: 0,
      paddingBottom: 24,
    },

    fixedFooter: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 12,

      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,

      backgroundColor: colors.background,
    },

    hero: {
      alignItems: "center",

      paddingHorizontal: 8,
      marginBottom: 25,
    },

    illustrationContainer: {
      position: "relative",

      width: 130,
      height: 110,

      alignItems: "center",
      justifyContent: "center",
    },

    cloudImage: {
      width: 150,
      height: 150,
    },

    starYellow: {
      position: "absolute",

      top: 3,
      right: -40,

      width: 24,
      height: 24,
    },

    starPink: {
      position: "absolute",

      bottom: 22,
      left: -25,

      width: 18,
      height: 18,
    },

    premiumBadge: {
      position: "absolute",

      right: 10,
      bottom: 13,

      width: 36,
      height: 36,

      alignItems: "center",
      justifyContent: "center",

      borderWidth: 3,
      borderColor: colors.background,
      borderRadius: 18,

      backgroundColor: colors.white,

      shadowColor: colors.primary,
      shadowOffset: {
        width: 0,
        height: 3,
      },
      shadowOpacity: 0.16,
      shadowRadius: 7,

      elevation: 4,
    },

    sparkleLeft: {
      position: "absolute",
      top: 13,
      left: 4,

      transform: [{ rotate: "-15deg" }],
    },

    sparkleRight: {
      position: "absolute",
      top: 2,
      right: 18,

      opacity: 0.75,
    },

    heroTitle: {
      marginTop: 5,

      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 24,
      lineHeight: 32,
      textAlign: "center",

      color: colors.textPrimary,
    },

    heroDescription: {
      maxWidth: 330,

      marginTop: 7,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 13,
      lineHeight: 20,
      textAlign: "center",

      color: colors.textSecondary,
    },

    plansContainer: {
      gap: 12,
    },

    planCard: {
      minHeight: 104,

      paddingHorizontal: 17,
      paddingVertical: 16,

      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 22,

      backgroundColor: colors.white,

      shadowColor: colors.textPrimary,
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.03,
      shadowRadius: 12,

      elevation: 2,
    },

    planCardSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.selectedBackground,
    },

    planCardPressed: {
      opacity: 0.78,
      transform: [{ scale: 0.99 }],
    },

    planTopRow: {
      flexDirection: "row",
      alignItems: "center",
    },

    planInformation: {
      flex: 1,
      minWidth: 0,
    },

    planTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",

      gap: 8,
    },

    planTitle: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 16,
      lineHeight: 22,

      color: colors.textPrimary,
    },

    bestValueBadge: {
      flexDirection: "row",
      alignItems: "center",

      gap: 4,

      paddingHorizontal: 8,
      paddingVertical: 4,

      borderRadius: 12,

      backgroundColor: colors.white,
    },

    bestValueBadgeText: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 9,
      lineHeight: 12,

      color: colors.primary,
    },

    priceRow: {
      flexDirection: "row",
      alignItems: "baseline",

      marginTop: 8,
    },

    planPrice: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 22,
      lineHeight: 29,

      color: colors.textPrimary,
    },

    planPeriod: {
      marginLeft: 5,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 11,
      lineHeight: 16,

      color: colors.textSecondary,
    },

    discountText: {
      marginTop: 2,

      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 11,
      lineHeight: 16,

      color: colors.success,
    },

    selectionIndicator: {
      width: 27,
      height: 27,

      alignItems: "center",
      justifyContent: "center",

      marginLeft: 12,

      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 14,

      backgroundColor: colors.white,
    },

    selectionIndicatorSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primary,
    },

    featuresSection: {
      marginTop: 25,
    },

    sectionTitle: {
      marginBottom: 9,
      paddingHorizontal: 3,

      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 14,
      lineHeight: 20,

      color: colors.textPrimary,
    },

    featuresCard: {
      paddingHorizontal: 14,

      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderRadius: 22,

      backgroundColor: colors.white,

      overflow: "hidden",
    },

    featureItem: {
      minHeight: 62,

      flexDirection: "row",
      alignItems: "center",
    },

    featureIconContainer: {
      width: 38,
      height: 38,

      alignItems: "center",
      justifyContent: "center",

      marginRight: 12,

      borderRadius: 19,

      backgroundColor: colors.selectedBackground,
    },

    featureTitle: {
      flex: 1,

      marginRight: 10,

      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 13,
      lineHeight: 18,

      color: colors.textPrimary,
    },

    featureDivider: {
      height: StyleSheet.hairlineWidth,

      marginLeft: 50,

      backgroundColor: colors.border,
    },

    primaryAction: {
      marginTop: 24,
    },

    textButton: {
      alignSelf: "center",

      paddingHorizontal: 16,
      paddingVertical: 12,
      marginTop: 20,

      borderRadius: 16,
    },

    textButtonPressed: {
      backgroundColor: colors.selectedBackground,
    },

    textButtonDisabled: {
      opacity: 0.55,
    },

    textButtonLabel: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 13,
      lineHeight: 18,

      color: colors.primary,
    },

    legalText: {
      maxWidth: 330,

      alignSelf: "center",

      marginTop: 2,

      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 10,
      lineHeight: 16,
      textAlign: "center",

      color: colors.textSecondary,
    },

    activeSubscriptionCard: {
      paddingHorizontal: 17,
      paddingVertical: 17,

      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 22,

      backgroundColor: colors.white,
    },

    activeStatusRow: {
      flexDirection: "row",
      alignItems: "center",

      marginBottom: 18,
    },

    activeStatusIcon: {
      width: 34,
      height: 34,

      alignItems: "center",
      justifyContent: "center",

      marginRight: 11,

      borderRadius: 17,

      backgroundColor: colors.success,
    },

    activeStatusText: {
      flex: 1,

      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 15,
      lineHeight: 21,

      color: colors.textPrimary,
    },

    subscriptionDetailRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",

      gap: 15,
    },

    subscriptionDetailLabel: {
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 12,
      lineHeight: 17,

      color: colors.textSecondary,
    },

    subscriptionDetailValue: {
      flexShrink: 1,

      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 13,
      lineHeight: 18,
      textAlign: "right",

      color: colors.textPrimary,
    },

    subscriptionDetailDivider: {
      height: StyleSheet.hairlineWidth,

      marginVertical: 14,

      backgroundColor: colors.border,
    },

    featureCheckContainer: {
      width: 24,
      height: 24,

      alignItems: "center",
      justifyContent: "center",

      borderRadius: 12,

      backgroundColor: colors.selectedBackground,
    },
  });
