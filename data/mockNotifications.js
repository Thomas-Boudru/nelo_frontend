// data/mockNotifications.js

export const MOCK_NOTIFICATIONS = [
  {
    id: "notification-1",
    category: "sleep",
    title: "Emma semble prête pour sa sieste",
    description: "Elle est éveillée depuis 2 h 05.",
    createdAt: "2026-08-23T14:42:00.000Z",
    isRead: false,
    action: {
      type: "open-sleep-entry",
    },
  },
  {
    id: "notification-2",
    category: "medication",
    title: "Prochaine dose prévue",
    description: "Le paracétamol est prévu à 16:30.",
    createdAt: "2026-08-23T14:25:00.000Z",
    isRead: false,
    action: {
      type: "open-medication",
      medicationId: "paracetamol",
    },
  },
  {
    id: "notification-3",
    category: "daily-summary",
    title: "Votre résumé est prêt",
    description: "Découvrez les moments clés de la journée d’Emma.",
    createdAt: "2026-08-22T20:05:00.000Z",
    isRead: true,
    action: {
      type: "open-daily-summary",
      date: "2026-08-22",
    },
  },
  {
    id: "notification-4",
    category: "family-activity",
    title: "Marie a ajouté 4 entrées",
    description: "Les activités ont été ajoutées au suivi d’Emma.",
    createdAt: "2026-08-22T18:42:00.000Z",
    isRead: true,
    action: {
      type: "open-tracking-day",
      date: "2026-08-22",
    },
  },
  {
    id: "notification-5",
    category: "growth",
    title: "Un nouveau point de croissance",
    description: "La courbe de croissance d’Emma a été mise à jour.",
    createdAt: "2026-08-22T11:20:00.000Z",
    isRead: true,
    action: {
      type: "open-growth-history",
    },
  },
];
