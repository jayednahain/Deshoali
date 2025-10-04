import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../Features/auth/authSlice';
import videosReducer from '../Features/vedios/videosSlice';

const store = configureStore({
  reducer: {
    videosStore: videosReducer,
    auth: authReducer,
  },
});

export default store;
