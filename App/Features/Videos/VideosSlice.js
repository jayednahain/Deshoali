import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import DownloadManager from '../../Service/DownloadManager';
import LocalStorageService from '../../Service/LocalStorageService';
import ServerSyncService from '../../Service/ServerSyncService';
import { getVideos } from './VideosAPI';

const initialState = {
  videos: [], // Raw API videos
  localVideos: {}, // Map of downloaded videos {videoId: videoData}
  videosWithStatus: [], // Merged videos with status
  currentDownload: null, // Currently downloading video ID
  downloadQueue: [], // Queue of video IDs to download
  isLoading: false,
  isError: false,
  errorMessage: '',
  // Search functionality
  searchQuery: '', // Current search query
  searchResults: [], // Filtered search results
  isSearching: false, // Loading state for search
};

export const fetchVideosThunk = createAsyncThunk(
  'Videos/fetchVideos',
  async () => {
    const response = await getVideos();
    return response;
  },
);

export const loadLocalVideosThunk = createAsyncThunk(
  'Videos/loadLocalVideos',
  async (_, { rejectWithValue }) => {
    try {
      console.log('[VideosSlice] Loading local videos from AsyncStorage');
      const localVideos = await LocalStorageService.getAllLocalVideos();
      if (localVideos && typeof localVideos === 'object') {
        return localVideos;
      }
      return {};
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to load local videos');
    }
  },
);

// Start auto download process for all NEW videos
export const startAutoDownloadThunk = createAsyncThunk(
  'Videos/startAutoDownload',
  async (videosWithStatus, { dispatch, rejectWithValue, getState }) => {
    try {
      console.log('[VideosSlice] Starting auto download process');

      if (!Array.isArray(videosWithStatus)) {
        throw new Error('Invalid videos array provided');
      }

      // Filter videos that are NEW status and need download
      const newVideos = videosWithStatus
        .filter(
          video =>
            video.status === 'NEW' &&
            video.id !== undefined &&
            video.id !== null,
        )
        .sort((a, b) => a.id - b.id); // Sort by ID ascending (0, 1, 2, 3...)

      if (newVideos.length === 0) {
        console.log('[VideosSlice] No new videos to download');
        return { message: 'No new videos to download', downloadCount: 0 };
      }

      console.log(
        `[VideosSlice] Found ${newVideos.length} new videos to download`,
      );

      // Get DownloadManager instance
      const downloadManager = DownloadManager.getInstance();

      // Setup callbacks for download progress and status updates
      const onProgress = (videoId, progress) => {
        if (typeof videoId === 'number' && typeof progress === 'number') {
          dispatch(updateDownloadProgress({ videoId, progress }));
        }
      };

      const onStatusChange = (videoId, status) => {
        if (typeof videoId === 'number' && status) {
          dispatch(updateVideoStatus({ videoId, status }));

          // Handle download start/completion status changes
          if (status === 'DOWNLOADING') {
            dispatch(setCurrentDownload(videoId));
          } else if (status === 'DOWNLOADED' || status === 'FAILED') {
            dispatch(setCurrentDownload(null));
          }
        }
      };

      // Set callbacks on the download manager
      downloadManager.setProgressCallback(onProgress);
      downloadManager.setStatusCallback(onStatusChange);

      // Start auto-download with sequential processing
      const downloadResult = await downloadManager.startAutoDownload(newVideos);

      console.log(
        '[VideosSlice] Auto download process completed:',
        downloadResult,
      );

      if (downloadResult) {
        return {
          message: `Auto download process completed successfully for ${newVideos.length} videos`,
          downloadCount: newVideos.length,
          successful: true,
        };
      } else {
        return {
          message: 'Auto download process completed with errors',
          downloadCount: 0,
          successful: false,
        };
      }
    } catch (error) {
      console.error('[VideosSlice] Error in auto download process:', error);
      return rejectWithValue(error.message || 'Auto download process failed');
    }
  },
);

