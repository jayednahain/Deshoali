# 🚀 Deshoali App - 6 Phase Implementation Plan

---

## 📋 Overview

This document outlines the complete implementation plan divided into 6 phases. Each phase builds upon the previous one, ensuring clean code and maintainable architecture.

**Current Status:** ✅ Basic structure exists (Redux, API, UI components)

**Goal:** Implement full video download management system with offline support

---

## 🎯 Phase 1: Local Storage & Video State Management

**Goal:** Set up foundation for tracking downloaded videos and their states

### **Dependencies to Install:**

```bash
npm install @react-native-async-storage/async-storage react-native-fs
```

### **Steps:**

#### 1.1 Create Local Storage Service

- **File:** `App/Service/LocalStorageService.js`
- **Purpose:** Manage AsyncStorage operations for video metadata
- **Functions:**
  - `saveVideoMetadata(videoId, videoData)` - Save video info to storage
  - `getVideoMetadata(videoId)` - Get single video info
  - `getAllLocalVideos()` - Get all downloaded videos
  - `updateVideoStatus(videoId, status)` - Update download status
  - `updateVideoProgress(videoId, progress)` - Update download progress
  - `removeVideoMetadata(videoId)` - Delete video record
  - `clearAllVideos()` - Clear all storage (testing purpose)

#### 1.2 Create File System Service

- **File:** `App/Service/FileSystemService.js`
- **Purpose:** Handle file operations using react-native-fs
- **Functions:**
  - `getStoragePath()` - Get current storage location
  - `checkFileExists(filePath)` - Verify file exists
  - `deleteVideoFile(filePath)` - Delete video file
  - `getFileSize(filePath)` - Get file size
  - `checkAvailableSpace()` - Check free storage (1GB minimum)
  - `createVideoDirectory()` - Create folder for videos

#### 1.3 Update VideosSlice (Redux)

- **File:** `App/Features/Videos/VideosSlice.js`
- **Add New State:**
  ```javascript
  {
    videos: [],              // API videos
    localVideos: {},         // Map of downloaded videos {videoId: videoData}
    currentDownload: null,   // Currently downloading video ID
    downloadQueue: [],       // Queue of video IDs to download
    isOnline: true,
    videosWithStatus: [],    // Merged API + local videos with status
  }
  ```
- **Add New Reducers:**
  - `setLocalVideos` - Load local videos from storage
  - `setVideosWithStatus` - Set merged video list
  - `setCurrentDownload` - Track current download
  - `updateVideoStatus` - Change video state (NEW/DOWNLOADING/DOWNLOADED/FAILED)
  - `updateDownloadProgress` - Update progress percentage
  - `addToDownloadQueue` - Add video to queue
  - `removeFromDownloadQueue` - Remove from queue

#### 1.4 Create Video Comparison Logic

- **File:** `App/Utils/VideoComparison.js`
- **Purpose:** Compare API videos with local storage
- **Functions:**
  - `mergeVideosWithLocalStatus(apiVideos, localVideos)` - Merge and assign status
  - `getNewVideos(videosWithStatus)` - Filter NEW videos
  - `getDownloadedVideos(videosWithStatus)` - Filter DOWNLOADED videos
  - `getFailedVideos(videosWithStatus)` - Filter FAILED videos

#### 1.5 Update Language.json

