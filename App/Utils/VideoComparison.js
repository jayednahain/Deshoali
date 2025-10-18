import FileSystemService from '../Service/FileSystemService';

/**
 * VideoComparison - Utilities for comparing API videos with local storage
 *
 * Handles:
 * - Merging API videos with local video metadata
 * - Assigning proper status based on file existence
 * - Filtering videos by status
 * - Sorting and organizing video data
 */

/**
 * Video Status Definitions:
 * - NEW: Video from API that hasn't been downloaded yet
 * - DOWNLOADING: Video currently being downloaded (should become FAILED if app was closed)
 * - DOWNLOADED: Video successfully downloaded and file exists
 * - FAILED: Download failed or was interrupted
 */

/**
 * Merge API videos with local storage data and assign status
 * @param {Array} apiVideos - Videos from API response
 * @param {Object} localVideos - Local videos map from AsyncStorage {videoId: videoData}
 * @returns {Promise<Array>} Merged videos with status assigned
 */
export const mergeVideosWithLocalStatus = async (apiVideos, localVideos) => {
  try {
    console.log('[VideoComparison] Merging API videos with local status');
    console.log(`[VideoComparison] API videos: ${apiVideos?.length || 0}`);
    console.log(
      `[VideoComparison] Local videos: ${
        Object.keys(localVideos || {}).length
      }`,
    );

    // Validate inputs
    if (!Array.isArray(apiVideos)) {
      console.warn('[VideoComparison] Invalid API videos array');
      return [];
    }

    if (!localVideos || typeof localVideos !== 'object') {
      console.warn('[VideoComparison] Invalid local videos object');
      localVideos = {};
    }

    const mergedVideos = [];

    for (const apiVideo of apiVideos) {
      try {
        // Validate API video structure
        if (!apiVideo || typeof apiVideo.id !== 'number') {
          console.warn('[VideoComparison] Invalid API video:', apiVideo);
          continue;
        }

        const videoId = apiVideo.id;
        const localVideo = localVideos[videoId];

        // Base video structure from API
        const mergedVideo = {
          ...apiVideo,
          status: 'NEW',
          downloadProgress: 0,
          localFilePath: null,
        };

        if (localVideo) {
          console.log(
            `[VideoComparison] Processing local video ${videoId} with status: ${localVideo.status}`,
            `localFilePath: ${localVideo.localFilePath || 'null'}`,
          );

          // Copy local metadata
          mergedVideo.downloadProgress = localVideo.downloadProgress || 0;
          mergedVideo.localFilePath = localVideo.localFilePath;
          mergedVideo.downloadedAt = localVideo.downloadedAt;
          mergedVideo.failedAt = localVideo.failedAt;
          mergedVideo.errorMessage = localVideo.errorMessage;

          // Determine status based on local data and file existence
          if (localVideo.status === 'DOWNLOADED') {
            // Verify file actually exists
            if (localVideo.localFilePath) {
              const fileExists = await FileSystemService.checkFileExists(
                localVideo.localFilePath,
              );
              if (fileExists) {
                mergedVideo.status = 'DOWNLOADED';
                mergedVideo.downloadProgress = 100;
                console.log(
                  `[VideoComparison] Video ${videoId}: DOWNLOADED (file verified)`,
                );
              } else {
                // File was deleted but record exists - treat as NEW
                mergedVideo.status = 'NEW';
                mergedVideo.downloadProgress = 0;
                mergedVideo.localFilePath = null;
                console.log(
                  `[VideoComparison] Video ${videoId}: File missing, marked as NEW`,
                );
              }
            } else {
              // No file path but marked as downloaded - treat as NEW
              mergedVideo.status = 'NEW';
              mergedVideo.downloadProgress = 0;
              console.log(
                `[VideoComparison] Video ${videoId}: No file path, marked as NEW`,
              );
            }
          } else if (localVideo.status === 'DOWNLOADING') {
            // If app was closed during download, mark as FAILED
            mergedVideo.status = 'FAILED';
            mergedVideo.errorMessage = 'Download interrupted by app closure';
            mergedVideo.failedAt = Date.now();
            console.log(
              `[VideoComparison] Video ${videoId}: DOWNLOADING -> FAILED (app was closed)`,
            );
          } else if (localVideo.status === 'FAILED') {
            // Keep failed status
            mergedVideo.status = 'FAILED';
            console.log(
              `[VideoComparison] Video ${videoId}: Keeping FAILED status`,
            );
          } else {
            // Unknown status, treat as NEW
            mergedVideo.status = 'NEW';
            mergedVideo.downloadProgress = 0;
            console.log(
              `[VideoComparison] Video ${videoId}: Unknown status ${localVideo.status}, marked as NEW`,
            );
          }
        } else {
          // Not in local storage, it's a new video
          mergedVideo.status = 'NEW';
          console.log(
            `[VideoComparison] Video ${videoId}: Not in local storage, marked as NEW`,
          );
        }

        mergedVideos.push(mergedVideo);
      } catch (videoError) {
        console.error(
          `[VideoComparison] Error processing video ${apiVideo?.id}:`,
          videoError,
        );
        // Skip this video and continue with others
        continue;
      }
    }

    console.log(
      `[VideoComparison] Successfully merged ${mergedVideos.length} videos`,
    );
    return mergedVideos;
  } catch (error) {
    console.error('[VideoComparison] Error merging videos:', error);
    return [];
  }
};

