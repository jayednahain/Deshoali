import RNFS from 'react-native-fs';
import databaseManager, { DB_KEYS } from '../../DBConfig';

/**
 * Video download status constants
 */
export const DOWNLOAD_STATUS = {
  PENDING: 'pending',
  DOWNLOADING: 'downloading',
  COMPLETED: 'completed',
  FAILED: 'failed',
  PAUSED: 'paused',
};

/**
 * Download Manager Class
 * Handles video downloading, progress tracking, and file management
 */
class VideoDownloadManager {
  constructor() {
    this.downloadQueue = [];
    this.currentDownload = null;
    this.isDownloading = false;
    this.downloadDirectory = `${RNFS.DocumentDirectoryPath}/videos`;
    this.progressCallbacks = new Map();
    this.statusCallbacks = new Map();

    // Log storage paths for debugging
    console.log('=== VIDEO STORAGE PATHS ===');
    console.log('Documents Directory:', RNFS.DocumentDirectoryPath);
    console.log('Cache Directory:', RNFS.CachesDirectoryPath);
    console.log('Download Directory:', RNFS.DownloadDirectoryPath);
    console.log('Videos Storage Path:', this.downloadDirectory);
    console.log('=========================');

    this.initializeDownloadDirectory();
  }

  /**
   * Initialize download directory
   */
  async initializeDownloadDirectory() {
    try {
      const exists = await RNFS.exists(this.downloadDirectory);
      if (!exists) {
        await RNFS.mkdir(this.downloadDirectory);
        console.log('✅ Download directory created:', this.downloadDirectory);
      } else {
        console.log(
          '✅ Download directory already exists:',
          this.downloadDirectory,
        );

        // List existing files for debugging
        try {
          const files = await RNFS.readDir(this.downloadDirectory);
          console.log(`📁 Found ${files.length} files in download directory:`);
          files.forEach((file, index) => {
            console.log(`  ${index + 1}. ${file.name} (${file.size} bytes)`);
          });
        } catch (listError) {
          console.log(
            '📁 Directory exists but cannot list files:',
            listError.message,
          );
        }
      }
    } catch (error) {
      console.error('❌ Error creating download directory:', error);
    }
  }

  /**
   * Generate unique filename for video
   * @param {Object} video - Video object
   * @returns {string} - Unique filename
   */
  generateFileName(video) {
    const videoId = video.id || video.title.replace(/[^a-zA-Z0-9]/g, '_');
    const extension = this.getFileExtension(video.sources[0]) || 'mp4';
    return `${videoId}.${extension}`;
  }

  /**
   * Get file extension from URL
   * @param {string} url - Video URL
   * @returns {string} - File extension
   */
  getFileExtension(url) {
    return url.split('.').pop()?.split('?')[0] || 'mp4';
  }

  /**
   * Get local file path for video
   * @param {Object} video - Video object
   * @returns {string} - Local file path
   */
  getLocalFilePath(video) {
    const fileName = this.generateFileName(video);
    return `${this.downloadDirectory}/${fileName}`;
  }

  /**
   * Check if video is already downloaded
   * @param {Object} video - Video object
   * @returns {Promise<boolean>} - Whether video exists locally
   */
  async isVideoDownloaded(video) {
    try {
      const filePath = this.getLocalFilePath(video);
      const exists = await RNFS.exists(filePath);

      if (exists) {
        // Also check if file is not empty
        const stat = await RNFS.stat(filePath);
        return stat.size > 0;
      }
      return false;
    } catch (error) {
      console.error('Error checking if video is downloaded:', error);
      return false;
    }
  }

  /**
   * Get video download status
   * @param {string} videoId - Video ID
   * @returns {Promise<Object>} - Download status object
   */
  async getVideoStatus(videoId) {
    try {
      const statusKey = `${DB_KEYS.VIDEO_STATUS}_${videoId}`;
      const status = await databaseManager.getData(statusKey);
      return (
        status || {
          status: DOWNLOAD_STATUS.PENDING,
          progress: 0,
          filePath: null,
          downloadedAt: null,
        }
      );
    } catch (error) {
      console.error('Error getting video status:', error);
      return {
        status: DOWNLOAD_STATUS.PENDING,
        progress: 0,
        filePath: null,
        downloadedAt: null,
      };
    }
  }

