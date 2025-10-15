import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

const APP_CONFIG_KEY = 'APP_CONFIG';

const initialState = {
  // Download settings
  autoDownloadEnabled: true,
  downloadOnWifiOnly: true,
  maxConcurrentDownloads: 1, // Always 1 for sequential downloads

  // Storage settings
  storageLocation: null, // Will be set by FileSystemService
  maxStorageUsageGB: 5,

  // App settings
  preferredLanguage: 'bn', // Bengali by default
  videoQuality: 'medium', // low, medium, high

  // Playback settings
  autoplay: false,
  showSubtitles: true,

  // Network settings
  downloadTimeout: 300000, // 5 minutes in milliseconds
  retryAttempts: 3,

  // UI settings
  darkMode: false,

  // Loading states
  isLoading: false,
  isError: false,
  errorMessage: '',
};

// Load app configuration from AsyncStorage
export const loadAppConfigThunk = createAsyncThunk(
  'AppConfig/loadAppConfig',
  async (_, { rejectWithValue }) => {
    try {
      console.log(
        '[AppConfigSlice] Loading app configuration from AsyncStorage',
      );

      const configString = await AsyncStorage.getItem(APP_CONFIG_KEY);

      if (configString) {
        const config = JSON.parse(configString);

        if (config && typeof config === 'object') {
          console.log('[AppConfigSlice] App configuration loaded successfully');
          return config;
        }
      }

      console.log(
        '[AppConfigSlice] No saved configuration found, using defaults',
      );
      return null; // Will use initialState defaults
    } catch (error) {
      console.error('[AppConfigSlice] Error loading app configuration:', error);
      return rejectWithValue(
        error.message || 'Failed to load app configuration',
      );
    }
  },
);

// Save app configuration to AsyncStorage
export const saveAppConfigThunk = createAsyncThunk(
  'AppConfig/saveAppConfig',
  async (config, { rejectWithValue, getState }) => {
    try {
      console.log('[AppConfigSlice] Saving app configuration to AsyncStorage');

      // Get current state if no config provided
      const configToSave = config || getState().appConfig;

      if (!configToSave || typeof configToSave !== 'object') {
        throw new Error('Invalid configuration data');
      }

      // Remove loading states before saving
      const { isLoading, isError, errorMessage, ...configData } = configToSave;

      const configString = JSON.stringify(configData);
      await AsyncStorage.setItem(APP_CONFIG_KEY, configString);

      console.log('[AppConfigSlice] App configuration saved successfully');
      return configData;
    } catch (error) {
      console.error('[AppConfigSlice] Error saving app configuration:', error);
      return rejectWithValue(
        error.message || 'Failed to save app configuration',
      );
    }
  },
);

