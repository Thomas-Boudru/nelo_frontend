const BOTTLE_IMAGE = require("../assets/illustrations/tracking/bottle.png");

const SLEEP_IMAGE = require("../assets/illustrations/tracking/night.png");

const DIAPER_IMAGE = require("../assets/illustrations/tracking/diaper.png");

const MOOD_IMAGE = require("../assets/illustrations/tracking/mood.png");

const MEDICATION_IMAGE = require("../assets/illustrations/tracking/medication.png");

const TEMPERATURE_IMAGE = require("../assets/illustrations/tracking/temperature.png");

const SYMPTOMS_IMAGE = require("../assets/illustrations/tracking/symptom.png");

const TEETHING_IMAGE = require("../assets/illustrations/tracking/tooth.png");

const GROWTH_IMAGE = require("../assets/illustrations/tracking/height.png");

const NOTE_IMAGE = require("../assets/illustrations/tracking/note.png");

export const TRACKING_TYPE_CONFIG = {
  bottle: {
    trackingId: "feeding",
    category: "feeding",
    titleKey: "Bottle",
    image: BOTTLE_IMAGE,
    backgroundColor: "#F0F3FF",
  },

  breastfeeding: {
    trackingId: "feeding",
    category: "feeding",
    titleKey: "Breastfeeding",
    image: BOTTLE_IMAGE,
    backgroundColor: "#F0F3FF",
  },

  solids: {
    trackingId: "feeding",
    category: "feeding",
    titleKey: "Solid food",
    image: BOTTLE_IMAGE,
    backgroundColor: "#FFF7E8",
  },

  sleep: {
    trackingId: "sleep",
    category: "sleep",
    titleKey: "Sleep",
    image: SLEEP_IMAGE,
    backgroundColor: "#F2F0FF",
  },

  diaper: {
    trackingId: "diaper",
    category: "diaper",
    titleKey: "Diaper",
    image: DIAPER_IMAGE,
    backgroundColor: "#EAF9F3",
  },

  mood: {
    trackingId: "mood",
    category: "mood",
    titleKey: "Mood",
    image: MOOD_IMAGE,
    backgroundColor: "#FFF7E8",
  },

  medication: {
    trackingId: "medication",
    category: "health",
    titleKey: "Medication",
    image: MEDICATION_IMAGE,
    backgroundColor: "#FFF6E7",
  },

  temperature: {
    trackingId: "temperature",
    category: "health",
    titleKey: "Temperature",
    image: TEMPERATURE_IMAGE,
    backgroundColor: "#FFF0EE",
  },

  symptoms: {
    trackingId: "symptoms",
    category: "health",
    titleKey: "Symptoms",
    image: SYMPTOMS_IMAGE,
    backgroundColor: "#EDF6FF",
  },

  teething: {
    trackingId: "teething",
    category: "health",
    titleKey: "Teething",
    image: TEETHING_IMAGE,
    backgroundColor: "#FFF0F6",
  },

  growth: {
    trackingId: "growth",
    category: "growth",
    titleKey: "Growth",
    image: GROWTH_IMAGE,
    backgroundColor: "#EDF6FF",
  },

  note: {
    trackingId: "note",
    category: "note",
    titleKey: "Note",
    image: NOTE_IMAGE,
    backgroundColor: "#FFF7E8",
  },
};

export const TRACKING_FILTERS = [
  {
    id: "all",
    labelKey: "All",
  },
  {
    id: "feeding",
    labelKey: "Feeding",
  },
  {
    id: "sleep",
    labelKey: "Sleep",
  },
  {
    id: "diaper",
    labelKey: "Diapers",
  },
  {
    id: "health",
    labelKey: "Health",
  },
];

/*
 * Les données sont volontairement proches de ce que l’API renverra :
 *
 * - type détermine l’apparence et le formulaire à ouvrir ;
 * - startedAt permet le tri et l’affichage de l’heure ;
 * - endedAt est utilisé pour les suivis ayant une durée ;
 * - displayValue contient seulement la valeur principale de la timeline ;
 * - data contient les informations complètes nécessaires à l’édition.
 */