- **File:** `App/AppAssets/StaticData/Language.json`
- **Add Missing Translations:**
  ```json
  {
    "downloading": {
      "english": "Downloading...",
      "bangla": "ডাউনলোড হচ্ছে..."
    },
    "new_video": { "english": "New", "bangla": "নতুন" },
    "failed": { "english": "Failed", "bangla": "ব্যর্থ" },
    "retry": { "english": "Retry", "bangla": "আবার চেষ্টা করুন" },
    "no_internet": {
      "english": "No Internet Connection",
      "bangla": "ইন্টারনেট কানেকশন নেই। ভিডিও ডাউনলোড করা যাচ্ছে না।"
    },
    "api_error": {
      "english": "Temporary problem. Please try again later",
      "bangla": "সাময়িক ভাবে সমস্যা হচ্ছে। কিছুক্ষন পর আবার চেষ্টা করুন"
    },
    "download_in_progress": {
      "english": "A video is currently downloading",
      "bangla": "বর্তমান এ একটি ভিডিও ডাউনলোড হচ্ছে। কিছুক্ষন পর আবার চেষ্টা করুন।"
    },
    "insufficient_storage": {
      "english": "Not enough storage space",
      "bangla": "আপনার মোবাইল মেমোরি তে পর্যাপ্ত পরিমান জায়গা নেই।"
    },
    "download_warning": {
      "english": "Don't close the app",
      "bangla": "অ্যাপ বন্ধ করবেন না"
    },
    "ok": { "english": "OK", "bangla": "ঠিক আছে" },
    "cancel": { "english": "Cancel", "bangla": "বাতিল করুন" }
  }
  ```

### **Testing Phase 1:**

- ✅ Save dummy video metadata to AsyncStorage
- ✅ Retrieve and verify data
- ✅ Check file system operations work
- ✅ Verify Redux state updates correctly

---

## 🎯 Phase 2: Download Manager & Sequential Download Logic

**Goal:** Implement core download functionality with sequential processing

### **Steps:**

#### 2.1 Create Download Manager Service

- **File:** `App/Service/DownloadManager.js`
- **Purpose:** Manage all download operations
- **Features:**
  - Sequential download queue processing
  - Progress tracking
  - Error handling
  - Retry mechanism
- **Functions:**
  - `startDownload(video)` - Start downloading single video
  - `processDownloadQueue(videos)` - Process queue sequentially
  - `pauseDownload()` - Pause current download
  - `resumeDownload(videoId)` - Resume failed download
  - `cancelDownload(videoId)` - Cancel download
  - `retryFailedDownload(videoId)` - Retry failed video

#### 2.2 Create Download Progress Hook

- **File:** `App/Hooks/useDownloadManager.js`
- **Purpose:** React hook to interact with download manager
- **Returns:**
  - `startSequentialDownloads(videos)` - Start auto downloads
  - `retryDownload(videoId)` - Retry single video
  - `currentDownload` - Currently downloading video
  - `downloadProgress` - Progress map {videoId: progress%}

#### 2.3 Update VideosSlice with Download Actions

- **Add Async Thunks:**
  - `startDownloadThunk(videoId)` - Start download
  - `retryDownloadThunk(videoId)` - Retry failed download
  - `loadLocalVideosThunk()` - Load from AsyncStorage on app start

#### 2.4 Update VideoList.js

- **Add Download Logic:**
  - Load local videos on mount
  - Compare API videos with local storage
  - Trigger auto-download for NEW videos
  - Display videos with correct status

#### 2.5 Update CardVideoListItem.js

- **Dynamic Status Display:**
  - Show correct status based on video state
  - Display progress percentage for DOWNLOADING videos
  - Show retry button for FAILED videos
  - Disable click for non-DOWNLOADED videos
  - Add warning text during downloads

#### 2.6 Create App Config Slice

- **File:** `App/Features/Config/appConfigSlice.js`
- **Purpose:** Store app-wide configuration
- **State:**
  ```javascript
  {
    allowMultipleDownloads: false,  // Control simultaneous downloads
    storageLocation: 'phone',       // 'phone' or 'sdcard'
    hasCheckedStorage: false,       // First-time storage check flag
  }
  ```

### **Testing Phase 2:**

- ✅ Download single video successfully
- ✅ Verify sequential download (0 → 1 → 2)
- ✅ Test failed download → skip to next
- ✅ Test retry functionality
- ✅ Verify progress updates in real-time

---

## 🎯 Phase 3: Error Handling, Modals & Offline Support

**Goal:** Complete error handling, UI feedback, and offline mode

### **Steps:**

#### 3.1 Create Error Modal Components

- **File:** `App/Components/Modal/ErrorModal.js`
- **Purpose:** Show API errors with retry option
- **Variants:**
  - New user + API error → Retry button
  - Existing user + API error → Bottom sheet with "Cancel" & "Retry"

