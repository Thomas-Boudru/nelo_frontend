import { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import * as Crypto from "expo-crypto";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useAuth } from "../../auth/AuthProvider";

import {
  getSubscriptionProducts,
  getFamilyEntitlements,
  createSubscriptionPurchaseIntent,
  synchronizeRevenueCatPurchase,
} from "../../api/billingApi";

import {
  loadRevenueCatProducts,
  purchaseRevenueCatProduct,
  restoreRevenueCatPurchases,
} from "../../services/billing/revenuecatService";

import {
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  AccessibilityInfo,
  Animated,
  Easing,
} from "react-native";

import { LinearGradient } from "expo-linear-gradient";

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

const LOADING_PLANS = [
  { id: "yearly", titleKey: "Yearly", periodKey: "per year" },
  { id: "monthly", titleKey: "Monthly", periodKey: "per month" },
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

function getBillingStore() {
  if (Platform.OS === "ios") return "app_store";
  if (Platform.OS === "android") return "play_store";

  throw new Error("Purchases are not supported on this platform.");
}

function getRevenueCatProductIdentifier(product) {
  const productId = product?.storeProductId;

  if (typeof productId !== "string" || !productId.trim()) {
    throw new Error("Missing store product ID.");
  }

  if (Platform.OS === "ios") {
    return productId;
  }

  if (Platform.OS === "android") {
    const basePlanId = product?.storeBasePlanId;

    if (typeof basePlanId !== "string" || !basePlanId.trim()) {
      throw new Error("Missing Google Play base plan ID.");
    }

    return `${productId}:${basePlanId}`;
  }

  throw new Error("Purchases are not supported on this platform.");
}

function LoadingPlanCard({ plan, styles, t }) {
  const progress = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(true);

  useEffect(() => {
    let active = true;
    let preferenceChanged = false;

    const listener = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (enabled) => {
        preferenceChanged = true;
        if (active) setReduceMotion(enabled);
      },
    );

    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (active && !preferenceChanged) {
          setReduceMotion(enabled);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
      listener.remove();
    };
  }, []);

  useEffect(() => {
    progress.setValue(0);

    if (reduceMotion) return;

    const animation = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 1400,
        easing: Easing.linear,
        useNativeDriver: true,
        isInteraction: false,
      }),
    );

    animation.start();

    return () => animation.stop();
  }, [progress, reduceMotion]);

  return (
    <View
      style={styles.planCard}
      accessible
      accessibilityLabel={`${t(plan.titleKey)}. ${t("Loading subscriptions")}`}
      accessibilityState={{ busy: true }}
    >
      <View style={styles.planTopRow}>
        <View style={styles.planInformation}>
          <View style={styles.planTitleRow}>
            <Text style={styles.planTitle}>{t(plan.titleKey)}</Text>
          </View>

          <View style={[styles.priceRow, { alignItems: "center" }]}>
            <View style={styles.skeletonPrice}>
              {!reduceMotion ? (
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.shimmerWave,
                    {
                      transform: [
                        {
                          translateX: progress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [-80, 120],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <LinearGradient
                    colors={[
                      "rgba(255,255,255,0)",
                      "rgba(255,255,255,0.65)",
                      "rgba(255,255,255,0)",
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFillObject}
                  />
                </Animated.View>
              ) : null}
            </View>

            <Text style={styles.planPeriod}>{t(plan.periodKey)}</Text>
          </View>
        </View>

        <View style={styles.selectionIndicator} />
      </View>
    </View>
  );
}

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

function ActiveSubscription({ colors, styles, t }) {
  return (
    <View style={styles.activeSubscriptionCard}>
      <View style={[styles.activeStatusRow, { marginBottom: 0 }]}>
        <View style={styles.activeStatusIcon}>
          <Ionicons name="checkmark" size={18} color={colors.white} />
        </View>

        <Text style={styles.activeStatusText}>
          {t("Your family has Premium access")}
        </Text>
      </View>
    </View>
  );
}

export default function SubscriptionScreen({ navigation }) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { user, accessToken, refreshSession } = useAuth();

  const selectedChild = useSelector((state) =>
    state.children.children.find(
      (child) => child.id === state.children.selectedChildId,
    ),
  );

  const familyId = selectedChild?.familyId;
  const userId = user?.id;
  const currentScopeKey = userId && familyId ? `${userId}:${familyId}` : null;

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [selectedPlan, setSelectedPlan] = useState("yearly");
  const [plans, setPlans] = useState([]);
  const [entitlements, setEntitlements] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reloadCount, setReloadCount] = useState(0);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [purchaseNeedsVerification, setPurchaseNeedsVerification] =
    useState(false);

  const busyRef = useRef(false);
  const screenRef = useRef({ userId, familyId });
  const mountedRef = useRef(true);
  const loadedScopeRef = useRef(null);

  // Le rendu ne doit jamais réutiliser les droits du compte ou de la
  // famille précédente, même pendant le court délai avant l'effet suivant.
  const visibleEntitlements =
    loadedScopeRef.current === currentScopeKey ? entitlements : null;

  screenRef.current = { userId, familyId };

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  function isCurrentScreen(expectedUserId, expectedFamilyId) {
    return (
      mountedRef.current &&
      screenRef.current.userId === expectedUserId &&
      screenRef.current.familyId === expectedFamilyId
    );
  }

  function readEntitlements(response) {
    const value = response?.entitlements ?? response;

    if (typeof value?.isPremium !== "boolean") {
      throw new Error("Invalid family entitlements response.");
    }

    return value;
  }

  useEffect(() => {
    let cancelled = false;
    const scopeKey = currentScopeKey;
    const scopeChanged = loadedScopeRef.current !== scopeKey;

    if (scopeChanged) {
      loadedScopeRef.current = scopeKey;
      setPlans([]);
      setEntitlements(null);
      setPurchaseNeedsVerification(false);
    }

    setIsLoading(true);
    setLoadFailed(false);

    if (!userId || !familyId) {
      setIsLoading(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      if (cancelled) return;

      cancelled = true;
      setLoadFailed(true);
      setIsLoading(false);
    }, 25000);

    async function load() {
      try {
        const [productsResponse, rightsResponse] = await Promise.all([
          getSubscriptionProducts({
            store: getBillingStore(),
            accessToken,
            refreshSession,
          }),

          getFamilyEntitlements({
            familyId,
            accessToken,
            refreshSession,
          }),
        ]);

        const rights = readEntitlements(rightsResponse);

        if (cancelled) return;

        setEntitlements(rights);

        const products = productsResponse.products;

        if (!Array.isArray(products)) {
          throw new Error("Invalid subscription products response.");
        }

        if (products.length === 0) {
          if (!cancelled) setPlans([]);
          return;
        }

        const storeProducts = await loadRevenueCatProducts({
          userId,
          identifiers: products.map(getRevenueCatProductIdentifier),
        });

        const availablePlans = products.flatMap((product) => {
          const expectedIdentifier = getRevenueCatProductIdentifier(product);

          const storeProduct = storeProducts.find(
            (item) => item.identifier === expectedIdentifier,
          );

          if (!storeProduct) return [];

          const yearly = product.billingPeriod === "year";

          return [
            {
              id: yearly ? "yearly" : "monthly",
              titleKey: yearly ? "Yearly" : "Monthly",
              periodKey: yearly ? "per year" : "per month",
              price: storeProduct.priceString,
              backendProduct: product,
              storeProduct,
            },
          ];
        });

        availablePlans.sort((a, b) =>
          a.id === b.id ? 0 : a.id === "yearly" ? -1 : 1,
        );

        if (cancelled) return;

        setPlans(availablePlans);

        setSelectedPlan((previous) =>
          availablePlans.some((plan) => plan.id === previous)
            ? previous
            : (availablePlans[0]?.id ?? "yearly"),
        );
      } catch (error) {
        if (!cancelled) {
          setLoadFailed(true);

          showToast({
            type: "error",
            title: t("Unable to load subscriptions"),
            message: t("Please try again"),
          });
        }
      } finally {
        clearTimeout(timeoutId);

        if (!cancelled) setIsLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [
    userId,
    familyId,
    currentScopeKey,
    accessToken,
    refreshSession,
    showToast,
    t,
    reloadCount,
  ]);

  async function confirmPremium(expectedUserId, expectedFamilyId) {
    const response = await synchronizeRevenueCatPurchase({
      familyId: expectedFamilyId,
      accessToken,
      refreshSession,
    });

    const rights = readEntitlements(response);

    if (isCurrentScreen(expectedUserId, expectedFamilyId)) {
      setEntitlements(rights);
    }

    return rights.isPremium;
  }

  const handleSubscribe = async () => {
    if (
      busyRef.current ||
      isLoading ||
      !userId ||
      !familyId ||
      visibleEntitlements?.isPremium ||
      visibleEntitlements?.currentUserRole !== "owner"
    ) {
      return;
    }

    const plan = plans.find((item) => item.id === selectedPlan);

    if (!plan || purchaseNeedsVerification) return;

    const purchaseUserId = userId;
    const purchaseFamilyId = familyId;

    busyRef.current = true;
    setIsPurchasing(true);

    let storePurchaseCompleted = false;

    try {
      // Conserve la même intention si la préparation est relancée
      // après une coupure réseau ou une annulation du paiement.
      const storageKey =
        `nelo_purchase_intent:revenuecat:${purchaseUserId}:` +
        `${purchaseFamilyId}:${plan.backendProduct.id}`;

      let savedRequest = null;

      try {
        const stored = await AsyncStorage.getItem(storageKey);
        savedRequest = stored ? JSON.parse(stored) : null;
      } catch {
        savedRequest = null;
      }

      if (
        !savedRequest?.key ||
        typeof savedRequest.createdAt !== "number" ||
        Date.now() - savedRequest.createdAt >= 30 * 60 * 1000
      ) {
        savedRequest = {
          key: Crypto.randomUUID(),
          createdAt: Date.now(),
        };

        await AsyncStorage.setItem(storageKey, JSON.stringify(savedRequest));
      }

      const { purchaseIntent } = await createSubscriptionPurchaseIntent({
        familyId: purchaseFamilyId,
        productId: plan.backendProduct.id,
        idempotencyKey: savedRequest.key,
        accessToken,
        refreshSession,
      });

      if (__DEV__) {
        console.log(
          "[Billing] Purchase intent checks",
          JSON.stringify(
            {
              status: purchaseIntent?.status,
              managementProvider: purchaseIntent?.managementProvider,
              familyMatches: purchaseIntent?.familyId === purchaseFamilyId,
              userMatches:
                purchaseIntent?.revenuecatAppUserId === purchaseUserId,
              receivedProductId: purchaseIntent?.product?.storeProductId,
              expectedProductId: plan.storeProduct.identifier,
              expiresAt: purchaseIntent?.expiresAt,
              deviceTime: new Date().toISOString(),
              replayed: purchaseIntent?.replayed,
            },
            null,
            2,
          ),
        );
      }

      const intentProduct = purchaseIntent?.product;
      const expectedProduct = plan.backendProduct;

      const productMatches =
        intentProduct?.storeProductId === expectedProduct.storeProductId &&
        (Platform.OS !== "android" ||
          (typeof expectedProduct.storeBasePlanId === "string" &&
            expectedProduct.storeBasePlanId.length > 0 &&
            intentProduct?.storeBasePlanId ===
              expectedProduct.storeBasePlanId));

      const storeProductMatches =
        getRevenueCatProductIdentifier(expectedProduct) ===
        plan.storeProduct.identifier;

      const expiresAt = Date.parse(purchaseIntent?.expiresAt);

      if (
        purchaseIntent?.status !== "pending" ||
        purchaseIntent?.managementProvider !== "revenuecat" ||
        purchaseIntent?.familyId !== purchaseFamilyId ||
        purchaseIntent?.revenuecatAppUserId !== purchaseUserId ||
        !productMatches ||
        !storeProductMatches ||
        !Number.isFinite(expiresAt) ||
        expiresAt <= Date.now()
      ) {
        throw new Error("The purchase preparation is no longer valid.");
      }

      if (!isCurrentScreen(purchaseUserId, purchaseFamilyId)) return;

      await purchaseRevenueCatProduct({
        userId: purchaseUserId,
        product: plan.storeProduct,
      });

      storePurchaseCompleted = true;

      if (isCurrentScreen(purchaseUserId, purchaseFamilyId)) {
        setPurchaseNeedsVerification(true);
      }

      const isPremium = await confirmPremium(purchaseUserId, purchaseFamilyId);

      if (!isCurrentScreen(purchaseUserId, purchaseFamilyId)) return;

      showToast({
        type: isPremium ? "success" : "info",
        title: t(isPremium ? "Premium activated" : "Purchase received"),
        message: t(
          isPremium
            ? "Your family now has Premium access"
            : "Your purchase is being verified. Use Restore purchases to check again.",
        ),
      });
    } catch (error) {
      if (__DEV__) {
        console.log(
          "[Billing] Purchase failed",
          JSON.stringify(
            {
              code: error?.code,
              status: error?.status,
              message: error?.message,
              userCancelled: error?.userCancelled,
              storePurchaseCompleted,
            },
            null,
            2,
          ),
        );
      }

      if (
        error?.userCancelled ||
        !isCurrentScreen(purchaseUserId, purchaseFamilyId)
      ) {
        return;
      }

      showToast({
        type: storePurchaseCompleted ? "info" : "error",
        title: t(
          storePurchaseCompleted
            ? "Purchase verification pending"
            : "Unable to complete purchase",
        ),
        message: t(
          storePurchaseCompleted
            ? "Do not purchase again. Use Restore purchases to check your access."
            : "Please try again. If you already purchased, use Restore purchases.",
        ),
      });
    } finally {
      busyRef.current = false;
      if (mountedRef.current) setIsPurchasing(false);
    }
  };

  const handleRestorePurchases = async () => {
    if (busyRef.current || !userId || !familyId) return;

    const restoreUserId = userId;
    const restoreFamilyId = familyId;

    busyRef.current = true;
    setIsRestoring(true);

    try {
      await restoreRevenueCatPurchases({
        userId: restoreUserId,
      });

      const isPremium = await confirmPremium(restoreUserId, restoreFamilyId);

      if (!isCurrentScreen(restoreUserId, restoreFamilyId)) return;

      showToast({
        type: isPremium ? "success" : "info",
        title: t(isPremium ? "Purchases restored" : "No active Premium access"),
        message: t(
          isPremium
            ? "Your family now has Premium access"
            : "No active Premium access was confirmed for this family.",
        ),
      });
    } catch (error) {
      if (!isCurrentScreen(restoreUserId, restoreFamilyId)) return;

      showToast({
        type: "error",
        title: t("Unable to restore purchases"),
        message: t(
          error?.code === "REVENUECAT_FAMILY_BINDING_MISSING" ||
            error?.code === "BILLING_FAMILY_CHANGE_REQUIRES_REVIEW"
            ? "Use the Nelo account and family used for the original purchase."
            : "Please try again",
        ),
      });
    } finally {
      busyRef.current = false;
      if (mountedRef.current) setIsRestoring(false);
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

          {!visibleEntitlements?.isPremium ? (
            <>
              <Text style={styles.heroTitle}>
                {t("Unlock the full Nelo experience")}
              </Text>

              <Text style={styles.heroDescription}>
                {t("Everything you need to support your parenting journey")}
              </Text>
            </>
          ) : null}
        </View>

        {!visibleEntitlements?.isPremium ? (
          <Text style={styles.legalText} accessibilityLiveRegion="polite">
            {isLoading
              ? t("Loading subscriptions")
              : !familyId
                ? t("Select a child to view subscriptions")
                : loadFailed
                  ? t("Unable to load subscriptions")
                  : visibleEntitlements?.currentUserRole !== "owner"
                    ? t("Only a family owner can purchase a subscription")
                    : plans.length === 0
                      ? t("Subscriptions are not available yet")
                      : null}
          </Text>
        ) : null}

        {visibleEntitlements?.isPremium ? (
          <ActiveSubscription colors={colors} styles={styles} t={t} />
        ) : (
          <View
            accessibilityRole={isLoading ? undefined : "radiogroup"}
            style={styles.plansContainer}
          >
            {isLoading
              ? LOADING_PLANS.map((plan) => (
                  <LoadingPlanCard
                    key={plan.id}
                    plan={plan}
                    styles={styles}
                    t={t}
                  />
                ))
              : plans.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    selected={plan.id === selectedPlan}
                    onPress={(id) => {
                      if (!busyRef.current) {
                        setSelectedPlan(id);
                      }
                    }}
                    colors={colors}
                    styles={styles}
                    t={t}
                  />
                ))}
          </View>
        )}

        {!visibleEntitlements?.isPremium &&
        !isLoading &&
        userId &&
        familyId &&
        (loadFailed || plans.length === 0) ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("Retry")}
            disabled={isPurchasing || isRestoring}
            onPress={() => {
              if (busyRef.current) return;

              setLoadFailed(false);
              setIsLoading(true);
              setReloadCount((count) => count + 1);
            }}
            style={({ pressed }) => [
              styles.textButton,
              pressed && styles.textButtonPressed,
              (isPurchasing || isRestoring) && styles.textButtonDisabled,
            ]}
          >
            <Text style={styles.textButtonLabel}>{t("Retry")}</Text>
          </Pressable>
        ) : null}

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
          disabled={isRestoring || isPurchasing || isLoading || !familyId}
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
          title={
            isLoading
              ? t("Loading subscriptions")
              : visibleEntitlements?.isPremium
                ? t("Manage subscription")
                : purchaseNeedsVerification
                  ? t("Restore purchases")
                  : t("Continue with selected plan", {
                      plan: t(selectedPlan === "yearly" ? "Yearly" : "Monthly"),
                    })
          }
          loading={isPurchasing || isRestoring}
          disabled={
            isLoading ||
            isPurchasing ||
            isRestoring ||
            !familyId ||
            (!visibleEntitlements?.isPremium &&
              !purchaseNeedsVerification &&
              (plans.length === 0 ||
                visibleEntitlements?.currentUserRole !== "owner"))
          }
          onPress={
            visibleEntitlements?.isPremium
              ? handleManageSubscription
              : purchaseNeedsVerification
                ? handleRestorePurchases
                : handleSubscribe
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

    skeletonPrice: {
      width: 110,
      height: 29,
      borderRadius: 8,
      overflow: "hidden",
      backgroundColor: colors.border,
    },

    shimmerWave: {
      position: "absolute",
      top: 0,
      bottom: 0,
      left: 0,
      width: 80,
    },
  });
