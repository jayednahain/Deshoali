# 🔄 Modal-Centric Download Migration Guide

## Overview

This guide explains how to migrate from the current **inline download progress** system to the new **modal-centric download** system while preserving all existing functionality.

---

## 📊 Architecture Comparison

### Current Architecture (Before)

```
User Opens App
    ↓
VideoList.js loads
    ↓
Fetch API videos + Load local videos
    ↓
Merge videos with status
    ↓
Display list with status chips
    ↓
Auto-download starts (background)
    ↓
Progress shows ON EACH CARD
    ↓
User can browse/click while downloading
    ↓
Downloads complete → Cards update status
```

### New Architecture (After)

```
User Opens App
    ↓
Show CustomLoader (full screen)
    ↓
Fetch API videos + Load local videos
    ↓
Merge videos with status (BEHIND loader)
    ↓
Hide CustomLoader
    ↓
Show DownloadingProcessModal (if NEW videos exist)
    ↓
Downloads happen INSIDE modal
    ↓
Modal shows: Video name, progress %, X/Y total
    ↓
If error → Hide modal → Show CustomErrorModal → Retry
    ↓
Downloads complete → Hide modal
    ↓
Show video list (all downloads complete)
```

---

## 🎯 Step-by-Step Migration Plan

---

## PHASE 1: Create New Components

### 1.1 Create CustomLoader Component

**File**: `App/Components/Loader/CustomLoader.js`

```javascript
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { ThemeColors } from '../../AppTheme';

/**
 * CustomLoader - Full-screen loading overlay
 * Shows during API calls and data loading
 */
const CustomLoader = ({ visible = false }) => {
  if (!visible) return null;

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#00ff00" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Transparent overlay
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999, // Above everything
  },
});

export default CustomLoader;
```

**Export**: Add to `App/Components/index.js`

```javascript
export { default as CustomLoader } from './Loader/CustomLoader';
```

---

### 1.2 Create DownloadingProcessModal Component

**File**: `App/Components/Modal/DownloadingProcessModal.js`

```javascript
import React from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { useSelector } from 'react-redux';
import { ThemeColors } from '../../AppTheme';
import { selectDownloadingProcessModal } from '../../Features/Modal/modalSlice';
import { useAppLanguage } from '../../Hooks/useAppLagnuage';

/**
 * DownloadingProcessModal - Shows download progress
 * Cannot be closed by user during downloads
 */
const DownloadingProcessModal = () => {
  const { i18n } = useAppLanguage();
  const modalState = useSelector(selectDownloadingProcessModal);

  const {
    visible,
    currentVideoName,
    currentVideoProgress,
    totalVideos,
    completedVideos,
  } = modalState;

  if (!visible) return null;

  const nextVideoNumber = completedVideos + 1; // Currently downloading video number
  const progressPercentage = Math.round(currentVideoProgress || 0);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => {
        // Prevent closing - user cannot dismiss during downloads
        console.log('[DownloadingProcessModal] Cannot close during download');
      }}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Modal Title */}
          <Text style={styles.title}>ডাউনলোড হচ্ছে</Text>

          {/* Warning Message */}
          <View style={styles.warningContainer}>
            <Text style={styles.warningText}>ইন্টারনেট সংযোগ চালু রাখুন !</Text>
            <Text style={styles.warningText}>
              অনুগ্রহ পূর্বক মোবাইল এপ কার্যক্রম চালু রাখুন !
            </Text>
          </View>

          {/* Total Progress: X/Y */}
          <View style={styles.totalProgressContainer}>
            <Text style={styles.totalProgressText}>
              {completedVideos}/{totalVideos}
            </Text>
            <Text style={styles.totalProgressLabel}>ভিডিও ডাউনলোড সম্পন্ন</Text>
          </View>

          {/* Current Video Info */}
          <View style={styles.currentVideoContainer}>
            <Text style={styles.currentVideoLabel}>
              বর্তমান ভিডিও ({nextVideoNumber}/{totalVideos}):
            </Text>
            <Text style={styles.currentVideoName} numberOfLines={2}>
              {currentVideoName || 'Loading...'}
            </Text>
          </View>

          {/* Single File Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBarBackground}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${progressPercentage}%` },
                ]}
              />
            </View>
            <Text style={styles.progressPercentage}>{progressPercentage}%</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: ThemeColors.colorWhite,
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: ThemeColors.colorBlack,
    marginBottom: 16,
    textAlign: 'center',
  },
  warningContainer: {
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    width: '100%',
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
    marginVertical: 2,
  },
  totalProgressContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  totalProgressText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: ThemeColors.colorPrimary || '#007AFF',
  },
  totalProgressLabel: {
    fontSize: 14,
    color: ThemeColors.colorGray,
    marginTop: 4,
  },
  currentVideoContainer: {
    width: '100%',
    marginBottom: 16,
  },
  currentVideoLabel: {
    fontSize: 12,
    color: ThemeColors.colorGray,
    marginBottom: 4,
  },
  currentVideoName: {
    fontSize: 16,
    fontWeight: '600',
    color: ThemeColors.colorBlack,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressBarBackground: {
    width: '100%',
    height: 12,
    backgroundColor: '#E0E0E0',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: ThemeColors.colorPrimary || '#007AFF',
    borderRadius: 6,
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: 'bold',
    color: ThemeColors.colorBlack,
  },
});