// Retry download for a specific failed video
export const retryVideoDownloadThunk = createAsyncThunk(
  'Videos/retryVideoDownload',
  async (videoData, { dispatch, rejectWithValue }) => {
    try {
      console.log(`[VideosSlice] Retrying download for video ${videoData.id}`);

      // Validate video data
      if (
        !videoData ||
        typeof videoData.id !== 'number' ||
        (!videoData.filepath && !videoData.video_url)
      ) {
        throw new Error('Invalid video data provided for retry');
      }

      // Check if video is in a state that can be retried
      if (!['FAILED', 'NEW'].includes(videoData.status)) {
        throw new Error(`Cannot retry video with status: ${videoData.status}`);
      }

      // Get DownloadManager instance
      const downloadManager = DownloadManager.getInstance();

      // Setup callbacks
      const onProgress = (videoId, progress) => {
        if (typeof videoId === 'number' && typeof progress === 'number') {
          dispatch(updateDownloadProgress({ videoId, progress }));
        }
      };

      const onStatusChange = (videoId, status) => {
        if (typeof videoId === 'number' && status) {
          dispatch(updateVideoStatus({ videoId, status }));

          // Handle status changes
          if (status === 'DOWNLOADING') {
            dispatch(setCurrentDownload(videoId));
          } else if (status === 'DOWNLOADED' || status === 'FAILED') {
            dispatch(setCurrentDownload(null));
          }
        }
      };

      // Set callbacks on the download manager
      downloadManager.setProgressCallback(onProgress);
      downloadManager.setStatusCallback(onStatusChange);

      // Set as current download and reset progress
      dispatch(setCurrentDownload(videoData.id));
      dispatch(updateDownloadProgress({ videoId: videoData.id, progress: 0 }));
      dispatch(
        updateVideoStatus({ videoId: videoData.id, status: 'DOWNLOADING' }),
      );

      // Start single video download
      const downloadResult = await downloadManager.downloadVideo(videoData);

      // Handle the boolean result
      const success = downloadResult === true;
      const status = success ? 'DOWNLOADED' : 'FAILED';

      // Complete the download (this will also clear current download via status callback)
      dispatch(
        completeDownload({
          videoId: videoData.id,
          status,
          localFilePath: null, // File path will be set by the download process
        }),
      );

      console.log(
        `[VideosSlice] Retry download completed for video ${videoData.id}:`,
        downloadResult,
      );

      return {
        videoId: videoData.id,
        success: success,
        message: success
          ? `Video ${videoData.id} downloaded successfully`
          : `Video ${videoData.id} download failed`,
        localFilePath: null, // Will be handled by the download process
      };
    } catch (error) {
      console.error(
        `[VideosSlice] Error retrying video ${videoData?.id}:`,
        error,
      );

      // Clear current download on error
      if (videoData?.id) {
        dispatch(setCurrentDownload(null));
        dispatch(
          updateVideoStatus({ videoId: videoData.id, status: 'FAILED' }),
        );
      }

      return rejectWithValue(error.message || 'Retry download failed');
    }
  },
);

// Server synchronization thunk - checks server videos against local storage
export const serverSyncThunk = createAsyncThunk(
  'Videos/serverSync',
  async ({ serverVideos, localVideos, options = {} }, { rejectWithValue }) => {
    try {
      console.log('[VideosSlice] Starting server synchronization...');

      // Validate inputs
      if (!Array.isArray(serverVideos)) {
        throw new Error('Server videos must be provided as an array');
      }

      if (!localVideos || typeof localVideos !== 'object') {
        console.log(
          '[VideosSlice] No local videos provided, treating as empty',
        );
      }

      // Perform complete sync analysis and cleanup
      const syncResult = await ServerSyncService.performCompleteSync(
        serverVideos,
        localVideos || {},
        {
          autoCleanup: options.autoCleanup !== false, // Default to true
          dryRun: options.dryRun || false, // Default to false
        },
      );

      if (!syncResult.success) {
        throw new Error(syncResult.error || 'Server synchronization failed');
      }

      console.log(
        '[VideosSlice] Server synchronization completed successfully',
      );
      console.log(
        `[VideosSlice] Sync summary:`,
        syncResult.syncReport.serverSync,
      );

      // Return the sync result for the reducer to handle
      return {
        syncAnalysis: syncResult.syncAnalysis,
        cleanupResult: syncResult.cleanupResult,
        syncReport: syncResult.syncReport,
        options,
      };
    } catch (error) {
      console.error('[VideosSlice] Server synchronization failed:', error);
      return rejectWithValue(
        error.message || 'Failed to synchronize with server',
      );
    }
  },
);

