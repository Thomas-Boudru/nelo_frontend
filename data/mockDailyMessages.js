export const mockDailyMessages = [
  {
    id: "night-wakings-4-months",
    category: "sleep",

    title: "Night wakings are still common",

    summary:
      "At this age, many babies still wake during the night. It doesn’t necessarily mean that something is wrong.",

    contextLabel: "Based on Emma’s age",

    illustration: "nightSleep",
    sections: [
      {
        id: "possible-reasons",
        type: "bulletList",
        title: "Why it can happen",
        icon: "moon-outline",
        items: [
          "Sleep cycle transitions",
          "Need for reassurance",
          "Hunger or discomfort",
        ],
      },
      {
        id: "things-to-try",
        type: "numberedList",
        title: "What you can try tonight",
        icon: "sparkles-outline",
        items: [
          "Pause briefly before intervening",
          "Keep lights low and voices soft",
          "Follow the usual bedtime routine",
        ],
      },
      {
        id: "reassurance",
        type: "highlight",
        icon: "heart-outline",
        content:
          "Every baby develops at their own pace. A few difficult nights do not necessarily mean that Emma’s sleep is getting worse.",
      },
    ],

    sources: [
      {
        id: "nhs-baby-sleep",
        label: "Helping your baby to sleep",
        publisher: "NHS",
        url: "https://www.nhs.uk/baby/caring-for-a-newborn/helping-your-baby-to-sleep/",
      },
    ],

    askNeloPrompt:
      "Why does Emma still wake during the night, and what could I try?",
  },

  {
    id: "tummy-time-4-months",
    category: "development",

    title: "A little floor time goes a long way",

    summary:
      "Short periods of supervised tummy time can help Emma strengthen the muscles she will use to roll, sit and crawl.",

    contextLabel: "Suggested for Emma today",

    illustration: "nightSleep",
    sections: [
      {
        id: "activity",
        type: "paragraph",
        title: "Try this today",
        content:
          "Place Emma on her tummy while she is awake and stay close to her. You can put a toy or your face in front of her to keep her interested.",
      },
      {
        id: "tips",
        type: "bulletList",
        title: "Make it easier",
        items: [
          "Start with short sessions",
          "Choose a moment when Emma is calm",
          "Stop if she becomes tired or uncomfortable",
        ],
      },
    ],

    sources: [],

    askNeloPrompt: "How can I make tummy time easier for Emma?",
  },
];

export function getMockDailyMessage(messageId) {
  return (
    mockDailyMessages.find((message) => message.id === messageId) ??
    mockDailyMessages[0]
  );
}
