import NetInfo from '@react-native-community/netinfo';
import RNFS from 'react-native-fs';
import Toast from 'react-native-toast-message';
import CrashReportService from './CrashReportService';
import FileSystemService from './FileSystemService';
import LocalStorageService from './LocalStorageService';
import baseUrl from './baseUrl';

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
    this.modalCallback = null; // NEW (Phase 3): Callback for modal updates
    this.downloadJob = null; // Current RNFS download job (for cancellation)

    // NEW: Network monitoring
    this.isNetworkAvailable = true; // Track network status
    this.networkUnsubscribe = null; // NetInfo listener
    this.pausedDueToNetwork = false; // Track if we paused due to network loss

    // ANR FIX: Flags to prevent race conditions
    this.isPausing = false; // Prevent multiple pause calls
    this.isResuming = false; // Prevent multiple resume calls

    // DEBUG MODE: Simulate network error
    this.debugSimulateError = false; // Can be toggled from UI
    this.debugTimeoutId = null; // Store timeout ID for debugging

    // Initialize network monitoring
    this._initializeNetworkMonitoring();

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
   * Initialize network monitoring
   * @private
   */
  _initializeNetworkMonitoring() {
    try {
      // Check initial network state
      NetInfo.fetch()
        .then(state => {
          try {
            this.isNetworkAvailable =
              state.isConnected && state.isInternetReachable;
            console.log(
              `${this.logPrefix} Initial network state: ${
                this.isNetworkAvailable ? 'ONLINE' : 'OFFLINE'
              }`,
            );
          } catch (error) {
            console.error(
              `${this.logPrefix} Error processing initial network state:`,
              error,
            );
          }
        })
        .catch(error => {
          console.error(
            `${this.logPrefix} Error fetching initial network state:`,
            error,
          );
        });

      // ✅ CRITICAL FIX: Debounce network changes to prevent rapid calls
      let networkChangeTimeout = null;

      // Listen for network state changes
      this.networkUnsubscribe = NetInfo.addEventListener(state => {
        // ✅ Clear any pending network change handling
        if (networkChangeTimeout) {
          clearTimeout(networkChangeTimeout);
        }

        // ✅ Debounce network changes by 500ms
        networkChangeTimeout = setTimeout(() => {
          try {
            const wasNetworkAvailable = this.isNetworkAvailable;
            const isNowAvailable =
              state.isConnected && state.isInternetReachable;

            this.isNetworkAvailable = isNowAvailable;

            console.log(
              `${this.logPrefix} 📡 Network state changed: ${
                wasNetworkAvailable ? 'ONLINE' : 'OFFLINE'
              } → ${isNowAvailable ? 'ONLINE' : 'OFFLINE'}`,
            );

            // Network lost during active download
            if (wasNetworkAvailable && !isNowAvailable && this.isProcessing) {
              console.log(
                `${this.logPrefix} 🔴 Network LOST during download - pausing...`,
              );

              // ✅ CRITICAL: Call async to prevent blocking
              setImmediate(() => {
                this._pauseDownloadDueToNetwork();
              });
            }

            // Network restored after being lost
            if (
              !wasNetworkAvailable &&
              isNowAvailable &&
              this.pausedDueToNetwork
            ) {
              console.log(
                `${this.logPrefix} 🟢 Network RESTORED - resuming...`,
              );

              // ✅ CRITICAL: Call async to prevent blocking
              setImmediate(() => {
                this._resumeDownloadsAfterNetworkRestore();
              });
            }
          } catch (error) {
            // ✅ CRASH PREVENTION: Catch ANY error in network listener
            console.error(
              `${this.logPrefix} ❌❌❌ CRASH PREVENTED in network listener:`,
              error,
            );
            console.error(`${this.logPrefix} Error stack:`, error.stack);

            // Log to crash report service
            CrashReportService.addLog(
              'Network listener error (CRASH PREVENTED)',
              'ERROR',
              {
                error: error.message,
                stack: error.stack,
                isProcessing: this.isProcessing,
                pausedDueToNetwork: this.pausedDueToNetwork,
                currentDownloadId: this.currentDownload?.id,
                queueLength: this.downloadQueue.length,
              },
            );

            // Try to recover gracefully (also async)
            setImmediate(() => {
              try {
                if (this.isProcessing && this.currentDownload) {
                  console.log(
                    `${this.logPrefix} Attempting graceful recovery...`,
                  );
                  this._pauseDownloadDueToNetwork();
                }
              } catch (recoveryError) {
                console.error(
                  `${this.logPrefix} Recovery also failed:`,
                  recoveryError,
                );
                CrashReportService.addLog(
                  'Network listener recovery failed',
                  'ERROR',
                  {
                    error: recoveryError.message,
                  },
                );
              }
            });
          }
        }, 500); // ✅ 500ms debounce to prevent rapid calls
      });

      console.log(`${this.logPrefix} ✅ Network monitoring initialized`);
    } catch (error) {
      console.error(
        `${this.logPrefix} ❌ Error initializing network monitoring:`,
        error,
      );
      CrashReportService.addLog(
        'Network monitoring initialization failed',
        'ERROR',
        {
          error: error.message,
          stack: error.stack,
        },
      );
    }
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
   * NEW (Phase 3): Set modal callback for download progress modal
   * @param {Function} callback - Function(videoName, progress, totalVideos, completedVideos)
   */
  setModalCallback(callback) {
    if (typeof callback === 'function') {
      this.modalCallback = callback;
      console.log(`${this.logPrefix} Modal callback set`);
    } else {
      console.warn(`${this.logPrefix} Invalid modal callback provided`);
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
      this._logDownloadEvent('START', 'AUTO_DOWNLOAD', {
        videoCount: newVideos?.length || 0,
      });

      // Validate input
      if (!Array.isArray(newVideos) || newVideos.length === 0) {
        console.log(`${this.logPrefix} No videos to download`);
        this._logDownloadEvent('NO_VIDEOS', 'AUTO_DOWNLOAD', {});
        return true;
      }

      // Check if already processing
      if (this.isProcessing || this.currentDownload !== null) {
        console.warn(
          `${this.logPrefix} Download already in progress, cannot start new download`,
        );
        this._logDownloadEvent('ALREADY_PROCESSING', 'AUTO_DOWNLOAD', {});
        return false;
      }

      // Validate storage space before starting
      const hasStorage = await FileSystemService.isStorageSufficient();
      if (!hasStorage) {
        console.error(
          `${this.logPrefix} Insufficient storage space for downloads`,
        );
        this._logDownloadEvent('INSUFFICIENT_STORAGE', 'AUTO_DOWNLOAD', {});
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
      const totalVideos = this.downloadQueue.length; // NEW (Phase 3): Track total
      let completedVideos = 0; // NEW (Phase 3): Track completed

      console.log(
        `${this.logPrefix} Starting queue processing with ${totalVideos} videos`,
      );

      while (this.downloadQueue.length > 0) {
        // NEW: Check network before processing
        if (!this.isNetworkAvailable) {
          console.warn(
            `${this.logPrefix} No network available, pausing queue processing`,
          );
          this.isProcessing = false;
          return false;
        }

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

        // NEW (Phase 3): Update modal with current video info (0% progress)
        this._updateModal(video.name, 0, totalVideos, completedVideos);

        // Attempt download
        const success = await this.downloadVideo(video);

        if (success) {
          console.log(
            `${this.logPrefix} Successfully downloaded video ${video.id}`,
          );
          this._updateStatus(video.id, 'DOWNLOADED');
          completedVideos++; // NEW (Phase 3): Increment completed count

          // NEW (Phase 3): Update modal with completed count (100% for this video)
          this._updateModal(video.name, 100, totalVideos, completedVideos);
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

      // Check if file already exists AND is complete
      const fileExists = await FileSystemService.checkFileExists(filePath);
      if (fileExists) {
        // ✅ NEW: Verify file size to ensure it's a complete download, not partial
        try {
          const fileSizeBytes = await FileSystemService.getFileSize(filePath);
          const fileSizeMB = fileSizeBytes / (1024 * 1024);

          // ✅ IMPORTANT: If file is very small, it's incomplete/partial
          // - 0-5MB: Almost certainly incomplete (threshold for partial detection)
          // - 5MB+: Likely a valid small video or large partial
          const MIN_VALID_FILE_SIZE_MB = 5;

          console.log(
            `${this.logPrefix} Video ${
              video.id
            } file exists: ${fileSizeMB.toFixed(
              2,
            )}MB (threshold: ${MIN_VALID_FILE_SIZE_MB}MB)`,
          );

          if (fileSizeMB < MIN_VALID_FILE_SIZE_MB) {
            console.warn(
              `${this.logPrefix} ⚠️ Video ${
                video.id
              }: File too small (${fileSizeMB.toFixed(
                2,
              )}MB < ${MIN_VALID_FILE_SIZE_MB}MB) - PARTIAL/CORRUPTED! Deleting and re-downloading...`,
            );

            this._logDownloadEvent('DELETE_PARTIAL_FILE', video.id, {
              fileSizeMB: fileSizeMB.toFixed(2),
              threshold: MIN_VALID_FILE_SIZE_MB,
              reason: 'file_too_small_on_retry',
            });

            // Delete partial/corrupted file
            try {
              await FileSystemService.deleteVideoFile(filePath);
              console.log(
                `${this.logPrefix} ✅ Deleted partial file for video ${video.id}`,
              );
            } catch (deleteErr) {
              console.error(
                `${this.logPrefix} ❌ Could not delete partial file:`,
                deleteErr,
              );
              // Continue anyway - might fail during download too
            }

            // Continue to re-download
          } else {
            // File is large enough - assume it's complete
            console.log(
              `${this.logPrefix} ✅ Video ${
                video.id
              }: File valid (${fileSizeMB.toFixed(
                2,
              )}MB >= ${MIN_VALID_FILE_SIZE_MB}MB) - SKIPPING download`,
            );

            // Save metadata and mark as downloaded
            await LocalStorageService.saveVideoMetadata(video.id, {
              ...video,
              status: 'DOWNLOADED',
              localFilePath: filePath,
              downloadProgress: 100,
              downloadedAt: Date.now(),
            });

            this._updateStatus(video.id, 'DOWNLOADED', filePath);
            return true;
          }
        } catch (fileSizeError) {
          console.error(
            `${this.logPrefix} ❌ Error checking file size for video ${video.id}:`,
            fileSizeError,
          );

          this._logDownloadEvent('FILE_SIZE_CHECK_ERROR', video.id, {
            errorMessage: fileSizeError.message,
          });

          // If we can't check file size, delete it and re-download to be safe
          console.warn(
            `${this.logPrefix} ⚠️ Cannot verify file size - deleting suspicious file and re-downloading...`,
          );
          try {
            await FileSystemService.deleteVideoFile(filePath);
            console.log(
              `${this.logPrefix} ✅ Deleted suspicious file for video ${video.id}`,
            );
          } catch (deleteError) {
            console.error(
              `${this.logPrefix} ❌ Error deleting suspicious file:`,
              deleteError,
            );
          }
        }
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
        this.downloadJob.cancel();
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

  /**
   * Toggle debug error simulation (for testing network failures)
   * @param {boolean} enable - Enable or disable simulation
   */
  setDebugSimulateError(enable) {
    this.debugSimulateError = enable;
    console.log(
      `${this.logPrefix} 🔴 DEBUG ERROR SIMULATION: ${
        enable ? 'ENABLED' : 'DISABLED'
      }`,
    );
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

                // Update modal progress
                if (
                  this.currentDownload &&
                  this.currentDownload.id === videoId
                ) {
                  this._updateModal(
                    this.currentDownload.name,
                    roundedProgress,
                    null,
                    null,
                  );
                }
              }
            } catch (progressError) {
              console.warn(
                `${this.logPrefix} Error updating progress:`,
                progressError,
              );
            }
          },
        };

        // ✅ CRITICAL FIX: Create a safe wrapper around RNFS job to prevent native crashes
        // RNFS has a bug where it can pass null to React Native bridge, causing NullPointerException
        // We intercept the promise and add a safety layer

        const downloadJobPromise = new Promise(
          (resolveWrapper, rejectWrapper) => {
            try {
              this.downloadJob = RNFS.downloadFile(options);

              // Store the original promise
              const originalPromise = this.downloadJob.promise;

              // Wrap the promise with safety checks
              originalPromise
                .then(result => {
                  resolveWrapper(result);
                })
                .catch(error => {
                  // ✅ CRITICAL: Intercept error BEFORE it reaches RNFS native code
                  // Create a safe error object that won't crash
                  const safeError = {
                    message: error?.message || 'Unknown download error',
                    code: error?.code || 'UNKNOWN',
                    stack: error?.stack || '',
                  };
                  rejectWrapper(safeError);
                });
            } catch (error) {
              // Setup error
              const safeError = {
                message: error?.message || 'Failed to start download',
                code: 'SETUP_ERROR',
                stack: error?.stack || '',
              };
              rejectWrapper(safeError);
            }
          },
        );

        // Handle the safe promise
        downloadJobPromise
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

            // Error is already safe from our wrapper above
            const errorMessage = error.message || 'Unknown error';
            const errorCode = error.code || 'UNKNOWN';
            const errorStack = error.stack || '';

            // ✅ Check if error is due to cancellation
            const isCancelled =
              errorMessage.includes('cancelled') ||
              errorMessage.includes('canceled') ||
              errorMessage.includes('stopped') ||
              errorCode === 'EUNSPECIFIED'; // RNFS cancellation error code

            if (isCancelled) {
              console.log(
                `${this.logPrefix} ℹ️ Download cancelled for video ${videoId} (expected due to network loss)`,
              );

              // ✅ Don't call FAILED callback - download was intentionally cancelled
              // The PAUSED callback was already called in _pauseDownloadDueToNetwork
              resolve({
                success: false,
                error: 'Download cancelled',
                cancelled: true,
              });
            } else {
              // ✅ Real error (not cancellation)
              console.error(
                `${this.logPrefix} ❌ DOWNLOAD ERROR for video ${videoId}:`,
                {
                  errorMessage: errorMessage,
                  errorCode: errorCode,
                  errorStack: errorStack,
                  timestamp: new Date().toISOString(),
                },
              );

              // Log to crash report service
              this._logDownloadEvent('ERROR', videoId, {
                errorMessage: errorMessage,
                errorCode: errorCode,
                errorStack: errorStack,
              });

              // ✅ CRITICAL FIX: Call status callback with safe error message
              try {
                // Ensure we pass a valid string, not null/undefined
                const safeErrorMessage =
                  errorMessage || 'Download failed - unknown error';
                this._updateStatus(videoId, 'FAILED', null, safeErrorMessage);
              } catch (callbackError) {
                console.error(
                  `${this.logPrefix} ❌ ERROR in _updateStatus callback:`,
                  callbackError,
                );
              }

              resolve({ success: false, error: errorMessage });
            }
          });
      } catch (error) {
        console.error(`${this.logPrefix} Error setting up download:`, error);
        // ✅ CRITICAL FIX: Safely get error message
        const setupError = error?.message || 'Download setup failed';
        resolve({ success: false, error: setupError });
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
        // const baseUrl = baseUrl;
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
        const fallbackUrl = `${baseUrl}api/v1/media-files/download/${video.id}`;
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
   * Update progress via callback (with safety checks)
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
  async _updateStatus(videoId, status, filePath = null, errorMessage = null) {
    try {
      if (this.statusCallback && typeof this.statusCallback === 'function') {
        // ✅ CRITICAL FIX: Ensure errorMessage is never null/undefined when passed to callback
        // RNFS NullPointerException fix
        const safeErrorMessage =
          errorMessage && typeof errorMessage === 'string'
            ? errorMessage
            : null;

        // For DOWNLOADED status, also pass the localFilePath
        if (status === 'DOWNLOADED') {
          const downloadedPath =
            filePath ||
            (await FileSystemService.getVideoFilePath(videoId, 'mp4'));
          console.log(
            `${this.logPrefix} Download completed for video ${videoId}, file path: ${downloadedPath}`,
          );
          this.statusCallback(videoId, status, downloadedPath);
        } else if (status === 'FAILED' || status === 'PAUSED') {
          // For FAILED/PAUSED status, pass error message (safely)
          const messageToLog = safeErrorMessage || 'No error message provided';
          console.error(
            `${this.logPrefix} Download ${status} for video ${videoId}: ${messageToLog}`,
          );
          // ✅ Only pass error message if it's a valid string
          this.statusCallback(
            videoId,
            status,
            null,
            safeErrorMessage || undefined,
          );
        } else {
          this.statusCallback(videoId, status);
        }
      }
    } catch (error) {
      console.error(`${this.logPrefix} ❌ CRASH in _updateStatus callback:`, {
        videoId,
        status,
        errorMessage: error.message,
        stack: error.stack,
      });

      // Log to crash report
      CrashReportService.addLog('_updateStatus callback crash', 'ERROR', {
        videoId,
        status,
        callbackError: error.message,
        stack: error.stack,
      });
    }
  }

  /**
   * NEW (Phase 3): Update modal with current download info
   * @private
   * @param {string} videoName - Name of video being downloaded
   * @param {number|null} progress - Progress percentage (0-100), null to skip update
   * @param {number|null} totalVideos - Total videos to download, null to skip update
   * @param {number|null} completedVideos - Videos completed, null to skip update
   */
  _updateModal(videoName, progress, totalVideos, completedVideos) {
    try {
      if (this.modalCallback && typeof this.modalCallback === 'function') {
        this.modalCallback(videoName, progress, totalVideos, completedVideos);
      }
    } catch (error) {
      console.error(`${this.logPrefix} Error in modal callback:`, error);
    }
  }

  /**
   * Pause download due to network loss
   * @private
   */
  /**
   * Pause download due to network loss
   * @private
   */

  _pauseDownloadDueToNetwork() {
    // Prevent multiple simultaneous pause calls
    if (this.isPausing) {
      console.log(`${this.logPrefix} ⚠️ Already pausing, skipping...`);
      return;
    }

    this.isPausing = true;

    try {
      console.log(
        `${this.logPrefix} 🛑 PAUSING DOWNLOADS due to network loss...`,
      );

      // ✅ ULTIMATE FIX: Use RNFS.stopDownload() instead of .cancel()
      // The .cancel() method has a native bug, but stopDownload(jobId) works correctly
      if (this.downloadJob) {
        try {
          console.log(
            `${this.logPrefix} Stopping download using RNFS.stopDownload()...`,
          );

          const jobId = this.downloadJob.jobId; // Get job ID

          // Nullify immediately to prevent re-entry
          this.downloadJob = null;

          // ✅ Use RNFS.stopDownload(jobId) instead of job.cancel()
          // This is the CORRECT API that doesn't cause native crashes
          if (jobId !== null && jobId !== undefined) {
            RNFS.stopDownload(jobId);
            console.log(
              `${this.logPrefix} ✅ Download stopped successfully (jobId: ${jobId})`,
            );
          } else {
            console.warn(
              `${this.logPrefix} ⚠️ No jobId available, cannot stop download`,
            );
          }
        } catch (error) {
          console.error(
            `${this.logPrefix} ❌ Error stopping download:`,
            error?.message || 'Unknown',
          );
          CrashReportService.addLog('Download stop error', 'ERROR', {
            error: error?.message || 'Unknown',
            stack: error?.stack || '',
          });

          // Still nullify to prevent memory leak
          this.downloadJob = null;
        }
      } else {
        console.log(`${this.logPrefix} No active download job to stop`);
      }

      // Set flags
      this.isProcessing = false;
      this.pausedDueToNetwork = true;

      // Update current download status
      if (this.currentDownload) {
        const errorMessage =
          'Network connection lost. Download will resume when network is restored.';
        const videoId = this.currentDownload.id;

        console.log(`${this.logPrefix} Updating video ${videoId} to PAUSED`);

        // Save paused status to local storage (async, don't wait)
        LocalStorageService.saveVideoMetadata(videoId, {
          ...this.currentDownload,
          status: 'PAUSED',
          pausedAt: new Date().toISOString(),
        }).catch(err => {
          console.error(`${this.logPrefix} Error saving paused status:`, err);
          CrashReportService.addLog('Save paused status error', 'ERROR', {
            error: err.message,
            videoId: videoId,
          });
        });

        // ✅ Call status callback ASYNC (with proper null checks)
        if (this.statusCallback && typeof this.statusCallback === 'function') {
          setTimeout(() => {
            try {
              console.log(
                `${this.logPrefix} Calling status callback for PAUSED`,
              );

              // ✅ Ensure videoId is valid
              if (typeof videoId === 'number') {
                this.statusCallback(videoId, 'PAUSED', null, errorMessage);
              } else {
                console.error(
                  `${this.logPrefix} Invalid videoId for status callback:`,
                  videoId,
                );
              }
            } catch (callbackError) {
              console.error(
                `${this.logPrefix} ❌ Error in status callback:`,
                callbackError,
              );
              CrashReportService.addLog(
                'Status callback error (PAUSED)',
                'ERROR',
                {
                  error: callbackError.message,
                  stack: callbackError.stack,
                  videoId: videoId,
                },
              );
            }
          }, 100); // Small delay to prevent blocking
        } else {
          console.warn(`${this.logPrefix} ⚠️ No status callback set!`);
        }

        // Show toast (async)
        setTimeout(() => {
          try {
            Toast.show({
              type: 'error',
              text1: 'Download Paused',
              text2: 'Network connection lost',
              position: 'bottom',
              visibilityTime: 3000,
            });
          } catch (toastError) {
            console.warn(`${this.logPrefix} Toast error:`, toastError);
          }
        }, 150);
      }

      console.log(`${this.logPrefix} ✅ Queue paused due to network loss`);
    } catch (error) {
      console.error(
        `${this.logPrefix} ❌❌❌ CRITICAL ERROR in _pauseDownloadDueToNetwork:`,
        error,
      );
      console.error(`${this.logPrefix} Error stack:`, error.stack);

      CrashReportService.addLog(
        'Critical error in _pauseDownloadDueToNetwork',
        'ERROR',
        {
          error: error.message,
          stack: error.stack,
          currentDownloadId: this.currentDownload?.id,
        },
      );
    } finally {
      // ✅ Always reset pausing flag
      this.isPausing = false;
    }
  }

  /**
   * Resume downloads after network is restored
   * @private
   */ /**
   * Resume downloads after network is restored
   * @private
   */
  _resumeDownloadsAfterNetworkRestore() {
    // ✅ Prevent multiple simultaneous resume calls
    if (this.isResuming) {
      console.log(`${this.logPrefix} ⚠️ Already resuming, skipping...`);
      return;
    }

    this.isResuming = true;

    try {
      console.log(
        `${this.logPrefix} 🔄 RESUMING DOWNLOADS after network restore...`,
      );

      this.pausedDueToNetwork = false;

      // Show toast (async)
      setTimeout(() => {
        try {
          Toast.show({
            type: 'success',
            text1: 'Network Restored',
            text2: 'Resuming downloads...',
            position: 'bottom',
            visibilityTime: 2000,
          });
        } catch (toastError) {
          console.warn(`${this.logPrefix} Toast error:`, toastError);
        }
      }, 100);

      // Resume processing queue (with delay to ensure network is stable)
      setTimeout(() => {
        if (this.downloadQueue.length > 0 && !this.isProcessing) {
          console.log(`${this.logPrefix} Restarting queue processing...`);
          this.processQueue();
        } else if (this.currentDownload && !this.isProcessing) {
          console.log(`${this.logPrefix} Restarting current download...`);
          this.processQueue();
        } else {
          console.log(
            `${this.logPrefix} No downloads to resume (queue empty or already processing)`,
          );
        }
      }, 1000); // ✅ 1 second delay to ensure network is stable

      console.log(`${this.logPrefix} ✅ Downloads resumed`);
    } catch (error) {
      console.error(`${this.logPrefix} ❌ Error resuming downloads:`, error);

      CrashReportService.addLog(
        'Error in _resumeDownloadsAfterNetworkRestore',
        'ERROR',
        {
          error: error.message,
          stack: error.stack,
        },
      );
    } finally {
      // ✅ Reset resuming flag
      this.isResuming = false;
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
          // ✅ NEW: Get file size before deletion to log partial download info
          try {
            const fileSizeBytes = await FileSystemService.getFileSize(filePath);
            const fileSizeMB = (fileSizeBytes / (1024 * 1024)).toFixed(2);
            console.log(
              `${this.logPrefix} Cleaning up partial file for video ${videoId} (${fileSizeMB}MB)`,
            );

            this._logDownloadEvent('CLEANUP_PARTIAL_FILE', videoId, {
              fileSizeMB: fileSizeMB,
              reason: 'download_failed',
            });
          } catch (sizeError) {
            console.warn(
              `${this.logPrefix} Could not get file size:`,
              sizeError,
            );
          }

          await FileSystemService.deleteVideoFile(filePath);
          console.log(
            `${this.logPrefix} Deleted partial file for video ${videoId}`,
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

  /**
   * Log download event to crash report service
   * @private
   */
  _logDownloadEvent(eventType, videoId, data = {}) {
    try {
      CrashReportService.addLog(
        `[DOWNLOAD] ${eventType} - Video ${videoId}`,
        'INFO',
        data,
      );
    } catch (error) {
      console.error(`${this.logPrefix} Error logging event:`, error);
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