#### 3.2 Create Insufficient Storage Modal

- **File:** `App/Components/Modal/StorageModal.js`
- **Purpose:** Show when storage < 1GB
- **Actions:**
  - Exit app button
  - Check storage on app open

#### 3.3 Create Download Warning Modal

- **File:** `App/Components/Modal/DownloadInProgressModal.js`
- **Purpose:** Show when user tries to download while another is downloading
- **Message:** "বর্তমান এ একটি ভিডিও ডাউনলোড হচ্ছে। কিছুক্ষন পর আবার চেষ্টা করুন।"

#### 3.4 Implement Pull-to-Refresh

- **File:** Update `App/UiViews/VideoList.js`
- **Add:** RefreshControl component
- **Action:** Re-fetch API videos

#### 3.5 Enhance Offline Mode

- **Logic:**
  - Check network on app open
  - Show only DOWNLOADED videos when offline
  - Display offline message/indicator
  - Handle offline during download (stop & mark as failed)

#### 3.6 Update Error Handling in VideosSlice

- **Handle:**
  - Network errors
  - API errors
  - Download errors
  - Storage errors

#### 3.7 Add Toast Notifications

- **Install:** `react-native-toast-message`
- **Messages:**
  - "ভিডিও ডাউনলোড চলছে" (when app goes to background)
  - "ভিডিও ডাউনলোড batil kor hoyeche" (when app closes during download)

### **Testing Phase 3:**

- ✅ Test offline mode shows only downloaded videos
- ✅ Verify error modals appear correctly
- ✅ Test pull-to-refresh
- ✅ Verify storage check on app open
- ✅ Test download error → shows failed state + retry

---

## 🎯 Phase 4: Search & Filter Functionality

**Goal:** Implement search bar and filter checkboxes

### **Steps:**

#### 4.1 Create Search Bar Component

- **File:** `App/Components/Search/SearchBar.js`
- **Features:**
  - Input field with clear button
  - Search icon
  - Bengali placeholder: "খোঁজ করুন" / English: "Search"
  - Minimum 3 characters to trigger search

#### 4.2 Create Filter Checkboxes Component

- **File:** `App/Components/Filter/FilterCheckboxes.js`
- **Options:**
  - ☐ Downloaded (ডাউনলোড হয়েছে)
  - ☐ Downloading (ডাউনলোড হচ্ছে) - Disabled when offline
  - ☐ New (নতুন) - Disabled when offline
- **Behavior:**
  - Radio button style (single selection only)
  - Default: All videos shown (no selection)

#### 4.3 Add Search & Filter State to VideosSlice

- **New State:**
  ```javascript
  {
    searchQuery: '',
    selectedFilter: null,  // null, 'DOWNLOADED', 'DOWNLOADING', 'NEW'
    filteredVideos: [],    // Videos after search + filter applied
  }
  ```
- **New Reducers:**
  - `setSearchQuery(query)`
  - `setSelectedFilter(filter)`
  - `applyFilters()` - Combine search + filter logic

#### 4.4 Create Filter Utility

- **File:** `App/Utils/FilterVideos.js`
- **Functions:**
  - `searchVideos(videos, query)` - Search by title (case-insensitive)
  - `filterByStatus(videos, status)` - Filter by status
  - `applySearchAndFilter(videos, query, status)` - Combined logic

#### 4.5 Update VideoList.js

- **Add:**
  - Search bar at top
  - Filter checkboxes below search
  - Display filtered videos in FlatList
  - Real-time search (debounced)

#### 4.6 Handle Offline Filter Behavior

- **Logic:**
  - When offline, disable "Downloading" and "New" checkboxes
  - Only allow "Downloaded" filter when offline

### **Testing Phase 4:**

- ✅ Search with <3 characters shows all videos
- ✅ Search with ≥3 characters filters correctly
- ✅ Filter by Downloaded/Downloading/New works
- ✅ Search + Filter combination works
- ✅ Offline mode disables correct checkboxes

