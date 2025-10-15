/**
 * Server Synchronization Service
 *
 * Handles synchronization between server video list and local stored videos:
 * 1. Identifies new videos from server (not in local storage)
 * 2. Identifies existing videos that are still on server
 * 3. Identifies deleted videos (in local storage but not on server)
 * 4. Provides cleanup and sync operations
 */

import FileSystemService from './FileSystemService';
import LocalStorageService from './LocalStorageService';

class ServerSyncService {
  /**
   * Compare server videos with local videos and categorize them
   * @param {Array} serverVideos - Array of videos from API response
   * @param {Object} localVideos - Object map of local videos {videoId: videoData}
   * @returns {Object} Categorized sync result
   */
  static async analyzeServerSync(serverVideos, localVideos) {
    try {
      console.log('[ServerSync] Starting server synchronization analysis...');
      console.log(`[ServerSync] Server videos count: ${serverVideos.length}`);
      console.log(
        `[ServerSync] Local videos count: ${Object.keys(localVideos).length}`,
      );

      // Validate inputs
      if (!Array.isArray(serverVideos)) {
        throw new Error('Server videos must be an array');
      }

      if (!localVideos || typeof localVideos !== 'object') {
        console.log(
          '[ServerSync] No local videos found, all server videos are new',
        );
        return {
          newVideos: serverVideos,
          existingVideos: [],
          deletedVideos: [],
          syncNeeded: serverVideos.length > 0,
          analysis: {
            totalServerVideos: serverVideos.length,
            totalLocalVideos: 0,
            newCount: serverVideos.length,
            existingCount: 0,
            deletedCount: 0,
          },
        };
      }

      // Convert server videos to ID set for faster lookup
      const serverVideoIds = new Set(serverVideos.map(video => video.id));
      const localVideoIds = Object.keys(localVideos).map(id =>
        parseInt(id, 10),
      );

      // 1. NEW VIDEOS: In server response but not in local storage
      const newVideos = serverVideos.filter(video => !localVideos[video.id]);

      // 2. EXISTING VIDEOS: In both server and local storage
      const existingVideos = serverVideos.filter(
        video => localVideos[video.id],
      );

      // 3. DELETED VIDEOS: In local storage but not in server response
      const deletedVideoIds = localVideoIds.filter(
        id => !serverVideoIds.has(id),
      );
      const deletedVideos = deletedVideoIds.map(id => ({
        id,
        localData: localVideos[id],
      }));

      const syncResult = {
        newVideos,
        existingVideos,
        deletedVideos,
        syncNeeded: newVideos.length > 0 || deletedVideos.length > 0,
        analysis: {
          totalServerVideos: serverVideos.length,
          totalLocalVideos: localVideoIds.length,
          newCount: newVideos.length,
          existingCount: existingVideos.length,
          deletedCount: deletedVideos.length,
        },
      };

      console.log('[ServerSync] Synchronization analysis complete:');
      console.log(`[ServerSync] - New videos: ${syncResult.analysis.newCount}`);
      console.log(
        `[ServerSync] - Existing videos: ${syncResult.analysis.existingCount}`,
      );
      console.log(
        `[ServerSync] - Deleted videos: ${syncResult.analysis.deletedCount}`,
      );
      console.log(`[ServerSync] - Sync needed: ${syncResult.syncNeeded}`);

      return syncResult;
    } catch (error) {
      console.error('[ServerSync] Error during sync analysis:', error);
      throw error;
    }
  }

  /**
   * Clean up deleted videos from local storage and file system
   * @param {Array} deletedVideos - Array of deleted video objects
   * @returns {Object} Cleanup result
   */
  static async cleanupDeletedVideos(deletedVideos) {
    try {
      console.log(
        `[ServerSync] Starting cleanup of ${deletedVideos.length} deleted videos...`,
      );

      if (!Array.isArray(deletedVideos) || deletedVideos.length === 0) {
        console.log('[ServerSync] No deleted videos to clean up');
        return {
          success: true,
          cleanedCount: 0,
          errors: [],
        };
      }

      const cleanupResults = {
        success: true,
        cleanedCount: 0,
        errors: [],
      };

      // Process each deleted video
      for (const deletedVideo of deletedVideos) {
        try {
          const { id, localData } = deletedVideo;

          console.log(`[ServerSync] Cleaning up deleted video ID: ${id}`);

          // 1. Remove video file from device storage (if it exists)
          if (localData && localData.localFilePath) {
            try {
              const fileExists = await FileSystemService.fileExists(
                localData.localFilePath,
              );
              if (fileExists) {
                await FileSystemService.deleteFile(localData.localFilePath);
                console.log(
                  `[ServerSync] Deleted video file: ${localData.localFilePath}`,
                );
              } else {
                console.log(
                  `[ServerSync] Video file not found: ${localData.localFilePath}`,
                );
              }
            } catch (fileError) {
              console.warn(
                `[ServerSync] Failed to delete file for video ${id}:`,
                fileError,
              );
              cleanupResults.errors.push({
                videoId: id,
                type: 'FILE_DELETE_ERROR',
                error: fileError.message,
              });
            }
          }

          // 2. Remove video from local storage (AsyncStorage)
          try {
            await LocalStorageService.removeLocalVideo(id);
            console.log(`[ServerSync] Removed video ${id} from local storage`);
            cleanupResults.cleanedCount++;
          } catch (storageError) {
            console.error(
              `[ServerSync] Failed to remove video ${id} from local storage:`,
              storageError,
            );
            cleanupResults.errors.push({
              videoId: id,
              type: 'STORAGE_REMOVE_ERROR',
              error: storageError.message,
            });
            cleanupResults.success = false;
          }
        } catch (videoError) {
          console.error(
            `[ServerSync] Error cleaning up video ${deletedVideo.id}:`,
            videoError,
          );
          cleanupResults.errors.push({
            videoId: deletedVideo.id,
            type: 'GENERAL_ERROR',
            error: videoError.message,
          });
          cleanupResults.success = false;
        }
      }

      console.log(
        `[ServerSync] Cleanup completed. Cleaned: ${cleanupResults.cleanedCount}, Errors: ${cleanupResults.errors.length}`,
      );

      return cleanupResults;
    } catch (error) {
      console.error('[ServerSync] Critical error during cleanup:', error);
      return {
        success: false,
        cleanedCount: 0,
        errors: [
          {
            videoId: 'UNKNOWN',
            type: 'CRITICAL_ERROR',
            error: error.message,
          },
        ],
      };
    }
  }

