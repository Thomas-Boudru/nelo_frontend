import { useState } from "react";
import {
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../auth/AuthProvider.js";
import PrimaryButton from "../../components/ui/PrimaryButton.js";

import {
  checkPendingInvitations,
  clearInvitations,
  selectInvitation,
  selectInvitationsStatus,
} from "../../store/slices/invitationsSlice.js";

import {
  setChildStatus,
  setStep,
} from "../../store/slices/onboardingSlice.js";

import { ONBOARDING_STEPS } from "../../navigation/onboardingFlow.js";

import { onboardingColors, radius, spacing } from "../../theme/index.js";

const colors = onboardingColors;

const PINK_STAR_IMAGE = require("../../assets/illustrations/onboarding/starPink.png");
const YELLOW_STAR_IMAGE = require("../../assets/illustrations/onboarding/starYellow.png");
const HEART_IMAGE = require("../../assets/illustrations/onboarding/heart.png");
const LANDSCAPE_IMAGE = require("../../assets/illustrations/onboarding/landscape.png");

export default function InvitationNotFoundScreen({ navigation }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const { accessToken, refreshSession, user, logout } = useAuth();

  const invitationStatus = useSelector(selectInvitationsStatus);

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const isChecking = invitationStatus === "loading";
  const isLoading = isChecking || isLoggingOut;

  const isExistingUser = Boolean(user?.onboardingCompletedAt);

  async function handleTryAgain() {
    if (isLoading) {
      return;
    }

    setErrorMessage("");

    try {
      const invitations = await dispatch(
        checkPendingInvitations({
          accessToken,
          refreshSession,
        }),
      );

      if (invitations.length > 0) {
        dispatch(selectInvitation(invitations[0].id));
        navigation.replace("PendingInvitation");
        return;
      }

      setErrorMessage(
        t("No active invitation was found for this email address."),
      );
    } catch (error) {
      console.error("Unable to check pending invitations:", error);

      if (error?.code === "NETWORK_ERROR") {
        setErrorMessage(
          t("Unable to contact the server. Check your internet connection."),
        );
      } else {
        setErrorMessage(
          t("We could not check your invitations. Please try again."),
        );
      }
    }
  }

  async function handleUseAnotherEmail() {
    if (isLoading) {
      return;
    }

    setIsLoggingOut(true);
    setErrorMessage("");

    try {
      /*
       * logout supprime également la session locale dans son bloc finally.
       * RootNavigator affichera ensuite le parcours de connexion.
       */
      await logout();

      dispatch(clearInvitations());
      dispatch(setChildStatus("join"));
    } catch (error) {
      console.error("Unable to sign out:", error);

      setErrorMessage(t("Unable to sign out. Please try again."));
    } finally {
      setIsLoggingOut(false);
    }
  }

  function handleContinueWithoutInvitation() {
    if (isLoading) {
      return;
    }

    dispatch(clearInvitations());
    dispatch(setChildStatus(null));

    /*
     * L'utilisateur bascule sur le parcours classique : il doit y
     * reprendre au choix du statut de l'enfant, et non à une étape
     * héritée du parcours invitation.
     */
    dispatch(setStep(ONBOARDING_STEPS.childStatus));

    /*
     * RootNavigator réévaluera automatiquement le parcours :
     * - utilisateur existant : application principale ;
     * - nouvel utilisateur : onboarding classique.
     */
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Image
        source={LANDSCAPE_IMAGE}
        resizeMode="stretch"
        pointerEvents="none"
        style={styles.landscape}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.header}>
          <Image
            source={PINK_STAR_IMAGE}
            resizeMode="contain"
            pointerEvents="none"
            style={styles.pinkStar}
          />

          <Image
            source={YELLOW_STAR_IMAGE}
            resizeMode="contain"
            pointerEvents="none"
            style={styles.yellowStar}
          />

          <View style={styles.iconContainer}>
            <Ionicons
              name="mail-open-outline"
              size={34}
              color={colors.primary}
            />

            <View style={styles.searchBadge}>
              <Ionicons name="search" size={14} color={colors.white} />
            </View>
          </View>

          <Text style={styles.eyebrow}>{t("Invitation check")}</Text>

          <Text style={styles.title}>{t("No invitation found")}</Text>

          <Text style={styles.description}>
            {t(
              "We could not find an active invitation for this email address.",
            )}
          </Text>
        </View>

        <View style={styles.helpCard}>
          <View style={styles.helpIconContainer}>
            <Ionicons
              name="information-circle-outline"
              size={24}
              color={colors.primary}
            />
          </View>

          <View style={styles.helpContent}>
            <Text style={styles.helpTitle}>
              {t("Check your email address")}
            </Text>

            <Text style={styles.helpText}>
              {t(
                "Make sure you signed in with the same email address that received the invitation.",
              )}
            </Text>
          </View>
        </View>

        <View style={styles.tipRow}>
          <Image
            source={HEART_IMAGE}
            resizeMode="contain"
            pointerEvents="none"
            style={styles.heart}
          />

          <Text style={styles.tipText}>
            {t(
              "You can also ask the profile owner to send you a new invitation.",
            )}
          </Text>
        </View>

        {errorMessage ? (
          <View style={styles.errorContainer}>
            <Ionicons
              name="alert-circle-outline"
              size={21}
              color={colors.error}
            />

            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          title={t("Try again")}
          onPress={handleTryAgain}
          loading={isChecking}
          disabled={isLoading}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("Use another email address")}
          disabled={isLoading}
          onPress={handleUseAnotherEmail}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.buttonPressed,
            isLoading && styles.buttonDisabled,
          ]}
        >
          {isLoggingOut ? (
            <View style={styles.secondaryButtonContent}>
              <Ionicons
                name="hourglass-outline"
                size={18}
                color={colors.primary}
              />

              <Text style={styles.secondaryButtonText}>
                {t("Signing out...")}
              </Text>
            </View>
          ) : (
            <View style={styles.secondaryButtonContent}>
              <Ionicons
                name="person-outline"
                size={18}
                color={colors.primary}
              />

              <Text style={styles.secondaryButtonText}>
                {t("Use another email address")}
              </Text>
            </View>
          )}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          disabled={isLoading}
          onPress={handleContinueWithoutInvitation}
          style={({ pressed }) => [
            styles.textButton,
            pressed && styles.buttonPressed,
            isLoading && styles.buttonDisabled,
          ]}
        >
          <Text style={styles.textButtonText}>
            {isExistingUser
              ? t("Continue to Nelo")
              : t("Create a child profile instead")}
          </Text>

          <Ionicons
            name="arrow-forward"
            size={15}
            color={colors.textSecondary}
          />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },

  landscape: {
    position: "absolute",
    right: 0,
    bottom: 0,
    left: 0,
    width: "100%",
    height: 165,
    opacity: 0.7,
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
  },

  header: {
    position: "relative",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
  },

  pinkStar: {
    position: "absolute",
    top: 5,
    left: 16,
    width: 22,
    height: 22,
    transform: [{ rotate: "-10deg" }],
  },

  yellowStar: {
    position: "absolute",
    top: 70,
    right: 10,
    width: 24,
    height: 24,
    transform: [{ rotate: "12deg" }],
  },

  iconContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    width: 76,
    height: 76,
    marginBottom: spacing.md,
    borderRadius: 38,
    backgroundColor: colors.primarySoft,
  },

  searchBadge: {
    position: "absolute",
    right: -1,
    bottom: 1,
    alignItems: "center",
    justifyContent: "center",
    width: 27,
    height: 27,
    borderWidth: 3,
    borderColor: colors.background,
    borderRadius: 14,
    backgroundColor: colors.primary,
  },

  eyebrow: {
    color: colors.primary,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 14,
    lineHeight: 20,
  },

  title: {
    maxWidth: 350,
    marginTop: spacing.sm,
    color: colors.textPrimary,
    fontFamily: "Lora_700Bold",
    fontSize: 29,
    lineHeight: 40,
    textAlign: "center",
    letterSpacing: -0.5,
  },

  description: {
    maxWidth: 350,
    marginTop: spacing.sm,
    color: colors.textSecondary,
    fontFamily: "PlusJakartaSans_500Regular",
    fontSize: 15,
    lineHeight: 24,
    textAlign: "center",
  },

  helpCard: {
    flexDirection: "row",
    width: "100%",
    marginTop: spacing.xxl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
  },

  helpIconContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
  },

  helpContent: {
    flex: 1,
    marginLeft: spacing.md,
  },

  helpTitle: {
    color: colors.textPrimary,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 15,
    lineHeight: 21,
  },

  helpText: {
    marginTop: 4,
    color: colors.textSecondary,
    fontFamily: "PlusJakartaSans_500Regular",
    fontSize: 13,
    lineHeight: 21,
  },

  tipRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    maxWidth: 340,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.sm,
  },

  heart: {
    width: 22,
    height: 22,
    marginRight: spacing.sm,
  },

  tipText: {
    flex: 1,
    color: colors.textSecondary,
    fontFamily: "PlusJakartaSans_500Regular",
    fontSize: 13,
    lineHeight: 20,
  },

  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: "rgba(220, 70, 70, 0.1)",
  },

  errorText: {
    flex: 1,
    marginLeft: spacing.sm,
    color: colors.error,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 13,
    lineHeight: 20,
  },

  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },

  secondaryButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
  },

  secondaryButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },

  secondaryButtonText: {
    color: colors.primary,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 14,
  },

  textButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 44,
    paddingHorizontal: spacing.sm,
  },

  textButtonText: {
    color: colors.textSecondary,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 13,
  },

  buttonPressed: {
    opacity: 0.6,
  },

  buttonDisabled: {
    opacity: 0.55,
  },
});
