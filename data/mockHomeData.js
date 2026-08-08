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
    minutesUntil: 23,
    idealWindowStart: "11:10",
    idealWindowEnd: "11:30",
  },

  dailyMessage: {
    id: "daily-message-1",
    content: "Les réveils nocturnes sont encore très fréquents à cet âge.",
  },

  memory: {
    id: "memory-1",
    monthsAgo: 6,
    description: "Emma riait pour la première fois",
    image: null,
  },
};