// Search videos thunk
export const searchVideosThunk = createAsyncThunk(
  'Videos/searchVideos',
  async (searchQuery, { getState, dispatch, rejectWithValue }) => {
    try {
      console.log(`[VideosSlice] Searching for: "${searchQuery}"`);

      // Set searching state
      dispatch(setSearching(true));
      dispatch(setSearchQuery(searchQuery));

      // Get current videos with status from state
      const state = getState();
      const { videosWithStatus } = state.videosStore;
      console.log('current videos:: ', JSON.stringify(videosWithStatus));

      if (!Array.isArray(videosWithStatus) || videosWithStatus.length === 0) {
        console.log('[VideosSlice] No videos to search');
        return [];
      }

      // Simulate loading delay for better UX
      await new Promise(resolve => setTimeout(resolve, 500));

      // Perform search - filter primarily by title (name field)
      const query = searchQuery.toLowerCase().trim();
      const searchResults = videosWithStatus.filter(video => {
        if (!video) return false;

        // Search in name (title) - primary search field
        if (video.name && video.name.toLowerCase().includes(query)) {
          return true;
        }

        return false;
      });

      console.log(`[VideosSlice] Found ${searchResults.length} search results`);
      return searchResults;
    } catch (error) {
      console.error('[VideosSlice] Search failed:', error);
      return rejectWithValue(error.message || 'Search failed');
    }
  },
);

