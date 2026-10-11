const KG_PER_LB = 0.45359237;
const CM_PER_INCH = 2.54;

export const DEFAULT_GROWTH_UNIT_PREFERENCES = {
  weight: "kg",
  length: "cm",
};

const MEASUREMENT_TITLES = {
  weight: "Weight",
  height: "Height",
  headCircumference: "Head circumference",
};

export function getGrowthMeasurementConfig(
  type,
  preferences = DEFAULT_GROWTH_UNIT_PREFERENCES,
) {
  if (!Object.prototype.hasOwnProperty.call(MEASUREMENT_TITLES, type)) {
    throw new Error("Invalid growth measurement type.");
  }

  const isWeight = type === "weight";

  const unit = isWeight
    ? ["lb", "lbs"].includes(preferences?.weight)
      ? "lb"
      : "kg"
    : ["in", "inch", "inches"].includes(preferences?.length)
      ? "in"
      : "cm";

  return {
    title: MEASUREMENT_TITLES[type],
    unit,
    step: isWeight || unit === "in" ? 0.01 : 0.1,
    decimals: 2,
    placeholder: "0.00",
  };
}

function getStorageFactor(type, unit) {
  if (type === "weight") {
    if (unit === "kg") return 1;
    if (unit === "lb") return KG_PER_LB;
  }

  if (type === "height" || type === "headCircumference") {
    if (unit === "cm") return 1;
    if (unit === "in") return CM_PER_INCH;
  }

  throw new Error("Invalid growth measurement unit.");
}

function validateValue(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error("Invalid growth measurement.");
  }
}

// kg → kg/lb, ou cm → cm/in.
export function toGrowthDisplayValue(value, type, unit) {
  if (value === null || value === undefined) {
    return null;
  }

  validateValue(value);

  return value / getStorageFactor(type, unit);
}

// kg/lb → kg, ou cm/in → cm.
export function toGrowthStorageValue(value, type, unit) {
  if (value === null || value === undefined) {
    return null;
  }

  validateValue(value);

  return value * getStorageFactor(type, unit);
}

export function formatGrowthDate(date) {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) {
    throw new Error("Invalid growth measurement date.");
  }

  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function parseGrowthDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);

  if (year < 1) {
    return null;
  }

  const date = new Date();
  date.setFullYear(year, month - 1, day);
  date.setHours(12, 0, 0, 0);

  return date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
    ? date
    : null;
}
