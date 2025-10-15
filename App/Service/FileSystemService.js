import { Platform } from 'react-native';
import RNFS from 'react-native-fs';

/**
 * FileSystemService - Manages file system operations for video storage
 *
 * Handles:
 * - Video directory creation and management
 * - File existence verification
 * - Storage space validation (minimum 1GB requirement)
 * - File deletion and cleanup
 * - Cross-platform file path handling
 */

const STORAGE_REQUIREMENTS = {
  MIN_STORAGE_KB: 1000000, // 1GB = 1,000,000 KB
  VIDEO_FOLDER_NAME: 'DeshoaliVideos',
};

class FileSystemService {
  constructor() {
    this.logPrefix = '[FileSystemService]';
    this.videoDirectoryPath = null;
  }

  /**
   * Get the storage path for videos
   * @returns {Promise<string>} Path to video storage directory
   */
  async getStoragePath() {
    try {
      if (this.videoDirectoryPath) {
        return this.videoDirectoryPath;
      }

      // Use DocumentDirectoryPath for both iOS and Android for consistency
      const basePath =
        Platform.OS === 'ios'
          ? RNFS.DocumentDirectoryPath
          : RNFS.DocumentDirectoryPath;

      this.videoDirectoryPath = `${basePath}/${STORAGE_REQUIREMENTS.VIDEO_FOLDER_NAME}`;

      console.log(
        `${this.logPrefix} Video directory path: ${this.videoDirectoryPath}`,
      );
      return this.videoDirectoryPath;
    } catch (error) {
      console.error(`${this.logPrefix} Error getting storage path:`, error);
      throw error;
    }
  }

  /**
   * Initialize video directory - create if doesn't exist
   * @returns {Promise<boolean>} Success status
   */
  async initializeVideoDirectory() {
    try {
      console.log(`${this.logPrefix} Initializing video directory`);

      const directoryPath = await this.getStoragePath();

      // Check if directory exists
      const directoryExists = await RNFS.exists(directoryPath);

      if (!directoryExists) {
        console.log(
          `${this.logPrefix} Creating video directory at: ${directoryPath}`,
        );
        await RNFS.mkdir(directoryPath);
        console.log(`${this.logPrefix} Video directory created successfully`);
      } else {
        console.log(`${this.logPrefix} Video directory already exists`);
      }

      // Verify directory is accessible
      const stats = await RNFS.stat(directoryPath);
      if (!stats.isDirectory()) {
        throw new Error('Video path exists but is not a directory');
      }

      console.log(`${this.logPrefix} Video directory initialized successfully`);
      return true;
    } catch (error) {
      console.error(
        `${this.logPrefix} Error initializing video directory:`,
        error,
      );
      return false;
    }
  }

  /**
   * Check if a file exists
   * @param {string} filePath - Full path to the file
   * @returns {Promise<boolean>} True if file exists
   */
  async checkFileExists(filePath) {
    try {
      if (!filePath || typeof filePath !== 'string') {
        console.warn(
          `${this.logPrefix} Invalid file path provided: ${filePath}`,
        );
        return false;
      }

      console.log(`${this.logPrefix} Checking file existence: ${filePath}`);

      const exists = await RNFS.exists(filePath);

      if (exists) {
        // Additional check - ensure it's actually a file, not a directory
        const stats = await RNFS.stat(filePath);
        const isFile = stats.isFile();

        console.log(`${this.logPrefix} File exists and is valid: ${isFile}`);
        return isFile;
      }

      console.log(`${this.logPrefix} File does not exist`);
      return false;
    } catch (error) {
      console.error(`${this.logPrefix} Error checking file existence:`, error);
      return false;
    }
  }

  /**
   * Delete a video file
   * @param {string} filePath - Full path to the video file
   * @returns {Promise<boolean>} Success status
   */
  async deleteVideoFile(filePath) {
    try {
      if (!filePath || typeof filePath !== 'string') {
        throw new Error('Invalid file path provided');
      }

      console.log(`${this.logPrefix} Deleting video file: ${filePath}`);

      const exists = await this.checkFileExists(filePath);
      if (!exists) {
        console.log(`${this.logPrefix} File doesn't exist, nothing to delete`);
        return true;
      }

      await RNFS.unlink(filePath);
      console.log(`${this.logPrefix} Video file deleted successfully`);
      return true;
    } catch (error) {
      console.error(`${this.logPrefix} Error deleting video file:`, error);
      return false;
    }
  }

  /**
   * Get file size in bytes
   * @param {string} filePath - Full path to the file
   * @returns {Promise<number|null>} File size in bytes or null if error
   */
  async getFileSize(filePath) {
    try {
      if (!filePath || typeof filePath !== 'string') {
        console.warn(
          `${this.logPrefix} Invalid file path provided: ${filePath}`,
        );
        return null;
      }

      console.log(`${this.logPrefix} Getting file size for: ${filePath}`);

      const exists = await this.checkFileExists(filePath);
      if (!exists) {
        console.log(`${this.logPrefix} File doesn't exist, size is 0`);
        return 0;
      }

      const stats = await RNFS.stat(filePath);
      const sizeBytes = parseInt(stats.size, 10);

      console.log(`${this.logPrefix} File size: ${sizeBytes} bytes`);
      return sizeBytes;
    } catch (error) {
      console.error(`${this.logPrefix} Error getting file size:`, error);
      return null;
    }
  }

