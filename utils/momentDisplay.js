const MILESTONE_ICONS = {
  "first-smile": "happy-outline",
  "first-laugh": "sparkles-outline",
  "rolls-over": "refresh-outline",
  "sits-up": "body-outline",
  "starts-crawling": "walk-outline",
  "first-steps": "footsteps-outline",
  "first-word": "chatbubble-ellipses-outline",

  "first-bottle": "nutrition-outline",
  "first-puree": "restaurant-outline",
  "first-solid-food": "fast-food-outline",
  "eats-alone": "restaurant-outline",

  "first-full-night": "moon-outline",
  "first-nap-alone": "bed-outline",
  "sleeps-own-room": "home-outline",

  "first-tooth": "sparkles-outline",
  "first-haircut": "cut-outline",
  "first-vaccine": "medical-outline",
  "first-birthday": "gift-outline",

  "first-bath": "water-outline",
  "first-outing": "sunny-outline",
  "first-trip": "airplane-outline",
  "first-day-daycare": "school-outline",
  "meets-grandparents": "people-outline",
};

export function parseMomentDate(value) {
  if (typeof value !== "string") {
    return null;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  const [, year, month, day] = match;

  // Construction en heure locale : pas de décalage de jour lié à UTC.
  const date = new Date(0);
  date.setFullYear(Number(year), Number(month) - 1, Number(day));
  date.setHours(12, 0, 0, 0);

  if (
    date.getFullYear() !== Number(year) ||
    date.getMonth() !== Number(month) - 1 ||
    date.getDate() !== Number(day)
  ) {
    return null;
  }

  return date;
}

export function formatMomentDate(value, language) {
  const date = parseMomentDate(value);

  if (!date) {
    return "";
  }

  return new Intl.DateTimeFormat(language, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function getChildAgeLabel(birthDate, occurredOn, t) {
  const birth = parseMomentDate(birthDate?.slice(0, 10));
  const event = parseMomentDate(occurredOn);

  if (!birth || !event || event < birth) {
    return "";
  }

  let months =
    (event.getFullYear() - birth.getFullYear()) * 12 +
    event.getMonth() -
    birth.getMonth();

  if (event.getDate() < birth.getDate()) {
    months -= 1;
  }

  return t("Child age in months", {
    count: Math.max(0, months),
  });
}

export function toMomentDisplay(moment, { child, userId, language, t }) {
  const photos = (moment.photos ?? []).map((photo) => ({
    ...photo,
    id: photo.attachmentId ?? photo.id,
    uri: photo.uri ?? photo.url ?? null,
  }));

  const milestone = moment.milestone
    ? {
        ...moment.milestone,
        id: moment.milestone.customMilestoneId ?? moment.milestone.catalogCode,
        isCustom: Boolean(moment.milestone.customMilestoneId),
        label: moment.milestone.nameSnapshot || t("Milestone"),
        displayLabel: moment.milestone.nameSnapshot || t("Milestone"),
        icon: moment.milestone.customMilestoneId
          ? "heart-outline"
          : (MILESTONE_ICONS[moment.milestone.catalogCode] ?? "flag-outline"),
      }
    : null;

  // Le repository fourni conserve l'ID de l'auteur,
  // mais ne fournit pas son prénom.
  const authorName =
    moment.createdByUserId === userId ? t("You") : t("Family member");

  return {
    ...moment,
    photos,
    milestone,
    childName: child?.displayName || child?.firstName || t("Baby"),
    title:
      moment.title || (moment.type === "milestone" ? milestone?.label : null),
    description: moment.story ?? "",
    image: photos[0]?.uri ? { uri: photos[0].uri } : null,
    dateLabel: formatMomentDate(moment.occurredOn, language),
    childAgeLabel: getChildAgeLabel(child?.birthDate, moment.occurredOn, t),
    authorName,
    author: {
      id: moment.createdByUserId,
      firstName: authorName,
    },

    // Le repository ne gère pas encore ces opérations.
    canEdit: false,
  };
}

export function buildMomentGroups(moments, filters, { language, t }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  let startDate = null;

  const dayCounts = {
    today: 1,
    "last-7-days": 7,
    "last-30-days": 30,
  };

  const dayCount = dayCounts[filters.dateRange];

  if (dayCount) {
    startDate = new Date(today);
    startDate.setDate(startDate.getDate() - (dayCount - 1));
  }

  const filtered = moments.filter((moment) => {
    if (filters.types.length > 0 && !filters.types.includes(moment.type)) {
      return false;
    }

    if (
      filters.authorIds.length > 0 &&
      !filters.authorIds.includes(moment.createdByUserId)
    ) {
      return false;
    }

    const date = parseMomentDate(moment.occurredOn);

    if (!date) {
      return false;
    }

    return !startDate || (date >= startDate && date < tomorrow);
  });

  const groups = new Map();

  for (const moment of filtered) {
    const key = moment.occurredOn;

    if (!groups.has(key)) {
      const date = parseMomentDate(key);

      let label = formatMomentDate(key, language);

      if (date >= today && date < tomorrow) {
        label = t("Today");
      } else if (date >= yesterday && date < today) {
        label = t("Yesterday");
      }

      groups.set(key, {
        id: key,
        label,
        moments: [],
      });
    }

    groups.get(key).moments.push(moment);
  }

  return [...groups.values()].sort((a, b) => b.id.localeCompare(a.id));
}