export default DownloadingProcessModal;
```

**Export**: Add to `App/Components/index.js`

```javascript
export { default as DownloadingProcessModal } from './Modal/DownloadingProcessModal';
```

---

### 1.3 Modify ErrorModal to CustomErrorModal

**File**: `App/Components/Modal/ErrorModal.js`

**Changes**:

1. Update button text to "আবার চেষ্ট্রা করুন"
2. Ensure cancel button is always visible
3. Accept retry action from parent

**No major code changes needed** - your existing `ErrorModal.js` already supports this!
Just ensure the retry button text uses Bengali translation.

---

## PHASE 2: Update Redux State

### 2.1 Update modalSlice.js

**File**: `App/Features/Modal/modalSlice.js`

**Add to initialState**:

```javascript
const initialState = {
  // ... existing states ...

  // NEW: Downloading Process Modal States
  downloadingProcessModal: {
    visible: false,
    currentVideoName: '',
    currentVideoProgress: 0, // 0-100%
    totalVideos: 0, // Total videos to download
    completedVideos: 0, // Videos already downloaded
  },
};
```

**Add new reducers**:

```javascript
// Downloading Process Modal Actions
showDownloadingProcessModal: (state, action) => {
  const {
    currentVideoName = '',
    currentVideoProgress = 0,
    totalVideos = 0,
    completedVideos = 0,
  } = action.payload;

  state.downloadingProcessModal = {
    visible: true,
    currentVideoName,
    currentVideoProgress,
    totalVideos,
    completedVideos,
  };
  state.isAnyModalVisible = true;

  console.log('[ModalSlice] Showing downloading process modal:', {
    currentVideoName,
    totalVideos,
    completedVideos,
  });
},

hideDownloadingProcessModal: state => {
  state.downloadingProcessModal = {
    ...initialState.downloadingProcessModal,
    visible: false,
  };
  state.isAnyModalVisible = state.errorModal.visible || state.storageModal.visible;

  console.log('[ModalSlice] Hiding downloading process modal');
},

updateDownloadingProcessModal: (state, action) => {
  const {
    currentVideoName,
    currentVideoProgress,
    totalVideos,
    completedVideos,
  } = action.payload;

  if (state.downloadingProcessModal.visible) {
    if (currentVideoName !== undefined) {
      state.downloadingProcessModal.currentVideoName = currentVideoName;
    }
    if (currentVideoProgress !== undefined) {
      state.downloadingProcessModal.currentVideoProgress = currentVideoProgress;
    }
    if (totalVideos !== undefined) {
      state.downloadingProcessModal.totalVideos = totalVideos;
    }
    if (completedVideos !== undefined) {
      state.downloadingProcessModal.completedVideos = completedVideos;
    }

    console.log('[ModalSlice] Updated downloading process modal:', action.payload);
  }
},
```

**Add selector**:

```javascript
export const selectDownloadingProcessModal = state =>
  state.modalStore?.downloadingProcessModal ||
  initialState.downloadingProcessModal;
