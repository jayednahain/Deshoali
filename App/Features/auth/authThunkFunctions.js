import { createAsyncThunk } from '@reduxjs/toolkit';
import databaseManager, { DB_KEYS } from '../../DBConfig';
import { refreshToken } from '../../service/apiRequestFunctions';

/**
 * Fixed credentials as per requirements
 */
const FIXED_CREDENTIALS = {
  username: 'admin',
  password: 'admin123',
};

/**
 * Authenticate user with fixed credentials (DUMMY IMPLEMENTATION)
 */
const loginThunk = createAsyncThunk(
  'auth/login',
  async (_, { rejectWithValue }) => {
    try {
      // DUMMY AUTHENTICATION - bypassing actual API call
      console.log('Using dummy authentication...');

      // Simulate a successful authentication response
      const dummyToken = 'dummy-jwt-token-12345';
      const dummyUser = { username: FIXED_CREDENTIALS.username };

      // Store JWT token securely
      await databaseManager.setData(DB_KEYS.JWT_TOKEN, dummyToken);

      return {
        token: dummyToken,
        user: dummyUser,
      };
    } catch (error) {
      console.error('Login error:', error);
      return rejectWithValue(error.message || 'Authentication failed');
    }
  },
);

/**
 * Check for existing token on app start (DUMMY IMPLEMENTATION)
 */
const checkAuthThunk = createAsyncThunk(
  'auth/checkAuth',
  async (_, { rejectWithValue }) => {
    try {
      console.log('Checking dummy authentication...');

      // DUMMY AUTHENTICATION - always return success
      // Check if we have a stored dummy token
      let token = await databaseManager.getData(DB_KEYS.JWT_TOKEN);

      if (!token) {
        // Create a dummy token if none exists
        token = 'dummy-jwt-token-12345';
        await databaseManager.setData(DB_KEYS.JWT_TOKEN, token);
      }

      return {
        token,
        user: { username: FIXED_CREDENTIALS.username },
      };
    } catch (error) {
      console.error('Check auth error:', error);
      // Even if there's an error, return a dummy success response
      const dummyToken = 'dummy-jwt-token-12345';
      await databaseManager.setData(DB_KEYS.JWT_TOKEN, dummyToken);

      return {
        token: dummyToken,
        user: { username: FIXED_CREDENTIALS.username },
      };
    }
  },
);

/**
 * Logout user and clear stored token
 */
const logoutThunk = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      // Remove token from storage
      await databaseManager.removeData(DB_KEYS.JWT_TOKEN);
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      return rejectWithValue(error.message || 'Logout failed');
    }
  },
);

/**
 * Refresh authentication token
 */
const refreshAuthThunk = createAsyncThunk(
  'auth/refresh',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      if (!auth.token) {
        throw new Error('No token to refresh');
      }

      const response = await refreshToken(auth.token);

      if (response.token) {
        // Update stored token
        await databaseManager.setData(DB_KEYS.JWT_TOKEN, response.token);

        return {
          token: response.token,
          user: response.user || auth.user,
        };
      } else {
        throw new Error('Token refresh failed');
      }
    } catch (error) {
      console.error('Refresh token error:', error);
      // If refresh fails, clear stored token
      await databaseManager.removeData(DB_KEYS.JWT_TOKEN);
      return rejectWithValue(error.message || 'Token refresh failed');
    }
  },
);

export {
  checkAuthThunk,
  FIXED_CREDENTIALS,
  loginThunk,
  logoutThunk,
  refreshAuthThunk,
};
