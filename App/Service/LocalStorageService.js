import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * LocalStorageService - Manages AsyncStorage operations for video metadata and app configuration
 *
 * Video Metadata Structure:
 * {
 *   id: number,
 *   name: string,
 *   filetype: string,
 *   filesize: string,
 *   file_duration: string,
 *   description: string,
 *   status: 'NEW' | 'DOWNLOADING' | 'DOWNLOADED' | 'FAILED',
 *   localFilePath: string,
 *   downloadProgress: number (0-100),
 *   downloadedAt: timestamp,
 *   failedAt: timestamp,
 *   errorMessage: string
 * }
 */

const STORAGE_KEYS = {
  VIDEO_METADATA: 'video_metadata_',
  ALL_VIDEOS: 'all_local_videos',
  APP_CONFIG: 'app_config',
};

class LocalStorageService {
  constructor() {
    this.logPrefix = '[LocalStorageService]';
  }

  /**
   * Save individual video metadata to AsyncStorage
   * @param {number} videoId - Unique video identifier
   * @param {Object} videoData - Complete video metadata object
   * @returns {Promise<boolean>} Success status
   */
  async saveVideoMetadata(videoId, videoData) {
    try {
      if (!videoId || typeof videoId !== 'number') {
        throw new Error('Invalid videoId provided');
      }

      if (!videoData || typeof videoData !== 'object') {
        throw new Error('Invalid videoData provided');
      }

      console.log(`${this.logPrefix} Saving metadata for video ${videoId}`);

      // Ensure required fields exist
      const metadataToSave = {
        id: videoId,
        name: videoData.name || 'Unknown Video',
        filetype: videoData.filetype || 'video/mp4',
        filesize: videoData.filesize || '0',
        file_duration: videoData.file_duration || '0',
        description: videoData.description || '',
        status: videoData.status || 'NEW',
        localFilePath: videoData.localFilePath || null,
        downloadProgress: videoData.downloadProgress || 0,
        downloadedAt: videoData.downloadedAt || null,
        failedAt: videoData.failedAt || null,
        errorMessage: videoData.errorMessage || null,
        updatedAt: Date.now(),
      };

      // Save individual video metadata
      const videoKey = STORAGE_KEYS.VIDEO_METADATA + videoId;
      await AsyncStorage.setItem(videoKey, JSON.stringify(metadataToSave));

      // Update the all videos index
      await this._updateAllVideosIndex(videoId, metadataToSave);

      console.log(
        `${this.logPrefix} Successfully saved metadata for video ${videoId}`,
      );
      return true;
    } catch (error) {
      console.error(`${this.logPrefix} Error saving video metadata:`, error);
      return false;
    }
  }

  /**
   * Get metadata for a specific video
   * @param {number} videoId - Video identifier
   * @returns {Promise<Object|null>} Video metadata or null if not found
   */
  async getVideoMetadata(videoId) {
    try {
      if (!videoId || typeof videoId !== 'number') {
        console.warn(`${this.logPrefix} Invalid videoId provided: ${videoId}`);
        return null;
      }

      console.log(`${this.logPrefix} Getting metadata for video ${videoId}`);

      const videoKey = STORAGE_KEYS.VIDEO_METADATA + videoId;
      const metadataString = await AsyncStorage.getItem(videoKey);

      if (!metadataString) {
        console.log(`${this.logPrefix} No metadata found for video ${videoId}`);
        return null;
      }

      const metadata = JSON.parse(metadataString);
      console.log(
        `${this.logPrefix} Retrieved metadata for video ${videoId}:`,
        {
          id: metadata.id,
          status: metadata.status,
          progress: metadata.downloadProgress,
        },
      );

      return metadata;
    } catch (error) {
      console.error(`${this.logPrefix} Error getting video metadata:`, error);
      return null;
    }
  }