```

**Export actions**:

```javascript
export const {
  // ... existing exports ...
  showDownloadingProcessModal,
  hideDownloadingProcessModal,
  updateDownloadingProcessModal,
} = modalSlice.actions;
```

---

### 2.2 Update VideosSlice.js

**File**: `App/Features/Videos/VideosSlice.js`

**Add to initialState**:

```javascript
const initialState = {
  // ... existing states ...

  // NEW: Download tracking for modal
  totalVideosToDownload: 0, // Total NEW videos to download
  videosDownloaded: 0, // Videos successfully downloaded in current session
  isDownloadingInModal: false, // Flag to indicate modal download is active
};
```

**Add new reducers**:

```javascript
// Set total videos to download for modal tracking
setTotalVideosToDownload: (state, action) => {
  const total = action.payload;
  if (typeof total === 'number' && total >= 0) {
    state.totalVideosToDownload = total;
    state.videosDownloaded = 0; // Reset counter when setting new total
    console.log(`[VideosSlice] Total videos to download: ${total}`);
  }
},

// Increment downloaded count for modal
incrementVideosDownloaded: state => {
  state.videosDownloaded += 1;
  console.log(
    `[VideosSlice] Videos downloaded: ${state.videosDownloaded}/${state.totalVideosToDownload}`,
  );
},

// Set downloading in modal flag
setDownloadingInModal: (state, action) => {
  const isDownloading = action.payload;
  if (typeof isDownloading === 'boolean') {
    state.isDownloadingInModal = isDownloading;
    console.log(`[VideosSlice] Downloading in modal: ${isDownloading}`);
  }
},

// Reset download tracking
resetDownloadTracking: state => {
  state.totalVideosToDownload = 0;
  state.videosDownloaded = 0;
  state.isDownloadingInModal = false;
  console.log('[VideosSlice] Reset download tracking');
},
```

**Export new actions**:

```javascript
export const {
  // ... existing exports ...
  setTotalVideosToDownload,
  incrementVideosDownloaded,
  setDownloadingInModal,
  resetDownloadTracking,
} = videoSlice.actions;
```

---

## PHASE 3: Modify DownloadManager

### 3.1 Update DownloadManager.js

**File**: `App/Service/DownloadManager.js`

**Add new callback for modal updates**:

```javascript
class DownloadManager {
  constructor() {
    // ... existing code ...
    this.modalCallback = null; // NEW: Callback for modal updates
  }

