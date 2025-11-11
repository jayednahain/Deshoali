import { useEffect } from 'react';
import { Alert } from 'react-native';
import { useDispatch } from 'react-redux';
import {
  setCurrentDownload,
  setDownloadError,
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
    const downloadManager = DownloadManager.getInstance();

    // Set progress callback - updates Redux state for real-time UI updates
    downloadManager.setProgressCallback((videoId, progress) => {
      try {
        if (typeof videoId === 'number' && typeof progress === 'number') {
          dispatch(updateDownloadProgress({ videoId, progress }));
        }
      } catch (error) {
        console.error(
          '[useDownloadManager] Error in progress callback:',
          error,
        );
      }
    });

    // Set status callback - updates Redux state for status changes
    downloadManager.setStatusCallback(
      (videoId, status, filePath, errorMessage) => {
        try {
          if (typeof videoId === 'number' && typeof status === 'string') {
            // Update video status in Redux
            dispatch(updateVideoStatus({ videoId, status }));

            // Update current download tracking
            if (status === 'DOWNLOADING') {
              dispatch(setCurrentDownload(videoId));
            } else if (status === 'DOWNLOADED' || status === 'FAILED') {
              dispatch(setCurrentDownload(null));
            }

            // Handle error states - dispatch error modal
            if (status === 'PAUSED') {
              // Network pause - show error modal with "will resume" message
              dispatch(
                setDownloadError({
                  errorMessage:
                    errorMessage ||
                    'Download paused. Will resume when network is available.',
                  errorType: 'NETWORK',
                  videoId,
                  videoName: `Video ${videoId}`,
                }),
              );
            } else if (status === 'FAILED') {
              // Download failure - show error modal
              dispatch(
                setDownloadError({
                  errorMessage:
                    errorMessage || 'Download failed. Please try again.',
                  errorType: 'UNKNOWN',
                  videoId,
                  videoName: `Video ${videoId}`,
                }),
              );
            }
          }
        } catch (error) {
          console.error(
            '[useDownloadManager] Error in status callback:',
            error,
          );
        }
      },
    );

    // Cleanup function (though callbacks persist for singleton lifecycle)
    return () => {};
  }, [dispatch]); // Only re-run if dispatch changes (shouldn't happen)

  /**
   * Start sequential downloads for new videos
   * @param {Array} newVideos - Array of NEW video objects
   * @returns {Promise<boolean>} Success status
   */
  const startSequentialDownloads = async newVideos => {
    try {
      // Validate input
      if (!Array.isArray(newVideos)) {
        Alert.alert(i18n('error'), 'Invalid videos list provided', [
          { text: i18n('ok') },
        ]);
        return false;
      }

      if (newVideos.length === 0) {
        return true;
      }

      // Validate each video object
      const validVideos = newVideos.filter(video => {
        if (!video || typeof video.id !== 'number' || !video.name) {
          return false;
        }
        return true;
      });

      if (validVideos.length === 0) {
        Alert.alert(i18n('error'), 'No valid videos found for download', [
          { text: i18n('ok') },
        ]);
        return false;
      }

      // Check if download is already active
      const downloadManager = DownloadManager.getInstance();
      if (downloadManager.isDownloadActive()) {
        Alert.alert(
          i18n('download_in_progress'),
          i18n('download_in_progress_message'),
          [{ text: i18n('ok') }],
        );
        return false;
      }

      // Start download process
      const success = await downloadManager.startAutoDownload(validVideos);

      if (!success) {
        Alert.alert(i18n('error'), i18n('download_failed'), [
          { text: i18n('ok') },
        ]);
        return false;
      }

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
      // Validate parameters
      if (typeof videoId !== 'number') {
        Alert.alert(i18n('error'), 'Invalid video ID provided', [
          { text: i18n('ok') },
        ]);
        return false;
      }

      if (!videoData || typeof videoData !== 'object' || !videoData.name) {
        Alert.alert(i18n('error'), 'Invalid video data provided', [
          { text: i18n('ok') },
        ]);
        return false;
      }

      // Check if another download is active
      const downloadManager = DownloadManager.getInstance();
      if (downloadManager.isDownloadActive()) {
        Alert.alert(
          i18n('download_in_progress'),
          i18n('download_in_progress_message'),
          [{ text: i18n('ok') }],
        );
        return false;
      }

      // Start retry
      const success = await downloadManager.retryDownload(videoData);

      if (!success) {
        Alert.alert(i18n('error'), i18n('download_failed'), [
          { text: i18n('ok') },
        ]);
        return false;
      }

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
      const downloadManager = DownloadManager.getInstance();

      if (!downloadManager.isDownloadActive()) {
        return true;
      }

      const success = await downloadManager.cancelCurrentDownload();

      if (!success) {
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
