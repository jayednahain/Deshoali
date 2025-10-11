import { configureStore } from '@reduxjs/toolkit';
import appConfigSlice from '../Features/Config/themeAndLanguageUpdateSlice';
import videoReducer from '../Features/Videos/VideosSlice';

const AppStore = configureStore({
  reducer: {
    videosStore: videoReducer,
    appConfig: appConfigSlice,
  },
});

export default AppStore;
