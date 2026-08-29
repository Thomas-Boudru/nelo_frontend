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

    // Passe à true après la réussite de POST /api/onboarding
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

    resetOnboarding() {
      return createInitialState();
    },
  },
});

export const {
  setChildStatus,
  setBornChildProfile,
  setExpectedChildProfile,
  setRelationship,
  setParentFirstName,
  setThemeMode,
  completeOnboarding,
  resetOnboarding,
} = onboardingSlice.actions;

export default onboardingSlice.reducer;
