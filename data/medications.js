export const MEDICATIONS = [
  {
    id: "paracetamol",
    translationKey: "Paracetamol",
    category: "Pain and fever",
    searchTerms: {
      en: ["paracetamol", "acetaminophen", "calpol", "tylenol", "panadol"],
      fr: [
        "paracétamol",
        "paracetamol",
        "dafalgan",
        "doliprane",
        "perdolan",
        "efferalgan",
      ],
      de: ["paracetamol", "ben-u-ron", "benuron"],
      es: [
        "paracetamol",
        "acetaminofén",
        "acetaminofen",
        "apiretal",
        "gelocatil",
      ],
      it: ["paracetamolo", "tachipirina", "efferalgan"],
      nl: ["paracetamol", "perdolan", "sinaspril"],
      pt: ["paracetamol", "acetaminofeno", "ben-u-ron", "benuron"],
    },
  },
  {
    id: "ibuprofen",
    translationKey: "Ibuprofen",
    category: "Pain and fever",
    searchTerms: {
      en: ["ibuprofen", "nurofen", "advil", "motrin"],
      fr: ["ibuprofène", "ibuprofen", "nurofen", "brufen", "advil"],
      de: ["ibuprofen", "nurofen", "dolormin"],
      es: ["ibuprofeno", "dalsy", "nurofen", "neobrufen"],
      it: ["ibuprofene", "nurofen", "brufen", "moment"],
      nl: ["ibuprofen", "nurofen", "brufen", "advil"],
      pt: ["ibuprofeno", "brufen", "nurofen", "trifene"],
    },
  },
  {
    id: "amoxicillin",
    translationKey: "Amoxicillin",
    category: "Antibiotic",
    searchTerms: {
      en: ["amoxicillin", "amoxil"],
      fr: ["amoxicilline", "amoxicillin", "clamoxyl"],
      de: ["amoxicillin", "amoxicilline", "amoxypen"],
      es: ["amoxicilina", "amoxil", "clamoxyl"],
      it: ["amoxicillina", "amoxina", "zimox"],
      nl: ["amoxicilline", "amoxicillin", "clamoxyl"],
      pt: ["amoxicilina", "amoxil", "clamoxyl"],
    },
  },
  {
    id: "amoxicillin-clavulanic-acid",
    translationKey: "Amoxicillin and clavulanic acid",
    category: "Antibiotic",
    searchTerms: {
      en: [
        "amoxicillin clavulanic acid",
        "amoxicillin clavulanate",
        "co-amoxiclav",
        "augmentin",
      ],
      fr: ["amoxicilline acide clavulanique", "co-amoxiclav", "augmentin"],
      de: [
        "amoxicillin clavulansäure",
        "amoxicillin clavulansaure",
        "co-amoxiclav",
        "augmentan",
      ],
      es: [
        "amoxicilina ácido clavulánico",
        "amoxicilina acido clavulanico",
        "amoxicilina clavulanato",
        "augmentine",
      ],
      it: [
        "amoxicillina acido clavulanico",
        "amoxicillina clavulanato",
        "augmentin",
      ],
      nl: ["amoxicilline clavulaanzuur", "co-amoxiclav", "augmentin"],
      pt: [
        "amoxicilina ácido clavulânico",
        "amoxicilina acido clavulanico",
        "amoxicilina clavulanato",
        "augmentin",
      ],
    },
  },
  {
    id: "azithromycin",
    translationKey: "Azithromycin",
    category: "Antibiotic",
    searchTerms: {
      en: ["azithromycin", "zithromax"],
      fr: ["azithromycine", "zithromax"],
      de: ["azithromycin", "zithromax"],
      es: ["azitromicina", "zithromax"],
      it: ["azitromicina", "zitromax"],
      nl: ["azitromycine", "zithromax"],
      pt: ["azitromicina", "zitromax"],
    },
  },
  {
    id: "clarithromycin",
    translationKey: "Clarithromycin",
    category: "Antibiotic",
    searchTerms: {
      en: ["clarithromycin", "klacid", "biaxin"],
      fr: ["clarithromycine", "klacid"],
      de: ["clarithromycin", "klacid"],
      es: ["claritromicina", "klacid"],
      it: ["claritromicina", "klacid", "veclam"],
      nl: ["claritromycine", "klacid"],
      pt: ["claritromicina", "klacid"],
    },
  },
  {
    id: "cefuroxime",
    translationKey: "Cefuroxime",
    category: "Antibiotic",
    searchTerms: {
      en: ["cefuroxime", "zinnat", "ceftin"],
      fr: ["céfuroxime", "cefuroxime", "zinnat"],
      de: ["cefuroxim", "zinnat", "elobact"],
      es: ["cefuroxima", "zinnat"],
      it: ["cefuroxima", "zinnat"],
      nl: ["cefuroxim", "cefuroxime", "zinnat"],
      pt: ["cefuroxima", "zinnat"],
    },
  },
  {
    id: "cefalexin",
    translationKey: "Cefalexin",
    category: "Antibiotic",
    searchTerms: {
      en: ["cefalexin", "cephalexin", "keflex"],
      fr: ["céfalexine", "cefalexine", "cephalexine"],
      de: ["cefalexin", "cephalexin"],
      es: ["cefalexina", "cephalexina"],
      it: ["cefalexina", "cephalexina"],
      nl: ["cefalexine", "cephalexine"],
      pt: ["cefalexina", "cephalexina"],
    },
  },
  {
    id: "cetirizine",
    translationKey: "Cetirizine",
    category: "Allergy",
    searchTerms: {
      en: ["cetirizine", "zyrtec", "reactine"],
      fr: ["cétirizine", "cetirizine", "zyrtec"],
      de: ["cetirizin", "zyrtec"],
      es: ["cetirizina", "zyrtec"],
      it: ["cetirizina", "zirtec"],
      nl: ["cetirizine", "zyrtec"],
      pt: ["cetirizina", "zyrtec"],
    },
  },
  {
    id: "desloratadine",
    translationKey: "Desloratadine",
    category: "Allergy",
    searchTerms: {
      en: ["desloratadine", "aerius", "clarinex"],
      fr: ["desloratadine", "aerius"],
      de: ["desloratadin", "aerius"],
      es: ["desloratadina", "aerius"],
      it: ["desloratadina", "aerius"],
      nl: ["desloratadine", "aerius"],
      pt: ["desloratadina", "aerius"],
    },
  },
  {
    id: "dimetindene",
    translationKey: "Dimetindene",
    category: "Allergy",
    searchTerms: {
      en: ["dimetindene", "fenistil"],
      fr: ["dimétindène", "dimetindene", "fenistil"],
      de: ["dimetinden", "fenistil"],
      es: ["dimetindeno", "fenistil"],
      it: ["dimetindene", "fenistil"],
      nl: ["dimetindeen", "fenistil"],
      pt: ["dimetindeno", "fenistil"],
    },
  },
  {
    id: "salbutamol",
    translationKey: "Salbutamol",
    category: "Breathing",
    searchTerms: {
      en: ["salbutamol", "albuterol", "ventolin"],
      fr: ["salbutamol", "ventoline", "ventolin"],
      de: ["salbutamol", "sultanol", "ventolin"],
      es: ["salbutamol", "ventolin"],
      it: ["salbutamolo", "ventolin", "broncovaleas"],
      nl: ["salbutamol", "ventolin", "airomir"],
      pt: ["salbutamol", "ventilan", "ventolin"],
    },
  },
  {
    id: "budesonide",
    translationKey: "Budesonide",
    category: "Breathing",
    searchTerms: {
      en: ["budesonide", "pulmicort"],
      fr: ["budésonide", "budesonide", "pulmicort"],
      de: ["budesonid", "pulmicort"],
      es: ["budesonida", "pulmicort"],
      it: ["budesonide", "pulmaxan"],
      nl: ["budesonide", "pulmicort"],
      pt: ["budesonida", "pulmicort"],
    },
  },
  {
    id: "fluticasone",
    translationKey: "Fluticasone",
    category: "Breathing",
    searchTerms: {
      en: ["fluticasone", "flixotide", "flovent"],
      fr: ["fluticasone", "flixotide"],
      de: ["fluticason", "flixotide"],
      es: ["fluticasona", "flixotide"],
      it: ["fluticasone", "flixotide"],
      nl: ["fluticason", "flixotide"],
      pt: ["fluticasona", "flixotaide"],
    },
  },
  {
    id: "prednisolone",
    translationKey: "Prednisolone",
    category: "Corticosteroid",
    searchTerms: {
      en: ["prednisolone", "orapred"],
      fr: ["prednisolone", "solupred"],
      de: ["prednisolon", "decortin"],
      es: ["prednisolona", "estilsona"],
      it: ["prednisolone", "deltacortene"],
      nl: ["prednisolon", "prednisolone"],
      pt: ["prednisolona", "meticorten"],
    },
  },
  {
    id: "omeprazole",
    translationKey: "Omeprazole",
    category: "Reflux and digestion",
    searchTerms: {
      en: ["omeprazole", "losec", "prilosec"],
      fr: ["oméprazole", "omeprazole", "losec"],
      de: ["omeprazol", "antra", "losec"],
      es: ["omeprazol", "losec"],
      it: ["omeprazolo", "losec", "omeprazen"],
      nl: ["omeprazol", "losec"],
      pt: ["omeprazol", "losec"],
    },
  },
  {
    id: "esomeprazole",
    translationKey: "Esomeprazole",
    category: "Reflux and digestion",
    searchTerms: {
      en: ["esomeprazole", "nexium"],
      fr: ["ésoméprazole", "esomeprazole", "nexiam", "nexium"],
      de: ["esomeprazol", "nexium"],
      es: ["esomeprazol", "nexium"],
      it: ["esomeprazolo", "lucen", "nexium"],
      nl: ["esomeprazol", "nexium"],
      pt: ["esomeprazol", "nexium"],
    },
  },
  {
    id: "lactulose",
    translationKey: "Lactulose",
    category: "Reflux and digestion",
    searchTerms: {
      en: ["lactulose", "duphalac"],
      fr: ["lactulose", "duphalac"],
      de: ["lactulose", "laktulose", "bifiteral"],
      es: ["lactulosa", "duphalac"],
      it: ["lattulosio", "laevolac"],
      nl: ["lactulose", "duphalac"],
      pt: ["lactulose", "duphalac"],
    },
  },
  {
    id: "macrogol",
    translationKey: "Macrogol",
    category: "Reflux and digestion",
    searchTerms: {
      en: ["macrogol", "polyethylene glycol", "peg", "movicol"],
      fr: [
        "macrogol",
        "polyéthylène glycol",
        "polyethylene glycol",
        "movicol",
        "forlax",
      ],
      de: ["macrogol", "polyethylenglykol", "movicol"],
      es: ["macrogol", "polietilenglicol", "movicol"],
      it: ["macrogol", "polietilenglicole", "movicol"],
      nl: ["macrogol", "polyethyleenglycol", "movicolon"],
      pt: ["macrogol", "polietilenoglicol", "movicol"],
    },
  },
  {
    id: "vitamin-d",
    translationKey: "Vitamin D",
    category: "Vitamin and supplement",
    searchTerms: {
      en: ["vitamin d", "vitamin d3", "cholecalciferol"],
      fr: ["vitamine d", "vitamine d3", "cholécalciférol", "d-cure", "dcure"],
      de: ["vitamin d", "vitamin d3", "cholecalciferol", "vigantol"],
      es: ["vitamina d", "vitamina d3", "colecalciferol"],
      it: ["vitamina d", "vitamina d3", "colecalciferolo", "dibase"],
      nl: ["vitamine d", "vitamine d3", "cholecalciferol", "d-cure", "dcure"],
      pt: ["vitamina d", "vitamina d3", "colecalciferol", "vigantol"],
    },
  },
  {
    id: "iron",
    translationKey: "Iron supplement",
    category: "Vitamin and supplement",
    searchTerms: {
      en: ["iron", "iron supplement", "ferrous sulfate"],
      fr: ["fer", "supplément de fer", "sulfate ferreux"],
      de: ["eisen", "eisenpräparat", "eisensulfat"],
      es: ["hierro", "suplemento de hierro", "sulfato ferroso"],
      it: ["ferro", "integratore di ferro", "solfato ferroso"],
      nl: ["ijzer", "ijzersupplement", "ferrosulfaat"],
      pt: ["ferro", "suplemento de ferro", "sulfato ferroso"],
    },
  },
];

