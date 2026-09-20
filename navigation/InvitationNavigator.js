import { useState } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useSelector } from "react-redux";

import { useAuth } from "../auth/AuthProvider.js";

import PendingInvitationScreen from "../screens/invitations/PendingInvitationScreen.js";
import InvitationNotFoundScreen from "../screens/invitations/InvitationNotFoundScreen.js";
import AcceptInvitationScreen from "../screens/invitations/AcceptInvitationScreen.js";

import ParentNameScreen from "../screens/auth/ParentNameScreen.js";
import RelationshipScreen from "../screens/auth/RelationshipScreen.js";

import { resolveInvitationRoute } from "./onboardingFlow.js";

import {
  selectSelectedInvitation,
  selectVisiblePendingInvitations,
} from "../store/slices/invitationsSlice.js";

import { selectOnboardingStep } from "../store/slices/onboardingSlice.js";

const Stack = createNativeStackNavigator();

export default function InvitationNavigator() {
  const { user } = useAuth();

  const invitations = useSelector(selectVisiblePendingInvitations);

  const selectedInvitation = useSelector(selectSelectedInvitation);

  const step = useSelector(selectOnboardingStep);

  /*
   * Route de reprise figée au montage, comme dans OnboardingNavigator.
   * Tant qu'aucune invitation n'est sélectionnée, on repasse par
   * PendingInvitationScreen : la sélection vit dans un slice non persisté,
   * et AcceptInvitationScreen n'aurait sinon rien à accepter.
   */
  const [initialRouteName] = useState(() =>
    resolveInvitationRoute({
      step,
      hasInvitations: invitations.length > 0,
      hasSelectedInvitation: Boolean(selectedInvitation),
      user,
    }),
  );

  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: "#EDF1FA",
        },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen
        name="PendingInvitation"
        component={PendingInvitationScreen}
      />

      <Stack.Screen
        name="InvitationNotFound"
        component={InvitationNotFoundScreen}
      />

      <Stack.Screen name="ParentName" component={ParentNameScreen} />

      <Stack.Screen name="Relationship" component={RelationshipScreen} />

      {/*
       * Route explicite : RelationshipScreen choisit sa destination selon
       * childStatus, au lieu de réutiliser le nom "OnboardingComplete"
       * pour deux écrans différents selon le navigateur parent.
       */}
      <Stack.Screen
        name="AcceptInvitation"
        component={AcceptInvitationScreen}
        options={{
          gestureEnabled: false,
          animation: "fade",
        }}
      />
    </Stack.Navigator>
  );
}