  /**
   * Get all local videos metadata
   * @returns {Promise<Object>} Map of video IDs to metadata {videoId: videoData}
   */
  async getAllLocalVideos() {
    try {
      console.log(`${this.logPrefix} Getting all local videos`);

      const allVideosString = await AsyncStorage.getItem(
        STORAGE_KEYS.ALL_VIDEOS,
      );

      if (!allVideosString) {
        console.log(`${this.logPrefix} No local videos found`);
        return {};
      }

      const allVideos = JSON.parse(allVideosString);
      console.log(
        `${this.logPrefix} Retrieved ${
          Object.keys(allVideos).length
        } local videos`,
      );

      return allVideos;
    } catch (error) {
      console.error(`${this.logPrefix} Error getting all local videos:`, error);
      return {};
    }
  }

  /**
   * Update video status
   * @param {number} videoId - Video identifier
   * @param {string} status - New status (NEW/DOWNLOADING/DOWNLOADED/FAILED)
   * @returns {Promise<boolean>} Success status
   */
  async updateVideoStatus(videoId, status) {
    try {
      if (!videoId || typeof videoId !== 'number') {
        throw new Error('Invalid videoId provided');
      }

      const validStatuses = ['NEW', 'DOWNLOADING', 'DOWNLOADED', 'FAILED'];
      if (!validStatuses.includes(status)) {
        throw new Error(
          `Invalid status: ${status}. Must be one of: ${validStatuses.join(
            ', ',
          )}`,
        );
      }

      console.log(
        `${this.logPrefix} Updating video ${videoId} status to ${status}`,
      );

      const existingMetadata = await this.getVideoMetadata(videoId);
      if (!existingMetadata) {
        console.warn(
          `${this.logPrefix} Cannot update status - video ${videoId} not found`,
        );
        return false;
      }

      const updatedMetadata = {
        ...existingMetadata,
        status,
        updatedAt: Date.now(),
      };

      // Add timestamp for specific states
      if (status === 'DOWNLOADED') {
        updatedMetadata.downloadedAt = Date.now();
        updatedMetadata.downloadProgress = 100;
        updatedMetadata.failedAt = null;
        updatedMetadata.errorMessage = null;
      } else if (status === 'FAILED') {
        updatedMetadata.failedAt = Date.now();
        updatedMetadata.downloadedAt = null;
      } else if (status === 'DOWNLOADING') {
        updatedMetadata.failedAt = null;
        updatedMetadata.errorMessage = null;
      }

      return await this.saveVideoMetadata(videoId, updatedMetadata);
    } catch (error) {
      console.error(`${this.logPrefix} Error updating video status:`, error);
      return false;
    }
  }

  /**
   * Update video download progress
   * @param {number} videoId - Video identifier
   * @param {number} progress - Progress percentage (0-100)
   * @returns {Promise<boolean>} Success status
   */
  async updateVideoProgress(videoId, progress) {
    try {
      if (!videoId || typeof videoId !== 'number') {
        throw new Error('Invalid videoId provided');
      }

      if (typeof progress !== 'number' || progress < 0 || progress > 100) {
        throw new Error('Progress must be a number between 0 and 100');
      }

      const existingMetadata = await this.getVideoMetadata(videoId);
      if (!existingMetadata) {
        console.warn(
          `${this.logPrefix} Cannot update progress - video ${videoId} not found`,
        );
        return false;
      }

      const updatedMetadata = {
        ...existingMetadata,
        downloadProgress: progress,
        updatedAt: Date.now(),
      };

      return await this.saveVideoMetadata(videoId, updatedMetadata);
    } catch (error) {
      console.error(`${this.logPrefix} Error updating video progress:`, error);
      return false;
    }
  }

  /**
   * Remove local video metadata (alias for removeVideoMetadata for consistency)
   * @param {number} videoId - Video identifier
   * @returns {Promise<boolean>} Success status
   */
  async removeLocalVideo(videoId) {
    return await this.removeVideoMetadata(videoId);
  }

