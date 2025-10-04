import { createSlice } from '@reduxjs/toolkit';
import initialState from './authInitialStates';
import {
  checkAuthThunk,
  loginThunk,
  logoutThunk,
  refreshAuthThunk,
} from './authThunkFunctions';




const authSlice = createSlice({
  name: 'auth',
  initialState: initialState,
  reducers: {
    // Synchronous actions
    clearError: state => {
      state.isError = false;
      state.error = '';
    },
    setAuthChecked: state => {
      state.authChecked = true;
    },
  },
  extraReducers: builder => {
    builder
      // Login cases
      .addCase(loginThunk.pending, state => {
        state.isLoading = true;
        state.isError = false;
        state.error = '';
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isError = false;
        state.error = '';
        state.isAuthenticated = true;
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.authChecked = true;
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.error = action.payload || 'Authentication failed';
        state.isAuthenticated = false;
        state.token = null;
        state.user = null;
        state.authChecked = true;
      })

      // Check auth cases
      .addCase(checkAuthThunk.pending, state => {
        state.isLoading = true;
        state.isError = false;
        state.error = '';
      })
      .addCase(checkAuthThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isError = false;
        state.error = '';
        state.isAuthenticated = true;
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.authChecked = true;
      })
      .addCase(checkAuthThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = false; // Don't show error for missing stored token
        state.error = '';
        state.isAuthenticated = false;
        state.token = null;
        state.user = null;
        state.authChecked = true;
      })

      // Logout cases
      .addCase(logoutThunk.pending, state => {
        state.isLoading = true;
      })
      .addCase(logoutThunk.fulfilled, state => {
        state.isLoading = false;
        state.isError = false;
        state.error = '';
        state.isAuthenticated = false;
        state.token = null;
        state.user = null;
      })
      .addCase(logoutThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.error = action.payload || 'Logout failed';
        // Still clear auth state even if logout API fails
        state.isAuthenticated = false;
        state.token = null;
        state.user = null;
      })

      // Refresh token cases
      .addCase(refreshAuthThunk.pending, state => {
        state.isLoading = true;
        state.isError = false;
        state.error = '';
      })
      .addCase(refreshAuthThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isError = false;
        state.error = '';
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.isAuthenticated = true;
      })
      .addCase(refreshAuthThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.error = action.payload || 'Token refresh failed';
        state.isAuthenticated = false;
        state.token = null;
        state.user = null;
      });
  },
});

export const { clearError, setAuthChecked } = authSlice.actions;
export default authSlice.reducer;