  /**
   * NEW: Set modal callback for download progress modal
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
   * NEW: Update modal with current download info
   * @private
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

  // ... rest of existing code ...
}
```

**Modify processQueue method to track total/completed**:

```javascript
async processQueue() {
  try {
    if (this.isProcessing) {
      console.warn(`${this.logPrefix} Queue processing already active`);
      return false;
    }

    this.isProcessing = true;
    const totalVideos = this.downloadQueue.length; // NEW: Track total
    let completedVideos = 0; // NEW: Track completed

    console.log(
      `${this.logPrefix} Starting queue processing with ${totalVideos} videos`,
    );

    while (this.downloadQueue.length > 0) {
      const video = this.downloadQueue.shift();

      if (!video || typeof video.id === 'undefined') {
        console.warn(`${this.logPrefix} Invalid video in queue, skipping`);
        continue;
      }

      console.log(
        `${this.logPrefix} Processing video ${video.id}: ${video.name}`,
      );

      this.currentDownload = video;
      this._updateStatus(video.id, 'DOWNLOADING');

      // NEW: Update modal with current video info
      this._updateModal(video.name, 0, totalVideos, completedVideos);

      const success = await this.downloadVideo(video);

      if (success) {
        console.log(
          `${this.logPrefix} Successfully downloaded video ${video.id}`,
        );
        this._updateStatus(video.id, 'DOWNLOADED');
        completedVideos++; // NEW: Increment completed count

        // NEW: Update modal with completed count
        this._updateModal(video.name, 100, totalVideos, completedVideos);
      } else {
        console.error(
          `${this.logPrefix} Failed to download video ${video.id}`,
        );
        this._updateStatus(video.id, 'FAILED');
      }

      this.currentDownload = null;
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
```

**Modify \_performDownload to update modal progress**:

```javascript
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

              // Update Redux progress
              this._updateProgress(videoId, roundedProgress);

              // NEW: Update modal progress (if currently downloading video)
              if (this.currentDownload && this.currentDownload.id === videoId) {
                const totalVideos = this.downloadQueue.length + 1; // Remaining + current
                const completedVideos = 0; // Will be updated in processQueue
                this._updateModal(
                  this.currentDownload.name,
                  roundedProgress,
                  totalVideos,
                  completedVideos,
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

      // ... rest of existing download code ...
    } catch (error) {
      console.error(`${this.logPrefix} Error setting up download:`, error);
      resolve({ success: false, error: error.message });
    }
  });
}
```

---

## PHASE 4: Update VideoList.js

### 4.1 Major Changes to VideoList.js

**File**: `App/UiViews/VideoList.js`

**Add new imports**:

```javascript
import { CustomLoader, DownloadingProcessModal } from '../Components';
import {
  hideDownloadingProcessModal,
  showDownloadingProcessModal,
  updateDownloadingProcessModal,
} from '../Features/Modal/modalSlice';
import {
  incrementVideosDownloaded,
  resetDownloadTracking,
  setDownloadingInModal,
  setTotalVideosToDownload,
} from '../Features/Videos/VideosSlice';
```

**Add new state**:

```javascript
// NEW: Loader state
const [showLoader, setShowLoader] = useState(false);
```

**Modify initialization effect**:

```javascript
useEffect(() => {
  const initializeApp = async () => {
    try {
      // NEW: Show loader during initialization
      setShowLoader(true);

      await FileSystemService.initializeVideoDirectory();
      dispatch(loadAppConfigThunk());
      dispatch(loadLocalVideosThunk());

      setIsInitialized(true);

      // NEW: Keep loader visible until data is ready
      // Will be hidden after API call or local load completes
    } catch (error) {
      setIsInitialized(true);
      setShowLoader(false); // Hide on error
    }
  };

  if (!isInitialized) {
    initializeApp();
  }
}, [dispatch, isInitialized]);
```

**Modify API fetch effect** (ONLINE mode):

```javascript
useEffect(() => {
  const fetchAndPrepare = async () => {
    if (
      isOnline &&
      isInitialized &&
      !isLoading &&
      videos.length === 0 &&
      !isError
    ) {
      try {
        // Loader already showing from initialization

        // Fetch API videos
        await dispatch(fetchVideosThunk()).unwrap();

        // Data will merge in next effect
        // Loader will hide after merge completes
      } catch (error) {
        console.error('[VideoList] Error fetching videos:', error);
        setShowLoader(false); // Hide loader on error
      }
    }
  };

  fetchAndPrepare();
}, [isOnline, isInitialized, dispatch]);
```

**Modify merge effect** (with loader and modal logic):

```javascript
useEffect(() => {
  const mergeVideos = async () => {
    const currentMergeKey = `${videos.length}-${
      Object.keys(localVideos || {}).length
    }-${videosWithStatus.length}`;

    if (currentMergeKey === lastMergeKey) {
      console.log('[VideoList] Skipping merge - data unchanged');
      return;
    }

    if (
      videos &&
      videos.length > 0 &&
      localVideos &&
      typeof localVideos === 'object' &&
      !isProcessing &&
      (videosWithStatus.length === 0 || currentMergeKey !== lastMergeKey)
    ) {
      try {
        setIsProcessing(true);
        console.log('[VideoList] Merging API videos with local status...');

        const mergedVideos = await VideoComparison.mergeVideosWithLocalStatus(
          videos,
          localVideos,
        );

        if (
          mergedVideos &&
          Array.isArray(mergedVideos) &&
          mergedVideos.length > 0
        ) {
          dispatch(setVideosWithStatus(mergedVideos));
          setLastMergeKey(currentMergeKey);

          // NEW: Hide loader after merge completes
          setShowLoader(false);

          console.log(
            `[VideoList] Merged ${mergedVideos.length} videos with status`,
          );
        } else {
          console.warn('[VideoList] No videos after merge operation');
          setShowLoader(false);
        }
      } catch (error) {
        console.error('[VideoList] Error merging videos:', error);
        setShowLoader(false);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  mergeVideos();
}, [videos, localVideos, dispatch]);
```

**REPLACE auto-download effect with modal-based download**:

```javascript
// NEW: Auto-download with modal
useEffect(() => {
  const triggerModalDownload = async () => {
    if (
      videosWithStatus &&
      videosWithStatus.length > 0 &&
      autoDownloadEnabled &&
      isOnline &&
      !currentDownload &&
      !isProcessing &&
      isInitialized &&
      !showLoader // NEW: Wait for loader to hide
    ) {
      const newVideos = videosWithStatus.filter(
        video =>
          video.status === 'NEW' &&
          video.id !== undefined &&
          video.id !== null &&
          (video.filepath || video.video_url),
      );

      if (newVideos.length > 0) {
        console.log(
          `[VideoList] Starting modal-based download for ${newVideos.length} new videos`,
        );

        // NEW: Set download tracking
        dispatch(setTotalVideosToDownload(newVideos.length));
        dispatch(setDownloadingInModal(true));

        // NEW: Show downloading process modal
        dispatch(
          showDownloadingProcessModal({
            currentVideoName: newVideos[0].name,
            currentVideoProgress: 0,
            totalVideos: newVideos.length,
            completedVideos: 0,
          }),
        );

        // Setup DownloadManager with modal callback
        const downloadManager = DownloadManager.getInstance();

        // Modal callback - updates modal in real-time
        downloadManager.setModalCallback(
          (videoName, progress, totalVideos, completedVideos) => {
            dispatch(
              updateDownloadingProcessModal({
                currentVideoName: videoName,
                currentVideoProgress: progress,
                totalVideos: totalVideos,
                completedVideos: completedVideos,
              }),
            );
          },
        );

        // Status callback - track completed downloads
        downloadManager.setStatusCallback((videoId, status, localFilePath) => {
          dispatch(updateVideoStatus({ videoId, status }));

          if (status === 'DOWNLOADED') {
            dispatch(incrementVideosDownloaded());

            // Update modal with new completed count
            const currentState = store.getState();
            const { videosDownloaded, totalVideosToDownload } =
              currentState.videosStore;

            dispatch(
              updateDownloadingProcessModal({
                completedVideos: videosDownloaded,
              }),
            );

            // Check if all downloads complete
            if (videosDownloaded >= totalVideosToDownload) {
              // All downloads complete!
              console.log('[VideoList] All downloads completed!');

              // Hide modal
              dispatch(hideDownloadingProcessModal());
              dispatch(setDownloadingInModal(false));
              dispatch(resetDownloadTracking());
            }
          } else if (status === 'FAILED') {
            // Handle download error
            console.error(`[VideoList] Download failed for video ${videoId}`);

            // Hide downloading modal
            dispatch(hideDownloadingProcessModal());
            dispatch(setDownloadingInModal(false));

            // Show error modal
            dispatch(
              showErrorModal({
                title: 'ডাউনলোড ব্যর্থ',
                message: 'ডাউনলোড করার সময় সমস্যা হয়েছে।',
                type: 'download_error',
                retryAction: () => {
                  // Retry from remaining videos
                  console.log('[VideoList] Retrying failed downloads...');

                  // Show loader
                  setShowLoader(true);

                  // Reload and retry
                  setTimeout(() => {
                    dispatch(fetchVideosThunk());
                  }, 500);
                },
                canCancel: true,
              }),
            );
          }

          if (status === 'DOWNLOADING') {
            dispatch(setCurrentDownload(videoId));
          } else if (status === 'DOWNLOADED' || status === 'FAILED') {
            dispatch(setCurrentDownload(null));
          }
        });

        // Start downloads
        try {
          await dispatch(startAutoDownloadThunk(videosWithStatus)).unwrap();
        } catch (error) {
          console.error('[VideoList] Download error:', error);

          // Hide modal and show error
          dispatch(hideDownloadingProcessModal());
          dispatch(setDownloadingInModal(false));

          dispatch(
            showErrorModal({
              title: 'ত্রুটি',
              message: 'ডাউনলোড শুরু করতে ব্যর্থ',
              type: 'download_error',
              retryAction: () => {
                setShowLoader(true);
                setTimeout(() => {
                  dispatch(fetchVideosThunk());
                }, 500);
              },
              canCancel: true,
            }),
          );
        }
      } else {
        console.log('[VideoList] No new videos to download');
      }
    }
  };

  const timeoutId = setTimeout(triggerModalDownload, 1000);
  return () => clearTimeout(timeoutId);
}, [
  videosWithStatus,
  autoDownloadEnabled,
  isOnline,
  isInitialized,
  showLoader,
  dispatch,
]);
```

**Modify offline mode to show loader**:

```javascript
if (!isOnline) {
  // Show loader while loading local videos
  if (
    !isInitialized ||
    (localVideos && Object.keys(localVideos).length === 0)
  ) {
    return (
      <View style={styles.container}>
        <CustomLoader visible={true} />
      </View>
    );
  }

  // Show offline videos
  return (
    <View style={styles.container}>
      <OfflineHeader downloadedCount={downloadedCount} />
      <VideoListRenderer
        videos={downloadedVideos}
        isOnline={isOnline}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      {/* Modals */}
      <DownloadingProcessModal />
    </View>
  );
}
```

**Update main render to include loader and modal**:

```javascript
return (
  <>
    <View style={styles.container}>{renderVideoList()}</View>

    {/* NEW: Full-screen loader */}
    <CustomLoader visible={showLoader} />

    {/* NEW: Downloading process modal */}
    <DownloadingProcessModal />
  </>
);
```

---

## PHASE 5: Update CardVideoListItem.js

### 5.1 Remove In-line Download Progress

**File**: `App/Components/Card/CardVideoListItem.js`

**REMOVE the downloading overlay** (keep status chips):

```javascript
// REMOVE THIS FUNCTION:
const renderDownloadingOverlay = () => {
  // DELETE THIS ENTIRE FUNCTION
  // Progress is now shown in modal, not on cards
};
```

**Update render**:

```javascript
return (
  <View style={styles.itemContainer}>
    {renderMainContent()}
    {/* REMOVED: renderDownloadingOverlay() */}
  </View>
);
```

**Keep status chips** - they still show NEW/DOWNLOADING/DOWNLOADED/FAILED status, but remove the progress percentage overlay.

---

## PHASE 6: Update App.js

### 6.1 Add New Modals to Root

**File**: `App.js`

```javascript
import React, { useEffect } from 'react';
import BootSplash from 'react-native-bootsplash';
import Toast from 'react-native-toast-message';
import { Provider } from 'react-redux';
import AppNavigation from './App/AppNavigation/CustomNavigation';

