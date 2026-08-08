export const DEFAULT_BOTTLE_CAPACITY_ML = 240;

export const BOTTLE_PORTIONS = [
  { id: "quarter", label: "¼", fraction: 0.25 },
  { id: "half", label: "½", fraction: 0.5 },
  { id: "threeQuarters", label: "¾", fraction: 0.75 },
  { id: "full", label: "Full", fraction: 1 },
];

const ML_PER_OUNCE = 29.5735;

export function getBottleAmountMl(capacityMl, fraction) {
  return Math.round(Number(capacityMl || 0) * Number(fraction || 0));
}

export function mlToOunces(amountMl) {
  return Math.round(Number(amountMl || 0) / ML_PER_OUNCE);
}

export function ouncesToMl(amountOz) {
  return Math.round(Number(amountOz || 0) * ML_PER_OUNCE);
}

function parseExactAmount(exactAmount) {
  const parsed = Number(String(exactAmount ?? "").replace(",", "."));

  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 0;
}

// Une saisie de biberon garde soit une portion (¼, ½, ¾, plein), soit une
// fraction libre issue du glissement dans le biberon, soit un volume exact.
export function getBottleFillRatio(entry) {
  const capacityMl = Number(entry?.bottleCapacityMl) || DEFAULT_BOTTLE_CAPACITY_ML;

  if (entry?.isExactAmountMode) {
    return Math.min(parseExactAmount(entry.exactAmount) / capacityMl, 1);
  }

  const portion = BOTTLE_PORTIONS.find(
    (candidate) => candidate.id === entry?.portionId,
  );

  if (portion) {
    return portion.fraction;
  }

  const fraction = Number(entry?.fraction);

  if (!Number.isFinite(fraction)) {
    return 0;
  }

  return Math.min(Math.max(fraction, 0), 1);
}

export function getBottleEntryAmountMl(entry) {
  if (entry?.isExactAmountMode) {
    return parseExactAmount(entry.exactAmount);
  }

  const capacityMl = Number(entry?.bottleCapacityMl) || DEFAULT_BOTTLE_CAPACITY_ML;

  return getBottleAmountMl(capacityMl, getBottleFillRatio(entry));
}

export function formatBottleAmount(amountMl, unit = "ml") {
  const safeAmount = Number(amountMl || 0);

  if (unit === "oz") {
    return `${mlToOunces(safeAmount)} oz`;
  }

  return `${Math.round(safeAmount)} ml`;
}

export function getCapacityLabel(capacityMl, unit = "ml") {
  return formatBottleAmount(capacityMl, unit);
}