  /**
   * Remove video metadata from storage
   * @param {number} videoId - Video identifier
   * @returns {Promise<boolean>} Success status
   */
  async removeVideoMetadata(videoId) {
    try {
      if (!videoId || typeof videoId !== 'number') {
        throw new Error('Invalid videoId provided');
      }

      console.log(`${this.logPrefix} Removing metadata for video ${videoId}`);

      // Remove individual video metadata
      const videoKey = STORAGE_KEYS.VIDEO_METADATA + videoId;
      await AsyncStorage.removeItem(videoKey);

      // Update all videos index
      await this._removeFromAllVideosIndex(videoId);

      console.log(
        `${this.logPrefix} Successfully removed metadata for video ${videoId}`,
      );
      return true;
    } catch (error) {
      console.error(`${this.logPrefix} Error removing video metadata:`, error);
      return false;
    }
  }

  /**
   * Clear all video metadata (for testing purposes)
   * @returns {Promise<boolean>} Success status
   */
  async clearAllVideos() {
    try {
      console.log(`${this.logPrefix} Clearing all video metadata`);

      // Get all video keys
      const allKeys = await AsyncStorage.getAllKeys();
      const videoKeys = allKeys.filter(key =>
        key.startsWith(STORAGE_KEYS.VIDEO_METADATA),
      );

      // Remove all video metadata
      if (videoKeys.length > 0) {
        await AsyncStorage.multiRemove(videoKeys);
      }

      // Clear the index
      await AsyncStorage.removeItem(STORAGE_KEYS.ALL_VIDEOS);

      console.log(
        `${this.logPrefix} Successfully cleared ${videoKeys.length} video metadata entries`,
      );
      return true;
    } catch (error) {
      console.error(`${this.logPrefix} Error clearing all videos:`, error);
      return false;
    }
  }

  /**
   * Save app configuration
   * @param {Object} config - App configuration object
   * @returns {Promise<boolean>} Success status
   */
  async saveAppConfig(config) {
    try {
      if (!config || typeof config !== 'object') {
        throw new Error('Invalid config provided');
      }

      console.log(`${this.logPrefix} Saving app config`);

      const configToSave = {
        ...config,
        updatedAt: Date.now(),
      };

      await AsyncStorage.setItem(
        STORAGE_KEYS.APP_CONFIG,
        JSON.stringify(configToSave),
      );

      console.log(`${this.logPrefix} Successfully saved app config`);
      return true;
    } catch (error) {
      console.error(`${this.logPrefix} Error saving app config:`, error);
      return false;
    }
  }

  /**
   * Get app configuration
   * @returns {Promise<Object|null>} App configuration or null
   */
  async getAppConfig() {
    try {
      console.log(`${this.logPrefix} Getting app config`);

      const configString = await AsyncStorage.getItem(STORAGE_KEYS.APP_CONFIG);

      if (!configString) {
        console.log(`${this.logPrefix} No app config found`);
        return null;
      }

      const config = JSON.parse(configString);
      console.log(`${this.logPrefix} Retrieved app config`);

      return config;
    } catch (error) {
      console.error(`${this.logPrefix} Error getting app config:`, error);
      return null;
    }
  }

  /**
   * Private method to update the all videos index
   * @param {number} videoId - Video identifier
   * @param {Object} metadata - Video metadata
   */
  async _updateAllVideosIndex(videoId, metadata) {
    try {
      const allVideos = await this.getAllLocalVideos();
      allVideos[videoId] = metadata;

      await AsyncStorage.setItem(
        STORAGE_KEYS.ALL_VIDEOS,
        JSON.stringify(allVideos),
      );
    } catch (error) {
      console.error(
        `${this.logPrefix} Error updating all videos index:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Private method to remove from all videos index
   * @param {number} videoId - Video identifier
   */
  async _removeFromAllVideosIndex(videoId) {
    try {
      const allVideos = await this.getAllLocalVideos();
      delete allVideos[videoId];

      await AsyncStorage.setItem(
        STORAGE_KEYS.ALL_VIDEOS,
        JSON.stringify(allVideos),
      );
    } catch (error) {
      console.error(
        `${this.logPrefix} Error removing from all videos index:`,
        error,
      );
      throw error;
    }
  }
}

// Export singleton instance
const localStorageService = new LocalStorageService();
export default localStorageService;
