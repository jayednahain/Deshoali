import { useEffect } from 'react';
import { Alert } from 'react-native';
import { useDispatch } from 'react-redux';
import {
  setCurrentDownload,
  updateDownloadProgress,
  updateVideoStatus,
} from '../Features/Videos/VideosSlice';
import DownloadManager from '../Service/DownloadManager';
import { useAppLanguage } from './useAppLagnuage';

/**
 * useDownloadManager - React hook for DownloadManager integration
 *
 * CRITICAL RESPONSIBILITIES:
 * - Initialize DownloadManager callbacks with Redux dispatch
 * - Provide safe wrapper functions for download operations
 * - Handle errors gracefully with user-friendly messages
 * - Prevent multiple simultaneous downloads
 * - Validate conditions before starting downloads
 *
 * KEEPS BUSINESS LOGIC SEPARATE FROM UI COMPONENTS
 */

export const useDownloadManager = () => {
  const dispatch = useDispatch();
  const { i18n } = useAppLanguage();

  // Initialize DownloadManager callbacks on mount
  useEffect(() => {
    console.log('[useDownloadManager] Initializing DownloadManager callbacks');

    const downloadManager = DownloadManager.getInstance();

    // Set progress callback - updates Redux state for real-time UI updates
    downloadManager.setProgressCallback((videoId, progress) => {
      try {
        if (typeof videoId === 'number' && typeof progress === 'number') {
          console.log(
            `[useDownloadManager] Progress update: Video ${videoId} - ${progress}%`,
          );
          dispatch(updateDownloadProgress({ videoId, progress }));
        } else {
          console.warn(
            '[useDownloadManager] Invalid progress callback parameters:',
            { videoId, progress },
          );
        }
      } catch (error) {
        console.error(
          '[useDownloadManager] Error in progress callback:',
          error,
        );
      }
    });

    // Set status callback - updates Redux state for status changes
    downloadManager.setStatusCallback((videoId, status) => {
      try {
        if (typeof videoId === 'number' && typeof status === 'string') {
          console.log(
            `[useDownloadManager] Status update: Video ${videoId} -> ${status}`,
          );

          // Update video status in Redux
          dispatch(updateVideoStatus({ videoId, status }));

          // Update current download tracking
          if (status === 'DOWNLOADING') {
            dispatch(setCurrentDownload(videoId));
          } else if (status === 'DOWNLOADED' || status === 'FAILED') {
            dispatch(setCurrentDownload(null));
          }
        } else {
          console.warn(
            '[useDownloadManager] Invalid status callback parameters:',
            { videoId, status },
          );
        }
      } catch (error) {
        console.error('[useDownloadManager] Error in status callback:', error);
      }
    });

    console.log(
      '[useDownloadManager] DownloadManager callbacks initialized successfully',
    );

    // Cleanup function (though callbacks persist for singleton lifecycle)
    return () => {
      console.log(
        '[useDownloadManager] Component unmounting - callbacks remain active for singleton',
      );
    };
  }, [dispatch]); // Only re-run if dispatch changes (shouldn't happen)

  /**
   * Start sequential downloads for new videos
   * @param {Array} newVideos - Array of NEW video objects
   * @returns {Promise<boolean>} Success status
   */
  const startSequentialDownloads = async newVideos => {
    try {
      console.log('[useDownloadManager] Starting sequential downloads');

      // Validate input
      if (!Array.isArray(newVideos)) {
        console.error(
          '[useDownloadManager] Invalid newVideos parameter - not an array',
        );
        Alert.alert(i18n('error'), 'Invalid videos list provided', [
          { text: i18n('ok') },
        ]);
        return false;
      }

      if (newVideos.length === 0) {
        console.log('[useDownloadManager] No new videos to download');
        return true;
      }

      // Validate each video object
      const validVideos = newVideos.filter(video => {
        if (!video || typeof video.id !== 'number' || !video.name) {
          console.warn(
            '[useDownloadManager] Filtering out invalid video:',
            video,
          );
          return false;
        }
        return true;
      });

      if (validVideos.length === 0) {
        console.warn(
          '[useDownloadManager] No valid videos found after filtering',
        );
        Alert.alert(i18n('error'), 'No valid videos found for download', [
          { text: i18n('ok') },
        ]);
        return false;
      }

      if (validVideos.length !== newVideos.length) {
        console.warn(
          `[useDownloadManager] Filtered ${
            newVideos.length - validVideos.length
          } invalid videos`,
        );
      }

      // Check if download is already active
      const downloadManager = DownloadManager.getInstance();
      if (downloadManager.isDownloadActive()) {
        console.warn(
          '[useDownloadManager] Cannot start downloads - another download is active',
        );
        Alert.alert(
          i18n('download_in_progress'),
          i18n('download_in_progress_message'),
          [{ text: i18n('ok') }],
        );
        return false;
      }

      console.log(
        `[useDownloadManager] Starting download for ${validVideos.length} valid videos`,
      );

      // Start download process
      const success = await downloadManager.startAutoDownload(validVideos);

      if (!success) {
        console.error('[useDownloadManager] Failed to start downloads');
        Alert.alert(i18n('error'), i18n('download_failed'), [
          { text: i18n('ok') },
        ]);
        return false;
      }

      console.log('[useDownloadManager] Downloads started successfully');
      return true;
    } catch (error) {
      console.error(
        '[useDownloadManager] Error starting sequential downloads:',
        error,
      );
      Alert.alert(i18n('error'), error.message || i18n('download_failed'), [
        { text: i18n('ok') },
      ]);
      return false;
    }
  };

  /**
   * Retry downloading a failed video
   * @param {number} videoId - ID of video to retry
   * @param {Object} videoData - Complete video object for retry
   * @returns {Promise<boolean>} Success status
   */
  const retryDownload = async (videoId, videoData) => {
    try {
      console.log(
        `[useDownloadManager] Retrying download for video ${videoId}`,
      );

      // Validate parameters
      if (typeof videoId !== 'number') {
        console.error(
          '[useDownloadManager] Invalid videoId for retry:',
          videoId,
        );
        Alert.alert(i18n('error'), 'Invalid video ID provided', [
          { text: i18n('ok') },
        ]);
        return false;
      }

      if (!videoData || typeof videoData !== 'object' || !videoData.name) {
        console.error(
          '[useDownloadManager] Invalid videoData for retry:',
          videoData,
        );
        Alert.alert(i18n('error'), 'Invalid video data provided', [
          { text: i18n('ok') },
        ]);
        return false;
      }

      // Check if another download is active
      const downloadManager = DownloadManager.getInstance();
      if (downloadManager.isDownloadActive()) {
        console.warn(
          `[useDownloadManager] Cannot retry video ${videoId} - another download is active`,
        );
        Alert.alert(
          i18n('download_in_progress'),
          i18n('download_in_progress_message'),
          [{ text: i18n('ok') }],
        );
        return false;
      }

      console.log(
        `[useDownloadManager] Retrying download for video ${videoId}: ${videoData.name}`,
      );

      // Start retry
      const success = await downloadManager.retryDownload(videoData);

      if (!success) {
        console.error(
          `[useDownloadManager] Failed to retry download for video ${videoId}`,
        );
        Alert.alert(i18n('error'), i18n('download_failed'), [
          { text: i18n('ok') },
        ]);
        return false;
      }

      console.log(
        `[useDownloadManager] Retry started successfully for video ${videoId}`,
      );
      return true;
    } catch (error) {
      console.error('[useDownloadManager] Error retrying download:', error);
      Alert.alert(i18n('error'), error.message || i18n('download_failed'), [
        { text: i18n('ok') },
      ]);
      return false;
    }
  };

  /**
   * Cancel current download
   * @returns {Promise<boolean>} Success status
   */
  const cancelDownload = async () => {
    try {
      console.log('[useDownloadManager] Cancelling current download');

      const downloadManager = DownloadManager.getInstance();

      if (!downloadManager.isDownloadActive()) {
        console.log('[useDownloadManager] No active download to cancel');
        return true;
      }

      const success = await downloadManager.cancelCurrentDownload();

      if (success) {
        console.log('[useDownloadManager] Download cancelled successfully');
      } else {
        console.error('[useDownloadManager] Failed to cancel download');
        Alert.alert(i18n('error'), 'Failed to cancel download', [
          { text: i18n('ok') },
        ]);
      }

      return success;
    } catch (error) {
      console.error('[useDownloadManager] Error cancelling download:', error);
      Alert.alert(i18n('error'), error.message || 'Failed to cancel download', [
        { text: i18n('ok') },
      ]);
      return false;
    }
  };

  /**
   * Get current download information
   * @returns {Object|null} Current download info or null
   */
  const getCurrentDownloadInfo = () => {
    try {
      const downloadManager = DownloadManager.getInstance();
      const currentDownload = downloadManager.getCurrentDownload();

      if (currentDownload) {
        console.log(
          `[useDownloadManager] Current download: Video ${currentDownload.id}`,
        );
        return {
          video: currentDownload,
          isActive: true,
        };
      } else {
        return {
          video: null,
          isActive: false,
        };
      }
    } catch (error) {
      console.error(
        '[useDownloadManager] Error getting current download info:',
        error,
      );
      return {
        video: null,
        isActive: false,
      };
    }
  };

  /**
   * Check if download is currently active
   * @returns {boolean} True if download is active
   */
  const isDownloadActive = () => {
    try {
      const downloadManager = DownloadManager.getInstance();
      const isActive = downloadManager.isDownloadActive();
      console.log(`[useDownloadManager] Download active status: ${isActive}`);
      return isActive;
    } catch (error) {
      console.error(
        '[useDownloadManager] Error checking download status:',
        error,
      );
      return false;
    }
  };

  /**
   * Get number of videos in download queue
   * @returns {number} Queue length
   */
  const getQueueLength = () => {
    try {
      const downloadManager = DownloadManager.getInstance();
      const queueLength = downloadManager.getQueueLength();
      console.log(`[useDownloadManager] Queue length: ${queueLength}`);
      return queueLength;
    } catch (error) {
      console.error('[useDownloadManager] Error getting queue length:', error);
      return 0;
    }
  };

  // Return hook interface
  return {
    // Download operations
    startSequentialDownloads,
    retryDownload,
    cancelDownload,

    // Status queries
    getCurrentDownloadInfo,
    isDownloadActive,
    getQueueLength,
  };
};