  /**
   * Check available storage space
   * @returns {Promise<Object>} Storage info {totalSpaceKB, freeSpaceKB, usedSpaceKB}
   */
  async checkAvailableSpace() {
    try {
      console.log(`${this.logPrefix} Checking available storage space`);

      // Get free space info
      const freeSpace = await RNFS.getFSInfo();

      const storageInfo = {
        totalSpaceKB: Math.round(freeSpace.totalSpace / 1024),
        freeSpaceKB: Math.round(freeSpace.freeSpace / 1024),
        usedSpaceKB: Math.round(
          (freeSpace.totalSpace - freeSpace.freeSpace) / 1024,
        ),
      };

      console.log(`${this.logPrefix} Storage info:`, {
        totalGB: (storageInfo.totalSpaceKB / 1024 / 1024).toFixed(2),
        freeGB: (storageInfo.freeSpaceKB / 1024 / 1024).toFixed(2),
        usedGB: (storageInfo.usedSpaceKB / 1024 / 1024).toFixed(2),
      });

      return storageInfo;
    } catch (error) {
      console.error(`${this.logPrefix} Error checking storage space:`, error);
      return {
        totalSpaceKB: 0,
        freeSpaceKB: 0,
        usedSpaceKB: 0,
      };
    }
  }

  /**
   * Check if storage is sufficient (≥1GB free)
   * @returns {Promise<boolean>} True if sufficient storage available
   */
  async isStorageSufficient() {
    try {
      console.log(
        `${this.logPrefix} Checking if storage is sufficient (≥${STORAGE_REQUIREMENTS.MIN_STORAGE_KB} KB)`,
      );

      const storageInfo = await this.checkAvailableSpace();
      const isSufficient =
        storageInfo.freeSpaceKB >= STORAGE_REQUIREMENTS.MIN_STORAGE_KB;

      console.log(`${this.logPrefix} Storage sufficient: ${isSufficient}`, {
        available: storageInfo.freeSpaceKB,
        required: STORAGE_REQUIREMENTS.MIN_STORAGE_KB,
        deficit: isSufficient
          ? 0
          : STORAGE_REQUIREMENTS.MIN_STORAGE_KB - storageInfo.freeSpaceKB,
      });

      return isSufficient;
    } catch (error) {
      console.error(
        `${this.logPrefix} Error checking storage sufficiency:`,
        error,
      );
      return false;
    }
  }

  /**
   * Generate video file path by video ID
   * @param {number} videoId - Video identifier
   * @param {string} fileExtension - File extension (default: mp4)
   * @returns {Promise<string>} Full path to video file
   */
  async getVideoFilePath(videoId, fileExtension = 'mp4') {
    try {
      if (!videoId || typeof videoId !== 'number') {
        throw new Error('Invalid video ID provided');
      }

      const directoryPath = await this.getStoragePath();
      const fileName = `video_${videoId}.${fileExtension}`;
      const fullPath = `${directoryPath}/${fileName}`;

      console.log(`${this.logPrefix} Generated video file path: ${fullPath}`);
      return fullPath;
    } catch (error) {
      console.error(
        `${this.logPrefix} Error generating video file path:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get all video files in the directory
   * @returns {Promise<Array>} List of video file info {name, path, size}
   */
  async getAllVideoFiles() {
    try {
      console.log(`${this.logPrefix} Getting all video files`);

      const directoryPath = await this.getStoragePath();

      // Check if directory exists
      const directoryExists = await RNFS.exists(directoryPath);
      if (!directoryExists) {
        console.log(`${this.logPrefix} Video directory doesn't exist yet`);
        return [];
      }

      // Read directory contents
      const files = await RNFS.readDir(directoryPath);

      // Filter for video files and get their info
      const videoFiles = [];

      for (const file of files) {
        if (
          file.isFile() &&
          (file.name.endsWith('.mp4') ||
            file.name.endsWith('.mov') ||
            file.name.endsWith('.avi'))
        ) {
          videoFiles.push({
            name: file.name,
            path: file.path,
            size: file.size,
            modificationTime: file.mtime,
          });
        }
      }

      console.log(`${this.logPrefix} Found ${videoFiles.length} video files`);
      return videoFiles;
    } catch (error) {
      console.error(`${this.logPrefix} Error getting video files:`, error);
      return [];
    }
  }

  /**
   * Delete all videos (for testing purposes)
   * @returns {Promise<boolean>} Success status
   */
  async deleteAllVideos() {
    try {
      console.log(`${this.logPrefix} Deleting all videos`);

      const videoFiles = await this.getAllVideoFiles();

      if (videoFiles.length === 0) {
        console.log(`${this.logPrefix} No videos to delete`);
        return true;
      }

      let deletedCount = 0;
      let errorCount = 0;

      for (const file of videoFiles) {
        const success = await this.deleteVideoFile(file.path);
        if (success) {
          deletedCount++;
        } else {
          errorCount++;
        }
      }

      console.log(
        `${this.logPrefix} Deleted ${deletedCount} videos, ${errorCount} errors`,
      );
      return errorCount === 0;
    } catch (error) {
      console.error(`${this.logPrefix} Error deleting all videos:`, error);
      return false;
    }
  }

  /**
   * Get total size of all video files
   * @returns {Promise<number>} Total size in bytes
   */
  async getTotalVideosSize() {
    try {
      console.log(`${this.logPrefix} Calculating total videos size`);

      const videoFiles = await this.getAllVideoFiles();

      const totalSize = videoFiles.reduce(
        (sum, file) => sum + (file.size || 0),
        0,
      );

      console.log(
        `${this.logPrefix} Total videos size: ${totalSize} bytes (${(
          totalSize /
          1024 /
          1024
        ).toFixed(2)} MB)`,
      );
      return totalSize;
    } catch (error) {
      console.error(
        `${this.logPrefix} Error calculating total videos size:`,
        error,
      );
      return 0;
    }
  }
}

// Export singleton instance
const fileSystemService = new FileSystemService();
export default fileSystemService;