---

## 🎯 Phase 5: Background Downloads & App State Management

**Goal:** Handle background downloads and app state changes

### **Dependencies:**

```bash
npm install react-native-background-fetch
# For Android foreground service
npm install react-native-background-actions
```

### **Steps:**

#### 5.1 Create Background Download Service

- **File:** `App/Service/BackgroundDownloadService.js`
- **Purpose:** Continue downloads when app is minimized
- **Features:**
  - Foreground service (Android)
  - Background task (iOS)
  - Handle app state changes

#### 5.2 Update useAppStatus Hook

- **File:** `App/Hooks/useAppStatus.js`
- **Add:**
  - Monitor app state changes (active → background → inactive)
  - Trigger appropriate actions on state change

#### 5.3 Implement App State Handling Logic

- **File:** `App/Utils/AppStateHandler.js`
- **Handle:**
  - **Active → Background:**
    - Continue downloads
    - Show toast: "ভিডিও ডাউনলোড চলছে"
  - **Background → Active:**
    - Resume download if interrupted
    - Refresh UI
  - **App Closed (killed):**
    - Stop downloads
    - Show toast: "ভিডিও ডাউনলোড batil kor hoyeche"
    - Remove failed video from storage

#### 5.4 Create Toast Service

- **File:** `App/Service/ToastService.js`
- **Purpose:** Centralized toast notifications
- **Functions:**
  - `showDownloadingToast()` - Show when background download starts
  - `showCancelledToast()` - Show when download cancelled
  - `showSuccessToast(message)` - Generic success
  - `showErrorToast(message)` - Generic error

#### 5.5 Update Download Manager

- **Add:**
  - Pause download when app goes to background (if needed)
  - Resume download when app becomes active
  - Handle network loss during download
  - Clean up failed downloads on app close

#### 5.6 Implement Download Cleanup Logic

- **File:** `App/Utils/DownloadCleanup.js`
- **Purpose:** Clean up incomplete downloads
- **Actions:**
  - Remove failed video metadata when app closes during download
  - Delete partial video files

### **Testing Phase 5:**

- ✅ Minimize app → download continues
- ✅ Close app → download stops, metadata removed
- ✅ Network loss during download → marked as failed
- ✅ Toast notifications appear correctly
- ✅ Foreground service keeps download alive

---

## 🎯 Phase 6: Video Player & Storage Selection

**Goal:** Complete video playback and initial storage setup

### **Dependencies:**

```bash
npm install react-native-video
npm install react-native-orientation-locker  # For fullscreen
```

### **Steps:**

#### 6.1 Create Storage Selection Screen

- **File:** `App/UiViews/StorageSelection.js`
- **Purpose:** First-time setup to choose storage location
- **UI:**
  - Two options: Phone / SD Card
  - Radio buttons
  - Confirm button
- **Logic:**
  - Show only on first app open
  - Save selection to appConfig
  - Check if 1GB free space available
  - If insufficient → show error modal & exit

#### 6.2 Create Storage Check Logic

- **File:** `App/Utils/StorageChecker.js`
- **Functions:**
  - `checkStorageOnAppOpen()` - Check on every app open
  - `getAvailableSpace(location)` - Get free space
  - `isStorageSufficient()` - Check ≥1GB free
  - `showInsufficientStorageModal()` - Trigger modal

#### 6.3 Update App.js

- **Add:**
  - Check if storage selected
  - If not → show StorageSelection screen
  - If yes → check storage space → show VideoList

#### 6.4 Create Video Player Screen

- **File:** `App/UiViews/VideoPlayer.js`
- **Features:**
  - Play/Pause button
  - Seek bar (scrubbing)
  - Current time / Total duration
  - Fullscreen toggle
  - Display video metadata (title, description)
- **Navigation:**
  - Only accessible for DOWNLOADED videos
  - Pass video file path as param

#### 6.5 Create Video Player Controls

- **File:** `App/Components/VideoPlayer/PlayerControls.js`
- **Controls:**
  - Play/Pause icon
  - Progress slider
  - Time display
  - Fullscreen button
  - Back button

