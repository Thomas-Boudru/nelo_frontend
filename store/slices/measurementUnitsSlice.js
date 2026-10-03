import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  weight: "kg",
  length: "cm",
  temperature: "celsius",
  volume: "ml",
  loaded: false,
};

const measurementUnitsSlice = createSlice({
  name: "measurementUnits",
  initialState,
  reducers: {
    measurementUnitsLoaded(state, action) {
      state.weight = action.payload.weight;
      state.length = action.payload.length;
      state.temperature = action.payload.temperature;
      state.volume = action.payload.volume;
      state.loaded = true;
    },
    measurementUnitChanged(state, action) {
      const { type, unit } = action.payload;
      if (["weight", "length", "temperature", "volume"].includes(type)) {
        state[type] = unit;
      }
    },
    measurementUnitsReset() {
      return initialState;
    },
  },
});

export const {
  measurementUnitsLoaded,
  measurementUnitChanged,
  measurementUnitsReset,
} = measurementUnitsSlice.actions;

export default measurementUnitsSlice.reducer;
