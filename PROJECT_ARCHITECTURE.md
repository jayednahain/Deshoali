# 📱 Deshoali - Project Architecture & Working Flow

**Version:** 0.0.1
**Framework:** React Native 0.81.4
**Language:** JavaScript/TypeScript
**State Management:** Redux with AsyncThunk
**Date:** November 2024

---

## 📑 Table of Contents

1. [Project Overview](#project-overview)
2. [Directory Structure](#directory-structure)
3. [Core Architecture](#core-architecture)
4. [Download System (Detailed)](#download-system-detailed)
5. [State Management (Redux)](#state-management-redux)
6. [Component Flow](#component-flow)
7. [Services & Utilities](#services--utilities)
8. [Network Resilience](#network-resilience)
9. [Error Handling](#error-handling)
10. [Development Flow](#development-flow)

---

## 🎯 Project Overview

**Deshoali** is a React Native video streaming and downloading application with the following key features:

- ✅ **Video Listing**: Display videos from API with offline support
- ✅ **Smart Downloading**: Sequential download queue with progress tracking
- ✅ **Video Player**: Full-featured video playback with Reanimated animations
- ✅ **Offline Mode**: Play downloaded videos without internet
- ✅ **Network Resilience**: Automatic pause/resume on network changes
- ✅ **Error Recovery**: Comprehensive crash reporting and error modals
- ✅ **Multi-language**: Bengali language support

**Target Platforms:**

- Android 7.0+ (Primary)
- iOS 12.0+ (Secondary)

---

## 📂 Directory Structure

```
Deshoali/
│
├── App/                              # Main application code
│   ├── AppAssets/                    # Static assets and data
│   │   ├── SvgLogos/                 # SVG components for icons
│   │   └── StaticData/
│   │       └── Language.json          # Multi-language translations (Bengali)
│   │
│   ├── AppLanguage/
│   │   └── i18n.js                   # Language configuration
│   │
│   ├── AppNavigation/
│   │   └── CustomNavigation.js        # React Navigation setup (Bottom Tabs + Stack)
│   │
│   ├── AppTheme/
│   │   ├── Colors.js                 # Theme color definitions (ThemeColors export)
│   │   ├── Style.js                  # Reusable style constants
│   │   ├── Typography.js             # Text styles and fonts
│   │   └── index.js                  # Theme exports
│   │
│   ├── Components/                   # Reusable UI components
│   │   ├── Button/                   # Custom button components
│   │   ├── Card/                     # Card components for listing
│   │   ├── Chip/                     # Small UI chips
│   │   ├── Header/                   # Header components
│   │   ├── List/                     # List rendering components
│   │   ├── Loader/                   # Loading spinners
│   │   ├── Modal/                    # Modal dialogs
│   │   │   ├── ErrorModal.js         # Display error messages (download, network)
│   │   │   ├── StorageModal.js       # Insufficient storage warning
│   │   │   ├── DownloadInProgressModal.js  # Download progress modal
│   │   │   ├── CrashReportModal.js   # Crash report with sharing
│   │   │   └── index.js              # Component exports
│   │   ├── Player/                   # Video player UI components
│   │   ├── Search/                   # Search UI components
│   │   └── index.js                  # All component exports
│   │
│   ├── Features/                     # Feature-specific modules
│   │   ├── Config/                   # Configuration module
│   │   ├── Connectivity/             # Network connectivity checks
│   │   ├── DeviceInfo/               # Device information utilities
│   │   ├── Modal/                    # Modal Redux slice
│   │   └── Videos/
│   │       ├── VideosSlice.js        # Redux slice for video state
│   │       └── VideosAPI.js          # API calls to fetch videos
│   │
│   ├── Hooks/                        # Custom React hooks
│   │   ├── useAppLanguage.js         # Language hook
│   │   ├── useAppStatus.js           # App status hook
│   │   ├── useDownloadManager.js     # Download manager integration
│   │   ├── useNetworkStatus.js       # Network status hook
│   │   └── useUtilityFunctions.js    # General utility functions
│   │
│   ├── ReduxStore/
│   │   └── store.js                  # Redux store configuration
│   │
│   ├── Service/                      # Business logic services (Singletons)
│   │   ├── BaseUrlInstance.js        # Axios base URL configuration
│   │   ├── DownloadManager.js        # 🔴 MAIN: Sequential download logic
│   │   ├── FileSystemService.js      # File operations (RNFS)
│   │   ├── LocalStorageService.js    # AsyncStorage operations
│   │   ├── ServerSyncService.js      # Server synchronization
│   │   ├── ToastService.js           # Toast notifications
│   │   └── CrashReportService.js     # Crash logging and sharing
│   │
│   ├── UiViews/                      # Screen/page components
│   │   ├── Videos/
│   │   │   ├── VideoListNew.js       # New video list (currently active)
│   │   │   ├── VideoDetailsNew.js    # Video details page
│   │   │   ├── VideoList.js          # Legacy video list
│   │   │   ├── VideoDetails.js       # Legacy video details
│   │   │   └── VideoPlayer.js        # Video player view
│   │   └── ... other screens
│   │
│   ├── UtilityFunctions/
│   │   └── UtilityFunctions.js       # Shared utility functions
│   │
│   └── Utils/                        # Utility modules
│       ├── VideoComparison.js        # Merge API + local + file videos
│       ├── FilterVideos.js           # Video filtering logic
│       ├── AppStateHandler.js        # App lifecycle handler
│       ├── DownloadCleanup.js        # Cleanup utilities
│       ├── StorageChecker.js         # Storage validation
│       └── Phase1Tests.js            # Test utilities
│
├── android/                          # Android native code
│   ├── app/
│   │   ├── src/                      # Android source code
│   │   └── build.gradle              # Android build config
│   └── gradle.properties             # Gradle properties
│
├── ios/                              # iOS native code
│   ├── Deshoali/                     # iOS project files
│   └── Deshoali.xcodeproj/           # Xcode project
│
├── __tests__/                        # Test files
│   └── App.test.tsx                  # App component tests
│
├── App.js                            # Root component (CrashReportModal, ErrorModal, etc.)
├── index.js                          # Entry point
├── app.json                          # App configuration
├── package.json                      # Dependencies and scripts
├── tsconfig.json                     # TypeScript config
├── babel.config.js                   # Babel configuration
├── metro.config.js                   # Metro bundler configuration
└── jest.config.js                    # Jest testing configuration
```

---

## 🏗️ Core Architecture

### Layered Architecture

```
┌─────────────────────────────────────────────┐
│        📱 UI LAYER (React Components)        │
│  VideoList → VideoDetails → VideoPlayer     │
└────────────────────┬────────────────────────┘
                     │ dispatch actions
                     ▼
┌─────────────────────────────────────────────┐
│     🔄 STATE MANAGEMENT (Redux & Thunks)    │
│  VideosSlice → startAutoDownloadThunk      │
│  modalSlice → Modal state management        │
└────────────────────┬────────────────────────┘
                     │ calls methods
                     ▼
┌─────────────────────────────────────────────┐
│     🔧 SERVICE LAYER (Business Logic)       │
│  DownloadManager → FileSystemService       │
│  LocalStorageService → CrashReportService  │
│  ServerSyncService → ToastService          │
└────────────────────┬────────────────────────┘
                     │ uses
                     ▼
┌─────────────────────────────────────────────┐
│     📚 EXTERNAL LIBRARIES & APIS            │
│  RNFS → AsyncStorage → NetInfo             │
│  Axios → react-native-video → Reanimated   │
└─────────────────────────────────────────────┘
```

### Design Patterns Used

| Pattern       | Purpose                            | Implementation                       |
| ------------- | ---------------------------------- | ------------------------------------ |
| **Singleton** | Ensure single instance of managers | DownloadManager, FileSystemService   |
| **Observer**  | Notify callbacks on state changes  | NetInfo listener, Redux subscribe    |
| **Callback**  | Pass data up from services         | statusCallback, progressCallback     |
| **Thunk**     | Async Redux actions                | startAutoDownloadThunk               |
| **Hook**      | Encapsulate logic with state       | useDownloadManager, useNetworkStatus |

---

## 🎬 Download System (Detailed)

### Overview

The download system is the **core feature** of Deshoali. It handles sequential downloading, progress tracking, error recovery, and network resilience.

```
DOWNLOAD FLOW:
User clicks "Download" → Redux dispatch → DownloadManager processes queue
                    ↓
              Check network
                    ↓
              Check storage
                    ↓
              Download video (RNFS)
                    ↓
              Update progress
                    ↓
              Verify file
                    ↓
              Save to AsyncStorage
                    ↓
              Update Redux state
                    ↓
              Show completion
```

### Architecture: Sequential Download Queue

**Key Principle:** Downloads ONE video at a time, in order (ID: 0 → 1 → 2 → 3...)

#### 1️⃣ **DownloadManager.js** (Primary Service)

**Location:** `App/Service/DownloadManager.js`

**Singleton Instance:**

```javascript
const manager = DownloadManager.getInstance();
```

**Key Properties:**

```javascript
{
  downloadQueue: [],              // Array of videos to download
  currentDownload: null,          // Currently downloading video
  isProcessing: false,            // Processing flag
  progressCallback: null,         // Progress updates (0-100%)
  statusCallback: null,           // Status updates (NEW→DOWNLOADING→DOWNLOADED)
  modalCallback: null,            // Modal display requests
  downloadJob: null,              // RNFS job (for cancellation)
  isNetworkAvailable: true,       // Network status
  pausedDueToNetwork: false,      // Paused due to network loss
  debugSimulateError: false,      // Debug mode flag
}
```

**Key Methods:**

| Method                                  | Purpose                   | Input        | Output             |
| --------------------------------------- | ------------------------- | ------------ | ------------------ |
| `startAutoDownload(videos)`             | Start download queue      | Video array  | Promise<result>    |
| `processQueue()`                        | Main loop processing      | -            | -                  |
| `downloadVideo(video)`                  | Download single video     | Video object | Promise            |
| `_performDownload()`                    | Execute RNFS download     | Video object | Progress tracking  |
| `_pauseDownloadDueToNetwork()`          | Pause on network loss     | -            | Sets PAUSED status |
| `_resumeDownloadsAfterNetworkRestore()` | Resume after network back | -            | Restarts queue     |
| `setProgressCallback(fn)`               | Set progress callback     | Function     | -                  |
| `setStatusCallback(fn)`                 | Set status callback       | Function     | -                  |
| `setDebugSimulateError(enable)`         | Enable debug mode         | Boolean      | -                  |

#### 2️⃣ **Download State Machine**

```
NEW (initial)
  ↓
DOWNLOADING (during download)
  ├→ DOWNLOADED (success)
  ├→ FAILED (error)
  └→ PAUSED (network loss)
     └→ DOWNLOADING (network restored - auto-resume)
```

#### 3️⃣ **Download Progress Flow**

```
DownloadManager._performDownload()
  ↓ (every 100-500ms)
progressCallback(videoId, progress)
  ↓
dispatch(updateDownloadProgress({ videoId, progress }))
  ↓
Redux state updated → UI re-renders with progress %
```

#### 4️⃣ **Sequential Processing Logic**

```javascript
// processQueue() - Main loop

1. Sort videos by ID ascending (0, 1, 2, 3...)
2. Wait 500ms between videos (prevent server overload)
3. FOR EACH video:
   a. Check network available
   b. Check storage sufficient
   c. Download video (with progress tracking)
   d. Verify file exists
   e. Save to AsyncStorage
   f. Update Redux status
   g. Call statusCallback
   h. Handle errors gracefully
4. Continue to next video
5. Mark queue as complete
```

#### 5️⃣ **Error Handling in Download**

```
Try download:
  ├→ Network error? → _pauseDownloadDueToNetwork()
  ├→ Storage error? → Show StorageModal, FAILED status
  ├→ File error? → Retry or FAILED status
  ├→ Callback error? → Try-catch with CrashReportService.addLog()
  └→ Unknown error? → FAILED status, show ErrorModal
```

### Integration Points

#### 📍 UI → Redux → DownloadManager

```javascript
// VideoListNew.js
<TouchableOpacity
  onPress={() => {
    dispatch(startAutoDownloadThunk(videosWithStatus));
  }}
>
  Download All
</TouchableOpacity>;

// VideosSlice.js
export const startAutoDownloadThunk = createAsyncThunk(
  'Videos/startAutoDownload',
  async (videosWithStatus, { dispatch }) => {
    const downloadManager = DownloadManager.getInstance();

    // Setup callbacks
    downloadManager.setStatusCallback((videoId, status, filePath) => {
      dispatch(updateVideoStatus({ videoId, status }));
    });

    downloadManager.setProgressCallback((videoId, progress) => {
      dispatch(updateDownloadProgress({ videoId, progress }));
    });

    // Start download
    await downloadManager.startAutoDownload(newVideos);
  },
);
```

#### 📍 DownloadManager → FileSystemService

```javascript
// In DownloadManager._performDownload()
const filePath = FileSystemService.getVideoFilePath(video.id);
const fileExists = await FileSystemService.checkFileExists(filePath);
const sufficient = await FileSystemService.isStorageSufficient();
```

#### 📍 DownloadManager → LocalStorageService

```javascript
// After successful download
await LocalStorageService.saveVideoMetadata(video.id, {
  id: video.id,
  name: video.name,
  status: 'DOWNLOADED',
  localFilePath: filePath,
  downloadedAt: new Date().toISOString(),
});
```

#### 📍 DownloadManager → CrashReportService

```javascript
// Log download events
CrashReportService.addLog(`Download started: ${video.name}`, 'INFO', {
  videoId: video.id,
});

// Log errors
CrashReportService.addLog(`Download failed: ${error.message}`, 'ERROR', {
  videoId: video.id,
  error,
});
```

---

## 🔄 State Management (Redux)

### VideosSlice Structure

**Location:** `App/Features/Videos/VideosSlice.js`

**State:**

```javascript
{
  videos: [],                      // Raw API videos
  localVideos: {},                 // Downloaded videos map
  videosWithStatus: [],            // Merged with status
  currentDownload: null,           // Downloading video ID
  downloadQueue: [],               // Queue of video IDs
  isLoading: false,                // API loading
  isError: false,                  // Error flag
  errorMessage: '',                // Error message

  // Download tracking (Phase 2)
  totalVideosToDownload: 0,        // Total to download
  videosDownloaded: 0,             // Downloaded count
  isDownloadingInModal: false,     // Modal active

  // Download error modal
  downloadErrorModal: {
    isVisible: false,
    errorMessage: '',
    errorType: '',                 // 'NETWORK', 'FILE_ERROR', 'UNKNOWN'
    videoId: null,
    videoName: '',
  },

  // Search
  searchQuery: '',
  searchResults: [],
  isSearching: false,
}
```

**Key Thunks:**

| Thunk                    | Purpose                   | Triggers             |
| ------------------------ | ------------------------- | -------------------- |
| `fetchVideosThunk`       | Fetch videos from API     | App start            |
| `loadLocalVideosThunk`   | Load downloaded videos    | App start            |
| `startAutoDownloadThunk` | Start sequential download | User clicks download |
| `searchVideosThunk`      | Search videos by query    | User types in search |

**Key Reducers:**

| Reducer                  | Purpose                    | Action            |
| ------------------------ | -------------------------- | ----------------- |
| `updateVideoStatus`      | Update single video status | Download changes  |
| `updateDownloadProgress` | Update progress %          | During download   |
| `completeDownload`       | Mark download complete     | Download finished |
| `setCurrentDownload`     | Set downloading video      | Download starts   |
| `setErrorModal`          | Show error modal           | Error occurs      |
| `updateSearchResults`    | Update search results      | Search completes  |

### ModalSlice Structure

**Location:** `App/Features/Modal/modalSlice.js`

```javascript
{
  errorModal: {
    isVisible: false,
    title: '',
    message: '',
    type: '',                       // 'ERROR', 'WARNING', 'INFO'
  },
  storageModal: {
    isVisible: false,
    freeSpace: 0,
    requiredSpace: 0,
  },
  downloadProgressModal: {
    isVisible: false,
    currentVideo: null,
    currentIndex: 0,
    totalVideos: 0,
    currentProgress: 0,             // 0-100%
  },
}
```

---

## 📊 Component Flow

### Screen Navigation Structure

```
BottomTabNavigator
├── Videos Stack
│   ├── VideoListNew (default screen)
│   │   ├── VideoSearchBar (search input)
│   │   ├── CardVideoListItem (per video)
│   │   │   └── Download button → dispatch startAutoDownloadThunk
│   │   └── VideoListRenderer (list view)
│   └── VideoDetailsNew
│       └── VideoPlayer
│           ├── react-native-video
│           ├── Reanimated controls
│           └── Play/pause/seek controls
│
├── Downloads Stack
│   └── DownloadHistory
│
└── Settings Stack
    └── Settings
```

### Data Flow During Download

```
VideoListNew.js
  ↓ user clicks Download
Redux dispatch(startAutoDownloadThunk(videosWithStatus))
  ↓
VideosSlice thunk
  ├→ DownloadManager.getInstance()
  ├→ Setup callbacks
  └→ startAutoDownload(newVideos)
    ↓
DownloadManager.startAutoDownload()
  ├→ processQueue()
  ├→ For each video:
  │   ├→ downloadVideo()
  │   ├→ _performDownload()
  │   │   ├→ progressCallback (every 100ms)
  │   │   │   └→ dispatch(updateDownloadProgress)
  │   │   └→ statusCallback on change
  │   │       └→ dispatch(updateVideoStatus)
  │   └→ Save to LocalStorageService
  └→ Queue complete
    ↓
App.js DownloadInProgressModal
  ├→ Shows current progress
  ├→ Displays video name
  └→ Shows % complete
```

---

## 🔧 Services & Utilities

### Service Layer Overview

#### 1. **DownloadManager** (CORE)

- Sequential download processing
- Network monitoring and auto-pause/resume
- Progress tracking
- Error handling and recovery
- Redux integration via callbacks

#### 2. **FileSystemService**

- File operations (create, delete, check exists)
- Storage space validation
- Video file path management
- Directory initialization

```javascript
// Key methods:
checkFileExists(filePath);
deleteVideoFile(videoId);
getStoragePath();
isStorageSufficient();
checkAvailableSpace();
getTotalVideosSize();
```

#### 3. **LocalStorageService**

- AsyncStorage operations
- Persist video metadata
- Load download history
- Update video status

```javascript
// Key methods:
saveVideoMetadata(videoId, metadata);
getAllLocalVideos();
getVideoMetadata(videoId);
updateVideoStatus(videoId, status);
deleteVideoMetadata(videoId);
```

#### 4. **CrashReportService**

- Capture uncaught errors
- Log download events
- Device information collection
- Crash report sharing

```javascript
// Key methods:
initialize();
addLog(message, level, data);
captureError(error, errorInfo);
shareCrashReport(crashReport);
exportLogs();
getAllCrashReports();
```

#### 5. **ToastService**

- Show toast notifications
- Network status messages
- Download alerts

#### 6. **ServerSyncService**

- Server synchronization
- API calls
- Data sync

### Hook Layer

#### **useDownloadManager**

Integrates DownloadManager with Redux and UI

```javascript
const {
  isDownloading,
  currentProgress,
  currentVideoName,
  error,
  startDownload,
  pauseDownload,
  resumeDownload,
} = useDownloadManager();
```

#### **useNetworkStatus**

Monitors network connectivity

```javascript
const { isOnline, isWifi, networkType } = useNetworkStatus();
```

#### **useAppLanguage**

Language/i18n management

---

## 🌐 Network Resilience

### Network Monitoring

**Implementation:** NetInfo listener in DownloadManager

```javascript
NetInfo.addEventListener(state => {
  const isOnline = state.isConnected && state.isInternetReachable;

  if (wasOnline && !isOnline && isProcessing) {
    // Network lost during download
    _pauseDownloadDueToNetwork();
  }

  if (!wasOnline && isOnline && pausedDueToNetwork) {
    // Network restored
    _resumeDownloadsAfterNetworkRestore();
  }
});
```

### Pause on Network Loss

When network is detected as lost:

1. Cancel current RNFS download job
2. Set video status to `PAUSED`
3. Save to AsyncStorage
4. Show toast notification: "Network Lost"
5. Stop processing queue

### Auto-Resume on Network Restore

When network is detected as restored:

1. Check if downloads were paused due to network
2. Restart `processQueue()`
3. Continue from where it stopped
4. Show toast notification: "Network Restored"

### Error Modal Dispatch

When download fails or pauses:

```javascript
dispatch(
  setErrorModal({
    isVisible: true,
    errorMessage:
      'Network lost during download. Download will resume when network is restored.',
    errorType: 'NETWORK',
    videoId: currentVideo.id,
    videoName: currentVideo.name,
  }),
);
```

---

## ❌ Error Handling

### Error Types & Responses

| Error Type             | Cause                   | Response                              |
| ---------------------- | ----------------------- | ------------------------------------- |
| `NETWORK_LOST`         | WiFi/mobile disabled    | Pause, auto-resume when back          |
| `STORAGE_INSUFFICIENT` | Not enough space        | Show StorageModal, skip video         |
| `DOWNLOAD_FAILED`      | URL error, timeout      | Retry or FAILED status                |
| `FILE_ERROR`           | Permission, write error | Show ErrorModal, FAILED status        |
| `API_ERROR`            | Server error            | Show ErrorModal, retry option         |
| `UNKNOWN`              | Unhandled exception     | Log to CrashReportService, show modal |

### Error Flow

```
Error occurs in DownloadManager
  ↓
Try-catch block
  ├→ Log to CrashReportService
  ├→ Update status to FAILED/PAUSED
  ├→ statusCallback(videoId, status, errorMessage)
  │   └→ dispatch(updateVideoStatus)
  │   └→ dispatch(setErrorModal)
  └→ Continue queue processing
    ↓
UI displays ErrorModal with:
  - Error message
  - Video name
  - Retry button
  - Share logs option
```

### Crash Reporting System

**CrashReportModal** appears after uncaught errors:

```javascript
// In App.js
<ErrorBoundary
  onError={(error, errorInfo) => {
    CrashReportService.captureError(error, errorInfo);
    setCrashReport(error);
    setShowCrashModal(true);
  }}
>
  <CrashReportModal
    isVisible={showCrashModal}
    crashReport={crashReport}
    onRetry={() => RNRestart.restart()}
  />
</ErrorBoundary>
```

**User can:**

- View crash details
- View logs (last 50 entries)
- Export logs to file
- Share via email/messaging
- Retry app

---

## 🔄 Development Flow

### Starting Development

```bash
# 1. Install dependencies
npm install

# 2. Start Metro bundler
npm start

# 3. Run on Android (in another terminal)
npm run android

# Or iOS
npm run ios
```

### Making Changes to Download System

1. **Edit DownloadManager.js:**

   - Changes here affect ALL downloads
   - Always wrap in try-catch for error logging
   - Add CrashReportService.addLog() for debug

2. **Update Redux in VideosSlice.js:**

   - Add new reducer action if needed
   - Update in startAutoDownloadThunk callbacks
   - Dispatch action from DownloadManager callback

3. **Test with Debug Mode:**

   ```javascript
   // In VideoListNew.js
   const downloadManager = DownloadManager.getInstance();
   downloadManager.setDebugSimulateError(true); // Enable error simulation
   ```

4. **Monitor Logs:**
   ```bash
   # In terminal
   npx react-native log-android
   # Look for [DownloadManager] prefix
   ```

### Common Development Tasks

#### Add new download status

```javascript
// VideosSlice.js
// Add to state machine
status === 'QUEUED'; // Add this

// DownloadManager.js
this._updateStatus(videoId, 'QUEUED', null, null);
```

#### Add new error type

```javascript
// ErrorModal.js
const errorTypeConfig = {
  MY_NEW_ERROR: {
    title: 'My Error',
    icon: 'alert',
    color: ThemeColors.error,
  },
};
```

#### Track new metric

```javascript
// CrashReportService.js
CrashReportService.addLog('Custom metric tracked', 'INFO', {
  metric: 'value',
  timestamp: Date.now(),
});
```

---

## 📈 Performance Considerations

### Download Optimization

| Optimization          | Technique                  | Benefit                     |
| --------------------- | -------------------------- | --------------------------- |
| **Sequential**        | One video at a time        | Prevents network congestion |
| **Chunk upload**      | RNFS handles internally    | Efficient memory usage      |
| **Progress callback** | 100-500ms throttling       | Reduces Redux updates       |
| **Pause between**     | 500ms delay between videos | Prevents server overload    |
| **Status cache**      | LocalStorageService        | Fast state restoration      |

### Memory Optimization

- Singleton services (not recreated)
- Callbacks removed after download
- Logs limited to last 500 entries
- Crash reports limited to 10 recent

---

## 🚀 Future Enhancements

### Potential Improvements

1. **Parallel Downloads** (Phase 7)

   - Download multiple videos simultaneously
   - Configurable max concurrent downloads

2. **Resume from Pause** (Phase 8)

   - Resume incomplete downloads (partial files)
   - Byte range requests

3. **Download Scheduling** (Phase 9)

   - Download at specific time
   - Download on WiFi only
   - Background download service

4. **Advanced Analytics** (Phase 10)

   - Track download speed
   - Success/failure ratios
   - Network type distribution

5. **CDN Integration**
   - Geo-location based server selection
   - Automatic server failover

---

## 📚 Reference Links

### Redux Integration

- StartAutoDownloadThunk: `App/Features/Videos/VideosSlice.js` (line 57)
- ModalSlice: `App/Features/Modal/modalSlice.js`

### Download Manager

- Main Service: `App/Service/DownloadManager.js`
- processQueue: Line ~200
- \_performDownload: Line ~300
- Network monitoring: Line ~39

### UI Components

- VideoListNew: `App/UiViews/Videos/VideoListNew.js`
- DownloadInProgressModal: `App/Components/Modal/DownloadInProgressModal.js`
- ErrorModal: `App/Components/Modal/ErrorModal.js`

### Utilities

- FileSystemService: `App/Service/FileSystemService.js`
- LocalStorageService: `App/Service/LocalStorageService.js`
- CrashReportService: `App/Service/CrashReportService.js`

---

## 🎓 Key Learnings

### Architecture Decisions

1. **Singleton Services** - Ensures single download queue, prevents conflicts
2. **Callback Pattern** - Decouples DownloadManager from Redux, enables flexible integration
3. **Sequential Processing** - Simplifies error handling, prevents network congestion
4. **Network Resilience** - Auto-pause/resume provides seamless UX during connectivity changes

### Error Handling Philosophy

- **Graceful Degradation** - Continue processing other videos if one fails
- **User Awareness** - Always show modals/toasts for errors
- **Crash Logging** - Capture everything for debugging
- **Offline Support** - App works without internet for downloaded videos

---

**Document Version:** 1.0
**Last Updated:** November 2024
**Author:** Deshoali Development Team
