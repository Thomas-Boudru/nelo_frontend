import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";

import { onboardingColors, spacing } from "../../theme/index.js";

import { completeOnboarding } from "../../store/slices/onboardingSlice.js";

import { useAuth } from "../../auth/AuthProvider.js";

import { completeOnboardingRequest } from "../../api/onboardingApi.js";

const colors = onboardingColors;

const CLOUD_IMAGE = require("../../assets/illustrations/onboarding/characterCloud.png");

const STAR_IMAGE = require("../../assets/illustrations/onboarding/starYellow.png");

const HEART_IMAGE = require("../../assets/illustrations/onboarding/heart.png");

const LANDSCAPE_IMAGE = require("../../assets/illustrations/onboarding/landscape.png");

const MINIMUM_LOADING_DURATION = 3000;

export default function OnboardingCompleteScreen() {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const onboarding = useSelector((state) => state.onboarding);

  const { accessToken, refreshSession, user, updateAuthenticatedUser } =
    useAuth();

  const parentName = onboarding.parentFirstName?.trim() || "";

  const childName = onboarding.childFirstName?.trim() || "";

  const [submissionError, setSubmissionError] = useState("");
  const [isRetrying, setIsRetrying] = useState(false);

  const rotation = useRef(new Animated.Value(0)).current;

  const cloudScale = useRef(new Animated.Value(0.94)).current;

  const contentOpacity = useRef(new Animated.Value(0)).current;

  function createPayload() {
    return {
      user: {
        displayName: onboarding.parentFirstName,
      },

      child: {
        status: onboarding.childStatus,
        displayName: onboarding.childFirstName || null,
        gender: onboarding.childGender,
        birthDate: onboarding.birthDate,
        birthTime: onboarding.birthTime,
        expectedBirthDate: onboarding.expectedBirthDate,
        isPremature: onboarding.isPremature,
        gestationalAgeWeeks: onboarding.gestationalAgeWeeks,
        gestationalAgeDays: onboarding.gestationalAgeDays,
      },

      membership: {
        relationship: onboarding.relationship,
      },

      preferences: {
        themeMode: onboarding.themeMode,
      },
    };
  }

  async function sendOnboardingRequest(payload, token) {
    return completeOnboardingRequest({
      payload,
      accessToken: token,
    });
  }

  async function submitOnboarding() {
    if (!accessToken) {
      throw new Error("Authentication session is missing.");
    }

    const payload = createPayload();

    const requestPromise = (async () => {
      try {
        return await sendOnboardingRequest(payload, accessToken);
      } catch (error) {
        if (error.code !== "ACCESS_TOKEN_EXPIRED") {
          throw error;
        }

        const refreshedAccessToken = await refreshSession();

        if (!refreshedAccessToken) {
          throw new Error("Unable to restore the authentication session.");
        }

        return sendOnboardingRequest(payload, refreshedAccessToken);
      }
    })();

    const minimumLoadingPromise = new Promise((resolve) => {
      setTimeout(resolve, MINIMUM_LOADING_DURATION);
    });

    const [result] = await Promise.all([requestPromise, minimumLoadingPromise]);

    return result;
  }

  function handleOnboardingSuccess(result) {
    const completedAt =
      result?.onboarding?.completedAt || new Date().toISOString();

    const updatedDisplayName =
      result?.onboarding?.user?.displayName || onboarding.parentFirstName;

    updateAuthenticatedUser({
      ...(user || {}),
      displayName: updatedDisplayName,
      onboardingCompletedAt: completedAt,
    });

    dispatch(completeOnboarding());
  }

  function handleSubmissionError(error) {
    console.error("Unable to complete onboarding", {
      name: error.name,
      message: error.message,
      status: error.status,
      code: error.code,
      details: error.details,
    });

    setSubmissionError(
      error.message ||
        t("Unable to complete your registration. Please try again."),
    );
  }

  async function handleRetry() {
    if (isRetrying) {
      return;
    }

    try {
      setIsRetrying(true);
      setSubmissionError("");

      const result = await submitOnboarding();

      handleOnboardingSuccess(result);
    } catch (error) {
      handleSubmissionError(error);
    } finally {
      setIsRetrying(false);
    }
  }

  useEffect(() => {
    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),

      Animated.spring(cloudScale, {
        toValue: 1,
        friction: 7,
        tension: 45,
        useNativeDriver: true,
      }),
    ]).start();
  }, [cloudScale, contentOpacity]);

  useEffect(() => {
    const rotationAnimation = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    rotationAnimation.start();

    return () => {
      rotationAnimation.stop();
    };
  }, [rotation]);

  useEffect(() => {
    let isMounted = true;

    async function initializeOnboarding() {
      try {
        const result = await submitOnboarding();

        if (!isMounted) {
          return;
        }

        handleOnboardingSuccess(result);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        handleSubmissionError(error);
      }
    }

    initializeOnboarding();

    return () => {
      isMounted = false;
    };
  }, []);

  const loaderRotation = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.screen}>
        <Image
          source={LANDSCAPE_IMAGE}
          resizeMode="stretch"
          pointerEvents="none"
          style={styles.landscapeBackground}
        />

        <Animated.View
          style={[
            styles.content,
            {
              opacity: contentOpacity,
            },
          ]}
        >
          <View style={styles.illustrationSection}>
            <Image
              source={STAR_IMAGE}
              resizeMode="contain"
              pointerEvents="none"
              style={styles.star}
            />

            <Image
              source={HEART_IMAGE}
              resizeMode="contain"
              pointerEvents="none"
              style={styles.heart}
            />

            <View style={styles.decorativeDotLeft} />
            <View style={styles.decorativeDotRight} />

            <Animated.Image
              source={CLOUD_IMAGE}
              resizeMode="contain"
              pointerEvents="none"
              style={[
                styles.cloud,
                {
                  transform: [{ scale: cloudScale }],
                },
              ]}
            />
          </View>

          <View style={styles.textSection}>
            <Text style={styles.title}>
              {t("Welcome")}{" "}
              <Text style={styles.highlightedName}>{parentName}</Text> 👋
            </Text>

            <Text style={styles.description}>
              {childName
                ? t("Nelo is preparing {{childName}}'s profile...", {
                    childName,
                  })
                : t("Nelo is preparing your experience...")}
            </Text>
          </View>

          <View style={styles.loadingSection}>
            {submissionError ? (
              <>
                <Text style={styles.errorText}>{submissionError}</Text>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("Try again")}
                  onPress={handleRetry}
                  disabled={isRetrying}
                  style={({ pressed }) => [
                    styles.retryButton,
                    (pressed || isRetrying) && styles.retryButtonPressed,
                  ]}
                >
                  <Text style={styles.retryButtonText}>
                    {isRetrying ? t("Trying again...") : t("Try again")}
                  </Text>
                </Pressable>
              </>
            ) : (
              <>
                <View style={styles.loaderTrack}>
                  <Animated.View
                    style={[
                      styles.loaderRing,
                      {
                        transform: [
                          {
                            rotate: loaderRotation,
                          },
                        ],
                      },
                    ]}
                  />

                  <View style={styles.loaderCenter} />
                </View>

                <Text style={styles.loadingText}>
                  {t("We are personalizing your experience.")}
                </Text>
              </>
            )}
          </View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },

  screen: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
  },

  landscapeBackground: {
    position: "absolute",
    right: 0,
    bottom: -8,
    left: 0,
    width: "100%",
    height: 190,
    opacity: 0.92,
  },

  content: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: 190,
  },

  illustrationSection: {
    position: "relative",
    width: "100%",
    height: 280,
    alignItems: "center",
    justifyContent: "flex-end",
  },

  cloud: {
    width: 250,
    height: 220,
  },

  star: {
    position: "absolute",
    top: 50,
    left: 32,
    width: 25,
    height: 25,
    transform: [{ rotate: "-10deg" }],
  },

  heart: {
    position: "absolute",
    top: 70,
    right: 34,
    width: 23,
    height: 23,
    transform: [{ rotate: "9deg" }],
  },

  decorativeDotLeft: {
    position: "absolute",
    top: 128,
    left: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(93, 143, 247, 0.32)",
  },

  decorativeDotRight: {
    position: "absolute",
    top: 145,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(93, 143, 247, 0.32)",
  },

  textSection: {
    width: "100%",
    alignItems: "center",
    marginTop: spacing.md,
  },

  title: {
    width: "100%",
    color: colors.textPrimary,
    fontFamily: "Lora_700Bold",
    fontSize: 31,
    lineHeight: 42,
    textAlign: "center",
    letterSpacing: -0.6,
  },

  highlightedName: {
    color: colors.primary,
  },

  description: {
    width: "100%",
    maxWidth: 350,
    marginTop: spacing.md,
    color: colors.textSecondary,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 16,
    lineHeight: 25,
    textAlign: "center",
  },

  loadingSection: {
    alignItems: "center",
    marginTop: spacing.xxl,
  },

  loaderTrack: {
    width: 82,
    height: 82,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 7,
    borderColor: "rgba(93, 143, 247, 0.16)",
    borderRadius: 41,
  },

  loaderRing: {
    position: "absolute",
    width: 82,
    height: 82,
    borderWidth: 7,
    borderColor: "transparent",
    borderTopColor: colors.primary,
    borderRightColor: colors.primary,
    borderRadius: 41,
  },

  loaderCenter: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
  },

  loadingText: {
    maxWidth: 320,
    marginTop: spacing.xl,
    color: colors.textSecondary,
    fontFamily: "PlusJakartaSans_500Regular",
    fontSize: 13,
    lineHeight: 21,
    textAlign: "center",
  },

  errorText: {
    maxWidth: 320,
    color: colors.error,
    fontFamily: "PlusJakartaSans_500Regular",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },

  retryButton: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },

  retryButtonPressed: {
    opacity: 0.65,
  },

  retryButtonText: {
    color: colors.white,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 14,
  },
});