import DownloadInProgressModal from './App/Components/Modal/DownloadInProgressModal';
import DownloadingProcessModal from './App/Components/Modal/DownloadingProcessModal'; // NEW
import ErrorModal from './App/Components/Modal/ErrorModal';
import StorageModal from './App/Components/Modal/StorageModal';
import AppStore from './App/ReduxStore/store';

export default function App() {
  useEffect(() => {
    const timer = setTimeout(() => {
      BootSplash.hide({ fade: true });
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Provider store={AppStore}>
      <AppNavigation />
      {/* Modals */}
      <ErrorModal />
      <StorageModal />
      <DownloadInProgressModal />
      <DownloadingProcessModal /> {/* NEW */}
      {/* Toast Notifications */}
      <Toast />
    </Provider>
  );
}
```

---

## 📋 Summary of Changes

### ✅ Files to CREATE:

1. `App/Components/Loader/CustomLoader.js` - Full-screen loader
2. `App/Components/Modal/DownloadingProcessModal.js` - Download progress modal

### ✏️ Files to MODIFY:

1. `App/Features/Modal/modalSlice.js` - Add downloading process modal state
2. `App/Features/Videos/VideosSlice.js` - Add download tracking state
3. `App/Service/DownloadManager.js` - Add modal callback
4. `App/UiViews/VideoList.js` - Integrate loader and modal logic
5. `App/Components/Card/CardVideoListItem.js` - Remove in-line progress
6. `App/Components/index.js` - Export new components
7. `App.js` - Add DownloadingProcessModal to root

### 🔄 Behavior Changes:

- **Before**: Progress shown on each card
- **After**: Progress shown in centralized modal

- **Before**: User can browse while downloading
- **After**: Modal blocks interaction during downloads

- **Before**: Per-video retry buttons
- **After**: Single error modal with global retry

---

## 🎯 Testing Checklist

### Test 1: First-Time User (Online)

- [ ] App opens → CustomLoader shows
- [ ] API call completes → Loader hides
- [ ] DownloadingProcessModal appears
- [ ] Downloads progress with X/Y count
- [ ] Modal shows video name and progress %
- [ ] Modal auto-hides when complete
- [ ] Video list displays

### Test 2: First-Time User (Offline)

- [ ] App opens → CustomLoader shows
- [ ] Local videos load → Loader hides
- [ ] No modal appears
- [ ] Only message about no internet

### Test 3: Returning User (Online, New Videos)

- [ ] App opens → CustomLoader shows
- [ ] API call → Merge happens → Loader hides
- [ ] DownloadingProcessModal shows (e.g., "7/9")
- [ ] Only NEW videos download
- [ ] Modal updates progress
- [ ] Modal hides when complete

### Test 4: Pull-to-Refresh

- [ ] User pulls → CustomLoader shows
- [ ] API call → Data merges → Loader hides
- [ ] If new videos exist → Modal appears
- [ ] Downloads progress shown in modal

### Test 5: Download Error

- [ ] Download fails during modal
- [ ] DownloadingProcessModal hides
- [ ] CustomErrorModal appears
- [ ] User clicks "আবার চেষ্ট্রা করুন"
- [ ] CustomLoader shows → API call
- [ ] DownloadingProcessModal reappears
- [ ] Downloads resume from remaining videos

### Test 6: Offline Mode

- [ ] No internet → CustomLoader shows
- [ ] Local videos load → Loader hides
- [ ] No modals appear
- [ ] Only downloaded videos shown

---

## 🚨 Important Notes

### What NOT to Change:

- ❌ Don't modify `DownloadManager.js` queue logic (sequential processing)
- ❌ Don't change `LocalStorageService.js` or `FileSystemService.js`
- ❌ Don't alter video status flow (NEW → DOWNLOADING → DOWNLOADED/FAILED)
- ❌ Don't change `ServerSyncService.js` cleanup logic

### What IS Changing:

- ✅ UI/UX only - downloads still work the same way
- ✅ Progress display location (cards → modal)
- ✅ Loading states (text → full-screen loader)
- ✅ Error handling (per-video → global modal)
- ✅ User experience (free browsing → guided flow)

---

## 🎨 Design Specifications

### CustomLoader:

- Background: `rgba(0, 0, 0, 0.5)` (50% transparent black)
- ActivityIndicator color: `#00ff00` (green)
- z-index: `9999` (above everything)
- Position: Absolute full-screen

### DownloadingProcessModal:

- Title: "ডাউনলোড হচ্ছে" (24px, bold)
- Warning: Yellow background (#FFF3CD)
- Total progress: Large text (36px) - "X/Y"
- Current video: 16px
- Progress bar: 12px height, primary color fill
- Cannot be dismissed by user

### CustomErrorModal:

- Retry button: "আবার চেষ্ট্রা করুন"
- Cancel button: Always visible
- Same error modal styling as existing

---

## 🔄 Migration Timeline

1. **Phase 1** (1-2 hours): Create CustomLoader + DownloadingProcessModal components
2. **Phase 2** (30 min): Update Redux slices (modalSlice + VideosSlice)
3. **Phase 3** (1 hour): Modify DownloadManager with modal callbacks
4. **Phase 4** (2-3 hours): Refactor VideoList.js with new flow
5. **Phase 5** (30 min): Update CardVideoListItem to remove overlay
6. **Phase 6** (15 min): Add modal to App.js
7. **Testing** (2-3 hours): Test all scenarios

**Total estimated time**: 7-10 hours

---

## ✅ Completion Criteria

When migration is complete, you should have:

1. ✅ CustomLoader component working
2. ✅ DownloadingProcessModal displaying download progress
3. ✅ No in-line progress overlays on video cards
4. ✅ Full-screen loader during API calls
5. ✅ Modal-based error handling with retry
6. ✅ Seamless transition: Loader → Data → Modal → List
7. ✅ All existing functionality preserved
8. ✅ Downloads still sequential (0→1→2→3)
9. ✅ Offline mode still works
10. ✅ Pull-to-refresh still works

---

**END OF MIGRATION GUIDE**
