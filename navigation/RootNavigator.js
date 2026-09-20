import { useEffect } from "react";
import { ActivityIndicator, AppState, StyleSheet, View } from "react-native";
import { useDispatch, useSelector } from "react-redux";

import { useAuth } from "../auth/AuthProvider.js";

import AppNavigator from "./AppNavigator.js";
import InvitationNavigator from "./InvitationNavigator.js";
import OnboardingNavigator from "./OnboardingNavigator.js";

import {
  isClassicChildStatus,
  resolveRootDestination,
} from "./onboardingFlow.js";

import {
  checkPendingInvitations,
  clearInvitations,
  selectHasCheckedInvitations,
  selectInvitationsStatus,
  selectVisiblePendingInvitations,
} from "../store/slices/invitationsSlice.js";

import {
  clearOnboardingCompletion,
  selectChildStatus,
  selectOnboardingStep,
} from "../store/slices/onboardingSlice.js";

export default function RootNavigator() {
  const dispatch = useDispatch();

  const { isInitializing, isAuthenticated, user, accessToken, refreshSession } =
    useAuth();

  const localOnboardingCompleted = useSelector(
    (state) => state.onboarding.completed,
  );

  const childStatus = useSelector(selectChildStatus);

  const invitationStatus = useSelector(selectInvitationsStatus);

  const hasCheckedInvitations = useSelector(selectHasCheckedInvitations);

  const pendingInvitations = useSelector(selectVisiblePendingInvitations);

  const developmentNavigationMode = "auto";

  const onboardingCompleted =
    Boolean(user?.onboardingCompletedAt) || localOnboardingCompleted;

  const needsOnboarding = isAuthenticated && !onboardingCompleted;

  /*
   * On vérifie les invitations :
   * - pour un utilisateur ayant terminé son onboarding ;
   * - pour un utilisateur ayant choisi "join" ;
   * - pour un ancien compte incomplet ayant perdu son état.
   *
   * On ne vérifie pas pendant une création classique d’enfant,
   * afin qu’une invitation ne détourne pas ce parcours.
   */
  const shouldCheckInvitations =
    isAuthenticated && !(needsOnboarding && isClassicChildStatus(childStatus));

  useEffect(() => {
    if (
      isInitializing ||
      !shouldCheckInvitations ||
      hasCheckedInvitations ||
      invitationStatus === "loading" ||
      !accessToken
    ) {
      return;
    }

    dispatch(
      checkPendingInvitations({
        accessToken,
        refreshSession,
      }),
    ).catch((error) => {
      console.error("Unable to check pending invitations:", error);
    });
  }, [
    accessToken,
    dispatch,
    hasCheckedInvitations,
    invitationStatus,
    isInitializing,
    refreshSession,
    shouldCheckInvitations,
  ]);

  /*
   * Les invitations appartiennent à l'utilisateur authentifié.
   * On vide donc entièrement ce slice après une déconnexion afin
   * qu'un autre compte ne récupère jamais les invitations précédentes.
   */
  useEffect(() => {
    if (isInitializing || isAuthenticated) {
      return;
    }

    const hasInvitationState =
      hasCheckedInvitations ||
      invitationStatus !== "idle" ||
      pendingInvitations.length > 0;

    if (!hasInvitationState) {
      return;
    }

    dispatch(clearInvitations());
  }, [
    dispatch,
    hasCheckedInvitations,
    invitationStatus,
    isAuthenticated,
    isInitializing,
    pendingInvitations.length,
  ]);

  /*
   * Lorsqu'un utilisateur revient dans Nelo, on vérifie à nouveau
   * ses invitations. Cela couvre notamment le retour depuis l'e-mail
   * d'invitation.
   *
   * Ce contrôle n'est pas effectué pendant un onboarding classique
   * born/expected afin de ne jamais détourner ce parcours.
   */
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (
        nextAppState !== "active" ||
        !isAuthenticated ||
        !shouldCheckInvitations ||
        invitationStatus === "loading" ||
        !accessToken
      ) {
        return;
      }

      dispatch(
        checkPendingInvitations({
          accessToken,
          refreshSession,
        }),
      ).catch((error) => {
        console.error("Unable to refresh pending invitations:", error);
      });
    });

    return () => {
      subscription.remove();
    };
  }, [
    accessToken,
    dispatch,
    invitationStatus,
    isAuthenticated,
    refreshSession,
    shouldCheckInvitations,
  ]);

  /*
   * `completed` n'est pas persisté, mais il survit à une déconnexion dans
   * la même session. Sans cette remise à zéro, le compte suivant utilisé
   * sur l'appareil sauterait entièrement son onboarding.
   *
   * Seul l'indicateur est effacé : le brouillon saisi avant
   * l'authentification doit rester disponible.
   */
  useEffect(() => {
    if (isInitializing || isAuthenticated || !localOnboardingCompleted) {
      return;
    }

    dispatch(clearOnboardingCompletion());
  }, [dispatch, isAuthenticated, isInitializing, localOnboardingCompleted]);

  if (developmentNavigationMode === "app") {
    return <AppNavigator />;
  }

  if (developmentNavigationMode === "onboarding") {
    return <OnboardingNavigator />;
  }

  /*
   * La décision vit dans onboardingFlow.js : elle est ainsi testable
   * indépendamment du rendu, notamment pour garantir qu'un onboarding
   * terminé ne repasse jamais transitoirement par "onboarding".
   */
  const destination = resolveRootDestination({
    isInitializing,
    isAuthenticated,
    onboardingCompleted,
    childStatus,
    hasCheckedInvitations,
    pendingInvitationCount: pendingInvitations.length,
  });

  if (destination === "session-loading") {
    return null;
  }

  if (destination === "invitations-loading") {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#6F7FF2" />
      </View>
    );
  }

  if (destination === "invitation") {
    return <InvitationNavigator />;
  }

  if (destination === "onboarding") {
    return <OnboardingNavigator />;
  }

  return <AppNavigator />;
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EDF1FA",
  },
});