export function normalizeMedicationSearch(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function getMedicationSearchTerms(medication, currentLanguage = "en") {
  const normalizedLanguage = currentLanguage.toLowerCase().split("-")[0];

  const currentLanguageTerms =
    medication.searchTerms?.[normalizedLanguage] ??
    medication.searchTerms?.en ??
    [];

  const otherLanguageTerms = Object.entries(medication.searchTerms ?? {})
    .filter(([language]) => language !== normalizedLanguage)
    .flatMap(([, terms]) => terms);

  return {
    currentLanguageTerms: currentLanguageTerms.map(normalizeMedicationSearch),
    otherLanguageTerms: otherLanguageTerms.map(normalizeMedicationSearch),
  };
}

export function searchMedications(
  medications,
  search,
  currentLanguage = "en",
  getTranslatedName = (medication) => medication.translationKey,
) {
  const normalizedSearch = normalizeMedicationSearch(search);

  if (!normalizedSearch) {
    return medications;
  }

  return medications
    .map((medication) => {
      const translatedName = normalizeMedicationSearch(
        getTranslatedName(medication),
      );

      const { currentLanguageTerms, otherLanguageTerms } =
        getMedicationSearchTerms(medication, currentLanguage);

      const isExactMatch =
        translatedName === normalizedSearch ||
        currentLanguageTerms.some((term) => term === normalizedSearch);

      const isCurrentLanguageMatch =
        translatedName.includes(normalizedSearch) ||
        currentLanguageTerms.some((term) => term.includes(normalizedSearch));

      const isOtherLanguageMatch = otherLanguageTerms.some((term) =>
        term.includes(normalizedSearch),
      );

      const score = isExactMatch
        ? 3
        : isCurrentLanguageMatch
          ? 2
          : isOtherLanguageMatch
            ? 1
            : 0;

      return {
        medication,
        score,
      };
    })
    .filter(({ score }) => score > 0)
    .sort((first, second) => second.score - first.score)
    .map(({ medication }) => medication);
}