export const mockTrackingDay = {
  date: "2026-08-17",
  childId: "emma",

  summary: {
    entryCount: 8,
    feedingCount: 3,
    sleepDurationMinutes: 195,
    diaperCount: 1,
  },

  entries: [
    {
      id: "bottle-1",
      type: "bottle",

      startedAt: "2026-08-17T19:20:00",

      amountMl: 120,
      bottleCapacityMl: 160,
      milkType: "formula",
      note: "",

      displayValue: "120 ml",
    },

    {
      id: "sleep-1",
      type: "sleep",
      startedAt: "2026-08-17T17:45:00+02:00",
      endedAt: "2026-08-17T18:30:00+02:00",
      displayValue: "45 min",

      data: {
        sleepType: "nap",
        durationMinutes: 45,
        wakeUps: 0,
        restlessNight: false,
        note: null,
      },
    },

    {
      id: "diaper-1",
      type: "diaper",
      startedAt: "2026-08-17T17:10:00+02:00",
      endedAt: null,
      displayValueKey: "Pee",

      data: {
        place: "diaper",
        content: "pee",
        note: null,
      },
    },

    {
      id: "mood-1",
      type: "mood",
      startedAt: "2026-08-17T15:30:00+02:00",
      endedAt: null,
      displayValueKey: "Calm",

      data: {
        moods: ["calm"],
        note: null,
      },
    },

    {
      id: "temperature-1",
      type: "temperature",
      startedAt: "2026-08-17T14:15:00+02:00",
      endedAt: null,
      displayValue: "37.2 °C",

      data: {
        value: 37.2,
        unit: "celsius",
        measurementLocation: "ear",
        note: null,
      },
    },

    {
      id: "solids-1",
      type: "solids",
      startedAt: "2026-08-17T12:10:00+02:00",
      endedAt: null,
      displayValueKey: "Banana",

      data: {
        foods: [
          {
            id: "banana",
            nameKey: "Banana",
            quantity: 1,
          },
        ],
        reaction: "liked",
        note: null,
      },
    },

    {
      id: "sleep-2",
      type: "sleep",
      startedAt: "2026-08-17T08:30:00+02:00",
      endedAt: "2026-08-17T11:00:00+02:00",
      displayValue: "2 h 30",

      data: {
        sleepType: "night",
        durationMinutes: 150,
        wakeUps: 1,
        restlessNight: false,
        note: null,
      },
    },

    {
      id: "breastfeeding-1",
      type: "breastfeeding",
      startedAt: "2026-08-17T07:45:00+02:00",
      endedAt: "2026-08-17T08:05:00+02:00",
      displayValue: "20 min",

      data: {
        leftDurationMinutes: 12,
        rightDurationMinutes: 8,
        note: null,
      },
    },
  ],
};

export const mockTrackingChildren = [
  {
    id: "emma",
    firstName: "Emma",
    ageLabel: "4 months old",
    themeMode: "blue",
    profilePicture: null,
  },

  {
    id: "leo",
    firstName: "Léo",
    ageLabel: "2 years old",
    themeMode: "green",
    profilePicture: null,
  },
];

export const mockTrackingTypeSections = [
  {
    id: "most-viewed",
    titleKey: "Most viewed",

    items: [
      {
        id: "growth",
        titleKey: "Growth",
        subtitleKey: "Weight, height and reference charts",
        metadata: "8.4 kg",
        image: TRACKING_TYPE_CONFIG.growth.image,
        backgroundColor: TRACKING_TYPE_CONFIG.growth.backgroundColor,
      },

      {
        id: "sleep",
        titleKey: "Sleep",
        subtitleKey: "Rhythm, duration and progress",
        metadataKey: "13 h 20 per day",
        image: TRACKING_TYPE_CONFIG.sleep.image,
        backgroundColor: TRACKING_TYPE_CONFIG.sleep.backgroundColor,
      },

      {
        id: "note",
        titleKey: "Notes",
        subtitleKey: "All notes and their photos",
        metadataKey: "12 notes",
        image: TRACKING_TYPE_CONFIG.note.image,
        backgroundColor: TRACKING_TYPE_CONFIG.note.backgroundColor,
      },
    ],
  },

  {
    id: "health",
    titleKey: "Health",

    items: [
      {
        id: "temperature",
        titleKey: "Temperature",
        metadataKey: "Last temperature: 37.2 °C on June 18",
        image: TRACKING_TYPE_CONFIG.temperature.image,
        backgroundColor: TRACKING_TYPE_CONFIG.temperature.backgroundColor,
        variant: "compact",
      },

      {
        id: "symptoms",
        titleKey: "Symptoms",
        metadataKey: "Last symptom: Cough on August 4",
        image: TRACKING_TYPE_CONFIG.symptoms.image,
        backgroundColor: TRACKING_TYPE_CONFIG.symptoms.backgroundColor,
        variant: "compact",
      },

      {
        id: "medication",
        titleKey: "Medication",
        metadataKey: "3 recorded medications",
        image: TRACKING_TYPE_CONFIG.medication.image,
        backgroundColor: TRACKING_TYPE_CONFIG.medication.backgroundColor,
        variant: "compact",
      },

      {
        id: "teething",
        titleKey: "Teething",
        metadataKey: "6 teeth have appeared",
        image: TRACKING_TYPE_CONFIG.teething.image,
        backgroundColor: TRACKING_TYPE_CONFIG.teething.backgroundColor,
        variant: "compact",
      },
    ],
  },

  {
    id: "daily-tracking",
    titleKey: "Daily tracking",

    items: [
      {
        id: "feeding",
        titleKey: "Feeding",
        metadataKey: "3 feedings today",
        image: TRACKING_TYPE_CONFIG.bottle.image,
        backgroundColor: TRACKING_TYPE_CONFIG.bottle.backgroundColor,
        variant: "compact",
      },

      {
        id: "diaper",
        titleKey: "Diapers",
        metadataKey: "1 diaper today",
        image: TRACKING_TYPE_CONFIG.diaper.image,
        backgroundColor: TRACKING_TYPE_CONFIG.diaper.backgroundColor,
        variant: "compact",
      },

      {
        id: "mood",
        titleKey: "Mood",
        metadataKey: "Current mood: Calm",
        image: TRACKING_TYPE_CONFIG.mood.image,
        backgroundColor: TRACKING_TYPE_CONFIG.mood.backgroundColor,
        variant: "compact",
      },
    ],
  },
];
