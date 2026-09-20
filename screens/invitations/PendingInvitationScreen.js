import { useEffect } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../auth/AuthProvider.js";
import PrimaryButton from "../../components/ui/PrimaryButton.js";

import {
  clearSelectedInvitation,
  dismissInvitation,
  selectInvitation,
  selectSelectedInvitation,
  selectVisiblePendingInvitations,
} from "../../store/slices/invitationsSlice.js";

import {
  setChildStatus,
  setStep,
} from "../../store/slices/onboardingSlice.js";

import {
  ONBOARDING_STEPS,
  resolveRouteAfterAuthentication,
  resolveStepAfterAuthentication,
} from "../../navigation/onboardingFlow.js";

import { onboardingColors, radius, spacing } from "../../theme/index.js";

const colors = onboardingColors;

export default function PendingInvitationScreen({ navigation }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { user } = useAuth();

  const invitations = useSelector(selectVisiblePendingInvitations);

  const selectedInvitation = useSelector(selectSelectedInvitation);

  /*
   * Sélectionne automatiquement l'invitation lorsqu'il n'y en a
   * qu'une, ce qui sera le cas le plus fréquent.
   */
  useEffect(() => {
    if (invitations.length === 1 && !selectedInvitation) {
      dispatch(selectInvitation(invitations[0].id));
    }
  }, [dispatch, invitations, selectedInvitation]);

  function handleSelectInvitation(invitationId) {
    dispatch(selectInvitation(invitationId));
  }

  function handleContinue() {
    if (!selectedInvitation) {
      return;
    }

    /*
     * Rétablit l'invariant du parcours invitation : l'utilisateur peut
     * arriver ici après une reprise où childStatus avait été perdu, et
     * RelationshipScreen s'appuie sur cette valeur pour choisir
     * AcceptInvitation.
     */
    dispatch(setChildStatus("join"));

    /*
     * ParentNameScreen n'est sauté que si le compte possède déjà un
     * prénom non vide. Se fier à onboardingCompletedAt laissait
     * AcceptInvitationScreen avec un displayName vide, donc un bouton
     * désactivé sans aucun message.
     */
    dispatch(setStep(resolveStepAfterAuthentication(user)));

    navigation.navigate(resolveRouteAfterAuthentication(user));
  }

  function handleNotNow() {
    if (selectedInvitation) {
      dispatch(dismissInvitation(selectedInvitation.id));
    }

    dispatch(clearSelectedInvitation());
    dispatch(setChildStatus(null));

    /*
     * RootNavigator repasse sur OnboardingNavigator : l'utilisateur doit
     * y reprendre au choix du statut de l'enfant, pas à une étape
     * héritée du parcours invitation.
     */
    dispatch(setStep(ONBOARDING_STEPS.childStatus));
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>{t("You have been invited")}</Text>

          <Text style={styles.title}>{t("Join a child profile")}</Text>

          <Text style={styles.description}>
            {t("Choose the invitation you would like to accept.")}
          </Text>
        </View>

        <View style={styles.invitations}>
          {invitations.map((invitation) => {
            const isSelected = selectedInvitation?.id === invitation.id;

            const childName = invitation.childFirstName || t("this child");

            return (
              <Pressable
                key={invitation.id}
                accessibilityRole="radio"
                accessibilityState={{
                  selected: isSelected,
                }}
                onPress={() => handleSelectInvitation(invitation.id)}
                style={({ pressed }) => [
                  styles.invitationCard,
                  isSelected && styles.invitationCardSelected,
                  pressed && styles.invitationCardPressed,
                ]}
              >
                <Text style={styles.childName}>{childName}</Text>

                <Text style={styles.invitationText}>
                  {invitation.inviterFirstName
                    ? t(
                        "{{inviterName}} invited you to join this child profile.",
                        {
                          inviterName: invitation.inviterFirstName,
                        },
                      )
                    : t("You were invited to join this child profile.")}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          title={t("Continue")}
          onPress={handleContinue}
          disabled={!selectedInvitation}
        />

        <Pressable
          accessibilityRole="button"
          onPress={handleNotNow}
          style={styles.notNowButton}
        >
          <Text style={styles.notNowText}>{t("Not now")}</Text>
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

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
  },

  header: {
    alignItems: "center",
  },

  eyebrow: {
    color: colors.primary,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 14,
    lineHeight: 20,
  },

  title: {
    marginTop: spacing.sm,
    color: colors.textPrimary,
    fontFamily: "Lora_700Bold",
    fontSize: 30,
    lineHeight: 42,
    textAlign: "center",
  },

  description: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
    fontFamily: "PlusJakartaSans_500Regular",
    fontSize: 15,
    lineHeight: 24,
    textAlign: "center",
  },

  invitations: {
    gap: spacing.md,
    marginTop: spacing.xxl,
  },

  invitationCard: {
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
  },

  invitationCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },

  invitationCardPressed: {
    opacity: 0.75,
  },

  childName: {
    color: colors.textPrimary,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 18,
    lineHeight: 25,
  },

  invitationText: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontFamily: "PlusJakartaSans_500Regular",
    fontSize: 14,
    lineHeight: 22,
  },

  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },

  notNowButton: {
    alignItems: "center",
    marginTop: spacing.sm,
    padding: spacing.sm,
  },

  notNowText: {
    color: colors.textSecondary,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 14,
  },
});