const appConfigSlice = createSlice({
  name: 'appConfig',
  initialState: initialState,
  reducers: {
    // Update auto download setting
    setAutoDownloadEnabled: (state, action) => {
      const enabled = action.payload;
      if (typeof enabled === 'boolean') {
        state.autoDownloadEnabled = enabled;
        console.log(`[AppConfigSlice] Auto download set to: ${enabled}`);
      } else {
        console.warn('[AppConfigSlice] Invalid auto download value:', enabled);
      }
    },

    // Update WiFi-only download setting
    setDownloadOnWifiOnly: (state, action) => {
      const wifiOnly = action.payload;
      if (typeof wifiOnly === 'boolean') {
        state.downloadOnWifiOnly = wifiOnly;
        console.log(
          `[AppConfigSlice] Download on WiFi only set to: ${wifiOnly}`,
        );
      } else {
        console.warn('[AppConfigSlice] Invalid WiFi-only value:', wifiOnly);
      }
    },

    // Update storage location
    setStorageLocation: (state, action) => {
      const location = action.payload;
      if (typeof location === 'string' && location.length > 0) {
        state.storageLocation = location;
        console.log(`[AppConfigSlice] Storage location set to: ${location}`);
      } else {
        console.warn('[AppConfigSlice] Invalid storage location:', location);
      }
    },

    // Update max storage usage
    setMaxStorageUsageGB: (state, action) => {
      const maxGB = action.payload;
      if (typeof maxGB === 'number' && maxGB > 0) {
        state.maxStorageUsageGB = Math.max(1, Math.min(50, maxGB)); // Clamp between 1-50 GB
        console.log(
          `[AppConfigSlice] Max storage usage set to: ${state.maxStorageUsageGB}GB`,
        );
      } else {
        console.warn('[AppConfigSlice] Invalid max storage value:', maxGB);
      }
    },

    // Update preferred language
    setPreferredLanguage: (state, action) => {
      const language = action.payload;
      if (typeof language === 'string' && ['bn', 'en'].includes(language)) {
        state.preferredLanguage = language;
        console.log(`[AppConfigSlice] Preferred language set to: ${language}`);
      } else {
        console.warn('[AppConfigSlice] Invalid language value:', language);
      }
    },

    // Update video quality
    setVideoQuality: (state, action) => {
      const quality = action.payload;
      if (
        typeof quality === 'string' &&
        ['low', 'medium', 'high'].includes(quality)
      ) {
        state.videoQuality = quality;
        console.log(`[AppConfigSlice] Video quality set to: ${quality}`);
      } else {
        console.warn('[AppConfigSlice] Invalid video quality:', quality);
      }
    },

    // Update autoplay setting
    setAutoplay: (state, action) => {
      const autoplay = action.payload;
      if (typeof autoplay === 'boolean') {
        state.autoplay = autoplay;
        console.log(`[AppConfigSlice] Autoplay set to: ${autoplay}`);
      } else {
        console.warn('[AppConfigSlice] Invalid autoplay value:', autoplay);
      }
    },

    // Update subtitles setting
    setShowSubtitles: (state, action) => {
      const showSubtitles = action.payload;
      if (typeof showSubtitles === 'boolean') {
        state.showSubtitles = showSubtitles;
        console.log(`[AppConfigSlice] Show subtitles set to: ${showSubtitles}`);
      } else {
        console.warn(
          '[AppConfigSlice] Invalid subtitles value:',
          showSubtitles,
        );
      }
    },

    // Update download timeout
    setDownloadTimeout: (state, action) => {
      const timeout = action.payload;
      if (typeof timeout === 'number' && timeout > 0) {
        state.downloadTimeout = Math.max(30000, Math.min(600000, timeout)); // Clamp between 30s-10min
        console.log(
          `[AppConfigSlice] Download timeout set to: ${state.downloadTimeout}ms`,
        );
      } else {
        console.warn('[AppConfigSlice] Invalid timeout value:', timeout);
      }
    },

    // Update retry attempts
    setRetryAttempts: (state, action) => {
      const attempts = action.payload;
      if (typeof attempts === 'number' && attempts >= 0) {
        state.retryAttempts = Math.max(0, Math.min(10, Math.floor(attempts))); // Clamp between 0-10
        console.log(
          `[AppConfigSlice] Retry attempts set to: ${state.retryAttempts}`,
        );
      } else {
        console.warn('[AppConfigSlice] Invalid retry attempts:', attempts);
      }
    },

    // Update dark mode setting
    setDarkMode: (state, action) => {
      const darkMode = action.payload;
      if (typeof darkMode === 'boolean') {
        state.darkMode = darkMode;
        console.log(`[AppConfigSlice] Dark mode set to: ${darkMode}`);
      } else {
        console.warn('[AppConfigSlice] Invalid dark mode value:', darkMode);
      }
    },

    // Batch update multiple settings
    updateAppConfig: (state, action) => {
      const updates = action.payload;

      if (!updates || typeof updates !== 'object') {
        console.warn('[AppConfigSlice] Invalid config updates:', updates);
        return;
      }

      // Validate and update each field
      Object.keys(updates).forEach(key => {
        if (
          initialState.hasOwnProperty(key) &&
          key !== 'isLoading' &&
          key !== 'isError' &&
          key !== 'errorMessage'
        ) {
          const value = updates[key];

          // Type validation based on initial state
          const expectedType = typeof initialState[key];
          if (typeof value === expectedType) {
            state[key] = value;
            console.log(`[AppConfigSlice] Updated ${key}: ${value}`);
          } else {
            console.warn(`[AppConfigSlice] Invalid type for ${key}:`, value);
          }
        }
      });

      console.log('[AppConfigSlice] Batch config update completed');
    },

    // Reset to default configuration
    resetAppConfig: state => {
      // Keep storage location if it was set
      const currentStorageLocation = state.storageLocation;

      // Reset to initial state
      Object.keys(initialState).forEach(key => {
        if (
          key !== 'isLoading' &&
          key !== 'isError' &&
          key !== 'errorMessage'
        ) {
          state[key] = initialState[key];
        }
      });

      // Restore storage location
      if (currentStorageLocation) {
        state.storageLocation = currentStorageLocation;
      }

      console.log('[AppConfigSlice] Configuration reset to defaults');
    },
  },
  extraReducers: builder => {
    builder
      // Load app config thunk
      .addCase(loadAppConfigThunk.pending, state => {
        state.isLoading = true;
        state.isError = false;
        state.errorMessage = '';
        console.log('[AppConfigSlice] Loading app configuration...');
      })
      .addCase(loadAppConfigThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isError = false;
        state.errorMessage = '';

        if (action.payload && typeof action.payload === 'object') {
          // Merge loaded config with current state, preserving type safety
          Object.keys(action.payload).forEach(key => {
            if (
              initialState.hasOwnProperty(key) &&
              key !== 'isLoading' &&
              key !== 'isError' &&
              key !== 'errorMessage'
            ) {
              const value = action.payload[key];
              const expectedType = typeof initialState[key];

              if (typeof value === expectedType) {
                state[key] = value;
              } else {
                console.warn(
                  `[AppConfigSlice] Ignoring invalid config value for ${key}:`,
                  value,
                );
              }
            }
          });

          console.log('[AppConfigSlice] App configuration loaded and merged');
        } else {
          console.log('[AppConfigSlice] Using default configuration');
        }
      })
      .addCase(loadAppConfigThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.errorMessage =
          action.payload || 'Failed to load app configuration';
        console.error(
          '[AppConfigSlice] Failed to load app configuration:',
          state.errorMessage,
        );
      })

      // Save app config thunk
      .addCase(saveAppConfigThunk.pending, state => {
        console.log('[AppConfigSlice] Saving app configuration...');
      })
      .addCase(saveAppConfigThunk.fulfilled, (state, action) => {
        console.log('[AppConfigSlice] App configuration saved successfully');
      })
      .addCase(saveAppConfigThunk.rejected, (state, action) => {
        console.error(
          '[AppConfigSlice] Failed to save app configuration:',
          action.payload,
        );
      });
  },
});

// Export action creators
export const {
  setAutoDownloadEnabled,
  setDownloadOnWifiOnly,
  setStorageLocation,
  setMaxStorageUsageGB,
  setPreferredLanguage,
  setVideoQuality,
  setAutoplay,
  setShowSubtitles,
  setDownloadTimeout,
  setRetryAttempts,
  setDarkMode,
  updateAppConfig,
  resetAppConfig,
} = appConfigSlice.actions;

// Export reducer
export default appConfigSlice.reducer;
