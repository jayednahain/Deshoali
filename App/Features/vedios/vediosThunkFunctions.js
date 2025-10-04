import NetInfo from '@react-native-community/netinfo';
import { createAsyncThunk } from '@reduxjs/toolkit';
import databaseManager, { DB_KEYS } from '../../DBConfig';
import { getVideoList, getVideos } from '../../service/apiRequestFunctions';
import { videoDownloadManager } from '../../service/downloadManager';

/**
 * Fetch video list from API (new structure)
 */
const fetchVideoListThunk = createAsyncThunk(
  'videos/fetchVideoList',
  async (_, { rejectWithValue }) => {
    try {
      const videoList = await getVideoList();

      // Store the fetched list for offline access
      await databaseManager.setData(DB_KEYS.VIDEO_LIST, videoList);
      await databaseManager.setData(
        DB_KEYS.LAST_SYNC,
        new Date().toISOString(),
      );

      return videoList;
    } catch (error) {
      console.error('Fetch video list error:', error);
      return rejectWithValue(error.message || 'Failed to fetch video list');
    }
  },
);

/**
 * Load cached video list for offline use
 */
const loadCachedVideoListThunk = createAsyncThunk(
  'videos/loadCachedVideoList',
  async (_, { rejectWithValue }) => {
    try {
      const cachedVideoList = await databaseManager.getData(DB_KEYS.VIDEO_LIST);
      const lastSync = await databaseManager.getData(DB_KEYS.LAST_SYNC);

      if (cachedVideoList) {
        return {
          videoList: cachedVideoList,
          lastSync,
          fromCache: true,
        };
      } else {
        throw new Error('No cached video list found');
      }
    } catch (error) {
      console.error('Load cached video list error:', error);
      return rejectWithValue(error.message || 'No cached data available');
    }
  },
);

/**
 * Sync video list with download status
 */
const syncVideoStatusThunk = createAsyncThunk(
  'videos/syncVideoStatus',
  async (videos, { rejectWithValue }) => {
    try {
      const statusMap = {};

      for (const video of videos) {
        const videoId = video.id || video.title;
        const status = await videoDownloadManager.getVideoStatus(videoId);
        statusMap[videoId] = status;
      }

      return statusMap;
    } catch (error) {
      console.error('Sync video status error:', error);
      return rejectWithValue(error.message || 'Failed to sync video status');
    }
  },
);

/**
 * Start downloading a video
 */
const startVideoDownloadThunk = createAsyncThunk(
  'videos/startVideoDownload',
  async (video, { rejectWithValue }) => {
    try {
      const success = await videoDownloadManager.addToQueue(video);

      if (success) {
        return {
          videoId: video.id || video.title,
          video,
        };
      } else {
        throw new Error('Failed to add video to download queue');
      }
    } catch (error) {
      console.error('Start video download error:', error);
      return rejectWithValue(error.message || 'Failed to start download');
    }
  },
);

/**
 * Update download progress
 */
const updateDownloadProgressThunk = createAsyncThunk(
  'videos/updateDownloadProgress',
  async ({ videoId, progress, status }) => {
    return {
      videoId,
      progress,
      status,
    };
  },
);

/**
 * Check network status and sync accordingly
 */
const checkNetworkAndSyncThunk = createAsyncThunk(
  'videos/checkNetworkAndSync',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const netInfo = await NetInfo.fetch();

      if (netInfo.isConnected) {
        // Online - fetch latest video list
        await dispatch(fetchVideoListThunk());
        return { isOffline: false };
      } else {
        // Offline - load cached data
        await dispatch(loadCachedVideoListThunk());
        return { isOffline: true };
      }
    } catch (error) {
      console.error('Network check and sync error:', error);
      return rejectWithValue(error.message || 'Network sync failed');
    }
  },
);

/**
 * Clear download states (for app restart)
 */
const clearDownloadStatesThunk = createAsyncThunk(
  'videos/clearDownloadStates',
  async (_, { rejectWithValue }) => {
    try {
      await videoDownloadManager.clearDownloadStates();
      return true;
    } catch (error) {
      console.error('Clear download states error:', error);
      return rejectWithValue(
        error.message || 'Failed to clear download states',
      );
    }
  },
);

/**
 * Legacy fetch videos function (keeping for backward compatibility)
 */
const fetchVideosThunk = createAsyncThunk(
  'videos/fetchVideos',
  async ({ search, tags }) => {
    const videos = await getVideos(search, tags);
    return videos;
  },
);

export {
  checkNetworkAndSyncThunk,
  clearDownloadStatesThunk,
  fetchVideoListThunk,
  fetchVideosThunk,
  loadCachedVideoListThunk,
  startVideoDownloadThunk,
  syncVideoStatusThunk,
  updateDownloadProgressThunk,
};
