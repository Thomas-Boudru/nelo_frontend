import { createSlice } from "@reduxjs/toolkit";

function createInitialState() {
  return {
    // "born" | "expected" | "join"
    childStatus: null,

    childFirstName: "",

    // "female" | "male" | "intersex" | "unspecified" | null
    childGender: null,

    // Dates au format YYYY-MM-DD
    birthDate: null,
    expectedBirthDate: null,

    // Heure au format HH:mm ou null
    birthTime: null,

    isPremature: false,
    gestationalAgeWeeks: null,
    gestationalAgeDays: null,

    // "mother" | "father" | "parent" | "grandparent"
    // | "family_or_friend" | "caregiver" | "other"
    relationship: null,

    parentFirstName: "",

    // Thème associé au profil de l’enfant
    themeMode: "blue",

    /*
     * Dernière étape atteinte, cf. navigation/onboardingFlow.js.
     * Persistée : elle permet de reprendre le parcours au bon écran
     * après un redémarrage de l’application.
     */
    step: null,

    /*
     * Passe à true après la réussite de POST /api/onboarding ou de
     * l’acceptation d’une invitation.
     *
     * Volontairement exclu de la persistance (cf. store.js) : cet
     * indicateur est recalculé à chaque démarrage depuis
     * user.onboardingCompletedAt. Le persister ferait sauter
     * l’onboarding du prochain compte utilisé sur l’appareil.
     */
    completed: false,
  };
}

const onboardingSlice = createSlice({
  name: "onboarding",

  initialState: createInitialState(),

  reducers: {
    setChildStatus(state, action) {
      state.childStatus = action.payload;
    },

    setStep(state, action) {
      state.step = action.payload;
    },

    setBornChildProfile(state, action) {
      const {
        firstName,
        gender = null,
        birthDate,
        birthTime = null,
        isPremature = false,
        gestationalAgeWeeks = null,
        gestationalAgeDays = null,
      } = action.payload;

      state.childStatus = "born";
      state.childFirstName = firstName || "";
      state.childGender = gender;
      state.birthDate = birthDate;
      state.birthTime = birthTime;
      state.expectedBirthDate = null;

      state.isPremature = Boolean(isPremature);

      state.gestationalAgeWeeks = isPremature ? gestationalAgeWeeks : null;

      state.gestationalAgeDays = isPremature ? gestationalAgeDays : null;
    },

    setExpectedChildProfile(state, action) {
      const {
        firstName = "",
        gender = null,
        expectedBirthDate,
      } = action.payload;

      state.childStatus = "expected";
      state.childFirstName = firstName || "";
      state.childGender = gender;
      state.expectedBirthDate = expectedBirthDate;

      state.birthDate = null;
      state.birthTime = null;
      state.isPremature = false;
      state.gestationalAgeWeeks = null;
      state.gestationalAgeDays = null;
    },

    setRelationship(state, action) {
      state.relationship = action.payload;
    },

    setParentFirstName(state, action) {
      state.parentFirstName = action.payload;
    },

    setThemeMode(state, action) {
      state.themeMode = action.payload;
    },

    completeOnboarding(state) {
      state.completed = true;
    },

    /*
     * `completed` n’est pas persisté mais survit à une déconnexion
     * dans la même session. RootNavigator le remet à zéro dès que la
     * session est perdue, sans toucher au brouillon en cours de saisie.
     */
    clearOnboardingCompletion(state) {
      state.completed = false;
    },

    /*
     * Efface le brouillon. Appelé après un onboarding réussi, une fois
     * la session authentifiée déjà marquée comme onboardée.
     */
    resetOnboarding() {
      return createInitialState();
    },
  },
});

export const {
  setChildStatus,
  setStep,
  setBornChildProfile,
  setExpectedChildProfile,
  setRelationship,
  setParentFirstName,
  setThemeMode,
  completeOnboarding,
  clearOnboardingCompletion,
  resetOnboarding,
} = onboardingSlice.actions;

export const selectOnboarding = (state) => state.onboarding;

export const selectOnboardingStep = (state) => state.onboarding.step;

export const selectChildStatus = (state) => state.onboarding.childStatus;

export default onboardingSlice.reducer;