  /**
   * Update video download status
   * @param {string} videoId - Video ID
   * @param {Object} statusUpdate - Status update object
   * @returns {Promise<boolean>} - Success status
   */
  async updateVideoStatus(videoId, statusUpdate) {
    try {
      const statusKey = `${DB_KEYS.VIDEO_STATUS}_${videoId}`;
      const currentStatus = await this.getVideoStatus(videoId);
      const newStatus = { ...currentStatus, ...statusUpdate };

      await databaseManager.setData(statusKey, newStatus);

      // Notify status callbacks
      if (this.statusCallbacks.has(videoId)) {
        this.statusCallbacks.get(videoId).forEach(callback => {
          callback(newStatus);
        });
      }

      return true;
    } catch (error) {
      console.error('Error updating video status:', error);
      return false;
    }
  }

  /**
   * Add video to download queue
   * @param {Object} video - Video object
   * @returns {Promise<boolean>} - Success status
   */
  async addToQueue(video) {
    try {
      const videoId = video.id || video.title;

      // Check if already downloaded
      if (await this.isVideoDownloaded(video)) {
        await this.updateVideoStatus(videoId, {
          status: DOWNLOAD_STATUS.COMPLETED,
          progress: 100,
          filePath: this.getLocalFilePath(video),
        });
        return true;
      }

      // Check if already in queue
      const existingIndex = this.downloadQueue.findIndex(
        item => (item.id || item.title) === videoId,
      );

      if (existingIndex === -1) {
        this.downloadQueue.push(video);
        await this.updateVideoStatus(videoId, {
          status: DOWNLOAD_STATUS.PENDING,
          progress: 0,
        });
      }

      // Start downloading if not already downloading
      if (!this.isDownloading) {
        this.processQueue();
      }

      return true;
    } catch (error) {
      console.error('Error adding video to queue:', error);
      return false;
    }
  }

  /**
   * Process download queue
   */
  async processQueue() {
    if (this.isDownloading || this.downloadQueue.length === 0) {
      return;
    }

    this.isDownloading = true;

    while (this.downloadQueue.length > 0) {
      const video = this.downloadQueue.shift();
      await this.downloadVideo(video);
    }

    this.isDownloading = false;
  }

  /**
   * Download a single video
   * @param {Object} video - Video object
   * @returns {Promise<boolean>} - Success status
   */
  async downloadVideo(video) {
    const videoId = video.id || video.title;
    const filePath = this.getLocalFilePath(video);

    try {
      this.currentDownload = video;

      await this.updateVideoStatus(videoId, {
        status: DOWNLOAD_STATUS.DOWNLOADING,
        progress: 0,
      });

      // Create download job
      const downloadJob = RNFS.downloadFile({
        fromUrl: video.sources[0],
        toFile: filePath,
        progress: res => {
          const progress = Math.round(
            (res.bytesWritten / res.contentLength) * 100,
          );

          // Update status with progress
          this.updateVideoStatus(videoId, {
            status: DOWNLOAD_STATUS.DOWNLOADING,
            progress: progress,
          });

          // Notify progress callbacks
          if (this.progressCallbacks.has(videoId)) {
            this.progressCallbacks.get(videoId).forEach(callback => {
              callback(progress);
            });
          }
        },
      });

      const result = await downloadJob.promise;

      if (result.statusCode === 200) {
        await this.updateVideoStatus(videoId, {
          status: DOWNLOAD_STATUS.COMPLETED,
          progress: 100,
          filePath: filePath,
          downloadedAt: new Date().toISOString(),
        });

        console.log('✅ Download completed:', video.title);
        console.log('📁 File saved to:', filePath);

        // Log file size for verification
        try {
          const stat = await RNFS.stat(filePath);
          console.log('📊 File size:', stat.size, 'bytes');
        } catch (statError) {
          console.log('⚠️ Could not get file stats:', statError.message);
        }

        return true;
      } else {
        throw new Error(
          `Download failed with status code: ${result.statusCode}`,
        );
      }
    } catch (error) {
      console.error('Download error for video:', video.title, error);

      await this.updateVideoStatus(videoId, {
        status: DOWNLOAD_STATUS.FAILED,
        error: error.message,
      });

      // Remove incomplete file
      try {
        const exists = await RNFS.exists(filePath);
        if (exists) {
          await RNFS.unlink(filePath);
        }
      } catch (cleanupError) {
        console.error('Error cleaning up incomplete file:', cleanupError);
      }

      return false;
    } finally {
      this.currentDownload = null;
    }
  }

