/**
 * Phase 1 Integration Test
 *
 * This file contains simple tests to verify Phase 1 components work together:
 * 1. LocalStorageService - save/load video metadata
 * 2. FileSystemService - directory creation, storage checks
 * 3. VideoComparison - merge API videos with local storage
 * 4. VideosSlice - Redux state management
 *
 * Run these tests manually in the app to verify functionality
 */

import FileSystemService from '../Service/FileSystemService';
import LocalStorageService from '../Service/LocalStorageService';
import {
  countVideosByStatus,
  getNewVideos,
  mergeVideosWithLocalStatus,
} from './VideoComparison';

/**
 * Test LocalStorageService functionality
 */
export const testLocalStorageService = async () => {
  console.log('\n=== Testing LocalStorageService ===');

  try {
    // Test 1: Clear all data first
    console.log('Test 1: Clearing all videos...');
    const clearResult = await LocalStorageService.clearAllVideos();
    console.log('Clear result:', clearResult);

    // Test 2: Save video metadata
    console.log('Test 2: Saving video metadata...');
    const testVideo = {
      id: 1,
      name: 'Test Video 1',
      filetype: 'video/mp4',
      filesize: '50000000',
      file_duration: '300',
      description: 'Test video for Phase 1',
      status: 'DOWNLOADED',
      localFilePath: '/test/path/video_1.mp4',
      downloadProgress: 100,
    };

    const saveResult = await LocalStorageService.saveVideoMetadata(
      1,
      testVideo,
    );
    console.log('Save result:', saveResult);

    // Test 3: Get single video metadata
    console.log('Test 3: Getting single video metadata...');
    const retrievedVideo = await LocalStorageService.getVideoMetadata(1);
    console.log('Retrieved video:', retrievedVideo);

    // Test 4: Update video status
    console.log('Test 4: Updating video status...');
    const updateResult = await LocalStorageService.updateVideoStatus(
      1,
      'FAILED',
    );
    console.log('Update result:', updateResult);

    // Test 5: Get all local videos
    console.log('Test 5: Getting all local videos...');
    const allVideos = await LocalStorageService.getAllLocalVideos();
    console.log('All videos:', allVideos);

    // Test 6: Save app config
    console.log('Test 6: Saving app config...');
    const testConfig = {
      storageLocation: 'phone',
      autoDownloadEnabled: true,
      hasCheckedStorage: true,
    };
    const configSaveResult = await LocalStorageService.saveAppConfig(
      testConfig,
    );
    console.log('Config save result:', configSaveResult);

    // Test 7: Get app config
    console.log('Test 7: Getting app config...');
    const retrievedConfig = await LocalStorageService.getAppConfig();
    console.log('Retrieved config:', retrievedConfig);

    console.log('✅ LocalStorageService tests completed successfully!');
    return true;
  } catch (error) {
    console.error('❌ LocalStorageService test failed:', error);
    return false;
  }
};

/**
 * Test FileSystemService functionality
 */
export const testFileSystemService = async () => {
  console.log('\n=== Testing FileSystemService ===');

  try {
    // Test 1: Initialize video directory
    console.log('Test 1: Initializing video directory...');
    const initResult = await FileSystemService.initializeVideoDirectory();
    console.log('Init result:', initResult);

    // Test 2: Get storage path
    console.log('Test 2: Getting storage path...');
    const storagePath = await FileSystemService.getStoragePath();
    console.log('Storage path:', storagePath);

    // Test 3: Check available space
    console.log('Test 3: Checking available space...');
    const spaceInfo = await FileSystemService.checkAvailableSpace();
    console.log('Space info:', spaceInfo);

    // Test 4: Check if storage is sufficient
    console.log('Test 4: Checking storage sufficiency...');
    const isSufficient = await FileSystemService.isStorageSufficient();
    console.log('Storage sufficient:', isSufficient);

    // Test 5: Generate video file path
    console.log('Test 5: Generating video file path...');
    const videoPath = await FileSystemService.getVideoFilePath(1);
    console.log('Video path:', videoPath);

    // Test 6: Check file exists (should be false)
    console.log('Test 6: Checking file existence...');
    const fileExists = await FileSystemService.checkFileExists(videoPath);
    console.log('File exists:', fileExists);

    // Test 7: Get all video files
    console.log('Test 7: Getting all video files...');
    const videoFiles = await FileSystemService.getAllVideoFiles();
    console.log('Video files:', videoFiles);

    console.log('✅ FileSystemService tests completed successfully!');
    return true;
  } catch (error) {
    console.error('❌ FileSystemService test failed:', error);
    return false;
  }
};

/**
 * Test VideoComparison functionality
 */
export const testVideoComparison = async () => {
  console.log('\n=== Testing VideoComparison ===');

  try {
    // Test data
    const apiVideos = [
      { id: 1, name: 'Video 1', description: 'First video' },
      { id: 2, name: 'Video 2', description: 'Second video' },
      { id: 3, name: 'Video 3', description: 'Third video' },
    ];

    const localVideos = {
      1: {
        id: 1,
        status: 'DOWNLOADED',
        localFilePath: '/test/path/video_1.mp4',
        downloadProgress: 100,
      },
      2: {
        id: 2,
        status: 'DOWNLOADING',
        downloadProgress: 50,
      },
    };

    // Test 1: Merge videos with status
    console.log('Test 1: Merging videos with local status...');
    const mergedVideos = await mergeVideosWithLocalStatus(
      apiVideos,
      localVideos,
    );
    console.log('Merged videos:', mergedVideos);

    // Test 2: Get NEW videos
    console.log('Test 2: Getting NEW videos...');
    const newVideos = getNewVideos(mergedVideos);
    console.log('NEW videos:', newVideos);

    // Test 3: Count videos by status
    console.log('Test 3: Counting videos by status...');
    const statusCounts = countVideosByStatus(mergedVideos);
    console.log('Status counts:', statusCounts);

    // Test 4: Test invalid inputs
    console.log('Test 4: Testing with invalid inputs...');
    const emptyMerge = await mergeVideosWithLocalStatus(null, null);
    console.log('Empty merge result:', emptyMerge);

    const invalidNew = getNewVideos(null);
    console.log('Invalid new videos result:', invalidNew);

    console.log('✅ VideoComparison tests completed successfully!');
    return true;
  } catch (error) {
    console.error('❌ VideoComparison test failed:', error);
    return false;
  }
};

/**
 * Run all Phase 1 integration tests
 */
export const runPhase1Tests = async () => {
  console.log('\n🚀 Starting Phase 1 Integration Tests...\n');

  const results = [];

  // Run tests sequentially
  results.push(await testLocalStorageService());
  results.push(await testFileSystemService());
  results.push(await testVideoComparison());

  // Summary
  const passedTests = results.filter(result => result).length;
  const totalTests = results.length;

  console.log('\n📊 Phase 1 Test Results:');
  console.log(`✅ Passed: ${passedTests}/${totalTests}`);
  console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests}`);

  if (passedTests === totalTests) {
    console.log('🎉 All Phase 1 tests passed! Ready for Phase 2.');
  } else {
    console.log('⚠️ Some tests failed. Please fix issues before proceeding.');
  }

  return passedTests === totalTests;
};

/**
 * Instructions for manual testing:
 *
 * Add this to your VideoList.js useEffect to run tests:
 *
 * useEffect(() => {
 *   const runTests = async () => {
 *     const { runPhase1Tests } = await import('../Utils/Phase1Tests');
 *     await runPhase1Tests();
 *   };
 *   runTests();
 * }, []);
 */
