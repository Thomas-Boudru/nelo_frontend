const LABELS = {
  happy: "Happy",
  calm: "Calm",
  fussy: "Fussy",
  crying: "Crying",
  unwell: "Unwell",

  dry: "Dry",
  wet: "Wet",
  dirty: "Dirty",
  wetAndDirty: "Wet and dirty",
  pee: "Pee",
  poop: "Poop",
  peeAndPoop: "Pee and poop",

  irritability: "Irritability",
  skinRash: "Skin rash",
  runnyNose: "Runny nose",
  cough: "Cough",
  fever: "Fever",
  unusualBreathing: "Unusual breathing",
  lowEnergy: "Low energy",
  lackOfAppetite: "Lack of appetite",
  regurgitation: "Regurgitation",
  vomiting: "Vomiting",
  diarrhea: "Diarrhea",
  constipation: "Constipation",

  forehead: "Forehead",
  armpit: "Armpit",
  rectal: "Rectal",
  ear: "Ear",
  oral: "Oral",
};

const DOSE_UNITS = {
  ml: "ml",
  drops: "drops",
  tablet: "tablet(s)",
  suppository: "suppository/suppositories",
  dose: "dose(s)",
};

function isNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

export function getHistoryEntryDate(entry) {
  if (entry.type === "teething") {
    const match =
      typeof entry.eruptionDate === "string"
        ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(entry.eruptionDate)
        : null;

    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    const date = new Date(0);
    date.setFullYear(year, month - 1, day);
    date.setHours(12, 0, 0, 0);

    return year > 0 &&
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
      ? date
      : null;
  }

  if (!entry.startedAt) return null;

  const date = new Date(entry.startedAt);

  return Number.isFinite(date.getTime()) ? date : null;
}

export function getHistoryPresentation(entry, { language, units, t }) {
  const number = (value, digits = 1) =>
    new Intl.NumberFormat(language, {
      maximumFractionDigits: digits,
    }).format(value);

  const label = (code, fallback) => t(LABELS[code] ?? fallback);

  const volume = (value) => {
    if (!isNumber(value)) return "";

    return units.volume === "fl_oz"
      ? `${number(value / 29.5735295625, 2)} fl oz`
      : `${number(value, 2)} ml`;
  };

  const result = (title, description = null) => ({
    title,
    description,
    badge: null,
  });

  switch (entry.type) {
    case "bottle":
      return result(t("Bottle"), volume(entry.amountMl));

    case "pumping": {
      const total = isNumber(entry.totalAmountMl)
        ? entry.totalAmountMl
        : isNumber(entry.leftAmountMl) && isNumber(entry.rightAmountMl)
          ? entry.leftAmountMl + entry.rightAmountMl
          : null;

      return result(t("Pumping"), volume(total));
    }

    case "breastfeeding": {
      const left = entry.leftDurationSeconds ?? 0;
      const right = entry.rightDurationSeconds ?? 0;

      if (!isNumber(left) || !isNumber(right)) {
        return result(t("Breastfeeding"));
      }

      const seconds = left + right;

      const duration =
        seconds < 60
          ? t("Less than a minute")
          : t("{{minutes}} min", {
              minutes: number(seconds / 60, 1),
            });

      return result(t("Breastfeeding"), duration);
    }

    case "solids":
      return result(
        t("Solid food"),
        (entry.foods ?? [])
          .map((food) =>
            food.translationKey
              ? t(food.translationKey)
              : food.nameSnapshot || food.name || t("Food"),
          )
          .join(" · "),
      );

    case "diaper":
    case "potty":
      return result(
        label(entry.content, entry.type === "potty" ? "Potty" : "Diaper"),
        [
          t(entry.type === "potty" ? "Potty" : "Diaper"),
          entry.isAccident ? t("Accident") : "",
        ]
          .filter(Boolean)
          .join(" · "),
      );

    case "mood":
      return result(label(entry.mood, "Mood"), entry.note || null);

    case "symptoms":
      return result(
        (entry.symptoms ?? [])
          .map((code) => label(code, "Symptom"))
          .join(", ") || t("Symptoms"),
        entry.note || null,
      );

    case "temperature": {
      const value = entry.temperatureCelsius;

      const title = !isNumber(value)
        ? t("Temperature")
        : units.temperature === "fahrenheit"
          ? `${number(value * 1.8 + 32)} °F`
          : `${number(value)} °C`;

      return result(
        title,
        LABELS[entry.measurementSite] ? t(LABELS[entry.measurementSite]) : null,
      );
    }

    case "medication": {
      const unit = DOSE_UNITS[entry.unit];

      const dose =
        isNumber(entry.amount) && unit
          ? `${number(entry.amount, 3)} ${t(unit)}`
          : null;

      return result(entry.medicationName || t("Medication"), dose);
    }

    case "vaccine":
      return result(
        entry.vaccineName || t("Vaccine"),
        entry.dose === "booster"
          ? t("Booster")
          : isNumber(entry.dose)
            ? t("Dose {{number}}", { number: entry.dose })
            : null,
      );

    case "teething":
      return result(
        t("Teeth recorded: {{number}}", {
          number: new Set(entry.toothCodes ?? []).size,
        }),
        entry.note || null,
      );

    case "note":
      return result(
        entry.note?.trim() || t("Note"),
        entry.photos?.length
          ? t("Photos attached: {{number}}", {
              number: entry.photos.length,
            })
          : null,
      );

    default:
      return result(t("Tracking entry"));
  }
}
