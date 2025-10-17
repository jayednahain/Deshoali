import { configureStore } from '@reduxjs/toolkit';
import appConfigSlice from '../Features/Config/appConfigSlice';
import themeAndLanguageSlice from '../Features/Config/themeAndLanguageUpdateSlice';
import modalSlice from '../Features/Modal/modalSlice';
import videoReducer from '../Features/Videos/VideosSlice';

const AppStore = configureStore({
  reducer: {
    videosStore: videoReducer,
    themeAndLanguage: themeAndLanguageSlice,
    appConfig: appConfigSlice,
    modalStore: modalSlice,
  },
});

export default AppStore;
