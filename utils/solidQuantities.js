const GRAMS_PER_OZ = 28.349523125;
const ML_PER_FL_OZ = 29.5735295625;

const UNIT_LABELS = {
  piece: "Piece",
  g: "g",
  oz: "oz",
  ml: "ml",
  fl_oz: "fl oz",
  teaspoon: "Teaspoon",
  tablespoon: "Tablespoon",
  portion: "Portion",
};

function roundQuantity(value) {
  return Math.round(value * 1000) / 1000;
}

export function getSolidWeightUnit(weightUnit) {
  return ["lb", "lbs", "oz"].includes(weightUnit) ? "oz" : "g";
}

export function getSolidVolumeUnit(volumeUnit) {
  return ["fl_oz", "oz"].includes(volumeUnit) ? "fl_oz" : "ml";
}

export function getSolidDisplayUnit(unit, preferences) {
  if (unit === "g" || unit === "oz") {
    return getSolidWeightUnit(preferences.weight);
  }

  if (unit === "ml" || unit === "fl_oz") {
    return getSolidVolumeUnit(preferences.volume);
  }

  return unit;
}

export function convertSolidAmount(amount, fromUnit, toUnit) {
  if (fromUnit === toUnit) return amount;

  if (fromUnit === "g" && toUnit === "oz") {
    return amount / GRAMS_PER_OZ;
  }

  if (fromUnit === "oz" && toUnit === "g") {
    return amount * GRAMS_PER_OZ;
  }

  if (fromUnit === "ml" && toUnit === "fl_oz") {
    return amount / ML_PER_FL_OZ;
  }

  if (fromUnit === "fl_oz" && toUnit === "ml") {
    return amount * ML_PER_FL_OZ;
  }

  // Une pièce ou une portion ne se convertit pas en poids ou volume.
  return amount;
}

export function normalizeSolidQuantity(amount, unit) {
  const storageUnit = unit === "oz" ? "g" : unit === "fl_oz" ? "ml" : unit;

  return {
    amount: roundQuantity(convertSolidAmount(amount, unit, storageUnit)),
    unit: storageUnit,
  };
}

export function formatSolidQuantity(food, preferences, t) {
  if (
    typeof food?.amount !== "number" ||
    !Number.isFinite(food.amount) ||
    food.amount <= 0 ||
    !UNIT_LABELS[food.unit]
  ) {
    return "";
  }

  const displayUnit = getSolidDisplayUnit(food.unit, preferences);
  const displayAmount = convertSolidAmount(food.amount, food.unit, displayUnit);

  const amountLabel = String(Number(displayAmount.toFixed(2)));

  const unitLabel = ["g", "oz", "ml", "fl_oz"].includes(displayUnit)
    ? UNIT_LABELS[displayUnit]
    : t(UNIT_LABELS[displayUnit]).toLocaleLowerCase();

  return `${amountLabel} ${unitLabel}`;
}
