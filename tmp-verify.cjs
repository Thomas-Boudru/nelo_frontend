const fs = require("fs");
const babel = require("@babel/core");

const raw = fs.readFileSync("locales/enTranslation.json", "utf8");
const parsed = JSON.parse(raw);
console.log("en JSON OK — keys:", Object.keys(parsed).length);

const keys = [...raw.matchAll(/^ {2}"((?:[^"\\]|\\.)*)":/gm)].map((m) => m[1]);
const seen = new Set();
const dups = [];
for (const key of keys) {
  if (seen.has(key)) dups.push(key);
  seen.add(key);
}
console.log("duplicate keys:", dups.length ? dups : "none");

const files = [
  "components/addTracking/DateTimeRow.js",
  "components/addTracking/medication/VaccineForm.js",
  "screens/medication/VaccineDetailsSheet.js",
  "screens/medication/VaccinePickerSheet.js",
  "screens/medication/MedicationEntrySheet.js",
  "navigation/MainTabNavigator.js",
  "data/vaccines.js",
  "screens/addTracking/Feeding/AddFoodSheet.js",
];

for (const file of files) {
  try {
    babel.transformFileSync(file, {
      presets: [require.resolve("babel-preset-expo")],
      configFile: false,
      babelrc: false,
    });
    console.log("OK   " + file);
  } catch (error) {
    console.log("FAIL " + file + " :: " + error.message.split("\n")[0]);
  }
}

// Vérifie que plus rien ne référence les props/fichiers supprimés.
const stale = [
  ["onPressVaccinePhoto", ["navigation/MainTabNavigator.js", "screens/medication/MedicationEntrySheet.js", "screens/medication/VaccineDetailsSheet.js"]],
  ["VaccineNextDoseRow", ["components/addTracking/medication/VaccineForm.js"]],
  ["onPressPhoto", ["screens/medication/MedicationEntrySheet.js", "screens/medication/VaccineDetailsSheet.js"]],
];

for (const [needle, checked] of stale) {
  const hits = checked.filter((f) => fs.readFileSync(f, "utf8").includes(needle));
  console.log(
    "stale '" + needle + "':",
    hits.length ? hits.join(", ") : "no references",
  );
}
