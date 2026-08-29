import { getLocales } from "expo-localization";

import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "../locales/enTranslation.json";
import fr from "../locales/frTranslation.json";
import de from "../locales/deTranslation.json";
import es from "../locales/esTranslation.json";
import it from "../locales/itTranslation.json";
import nl from "../locales/nlTranslation.json";
import pt from "../locales/ptTranslation.json";

export const supportedLanguages = ["en", "fr", "de", "es", "it", "nl", "pt"];

export function normalizeLanguage(language) {
  const normalizedLanguage = String(language || "")
    .trim()
    .toLowerCase()
    .split("-")[0];

  return supportedLanguages.includes(normalizedLanguage)
    ? normalizedLanguage
    : "en";
}

function getDeviceLanguage() {
  const deviceLanguage = getLocales()[0]?.languageCode;

  return normalizeLanguage(deviceLanguage);
}

i18n.use(initReactI18next).init({
  resources: {
    en: {
      translation: en,
    },
    fr: {
      translation: fr,
    },
    de: {
      translation: de,
    },
    es: {
      translation: es,
    },
    it: {
      translation: it,
    },
    nl: {
      translation: nl,
    },
    pt: {
      translation: pt,
    },
  },

  lng: getDeviceLanguage(),
  fallbackLng: "en",
  supportedLngs: supportedLanguages,

  interpolation: {
    escapeValue: false,
  },

  react: {
    useSuspense: false,
  },

  returnNull: false,
});

export default i18n;
