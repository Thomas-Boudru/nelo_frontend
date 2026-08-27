/*
 * Table de correspondance unique « type de suivi -> écran d'historique ».
 * Elle est partagée par l'accueil, l'onglet Tracking et les sheets d'ajout,
 * pour qu'un même type ouvre toujours le même écran.
 */

const FEEDING_DESTINATION = {
  screen: "TrackingStatsHistory",

  params: {
    trackingType: "feeding",
    titleKey: "Feeding",
  },
};

const DIAPER_DESTINATION = {
  screen: "TrackingStatsHistory",

  params: {
    trackingType: "diaper",
    titleKey: "Diapers",
  },
};

const MOOD_DESTINATION = {
  screen: "TrackingStatsHistory",

  params: {
    trackingType: "mood",
    titleKey: "Mood",
  },
};

const SYMPTOMS_DESTINATION = {
  screen: "TrackingStatsHistory",

  params: {
    trackingType: "symptoms",
    titleKey: "Symptoms",
  },
};

const MEDICATION_DESTINATION = {
  screen: "TrackingTypeHistory",

  params: {
    trackingType: "medication",
    titleKey: "Medication",
  },
};

const VACCINE_DESTINATION = {
  screen: "TrackingTypeHistory",

  params: {
    trackingType: "vaccine",
    titleKey: "Vaccines",
  },
};

const TEMPERATURE_DESTINATION = {
  screen: "TrackingTypeHistory",

  params: {
    trackingType: "temperature",
    titleKey: "Temperature",
  },
};

const TEETHING_DESTINATION = {
  screen: "TrackingTypeHistory",

  params: {
    trackingType: "teething",
    titleKey: "Teething",
  },
};

const NOTE_DESTINATION = {
  screen: "TrackingTypeHistory",

  params: {
    trackingType: "note",
    titleKey: "Notes",
  },
};

const SLEEP_DESTINATION = {
  screen: "SleepHistory",
};

const GROWTH_DESTINATION = {
  screen: "GrowthHistory",
};

/*
 * Les alias couvrent aussi bien les identifiants de catégorie
 * (« feeding », « diaper ») que les types d'entrée (« bottle », « potty »).
 */
const TRACKING_HISTORY_DESTINATIONS = {
  feeding: FEEDING_DESTINATION,
  bottle: FEEDING_DESTINATION,
  breastfeeding: FEEDING_DESTINATION,
  solids: FEEDING_DESTINATION,
  meals: FEEDING_DESTINATION,
  pumping: FEEDING_DESTINATION,

  diaper: DIAPER_DESTINATION,
  diapers: DIAPER_DESTINATION,
  potty: DIAPER_DESTINATION,

  mood: MOOD_DESTINATION,

  symptoms: SYMPTOMS_DESTINATION,

  medication: MEDICATION_DESTINATION,
  vaccine: VACCINE_DESTINATION,

  temperature: TEMPERATURE_DESTINATION,

  teething: TEETHING_DESTINATION,

  note: NOTE_DESTINATION,

  sleep: SLEEP_DESTINATION,
  nap: SLEEP_DESTINATION,
  night: SLEEP_DESTINATION,

  growth: GROWTH_DESTINATION,
};

export function getTrackingHistoryDestination(trackingType) {
  return TRACKING_HISTORY_DESTINATIONS[trackingType] ?? null;
}

/*
 * Depuis un écran situé hors de la pile Tracking (accueil, sheets montées
 * au niveau des onglets), il faut cibler les trois niveaux :
 * MainTabs -> onglet Tracking -> écran de la pile.
 */
export function navigateToTrackingHistory(navigation, trackingType, extraParams) {
  const destination = getTrackingHistoryDestination(trackingType);

  if (!navigation || !destination) {
    console.log("Aucun historique pour ce type de suivi :", trackingType);

    return false;
  }

  navigation.navigate("MainTabs", {
    screen: "Tracking",

    params: {
      screen: destination.screen,

      params:
        destination.params || extraParams
          ? {
              ...destination.params,
              ...extraParams,
            }
          : undefined,

      /*
       * Sans `initial: false`, la pile Tracking encore jamais montée (onglets
       * lazy) démarre directement sur l'écran d'historique : « TrackingOverview »
       * n'est alors pas en dessous et le retour n'a rien à dépiler.
       */
      initial: false,
    },
  });

  return true;
}
