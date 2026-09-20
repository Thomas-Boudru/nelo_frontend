/*
 * Source unique de vérité du parcours d'onboarding.
 *
 * Le parcours enjambe l'authentification : les données saisies avant
 * la connexion doivent survivre au redémarrage de l'application, et la
 * reprise doit pouvoir repartir de la bonne étape. Ce module traduit
 * l'étape mémorisée dans Redux en route de navigation, et vérifie que
 * l'état est complet avant tout appel réseau.
 */

export const ONBOARDING_STEPS = {
  childStatus: "childStatus",
  childProfile: "childProfile",
  auth: "auth",
  parentName: "parentName",
  relationship: "relationship",
  submitting: "submitting",
};

export function isClassicChildStatus(childStatus) {
  return childStatus === "born" || childStatus === "expected";
}

export function isKnownChildStatus(childStatus) {
  return isClassicChildStatus(childStatus) || childStatus === "join";
}

export function hasUserDisplayName(user) {
  return Boolean(user?.displayName?.trim());
}

function childProfileRoute(childStatus) {
  return childStatus === "expected"
    ? "ExpectedChildProfile"
    : "BornChildProfile";
}

/*
 * Étape à atteindre juste après une authentification réussie.
 * Un utilisateur qui possède déjà un prénom ne repasse pas par
 * ParentNameScreen.
 */
export function resolveStepAfterAuthentication(user) {
  return hasUserDisplayName(user)
    ? ONBOARDING_STEPS.relationship
    : ONBOARDING_STEPS.parentName;
}

export function resolveRouteAfterAuthentication(user) {
  return hasUserDisplayName(user) ? "Relationship" : "ParentName";
}

/*
 * Route de reprise dans OnboardingNavigator.
 *
 * Calculée une seule fois au montage : React Navigation n'utilise
 * initialRouteName que pour construire l'état initial de la pile.
 */
export function resolveOnboardingRoute({
  step,
  childStatus,
  isAuthenticated,
  user,
}) {
  switch (step) {
    case ONBOARDING_STEPS.submitting:
      return "OnboardingComplete";

    case ONBOARDING_STEPS.relationship:
      return "Relationship";

    case ONBOARDING_STEPS.parentName:
      return hasUserDisplayName(user) ? "Relationship" : "ParentName";

    case ONBOARDING_STEPS.auth:
      /*
       * Une session restaurée ne doit jamais renvoyer vers l'inscription.
       */
      return isAuthenticated ? resolveRouteAfterAuthentication(user) : "SignUp";

    case ONBOARDING_STEPS.childProfile:
      return childProfileRoute(childStatus);

    case ONBOARDING_STEPS.childStatus:
      return "ChildStatus";

    default:
      return "Welcome";
  }
}

/*
 * Route de reprise dans InvitationNavigator.
 *
 * L'invitation sélectionnée vit dans un slice non persisté : tant
 * qu'aucune invitation n'est sélectionnée, on repasse obligatoirement
 * par PendingInvitationScreen, sinon AcceptInvitationScreen n'aurait
 * aucune invitation à accepter.
 */
export function resolveInvitationRoute({
  step,
  hasInvitations,
  hasSelectedInvitation,
  user,
}) {
  if (!hasInvitations) {
    return "InvitationNotFound";
  }

  if (!hasSelectedInvitation) {
    return "PendingInvitation";
  }

  switch (step) {
    case ONBOARDING_STEPS.submitting:
      return "AcceptInvitation";

    case ONBOARDING_STEPS.relationship:
      return "Relationship";

    case ONBOARDING_STEPS.parentName:
      return hasUserDisplayName(user) ? "Relationship" : "ParentName";

    default:
      return "PendingInvitation";
  }
}

/*
 * Décision de routage de RootNavigator, isolée pour être testable.
 *
 * Renvoie "session-loading" | "invitations-loading" | "onboarding"
 * | "invitation" | "app".
 */
export function resolveRootDestination({
  isInitializing,
  isAuthenticated,
  onboardingCompleted,
  childStatus,
  hasCheckedInvitations,
  pendingInvitationCount = 0,
}) {
  if (isInitializing) {
    return "session-loading";
  }

  if (!isAuthenticated) {
    return "onboarding";
  }

  const needsOnboarding = !onboardingCompleted;

  /*
   * Une personne engagée dans la création classique de son enfant
   * ne doit pas être détournée par une invitation en attente.
   */
  const isClassicOnboarding =
    needsOnboarding && isClassicChildStatus(childStatus);

  if (isClassicOnboarding) {
    return "onboarding";
  }

  /*
   * Tous les autres utilisateurs authentifiés sont vérifiés :
   * - utilisateurs déjà inscrits ;
   * - parcours "join" ;
   * - anciens comptes incomplets ayant perdu leur état.
   */
  if (!hasCheckedInvitations) {
    return "invitations-loading";
  }
  /*
   * Une invitation trouvée est proposée aussi bien à un nouvel
   * utilisateur qu'à un utilisateur déjà présent dans l'application.
   */
  if (pendingInvitationCount > 0) {
    return "invitation";
  }

  /*
   * Si la personne avait explicitement choisi "join", on affiche
   * InvitationNotFound lorsqu'aucune invitation n'existe.
   */
  if (needsOnboarding && childStatus === "join") {
    return "invitation";
  }

  if (needsOnboarding) {
    return "onboarding";
  }

  return "app";
}
/*
 * Vérifie l'état d'onboarding avant l'envoi réseau.
 *
 * Les règles reproduisent celles du schéma Zod de
 * Backend/controllers/onboarding/onboardingController.js : plutôt que
 * de laisser partir un payload que le backend rejettera en 400, on
 * renvoie l'écran qui permet de compléter la donnée manquante.
 *
 * Renvoie null si l'état est complet.
 */
export function findMissingOnboardingStep(onboarding) {
  const childStatus = onboarding?.childStatus ?? null;

  if (!isKnownChildStatus(childStatus)) {
    return {
      step: ONBOARDING_STEPS.childStatus,
      route: "ChildStatus",
      field: "childStatus",
    };
  }

  if (childStatus === "born") {
    if (!onboarding.childFirstName?.trim() || !onboarding.birthDate) {
      return {
        step: ONBOARDING_STEPS.childProfile,
        route: "BornChildProfile",
        field: "child",
      };
    }
  }

  if (childStatus === "expected") {
    if (!onboarding.expectedBirthDate) {
      return {
        step: ONBOARDING_STEPS.childProfile,
        route: "ExpectedChildProfile",
        field: "child",
      };
    }
  }

  /*
   * Le backend exige au moins 2 caractères pour user.displayName.
   */
  if ((onboarding.parentFirstName?.trim() || "").length < 2) {
    return {
      step: ONBOARDING_STEPS.parentName,
      route: "ParentName",
      field: "parentFirstName",
    };
  }

  if (isClassicChildStatus(childStatus) && !onboarding.relationship) {
    return {
      step: ONBOARDING_STEPS.relationship,
      route: "Relationship",
      field: "relationship",
    };
  }

  return null;
}
