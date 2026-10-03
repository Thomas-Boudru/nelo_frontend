import { useEffect } from "react";
import { useDispatch } from "react-redux";

import { useAuth } from "../../auth/AuthProvider.js";
import { getLocalUserPreferences } from "../../database/user/userPreferencesRepository.js";
import {
  measurementUnitsLoaded,
  measurementUnitsReset,
} from "../../store/slices/measurementUnitsSlice.js";

export default function MeasurementUnitsLoader() {
  const { user } = useAuth();
  const dispatch = useDispatch();

  useEffect(() => {
    let cancelled = false;

    // Vide immédiatement les unités du compte précédent.
    dispatch(measurementUnitsReset());

    if (!user?.id) {
      return () => {
        cancelled = true;
      };
    }

    getLocalUserPreferences(user.id)
      .then((preferences) => {
        if (cancelled) return;

        dispatch(
          measurementUnitsLoaded({
            weight: preferences?.weightUnit ?? "kg",
            length: preferences?.lengthUnit ?? "cm",
            temperature:
              preferences?.temperatureUnit === "f" ? "fahrenheit" : "celsius",
            volume: preferences?.volumeUnit ?? "ml",
          }),
        );
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Unable to load measurement units:", error);
        // Le slice reste à loaded: false : les écrans concernés
        // pourront afficher un chargement ou proposer une nouvelle tentative.
      });

    return () => {
      cancelled = true;
    };
  }, [dispatch, user?.id]);

  return null;
}
