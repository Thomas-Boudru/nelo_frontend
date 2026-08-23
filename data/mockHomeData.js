import { getMockDailyMessage } from "./mockDailyMessages.js";

export const mockHomeData = {
  parent: {
    id: "parent-1",
    firstName: "Thomas",
  },

  child: {
    id: "child-1",
    firstName: "Emma",
    ageInMonths: 9,
    profilePicture: null,
  },

  dailySummary: {
    updatedAt: "09:30",

    bottles: {
      amount: 720,
      unit: "ml",
    },

    sleep: {
      hours: 12,
      minutes: 40,
    },

    diapers: {
      count: 5,
    },

    meals: {
      count: 2,
    },

    mood: {
      value: "good",
    },
  },

  nextNap: {
    status: "prediction",
    type: "nap",

    minutesUntil: 35,

    idealWindowStart: "14:30",
    idealWindowEnd: "15:00",
    routineStart: "14:20",

    confidence: "good",

    reasons: [
      {
        type: "awake_duration",
        minutes: 102,
      },
      {
        type: "last_nap_duration",
        minutes: 48,
      },
      {
        type: "usual_wake_window",
        minimumMinutes: 105,
        maximumMinutes: 120,
      },
    ],

    advice: "reduce_stimulation",
  },

  dailyMessage: getMockDailyMessage("night-wakings-4-months"),

  memory: {
    id: "memory-1",
    monthsAgo: 6,
    description: "Emma riait pour la première fois",
    image: null,
  },
};
