import { getLocales } from "expo-localization";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "../locales/enTranslation.json";

const supportedLanguages = ["en"];

function getDeviceLanguage() {
  const deviceLanguage = getLocales()[0]?.languageCode;

  if (deviceLanguage && supportedLanguages.includes(deviceLanguage)) {
    return deviceLanguage;
  }

  return "en";
}

i18n.use(initReactI18next).init({
  resources: {
    en: {
      translation: en,
    },
  },

  lng: getDeviceLanguage(),
  fallbackLng: "en",

  interpolation: {
    escapeValue: false,
  },

  returnNull: false,
});

export default i18n;