const videoSlice = createSlice({
  name: 'videos',
  initialState: initialState,
  reducers: {
    // Set local videos map
    setLocalVideos: (state, action) => {
      if (action.payload && typeof action.payload === 'object') {
        state.localVideos = action.payload;
        console.log(
          `[VideosSlice] Set ${
            Object.keys(action.payload).length
          } local videos`,
        );
      } else {
        state.localVideos = {};
        console.log('[VideosSlice] Cleared local videos');
      }
    },

    // Set merged videos with status
    setVideosWithStatus: (state, action) => {
      if (Array.isArray(action.payload)) {
        state.videosWithStatus = action.payload;
        console.log(
          `[VideosSlice] Set ${action.payload.length} videos with status`,
        );
      } else {
        state.videosWithStatus = [];
        console.log('[VideosSlice] Cleared videos with status');
      }
    },

    // Track current download
    setCurrentDownload: (state, action) => {
      const videoId = action.payload;
      if (videoId === null || typeof videoId === 'number') {
        state.currentDownload = videoId;
        console.log(`[VideosSlice] Set current download: ${videoId}`);
      } else {
        console.warn('[VideosSlice] Invalid current download ID:', videoId);
      }
    },

    // Update video status
    updateVideoStatus: (state, action) => {
      const { videoId, status } = action.payload;

      if (typeof videoId !== 'number' || !status) {
        console.warn('[VideosSlice] Invalid status update:', action.payload);
        return;
      }

      // Update in local videos
      if (state.localVideos[videoId]) {
        state.localVideos[videoId].status = status;
        state.localVideos[videoId].updatedAt = Date.now();
      }

      // Update in videos with status
      const videoIndex = state.videosWithStatus.findIndex(
        v => v.id === videoId,
      );
      if (videoIndex !== -1) {
        state.videosWithStatus[videoIndex].status = status;
      }

      console.log(`[VideosSlice] Updated video ${videoId} status to ${status}`);
    },

    // Update download progress
    updateDownloadProgress: (state, action) => {
      const { videoId, progress } = action.payload;

      if (typeof videoId !== 'number' || typeof progress !== 'number') {
        console.warn('[VideosSlice] Invalid progress update:', action.payload);
        return;
      }

      // Clamp progress between 0 and 100
      const clampedProgress = Math.max(0, Math.min(100, progress));

      // Update in local videos
      if (state.localVideos[videoId]) {
        state.localVideos[videoId].downloadProgress = clampedProgress;
      }

      // Update in videos with status
      const videoIndex = state.videosWithStatus.findIndex(
        v => v.id === videoId,
      );
      if (videoIndex !== -1) {
        state.videosWithStatus[videoIndex].downloadProgress = clampedProgress;
      }

      console.log(
        `[VideosSlice] Updated video ${videoId} progress to ${clampedProgress}%`,
      );
    },

    // Add to download queue
    addToDownloadQueue: (state, action) => {
      const videoId = action.payload;

      if (typeof videoId !== 'number') {
        console.warn('[VideosSlice] Invalid video ID for queue:', videoId);
        return;
      }

      if (!state.downloadQueue.includes(videoId)) {
        state.downloadQueue.push(videoId);
        console.log(`[VideosSlice] Added video ${videoId} to download queue`);
      } else {
        console.log(`[VideosSlice] Video ${videoId} already in queue`);
      }
    },

    // Remove from download queue
    removeFromDownloadQueue: (state, action) => {
      const videoId = action.payload;

      if (typeof videoId !== 'number') {
        console.warn(
          '[VideosSlice] Invalid video ID for queue removal:',
          videoId,
        );
        return;
      }

      const index = state.downloadQueue.indexOf(videoId);
      if (index > -1) {
        state.downloadQueue.splice(index, 1);
        console.log(
          `[VideosSlice] Removed video ${videoId} from download queue`,
        );
      } else {
        console.log(`[VideosSlice] Video ${videoId} not found in queue`);
      }
    },

    // Complete download (set status and clear current download)
    completeDownload: (state, action) => {
      const { videoId, status, localFilePath } = action.payload;

      if (typeof videoId !== 'number' || !status) {
        console.warn(
          '[VideosSlice] Invalid download completion:',
          action.payload,
        );
        return;
      }

      // Update status
      if (state.localVideos[videoId]) {
        state.localVideos[videoId].status = status;
        state.localVideos[videoId].downloadProgress =
          status === 'DOWNLOADED' ? 100 : 0;
        state.localVideos[videoId].updatedAt = Date.now();

        if (localFilePath && status === 'DOWNLOADED') {
          state.localVideos[videoId].localFilePath = localFilePath;
          state.localVideos[videoId].downloadedAt = Date.now();
        }
      }

      // Update in videos with status
      const videoIndex = state.videosWithStatus.findIndex(
        v => v.id === videoId,
      );
      if (videoIndex !== -1) {
        state.videosWithStatus[videoIndex].status = status;
        state.videosWithStatus[videoIndex].downloadProgress =
          status === 'DOWNLOADED' ? 100 : 0;

        if (localFilePath && status === 'DOWNLOADED') {
          state.videosWithStatus[videoIndex].localFilePath = localFilePath;
        }
      }

      // Clear current download if this was it
      if (state.currentDownload === videoId) {
        state.currentDownload = null;
      }

      // Remove from queue
      const queueIndex = state.downloadQueue.indexOf(videoId);
      if (queueIndex > -1) {
        state.downloadQueue.splice(queueIndex, 1);
      }

      console.log(
        `[VideosSlice] Completed download for video ${videoId} with status ${status}`,
      );
    },

    // Search functionality
    setSearchQuery: (state, action) => {
      const query = action.payload || '';
      state.searchQuery = query;

      if (query.trim() === '') {
        // Clear search - show all videos
        state.searchResults = [];
        console.log('[VideosSlice] Cleared search');
      } else {
        console.log(`[VideosSlice] Set search query: "${query}"`);
      }
    },

    setSearching: (state, action) => {
      state.isSearching = action.payload || false;
      console.log(`[VideosSlice] Set searching: ${state.isSearching}`);
    },

    setSearchResults: (state, action) => {
      if (Array.isArray(action.payload)) {
        state.searchResults = action.payload;
        state.isSearching = false;
        console.log(
          `[VideosSlice] Set ${action.payload.length} search results`,
        );
      } else {
        state.searchResults = [];
        state.isSearching = false;
        console.log('[VideosSlice] Cleared search results');
      }
    },

    // Reset videos state
    resetVideosState: state => {
      state.videos = [];
      state.localVideos = {};
      state.videosWithStatus = [];
      state.currentDownload = null;
      state.downloadQueue = [];
      state.isLoading = false;
      state.isError = false;
      state.errorMessage = '';
      // Reset search state
      state.searchQuery = '';
      state.searchResults = [];
      state.isSearching = false;
      console.log('[VideosSlice] Reset videos state');
    },
  },
  extraReducers: builder => {
    builder
      // Fetch videos thunk
      .addCase(fetchVideosThunk.pending, state => {
        state.isLoading = true;
        state.isError = false;
        state.errorMessage = '';
      })
      .addCase(fetchVideosThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isError = false;
        state.errorMessage = '';

        if (
          action.payload &&
          action.payload.data &&
          Array.isArray(action.payload.data)
        ) {
          state.videos = action.payload.data;
        } else {
          state.videos = [];
        }
      })
      .addCase(fetchVideosThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.errorMessage = action.error.message || 'Failed to fetch videos';
      })

      .addCase(loadLocalVideosThunk.pending, state => {})
      .addCase(loadLocalVideosThunk.fulfilled, (state, action) => {
        if (action.payload && typeof action.payload === 'object') {
          state.localVideos = action.payload;
        } else {
          state.localVideos = {};
        }
      })

      .addCase(loadLocalVideosThunk.rejected, (state, action) => {
        state.localVideos = {};
      })

      // Start auto download thunk
      .addCase(startAutoDownloadThunk.pending, state => {
        console.log('[VideosSlice] Auto download process starting...');
        // Don't set isLoading here as it might interfere with video fetching
      })
      .addCase(startAutoDownloadThunk.fulfilled, (state, action) => {
        console.log(
          '[VideosSlice] Auto download process completed:',
          action.payload,
        );
        // Download results are handled by individual progress callbacks
      })
      .addCase(startAutoDownloadThunk.rejected, (state, action) => {
        console.error(
          '[VideosSlice] Auto download process failed:',
          action.payload,
        );
        // Clear any stuck current download
        state.currentDownload = null;
      })

      // Retry video download thunk
      .addCase(retryVideoDownloadThunk.pending, (state, action) => {
        console.log('[VideosSlice] Retry download starting...');
        // Current download and status are set in the thunk itself
      })
      .addCase(retryVideoDownloadThunk.fulfilled, (state, action) => {
        console.log('[VideosSlice] Retry download completed:', action.payload);
        // Download completion is handled by the thunk itself
      })
      .addCase(retryVideoDownloadThunk.rejected, (state, action) => {
        console.error('[VideosSlice] Retry download failed:', action.payload);
        // Error handling is done in the thunk itself
      })

      // Server synchronization thunk
      .addCase(serverSyncThunk.pending, state => {
        console.log('[VideosSlice] Server synchronization starting...');
        // Don't change loading state as this is a background operation
      })
      .addCase(serverSyncThunk.fulfilled, (state, action) => {
        console.log(
          '[VideosSlice] Server synchronization completed:',
          action.payload,
        );

        const { syncAnalysis, cleanupResult, syncReport } = action.payload;

        // Update local videos if cleanup occurred
        if (
          cleanupResult &&
          cleanupResult.success &&
          cleanupResult.cleanedCount > 0
        ) {
          console.log(
            `[VideosSlice] Removing ${cleanupResult.cleanedCount} cleaned videos from state`,
          );

          // Remove cleaned videos from localVideos state
          const updatedLocalVideos = { ...state.localVideos };
          syncAnalysis.deletedVideos.forEach(deletedVideo => {
            delete updatedLocalVideos[deletedVideo.id];
          });
          state.localVideos = updatedLocalVideos;

          // Remove cleaned videos from videosWithStatus
          state.videosWithStatus = state.videosWithStatus.filter(
            video =>
              !syncAnalysis.deletedVideos.some(
                deleted => deleted.id === video.id,
              ),
          );
        }

        // Log sync summary
        console.log('[VideosSlice] Sync report:', {
          newVideos: syncReport.serverSync.newVideos,
          existingVideos: syncReport.serverSync.existingVideos,
          deletedVideos: syncReport.serverSync.deletedVideos,
          cleanedUp: cleanupResult ? cleanupResult.cleanedCount : 0,
        });
      })
      .addCase(serverSyncThunk.rejected, (state, action) => {
        console.error(
          '[VideosSlice] Server synchronization failed:',
          action.payload,
        );
        // Don't change error state as this is a background operation
        // Main app functionality should continue working
      })

      // Search videos thunk
      .addCase(searchVideosThunk.pending, (state, action) => {
        state.isSearching = true;
        console.log('[VideosSlice] Search started');
      })
      .addCase(searchVideosThunk.fulfilled, (state, action) => {
        state.isSearching = false;
        state.searchResults = action.payload || [];
        console.log(
          `[VideosSlice] Search completed with ${state.searchResults.length} results`,
        );
      })
      .addCase(searchVideosThunk.rejected, (state, action) => {
        state.isSearching = false;
        state.searchResults = [];
        console.error('[VideosSlice] Search failed:', action.payload);
      });
  },
});

// Export action creators
export const {
  setLocalVideos,
  setVideosWithStatus,
  setCurrentDownload,
  updateVideoStatus,
  updateDownloadProgress,
  addToDownloadQueue,
  removeFromDownloadQueue,
  completeDownload,
  resetVideosState,
  // Search actions
  setSearchQuery,
  setSearching,
  setSearchResults,
} = videoSlice.actions;

// Export reducer
export default videoSlice.reducer;
