export function getTemperatureUnit(preference) {
  const normalized = String(preference ?? "")
    .trim()
    .toLowerCase();

  return ["fahrenheit", "°f", "f"].includes(normalized)
    ? "fahrenheit"
    : "celsius";
}

export function getTemperatureUnitLabel(unit) {
  return getTemperatureUnit(unit) === "fahrenheit" ? "°F" : "°C";
}

export function temperatureToCelsius(value, unit) {
  return getTemperatureUnit(unit) === "fahrenheit"
    ? ((value - 32) * 5) / 9
    : value;
}

export function temperatureFromCelsius(value, unit) {
  return getTemperatureUnit(unit) === "fahrenheit"
    ? (value * 9) / 5 + 32
    : value;
}

export function formatTemperatureValue(celsius, unit) {
  return temperatureFromCelsius(celsius, unit).toFixed(1);
}

export function parseTemperatureInput(value) {
  const normalized = String(value).trim().replace(",", ".");

  if (!/^\d+(?:\.\d+)?$/.test(normalized)) {
    return null;
  }

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}
