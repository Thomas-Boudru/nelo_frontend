import { useState } from "react";
import {
  Image,
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
import { acceptInvitation } from "../../api/userFlow/invitationsApi.js";

import PrimaryButton from "../../components/ui/PrimaryButton.js";

import {
  removeInvitation,
  selectSelectedInvitation,
} from "../../store/slices/invitationsSlice.js";

import {
  completeOnboarding,
  resetOnboarding,
} from "../../store/slices/onboardingSlice.js";

import { loadChildren, selectChild } from "../../store/slices/childrenSlice.js";

import { onboardingColors, radius, spacing } from "../../theme/index.js";

const colors = onboardingColors;

const PINK_STAR_IMAGE = require("../../assets/illustrations/onboarding/starPink.png");
const YELLOW_STAR_IMAGE = require("../../assets/illustrations/onboarding/starYellow.png");
const HEART_IMAGE = require("../../assets/illustrations/onboarding/heart.png");
const LANDSCAPE_IMAGE = require("../../assets/illustrations/onboarding/landscape.png");

export default function AcceptInvitationScreen() {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const { accessToken, refreshSession, updateAuthenticatedUser, user } =
    useAuth();

  const invitation = useSelector(selectSelectedInvitation);

  const relationshipType = useSelector(
    (state) => state.onboarding.relationship,
  );

  const onboardingParentFirstName = useSelector(
    (state) => state.onboarding.parentFirstName,
  );

  const [isAccepting, setIsAccepting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const displayName =
    onboardingParentFirstName?.trim() || user?.displayName?.trim() || "";

  /*
   * Le bouton est désactivé tant qu'il manque une donnée. Sans ce
   * message, l'écran était une impasse muette.
   */
  const blockingMessage = !displayName
    ? t("Please enter your preferred name before joining.")
    : !relationshipType
      ? t("Please choose your relationship with the child before joining.")
      : "";

  const childName = invitation?.childFirstName?.trim() || t("this child");

  const inviterName = invitation?.inviterFirstName?.trim();

  /*
   * Renvoie également le token réellement utilisé.
   * Si le premier token a expiré, loadChildren utilisera ainsi
   * le nouveau token obtenu avec refreshSession.
   */
  async function executeAcceptInvitation() {
    let effectiveAccessToken = accessToken;

    try {
      const response = await acceptInvitation({
        invitationId: invitation.id,
        relationshipType,
        displayName,
        accessToken: effectiveAccessToken,
      });

      return {
        response,
        effectiveAccessToken,
      };
    } catch (error) {
      if (error?.code !== "ACCESS_TOKEN_EXPIRED") {
        throw error;
      }

      effectiveAccessToken = await refreshSession();

      if (!effectiveAccessToken) {
        const authenticationError = new Error("Your session has expired.");

        authenticationError.code = "AUTHENTICATION_REQUIRED";

        throw authenticationError;
      }

      const response = await acceptInvitation({
        invitationId: invitation.id,
        relationshipType,
        displayName,
        accessToken: effectiveAccessToken,
      });

      return {
        response,
        effectiveAccessToken,
      };
    }
  }

  async function handleAcceptInvitation() {
    if (!invitation?.id || !relationshipType || !displayName || isAccepting) {
      return;
    }

    setIsAccepting(true);
    setErrorMessage("");

    try {
      const { response, effectiveAccessToken } =
        await executeAcceptInvitation();

      /*
       * L'ordre est important, comme dans OnboardingCompleteScreen.
       *
       * 1. La session authentifiée reçoit onboardingCompletedAt, renvoyé
       *    par le backend dans response.user : c'est le signal que
       *    RootNavigator lit en priorité.
       * 2. Le brouillon est effacé — resetOnboarding remet aussi
       *    childStatus à null, ce qui sort du parcours invitation.
       * 3. `completed` est reposé comme filet, resetOnboarding l'ayant
       *    remis à false.
       *
       * Inverser 1 et 2 pouvait faire réapparaître brièvement
       * WelcomeScreen entre les deux rendus.
       */
      updateAuthenticatedUser({
        ...user,
        ...response.user,
      });

      dispatch(removeInvitation(invitation.id));
      dispatch(resetOnboarding());
      dispatch(completeOnboarding());

      try {
        await dispatch(
          loadChildren({
            userId: response.user.id,
            accessToken: effectiveAccessToken,
            refreshSession,
          }),
        ).unwrap();

        dispatch(selectChild(response.child.id));
      } catch (childrenError) {
        /*
         * L'invitation est déjà acceptée à ce stade.
         * L'enfant sera récupéré au prochain chargement.
         */
        console.error(
          "Invitation accepted but children could not be reloaded:",
          childrenError,
        );
      }
    } catch (error) {
      console.error("Unable to accept invitation:", error);

      if (error?.code === "INVITATION_EXPIRED") {
        setErrorMessage(
          t(
            "This invitation has expired. Ask the profile owner to send a new invitation.",
          ),
        );
      } else if (error?.code === "INVITATION_REVOKED") {
        setErrorMessage(t("This invitation has been cancelled."));
      } else if (error?.code === "INVITATION_EMAIL_MISMATCH") {
        setErrorMessage(
          t("This invitation was sent to another email address."),
        );
      } else if (error?.code === "AUTHENTICATION_REQUIRED") {
        setErrorMessage(t("Your session has expired. Please sign in again."));
      } else if (error?.code === "NETWORK_ERROR") {
        setErrorMessage(
          t("Unable to contact the server. Check your internet connection."),
        );
      } else {
        setErrorMessage(
          t("Unable to join the child profile. Please try again."),
        );
      }
    } finally {
      setIsAccepting(false);
    }
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
            <Ionicons name="heart" size={31} color={colors.primary} />
          </View>

          <Text style={styles.eyebrow}>{t("Everything is ready")}</Text>

          <Text style={styles.title}>
            {t("Join {{childName}} on Nelo", {
              childName,
            })}
          </Text>

          <Text style={styles.description}>
            {t(
              "Once you join, you will be able to follow and share this child's daily moments.",
            )}
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Ionicons name="people-outline" size={25} color={colors.primary} />
          </View>

          <View style={styles.summaryContent}>
            <Text style={styles.summaryTitle}>{t("Child profile")}</Text>

            <Text style={styles.childName}>{childName}</Text>

            {inviterName ? (
              <Text style={styles.inviterText}>
                {t("Invited by {{inviterName}}", {
                  inviterName,
                })}
              </Text>
            ) : null}
          </View>

          <View style={styles.readyIcon}>
            <Ionicons name="checkmark" size={19} color={colors.white} />
          </View>
        </View>

        <View style={styles.informationRow}>
          <Image
            source={HEART_IMAGE}
            resizeMode="contain"
            pointerEvents="none"
            style={styles.heart}
          />

          <Text style={styles.informationText}>
            {t(
              "Your relationship with the child will be added to their profile.",
            )}
          </Text>
        </View>

        {errorMessage || blockingMessage ? (
          <View style={styles.errorContainer}>
            <Ionicons
              name="alert-circle-outline"
              size={21}
              color={colors.error}
            />

            <Text style={styles.errorText}>
              {errorMessage || blockingMessage}
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          title={t("Join child profile")}
          onPress={handleAcceptInvitation}
          loading={isAccepting}
          disabled={
            !invitation || !relationshipType || !displayName || isAccepting
          }
        />

        <View style={styles.securityNotice}>
          <Ionicons
            name="lock-closed-outline"
            size={14}
            color={colors.textSecondary}
          />

          <Text style={styles.securityText}>
            {t("This invitation is private and secure.")}
          </Text>
        </View>
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
    opacity: 0.75,
  },

  scrollContent: {
    flexGrow: 1,
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
    top: 4,
    left: 14,
    width: 22,
    height: 22,
    transform: [{ rotate: "-10deg" }],
  },

  yellowStar: {
    position: "absolute",
    top: 65,
    right: 9,
    width: 24,
    height: 24,
    transform: [{ rotate: "12deg" }],
  },

  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 72,
    height: 72,
    marginBottom: spacing.md,
    borderRadius: 36,
    backgroundColor: colors.primarySoft,
  },

  eyebrow: {
    color: colors.primary,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 14,
    lineHeight: 20,
  },

  title: {
    maxWidth: 360,
    marginTop: spacing.sm,
    color: colors.textPrimary,
    fontFamily: "Lora_700Bold",
    fontSize: 30,
    lineHeight: 42,
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

  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginTop: spacing.xxl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
  },

  summaryIcon: {
    alignItems: "center",
    justifyContent: "center",
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primarySoft,
  },

  summaryContent: {
    flex: 1,
    marginLeft: spacing.md,
  },

  summaryTitle: {
    color: colors.textSecondary,
    fontFamily: "PlusJakartaSans_500Regular",
    fontSize: 12,
    lineHeight: 18,
  },

  childName: {
    marginTop: 2,
    color: colors.textPrimary,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 18,
    lineHeight: 25,
  },

  inviterText: {
    marginTop: 2,
    color: colors.textSecondary,
    fontFamily: "PlusJakartaSans_500Regular",
    fontSize: 13,
    lineHeight: 19,
  },

  readyIcon: {
    alignItems: "center",
    justifyContent: "center",
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
  },

  informationRow: {
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

  informationText: {
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

  securityNotice: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: spacing.sm,
  },

  securityText: {
    color: colors.textSecondary,
    fontFamily: "PlusJakartaSans_500Regular",
    fontSize: 12,
    lineHeight: 18,
  },
});