/**
 * Get videos with NEW status, sorted by ID ascending
 * @param {Array} videosWithStatus - Array of videos with status
 * @returns {Array} NEW videos sorted by ID
 */
export const getNewVideos = videosWithStatus => {
  try {
    if (!Array.isArray(videosWithStatus)) {
      console.warn(
        '[VideoComparison] Invalid videosWithStatus array for getNewVideos',
      );
      return [];
    }

    const newVideos = videosWithStatus
      .filter(video => video && video.status === 'NEW')
      .sort((a, b) => a.id - b.id); // Sort by ID ascending

    console.log(
      `[VideoComparison] Found ${newVideos.length} NEW videos:`,
      newVideos.map(v => v.id),
    );
    return newVideos;
  } catch (error) {
    console.error('[VideoComparison] Error getting NEW videos:', error);
    return [];
  }
};

/**
 * Get videos with DOWNLOADED status
 * @param {Array} videosWithStatus - Array of videos with status
 * @returns {Array} DOWNLOADED videos
 */
export const getDownloadedVideos = videosWithStatus => {
  try {
    if (!Array.isArray(videosWithStatus)) {
      console.warn(
        '[VideoComparison] Invalid videosWithStatus array for getDownloadedVideos',
      );
      return [];
    }

    const downloadedVideos = videosWithStatus.filter(
      video => video && video.status === 'DOWNLOADED',
    );

    console.log(
      `[VideoComparison] Found ${downloadedVideos.length} DOWNLOADED videos:`,
      downloadedVideos.map(v => v.id),
    );
    return downloadedVideos;
  } catch (error) {
    console.error('[VideoComparison] Error getting DOWNLOADED videos:', error);
    return [];
  }
};

/**
 * Get videos with FAILED status
 * @param {Array} videosWithStatus - Array of videos with status
 * @returns {Array} FAILED videos
 */
export const getFailedVideos = videosWithStatus => {
  try {
    if (!Array.isArray(videosWithStatus)) {
      console.warn(
        '[VideoComparison] Invalid videosWithStatus array for getFailedVideos',
      );
      return [];
    }

    const failedVideos = videosWithStatus.filter(
      video => video && video.status === 'FAILED',
    );

    console.log(
      `[VideoComparison] Found ${failedVideos.length} FAILED videos:`,
      failedVideos.map(v => v.id),
    );
    return failedVideos;
  } catch (error) {
    console.error('[VideoComparison] Error getting FAILED videos:', error);
    return [];
  }
};

/**
 * Get videos with DOWNLOADING status
 * @param {Array} videosWithStatus - Array of videos with status
 * @returns {Array} DOWNLOADING videos
 */
