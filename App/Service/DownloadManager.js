import RNFS from 'react-native-fs';
import FileSystemService from './FileSystemService';
import LocalStorageService from './LocalStorageService';

/**
 * DownloadManager - Singleton service for sequential video downloads
 *
 * CRITICAL REQUIREMENTS:
 * - Downloads videos ONE BY ONE (sequential, not parallel)
 * - Downloads from TOP TO BOTTOM by video ID (0 → 1 → 2 → 3)
 * - Tracks real-time progress (0-100%)
 * - Handles errors and failures gracefully
 * - Integrates with Redux for state updates
 * - Validates storage space before downloading
 *
 * STATE FLOW:
 * NEW → DOWNLOADING → DOWNLOADED/FAILED
 */

class DownloadManager {
  constructor() {
    if (DownloadManager.instance) {
      return DownloadManager.instance;
    }

    this.logPrefix = '[DownloadManager]';
    this.currentDownload = null; // Currently downloading video object
    this.downloadQueue = []; // Array of video objects to download
    this.isProcessing = false; // Flag to prevent multiple simultaneous processing
    this.progressCallback = null; // Callback for progress updates
    this.statusCallback = null; // Callback for status updates
    this.downloadJob = null; // Current RNFS download job (for cancellation)

    console.log(`${this.logPrefix} Initialized singleton instance`);
    DownloadManager.instance = this;
  }

  /**
   * Get singleton instance
   * @returns {DownloadManager} Singleton instance
   */
  static getInstance() {
    if (!DownloadManager.instance) {
      DownloadManager.instance = new DownloadManager();
    }
    return DownloadManager.instance;
  }

  /**
   * Set progress callback for Redux integration
   * @param {Function} callback - Function(videoId, progress)
   */
  setProgressCallback(callback) {
    if (typeof callback === 'function') {
      this.progressCallback = callback;
      console.log(`${this.logPrefix} Progress callback set`);
    } else {
      console.warn(`${this.logPrefix} Invalid progress callback provided`);
    }
  }

  /**
   * Set status callback for Redux integration
   * @param {Function} callback - Function(videoId, status)
   */
  setStatusCallback(callback) {
    if (typeof callback === 'function') {
      this.statusCallback = callback;
      console.log(`${this.logPrefix} Status callback set`);
    } else {
      console.warn(`${this.logPrefix} Invalid status callback provided`);
    }
  }

  /**
   * Start auto-download process for NEW videos
   * @param {Array} newVideos - Array of NEW video objects sorted by ID
   * @returns {Promise<boolean>} Success status
   */
  async startAutoDownload(newVideos) {
    try {
      console.log(`${this.logPrefix} Starting auto-download process`);

      // Validate input
      if (!Array.isArray(newVideos) || newVideos.length === 0) {
        console.log(`${this.logPrefix} No videos to download`);
        return true;
      }

      // Check if already processing
      if (this.isProcessing || this.currentDownload !== null) {
        console.warn(
          `${this.logPrefix} Download already in progress, cannot start new download`,
        );
        return false;
      }

      // Validate storage space before starting
      const hasStorage = await FileSystemService.isStorageSufficient();
      if (!hasStorage) {
        console.error(
          `${this.logPrefix} Insufficient storage space for downloads`,
        );
        return false;
      }

      // Sort videos by ID ascending (0 → 1 → 2 → 3)
      const sortedVideos = [...newVideos].sort((a, b) => {
        const idA = typeof a.id === 'number' ? a.id : parseInt(a.id, 10);
        const idB = typeof b.id === 'number' ? b.id : parseInt(b.id, 10);
        return idA - idB;
      });

      console.log(
        `${this.logPrefix} Sorted ${sortedVideos.length} videos for download:`,
        sortedVideos.map(v => v.id),
      );

      // Add to queue and start processing
      this.downloadQueue = sortedVideos;
      return await this.processQueue();
    } catch (error) {
      console.error(`${this.logPrefix} Error starting auto-download:`, error);
      this.isProcessing = false;
      return false;
    }
  }