  /**
   * Cancel current download
   */
  async cancelCurrentDownload() {
    if (this.currentDownload) {
      const videoId = this.currentDownload.id || this.currentDownload.title;

      try {
        // Update status to pending (will restart from 0%)
        await this.updateVideoStatus(videoId, {
          status: DOWNLOAD_STATUS.PENDING,
          progress: 0,
        });

        // Clean up incomplete file
        const filePath = this.getLocalFilePath(this.currentDownload);
        const exists = await RNFS.exists(filePath);
        if (exists) {
          await RNFS.unlink(filePath);
        }

        this.currentDownload = null;
        this.isDownloading = false;

        console.log('Download cancelled for:', videoId);
      } catch (error) {
        console.error('Error cancelling download:', error);
      }
    }
  }

  /**
   * Clear all download data (for app restart logic)
   */
  async clearDownloadStates() {
    try {
      const keys = await databaseManager.getAllKeys();
      const statusKeys = keys.filter(key =>
        key.startsWith(DB_KEYS.VIDEO_STATUS),
      );

      for (const key of statusKeys) {
        const status = await databaseManager.getData(key);
        if (status && status.status === DOWNLOAD_STATUS.DOWNLOADING) {
          // Reset downloading videos to pending
          await databaseManager.setData(key, {
            ...status,
            status: DOWNLOAD_STATUS.PENDING,
            progress: 0,
          });
        }
      }

      this.downloadQueue = [];
      this.currentDownload = null;
      this.isDownloading = false;

      console.log('Download states cleared for app restart');
    } catch (error) {
      console.error('Error clearing download states:', error);
    }
  }

  /**
   * Subscribe to download progress updates
   * @param {string} videoId - Video ID
   * @param {Function} callback - Progress callback
   */
  subscribeToProgress(videoId, callback) {
    if (!this.progressCallbacks.has(videoId)) {
      this.progressCallbacks.set(videoId, []);
    }
    this.progressCallbacks.get(videoId).push(callback);
  }

  /**
   * Subscribe to status updates
   * @param {string} videoId - Video ID
   * @param {Function} callback - Status callback
   */
  subscribeToStatus(videoId, callback) {
    if (!this.statusCallbacks.has(videoId)) {
      this.statusCallbacks.set(videoId, []);
    }
    this.statusCallbacks.get(videoId).push(callback);
  }

  /**
   * Unsubscribe from callbacks
   * @param {string} videoId - Video ID
   */
  unsubscribe(videoId) {
    this.progressCallbacks.delete(videoId);
    this.statusCallbacks.delete(videoId);
  }

  /**
   * Get download statistics
   * @returns {Promise<Object>} - Download statistics
   */
  async getDownloadStats() {
    try {
      const keys = await databaseManager.getAllKeys();
      const statusKeys = keys.filter(key =>
        key.startsWith(DB_KEYS.VIDEO_STATUS),
      );

      const stats = {
        total: statusKeys.length,
        completed: 0,
        downloading: 0,
        pending: 0,
        failed: 0,
      };

      for (const key of statusKeys) {
        const status = await databaseManager.getData(key);
        if (status) {
          stats[status.status] = (stats[status.status] || 0) + 1;
        }
      }

      return stats;
    } catch (error) {
      console.error('Error getting download stats:', error);
      return { total: 0, completed: 0, downloading: 0, pending: 0, failed: 0 };
    }
  }
}

// Export singleton instance
const videoDownloadManager = new VideoDownloadManager();
export default videoDownloadManager;
