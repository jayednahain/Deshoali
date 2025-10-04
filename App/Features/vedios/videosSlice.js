import { createSlice } from '@reduxjs/toolkit';
import initialState from './vediosInitialStates';
import {
  checkNetworkAndSyncThunk,
  clearDownloadStatesThunk,
  fetchVideoListThunk,
  fetchVideosThunk,
  loadCachedVideoListThunk,
  startVideoDownloadThunk,
  syncVideoStatusThunk,
  updateDownloadProgressThunk,
} from './vediosThunkFunctions';

const videoSlice = createSlice({
  name: 'videos',
  initialState: initialState,
  reducers: {
    // Synchronous actions
    setOfflineMode: (state, action) => {
      state.isOffline = action.payload;
    },
    clearError: state => {
      state.isError = false;
      state.error = '';
    },
    updateVideoDownloadStatus: (state, action) => {
      const { videoId, status } = action.payload;
      if (!state.downloadStatus[videoId]) {
        state.downloadStatus[videoId] = {};
      }
      state.downloadStatus[videoId] = {
        ...state.downloadStatus[videoId],
        ...status,
      };
    },
    setCurrentDownload: (state, action) => {
      state.currentDownload = action.payload;
    },
  },
  extraReducers: builder => {
    builder
      // Legacy fetch videos
      .addCase(fetchVideosThunk.pending, state => {
        state.isLoading = true;
        state.isError = false;
        state.error = '';
      })
      .addCase(fetchVideosThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isError = false;
        state.error = '';
        state.videos = action.payload;
      })
      .addCase(fetchVideosThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.error = action.error.message;
      })

      // Fetch video list (new structure)
      .addCase(fetchVideoListThunk.pending, state => {
        state.isLoading = true;
        state.isError = false;
        state.error = '';
        state.syncInProgress = true;
      })
      .addCase(fetchVideoListThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isError = false;
        state.error = '';
        state.syncInProgress = false;
        state.videoList = action.payload;
        state.lastSync = new Date().toISOString();
        state.isOffline = false;

        // Flatten videos for easy access
        state.videos = [];
        action.payload.categories.forEach(category => {
          state.videos.push(
            ...category.videos.map(video => ({
              ...video,
              category: category.name,
            })),
          );
        });
      })
      .addCase(fetchVideoListThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.error = action.payload || 'Failed to fetch video list';
        state.syncInProgress = false;
      })

      // Load cached video list
      .addCase(loadCachedVideoListThunk.pending, state => {
        state.isLoading = true;
        state.isError = false;
        state.error = '';
      })
      .addCase(loadCachedVideoListThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isError = false;
        state.error = '';
        state.videoList = action.payload.videoList;
        state.lastSync = action.payload.lastSync;
        state.isOffline = true;

        // Flatten videos for easy access
        state.videos = [];
        action.payload.videoList.categories.forEach(category => {
          state.videos.push(
            ...category.videos.map(video => ({
              ...video,
              category: category.name,
            })),
          );
        });
      })
      .addCase(loadCachedVideoListThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.error = action.payload || 'No cached data available';
      })

      // Sync video status
      .addCase(syncVideoStatusThunk.fulfilled, (state, action) => {
        state.downloadStatus = { ...state.downloadStatus, ...action.payload };
      })

      // Start video download
      .addCase(startVideoDownloadThunk.fulfilled, (state, action) => {
        const { videoId } = action.payload;
        if (!state.downloadQueue.includes(videoId)) {
          state.downloadQueue.push(videoId);
        }
      })

      // Update download progress
      .addCase(updateDownloadProgressThunk.fulfilled, (state, action) => {
        const { videoId, progress, status } = action.payload;
        if (!state.downloadStatus[videoId]) {
          state.downloadStatus[videoId] = {};
        }
        state.downloadStatus[videoId] = {
          ...state.downloadStatus[videoId],
          progress,
          status,
        };
      })

      // Network check and sync
      .addCase(checkNetworkAndSyncThunk.fulfilled, (state, action) => {
        state.isOffline = action.payload.isOffline;
      })

      // Clear download states
      .addCase(clearDownloadStatesThunk.fulfilled, state => {
        // Reset only download-related states, keep video data
        state.downloadQueue = [];
        state.currentDownload = null;

        // Reset downloading videos to pending
        Object.keys(state.downloadStatus).forEach(videoId => {
          if (state.downloadStatus[videoId].status === 'downloading') {
            state.downloadStatus[videoId] = {
              ...state.downloadStatus[videoId],
              status: 'pending',
              progress: 0,
            };
          }
        });
      });
  },
});

export const {
  setOfflineMode,
  clearError,
  updateVideoDownloadStatus,
  setCurrentDownload,
} = videoSlice.actions;

export default videoSlice.reducer;
