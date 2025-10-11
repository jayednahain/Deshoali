import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isConnected: true,
  connectionType: 'unknown',
  isInternetReachable: true,
  hasInternetError: false,
  lastConnectionCheck: Date.now(),
};

const connectivitySlice = createSlice({
  name: 'connectivity',
  initialState,
  reducers: {
    updateConnectionStatus: (state, action) => {
      const { isConnected, type, isInternetReachable } = action.payload;
      state.isConnected = isConnected;
      state.connectionType = type;
      state.isInternetReachable = isInternetReachable;
      state.lastConnectionCheck = Date.now();

      // Set hasInternetError if there's no connection or internet is not reachable
      state.hasInternetError = !isConnected || !isInternetReachable;
    },
    setInternetError: (state, action) => {
      state.hasInternetError = action.payload;
    },
    resetConnectivityState: state => {
      return initialState;
    },
  },
});

export const {
  updateConnectionStatus,
  setInternetError,
  resetConnectivityState,
} = connectivitySlice.actions;

// Selectors
export const selectIsConnected = state => state.connectivityStore.isConnected;
export const selectConnectionType = state =>
  state.connectivityStore.connectionType;
export const selectIsInternetReachable = state =>
  state.connectivityStore.isInternetReachable;
export const selectHasInternetError = state =>
  state.connectivityStore.hasInternetError;
export const selectLastConnectionCheck = state =>
  state.connectivityStore.lastConnectionCheck;

export default connectivitySlice.reducer;
