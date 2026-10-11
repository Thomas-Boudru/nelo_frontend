import { getLocales } from "expo-localization";

export function getDeviceMeasurementUnits() {
  const locale = getLocales()[0];

  const system =
    locale?.measurementSystem ??
    (locale?.regionCode === "US" ? "us" : "metric");

  const usesUSUnits = system === "us";

  const temperatureUnit =
    locale?.temperatureUnit === "fahrenheit"
      ? "f"
      : locale?.temperatureUnit === "celsius"
        ? "c"
        : locale?.regionCode === "US"
          ? "f"
          : "c";

  return {
    weightUnit: usesUSUnits ? "lb" : "kg",
    lengthUnit: usesUSUnits ? "in" : "cm",
    temperatureUnit,
    volumeUnit: usesUSUnits ? "fl_oz" : "ml",
  };
}

export function toMeasurementUnitsState(preferences) {
  return {
    weight: preferences.weightUnit,
    length: preferences.lengthUnit,
    temperature: preferences.temperatureUnit === "f" ? "fahrenheit" : "celsius",
    volume: preferences.volumeUnit ?? "ml",
  };
}