  /**
   * Process download queue sequentially
   * @returns {Promise<boolean>} Success status
   */
  async processQueue() {
    try {
      if (this.isProcessing) {
        console.warn(`${this.logPrefix} Queue processing already active`);
        return false;
      }

      this.isProcessing = true;
      console.log(
        `${this.logPrefix} Starting queue processing with ${this.downloadQueue.length} videos`,
      );

      while (this.downloadQueue.length > 0) {
        // Get next video from queue
        const video = this.downloadQueue.shift();

        if (!video || typeof video.id === 'undefined') {
          console.warn(`${this.logPrefix} Invalid video in queue, skipping`);
          continue;
        }

        console.log(
          `${this.logPrefix} Processing video ${video.id}: ${video.name}`,
        );

        // Set current download
        this.currentDownload = video;

        // Update status to DOWNLOADING
        this._updateStatus(video.id, 'DOWNLOADING');

        // Attempt download
        const success = await this.downloadVideo(video);

        if (success) {
          console.log(
            `${this.logPrefix} Successfully downloaded video ${video.id}`,
          );
          this._updateStatus(video.id, 'DOWNLOADED');
        } else {
          console.error(
            `${this.logPrefix} Failed to download video ${video.id}`,
          );
          this._updateStatus(video.id, 'FAILED');
          // Continue with next video instead of stopping the queue
        }

        // Clear current download
        this.currentDownload = null;

        // Small delay between downloads to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      console.log(`${this.logPrefix} Queue processing completed`);
      this.isProcessing = false;
      return true;
    } catch (error) {
      console.error(`${this.logPrefix} Error processing queue:`, error);
      this.isProcessing = false;
      this.currentDownload = null;
      return false;
    }
  }

  /**
   * Download a single video
   * @param {Object} video - Video object to download
   * @returns {Promise<boolean>} Success status
   */
  async downloadVideo(video) {
    try {
      if (!video || !video.id) {
        throw new Error('Invalid video object provided');
      }

      console.log(`${this.logPrefix} Starting download for video ${video.id}`);

      // Generate file path
      const filePath = await FileSystemService.getVideoFilePath(
        video.id,
        'mp4',
      );

      // Check if file already exists
      const fileExists = await FileSystemService.checkFileExists(filePath);
      if (fileExists) {
        console.log(
          `${this.logPrefix} Video ${video.id} file already exists, skipping download`,
        );

        // Save metadata and mark as downloaded
        await LocalStorageService.saveVideoMetadata(video.id, {
          ...video,
          status: 'DOWNLOADED',
          localFilePath: filePath,
          downloadProgress: 100,
          downloadedAt: Date.now(),
        });

        return true;
      }

      // Create download URL (assuming API provides download URL)
      const downloadUrl = this._getVideoDownloadUrl(video);
      if (!downloadUrl) {
        throw new Error('No download URL available for video');
      }

      // Save initial metadata
      await LocalStorageService.saveVideoMetadata(video.id, {
        ...video,
        status: 'DOWNLOADING',
        localFilePath: filePath,
        downloadProgress: 0,
      });

      // Start download with progress tracking
      const downloadResult = await this._performDownload(
        video.id,
        downloadUrl,
        filePath,
      );

      if (downloadResult.success) {
        // Verify downloaded file
        const downloadedFileExists = await FileSystemService.checkFileExists(
          filePath,
        );
        if (!downloadedFileExists) {
          throw new Error('Downloaded file not found after completion');
        }

        // Update metadata with success
        await LocalStorageService.saveVideoMetadata(video.id, {
          ...video,
          status: 'DOWNLOADED',
          localFilePath: filePath,
          downloadProgress: 100,
          downloadedAt: Date.now(),
        });

        console.log(
          `${this.logPrefix} Successfully downloaded video ${video.id} to ${filePath}`,
        );
        return true;
      } else {
        // Clean up failed download
        await this._cleanupFailedDownload(video.id, filePath);
        return false;
      }
    } catch (error) {
      console.error(
        `${this.logPrefix} Error downloading video ${video.id}:`,
        error,
      );

      // Clean up on error
      if (video && video.id) {
        await this._cleanupFailedDownload(video.id, null);
      }

      return false;
    }
  }

  /**
   * Retry downloading a failed video
   * @param {Object} video - Video object to retry
   * @returns {Promise<boolean>} Success status
   */
  async retryDownload(video) {
    try {
      if (!video || !video.id) {
        throw new Error('Invalid video object for retry');
      }

      console.log(`${this.logPrefix} Retrying download for video ${video.id}`);

      // Check if another download is in progress
      if (this.currentDownload !== null || this.isProcessing) {
        console.warn(
          `${this.logPrefix} Cannot retry - another download in progress`,
        );
        return false;
      }

      // Validate storage space
      const hasStorage = await FileSystemService.isStorageSufficient();
      if (!hasStorage) {
        console.error(`${this.logPrefix} Insufficient storage for retry`);
        return false;
      }

      // Set as current download and process
      this.currentDownload = video;
      this._updateStatus(video.id, 'DOWNLOADING');

      const success = await this.downloadVideo(video);

      if (success) {
        this._updateStatus(video.id, 'DOWNLOADED');
      } else {
        this._updateStatus(video.id, 'FAILED');
      }

      this.currentDownload = null;
      return success;
    } catch (error) {
      console.error(`${this.logPrefix} Error retrying download:`, error);
      this.currentDownload = null;

      if (video && video.id) {
        this._updateStatus(video.id, 'FAILED');
      }

      return false;
    }
  }

  /**
   * Cancel current download
   * @returns {Promise<boolean>} Success status
   */
  async cancelCurrentDownload() {
    try {
      console.log(`${this.logPrefix} Cancelling current download`);

      if (this.downloadJob) {
        // Cancel RNFS download job
        this.downloadJob.promise.cancel();
        this.downloadJob = null;
        console.log(`${this.logPrefix} RNFS download job cancelled`);
      }

      if (this.currentDownload) {
        const videoId = this.currentDownload.id;

        // Clean up failed download
        const filePath = await FileSystemService.getVideoFilePath(
          videoId,
          'mp4',
        );
        await this._cleanupFailedDownload(videoId, filePath);

        this.currentDownload = null;
      }

      // Clear queue and reset processing
      this.downloadQueue = [];
      this.isProcessing = false;

      console.log(`${this.logPrefix} Download cancelled successfully`);
      return true;
    } catch (error) {
      console.error(`${this.logPrefix} Error cancelling download:`, error);
      return false;
    }
  }

  /**
   * Get current download info
   * @returns {Object|null} Current download info or null
   */
  getCurrentDownload() {
    return this.currentDownload;
  }

  /**
   * Check if download is active
   * @returns {boolean} True if download is active
   */
  isDownloadActive() {
    return this.currentDownload !== null || this.isProcessing;
  }

  /**
   * Get queue length
   * @returns {number} Number of videos in queue
   */
  getQueueLength() {
    return this.downloadQueue.length;
  }

  // Private methods

  /**
   * Perform actual download with progress tracking
   * @private
   */
  async _performDownload(videoId, downloadUrl, filePath) {
    return new Promise(resolve => {
      try {
        console.log(
          `${this.logPrefix} Starting RNFS download for video ${videoId}`,
        );

        const options = {
          fromUrl: downloadUrl,
          toFile: filePath,
          background: true,
          discretionary: true,
          progress: res => {
            try {
              if (res.contentLength > 0) {
                const progress = (res.bytesWritten / res.contentLength) * 100;
                const roundedProgress = Math.min(
                  Math.max(Math.round(progress), 0),
                  100,
                );

                // Update progress via callback
                this._updateProgress(videoId, roundedProgress);
              }
            } catch (progressError) {
              console.warn(
                `${this.logPrefix} Error updating progress:`,
                progressError,
              );
            }
          },
        };

        this.downloadJob = RNFS.downloadFile(options);

        this.downloadJob.promise
          .then(result => {
            this.downloadJob = null;

            if (result.statusCode === 200) {
              console.log(
                `${this.logPrefix} Download completed successfully for video ${videoId}`,
              );
              this._updateProgress(videoId, 100);
              resolve({ success: true });
            } else {
              console.error(
                `${this.logPrefix} Download failed with status ${result.statusCode}`,
              );
              resolve({ success: false, error: `HTTP ${result.statusCode}` });
            }
          })
          .catch(error => {
            this.downloadJob = null;
            console.error(
              `${this.logPrefix} Download error for video ${videoId}:`,
              error,
            );
            resolve({ success: false, error: error.message });
          });
      } catch (error) {
        console.error(`${this.logPrefix} Error setting up download:`, error);
        resolve({ success: false, error: error.message });
      }
    });
  }

  /**
   * Get video download URL
   * @private
   */
  _getVideoDownloadUrl(video) {
    try {
      // Check if video has filepath (from API response)
      if (video && video.filepath && typeof video.filepath === 'string') {
        // API returns relative path like "storage/media_files/1759859009304_videoplayback.mp4"
        // We need to construct full URL: https://api.redfynix.com/storage/media_files/1759859009304_videoplayback.mp4
        const baseUrl = 'https://api.redfynix.com/';
        const fullUrl = `${baseUrl}${video.filepath}`;

        console.log(
          `${this.logPrefix} Constructed download URL for video ${video.id}: ${fullUrl}`,
        );
        return fullUrl;
      }

      // Fallback: Check for video_url field (legacy support)
      if (video && video.video_url && typeof video.video_url === 'string') {
        console.log(
          `${this.logPrefix} Using video_url field for video ${video.id}: ${video.video_url}`,
        );
        return video.video_url;
      }

      // Fallback: Try to construct from ID (legacy method)
      if (video && video.id) {
        const fallbackUrl = `https://api.redfynix.com/api/v1/media-files/download/${video.id}`;
        console.log(
          `${this.logPrefix} Using fallback URL construction for video ${video.id}: ${fallbackUrl}`,
        );
        return fallbackUrl;
      }

      console.error(
        `${this.logPrefix} No valid video URL found for video:`,
        video,
      );
      return null;
    } catch (error) {
      console.error(
        `${this.logPrefix} Error constructing video download URL:`,
        error,
      );
      return null;
    }
  }

  /**
   * Update progress via callback
   * @private
   */
  _updateProgress(videoId, progress) {
    try {
      if (
        this.progressCallback &&
        typeof this.progressCallback === 'function'
      ) {
        this.progressCallback(videoId, progress);
      }
    } catch (error) {
      console.error(`${this.logPrefix} Error in progress callback:`, error);
    }
  }

  /**
   * Update status via callback (enhanced to include localFilePath for DOWNLOADED status)
   * @private
   */
  async _updateStatus(videoId, status) {
    try {
      if (this.statusCallback && typeof this.statusCallback === 'function') {
        // For DOWNLOADED status, also pass the localFilePath
        if (status === 'DOWNLOADED') {
          const filePath = await FileSystemService.getVideoFilePath(
            videoId,
            'mp4',
          );
          console.log(
            `${this.logPrefix} Download completed for video ${videoId}, file path: ${filePath}`,
          );
          this.statusCallback(videoId, status, filePath);
        } else {
          this.statusCallback(videoId, status);
        }
      }
    } catch (error) {
      console.error(`${this.logPrefix} Error in status callback:`, error);
    }
  }

  /**
   * Clean up failed download
   * @private
   */
  async _cleanupFailedDownload(videoId, filePath) {
    try {
      // Delete partial file if it exists
      if (filePath) {
        const fileExists = await FileSystemService.checkFileExists(filePath);
        if (fileExists) {
          await FileSystemService.deleteVideoFile(filePath);
          console.log(
            `${this.logPrefix} Cleaned up partial file for video ${videoId}`,
          );
        }
      }

      // Update metadata to failed status
      await LocalStorageService.updateVideoStatus(videoId, 'FAILED');
      console.log(`${this.logPrefix} Marked video ${videoId} as FAILED`);
    } catch (error) {
      console.error(
        `${this.logPrefix} Error cleaning up failed download:`,
        error,
      );
    }
  }
}

// Singleton instance
let instance = null;

export default {
  getInstance: () => {
    if (!instance) {
      instance = new DownloadManager();
    }
    return instance;
  },
};