  /**
   * Get a summary report of sync status
   * @param {Object} syncAnalysis - Result from analyzeServerSync
   * @param {Object} cleanupResult - Result from cleanupDeletedVideos (optional)
   * @returns {Object} Detailed sync report
   */
  static generateSyncReport(syncAnalysis, cleanupResult = null) {
    const report = {
      timestamp: new Date().toISOString(),
      serverSync: {
        totalServerVideos: syncAnalysis.analysis.totalServerVideos,
        totalLocalVideos: syncAnalysis.analysis.totalLocalVideos,
        newVideos: syncAnalysis.analysis.newCount,
        existingVideos: syncAnalysis.analysis.existingCount,
        deletedVideos: syncAnalysis.analysis.deletedCount,
        syncRequired: syncAnalysis.syncNeeded,
      },
      cleanup: cleanupResult
        ? {
            attempted: true,
            success: cleanupResult.success,
            videosRemoved: cleanupResult.cleanedCount,
            errors: cleanupResult.errors.length,
            errorDetails: cleanupResult.errors,
          }
        : {
            attempted: false,
          },
      recommendations: [],
    };

    // Generate recommendations
    if (syncAnalysis.analysis.newCount > 0) {
      report.recommendations.push({
        type: 'NEW_DOWNLOADS',
        message: `${syncAnalysis.analysis.newCount} new video(s) available for download`,
        action: 'START_AUTO_DOWNLOAD',
      });
    }

    if (syncAnalysis.analysis.deletedCount > 0 && !cleanupResult) {
      report.recommendations.push({
        type: 'CLEANUP_NEEDED',
        message: `${syncAnalysis.analysis.deletedCount} video(s) deleted from server should be cleaned up locally`,
        action: 'RUN_CLEANUP',
      });
    }

    if (cleanupResult && cleanupResult.errors.length > 0) {
      report.recommendations.push({
        type: 'CLEANUP_ERRORS',
        message: `${cleanupResult.errors.length} error(s) occurred during cleanup`,
        action: 'RETRY_CLEANUP',
      });
    }

    if (
      syncAnalysis.analysis.newCount === 0 &&
      syncAnalysis.analysis.deletedCount === 0
    ) {
      report.recommendations.push({
        type: 'IN_SYNC',
        message: 'Local storage is synchronized with server',
        action: 'NONE',
      });
    }

    console.log('[ServerSync] Generated sync report:', report);
    return report;
  }

  /**
   * Perform complete server synchronization
   * @param {Array} serverVideos - Videos from server
   * @param {Object} localVideos - Local videos map
   * @param {Object} options - Sync options
   * @returns {Object} Complete sync result
   */
  static async performCompleteSync(serverVideos, localVideos, options = {}) {
    try {
      console.log('[ServerSync] Starting complete server synchronization...');

      const {
        autoCleanup = true, // Automatically cleanup deleted videos
        dryRun = false, // Just analyze, don't make changes
      } = options;

      // Step 1: Analyze what needs to be synced
      const syncAnalysis = await this.analyzeServerSync(
        serverVideos,
        localVideos,
      );

      let cleanupResult = null;

      // Step 2: Cleanup deleted videos if needed and allowed
      if (!dryRun && autoCleanup && syncAnalysis.deletedVideos.length > 0) {
        console.log(
          '[ServerSync] Auto-cleanup enabled, cleaning up deleted videos...',
        );
        cleanupResult = await this.cleanupDeletedVideos(
          syncAnalysis.deletedVideos,
        );
      } else if (syncAnalysis.deletedVideos.length > 0) {
        console.log(
          '[ServerSync] Cleanup needed but skipped (dryRun or autoCleanup disabled)',
        );
      }

      // Step 3: Generate comprehensive report
      const syncReport = this.generateSyncReport(syncAnalysis, cleanupResult);

      const completeResult = {
        success: true,
        syncAnalysis,
        cleanupResult,
        syncReport,
        dryRun,
      };

      console.log(
        '[ServerSync] Complete synchronization finished successfully',
      );
      return completeResult;
    } catch (error) {
      console.error(
        '[ServerSync] Error during complete synchronization:',
        error,
      );
      return {
        success: false,
        error: error.message,
        syncAnalysis: null,
        cleanupResult: null,
        syncReport: null,
        dryRun: options.dryRun || false,
      };
    }
  }
}

export default ServerSyncService;