export const getDownloadingVideos = videosWithStatus => {
  try {
    if (!Array.isArray(videosWithStatus)) {
      console.warn(
        '[VideoComparison] Invalid videosWithStatus array for getDownloadingVideos',
      );
      return [];
    }

    const downloadingVideos = videosWithStatus.filter(
      video => video && video.status === 'DOWNLOADING',
    );

    console.log(
      `[VideoComparison] Found ${downloadingVideos.length} DOWNLOADING videos:`,
      downloadingVideos.map(v => v.id),
    );
    return downloadingVideos;
  } catch (error) {
    console.error('[VideoComparison] Error getting DOWNLOADING videos:', error);
    return [];
  }
};

/**
 * Find a video by ID
 * @param {Array} videosWithStatus - Array of videos with status
 * @param {number} videoId - Video ID to find
 * @returns {Object|null} Video object or null if not found
 */
export const getVideoById = (videosWithStatus, videoId) => {
  try {
    if (!Array.isArray(videosWithStatus) || typeof videoId !== 'number') {
      console.warn('[VideoComparison] Invalid parameters for getVideoById');
      return null;
    }

    const foundVideo = videosWithStatus.find(v => v && v.id === videoId);

    if (foundVideo) {
      console.log(
        `[VideoComparison] Found video ${videoId} with status: ${foundVideo.status}`,
      );
    } else {
      console.log(`[VideoComparison] Video ${videoId} not found`);
    }

    return foundVideo || null;
  } catch (error) {
    console.error('[VideoComparison] Error getting video by ID:', error);
    return null;
  }
};

/**
 * Count videos by status
 * @param {Array} videosWithStatus - Array of videos with status
 * @returns {Object} Count object {NEW: number, DOWNLOADING: number, DOWNLOADED: number, FAILED: number}
 */
export const countVideosByStatus = videosWithStatus => {
  try {
    if (!Array.isArray(videosWithStatus)) {
      console.warn(
        '[VideoComparison] Invalid videosWithStatus array for countVideosByStatus',
      );
      return { NEW: 0, DOWNLOADING: 0, DOWNLOADED: 0, FAILED: 0 };
    }

    const counts = { NEW: 0, DOWNLOADING: 0, DOWNLOADED: 0, FAILED: 0 };

    for (const video of videosWithStatus) {
      if (video && video.status && counts.hasOwnProperty(video.status)) {
        counts[video.status]++;
      }
    }

    console.log('[VideoComparison] Video counts by status:', counts);
    return counts;
  } catch (error) {
    console.error('[VideoComparison] Error counting videos by status:', error);
    return { NEW: 0, DOWNLOADING: 0, DOWNLOADED: 0, FAILED: 0 };
  }
};

/**
 * Validate video metadata structure
 * @param {Object} video - Video object to validate
 * @returns {boolean} True if video has required fields
 */
export const isValidVideoStructure = video => {
  try {
    if (!video || typeof video !== 'object') {
      return false;
    }

    // Required fields
    const requiredFields = ['id', 'name'];

    for (const field of requiredFields) {
      if (!video.hasOwnProperty(field)) {
        console.warn(
          `[VideoComparison] Video missing required field: ${field}`,
        );
        return false;
      }
    }

    // Validate ID is a number
    if (typeof video.id !== 'number') {
      console.warn(`[VideoComparison] Video ID must be a number: ${video.id}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[VideoComparison] Error validating video structure:', error);
    return false;
  }
};

/**
 * Clean invalid videos from array
 * @param {Array} videos - Array of videos to clean
 * @returns {Array} Array of valid videos
 */
export const cleanVideoArray = videos => {
  try {
    if (!Array.isArray(videos)) {
      console.warn('[VideoComparison] cleanVideoArray: input is not an array');
      return [];
    }

    const validVideos = videos.filter(video => isValidVideoStructure(video));

    if (validVideos.length !== videos.length) {
      console.warn(
        `[VideoComparison] Filtered out ${
          videos.length - validVideos.length
        } invalid videos`,
      );
    }

    return validVideos;
  } catch (error) {
    console.error('[VideoComparison] Error cleaning video array:', error);
    return [];
  }
};
