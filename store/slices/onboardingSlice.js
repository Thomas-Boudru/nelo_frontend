import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  childStatus: null,

  childFirstName: "",
  childGender: null,
  birthDate: null,
  expectedBirthDate: null,
  isPremature: null,

  relationship: null,

  parentFirstName: "",

  completed: false,
};

const onboardingSlice = createSlice({
  name: "onboarding",

  initialState,

  reducers: {
    setChildStatus(state, action) {
      state.childStatus = action.payload;
    },

    setBornChildProfile(state, action) {
      const { firstName, gender, birthDate, isPremature } = action.payload;

      state.childFirstName = firstName;
      state.childGender = gender;
      state.birthDate = birthDate;
      state.isPremature = isPremature;

      state.expectedBirthDate = null;
    },

    setExpectedChildProfile(state, action) {
      const { firstName, gender, expectedBirthDate } = action.payload;

      state.childFirstName = firstName;
      state.childGender = gender;
      state.expectedBirthDate = expectedBirthDate;

      state.birthDate = null;
      state.isPremature = null;
    },

    setRelationship(state, action) {
      state.relationship = action.payload;
    },

    setParentFirstName(state, action) {
      state.parentFirstName = action.payload;
    },

    completeOnboarding(state) {
      state.completed = true;
    },

    resetOnboarding() {
      return initialState;
    },
  },
});

export const {
  setChildStatus,
  setBornChildProfile,
  setExpectedChildProfile,
  setRelationship,
  setParentFirstName,
  completeOnboarding,
  resetOnboarding,
} = onboardingSlice.actions;

export default onboardingSlice.reducer;