#### 6.6 Update CardVideoListItem.js

- **Add:**
  - `onPress` handler
  - Navigate to VideoPlayer if status === 'DOWNLOADED'
  - Show disabled state if not downloaded

#### 6.7 Add Video Player Navigation

- **File:** `App/AppNavigation/CustomNavigation.js`
- **Add:**
  - VideoPlayer screen to stack navigator
  - Pass video data as params

#### 6.8 Handle Video Playback Errors

- **Scenarios:**
  - File not found
  - Corrupted video file
  - Unsupported format
- **Action:**
  - Show error message
  - Offer to re-download

### **Testing Phase 6:**

- ✅ Storage selection shows on first open
- ✅ Storage check works (1GB minimum)
- ✅ Insufficient storage modal blocks app
- ✅ Video player opens for downloaded videos
- ✅ Play/Pause/Seek controls work
- ✅ Fullscreen mode works
- ✅ Non-downloaded videos are not clickable

---

## 🎉 Final Integration & Testing

### **Complete App Flow Test:**

1. **First-Time User:**

   - ✅ Open app → Storage selection
   - ✅ Check storage (1GB)
   - ✅ Call API → Show videos
   - ✅ Auto-download starts (0 → 1 → 2)
   - ✅ Progress updates in real-time

2. **Returning User:**

   - ✅ Open app → Load local videos
   - ✅ Call API → Compare with local
   - ✅ Download only NEW videos
   - ✅ Show all videos with correct status

3. **Offline Mode:**

   - ✅ Show only downloaded videos
   - ✅ Display offline message
   - ✅ Disable "Downloading" & "New" filters

4. **Download Scenarios:**

   - ✅ Sequential download works
   - ✅ Failed download → skip to next → show retry
   - ✅ Retry download works
   - ✅ Multiple download blocked (modal shows)

5. **Background Behavior:**

   - ✅ Minimize app → download continues → toast shows
   - ✅ Close app → download stops → toast shows

6. **Search & Filter:**

   - ✅ Search by title works (≥3 chars)
   - ✅ Filter by status works
   - ✅ Search + Filter combination works

7. **Video Playback:**

   - ✅ Only downloaded videos playable
   - ✅ Player controls work
   - ✅ Fullscreen works

8. **Error Handling:**
   - ✅ API error → modal with retry
   - ✅ Network loss during download → failed state
   - ✅ Insufficient storage → modal → exit app

---

## 📦 Summary of New Files to Create

### **Services:**

- `App/Service/LocalStorageService.js`
- `App/Service/FileSystemService.js`
- `App/Service/DownloadManager.js`
- `App/Service/BackgroundDownloadService.js`
- `App/Service/ToastService.js`

### **Utils:**

- `App/Utils/VideoComparison.js`
- `App/Utils/FilterVideos.js`
- `App/Utils/AppStateHandler.js`
- `App/Utils/DownloadCleanup.js`
- `App/Utils/StorageChecker.js`

### **Hooks:**

- `App/Hooks/useDownloadManager.js`

### **Components:**

- `App/Components/Modal/ErrorModal.js`
- `App/Components/Modal/StorageModal.js`
- `App/Components/Modal/DownloadInProgressModal.js`
- `App/Components/Search/SearchBar.js`
- `App/Components/Filter/FilterCheckboxes.js`
- `App/Components/VideoPlayer/PlayerControls.js`

### **Screens:**

- `App/UiViews/StorageSelection.js`
- `App/UiViews/VideoPlayer.js`

### **Redux Slices:**

- `App/Features/Config/appConfigSlice.js`
- Update: `App/Features/Videos/VideosSlice.js`

---

## 🚀 Let's Start!

**Current Phase:** Ready to begin Phase 1

**Next Steps:**

1. Install dependencies for Phase 1
2. Create LocalStorageService.js
3. Create FileSystemService.js
4. Update VideosSlice.js
5. Test storage operations

Let me know when you're ready to start Phase 1! 💪
