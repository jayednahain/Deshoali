import { createSlice } from '@reduxjs/toolkit';
const initialState = {
  theme: 'light', // 'light' or 'dark'
  language: 'bng', // default language
};
const themeAndLanguageUpdateSlice = createSlice({
  name: 'appConfig',
  initialState,
  reducers: {
    setTheme: (state, action) => {
      state.theme = action.payload;
    },
    setLanguage: (state, action) => {
      state.language = action.payload;
    },
    resetConfigState: state => {
      return initialState;
    },
  },
});

// Selectors
// export const selectTheme = state => state.appConfig.theme;
// export const selectLanguage = state => state.appConfig.language;
export const { setTheme, setLanguage, resetConfigState } =
  themeAndLanguageUpdateSlice.actions;
export default themeAndLanguageUpdateSlice.reducer;
