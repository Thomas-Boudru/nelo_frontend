// i18n.js
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const customPluralResolver = (count, options) => {
  return "singular";
};

i18n.use(initReactI18next).init({
  compatibilityJSON: "v3",
  resources: {
    en: {
      translation: require("../locales/enTranslation.json"),
    },
    fr: {
      translation: require("../locales/frTranslation.json"),
    },
    nl: {
      translation: require("../locales/nlTranslation.json"),
    },
  },
  lng: "en", // Langue par défaut
  fallbackLng: "en", // Langue de secours si la traduction est manquante
  interpolation: {
    escapeValue: false,
  },
  pluralRules: customPluralResolver, // Utiliser la fonction de résolution des pluriels personnalisée
});

export default i18n;
