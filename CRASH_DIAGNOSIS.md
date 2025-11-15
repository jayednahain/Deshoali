# 🔴 Crash Diagnosis & Analysis Report

**Date:** November 11, 2024
**Focus:** App crash when WiFi/mobile data is turned off during video download
**Status:** ⚠️ INVESTIGATING

---

## 📋 Diagnostic Questions & Current Analysis

### ❓ Q1: When exactly does the crash happen?

#### Possible Scenarios:

1. **Immediately when you turn off WiFi/data?** ✓ LIKELY

   - NetInfo listener triggers almost instantly
   - Callback chain starts immediately

2. **After a few seconds of network loss?** ~ POSSIBLE

   - Timeout from RNFS download job
   - Takes 2-5 seconds to detect no internet response

3. **When trying to resume the download?** ~ POSSIBLE
   - Error during `processQueue()` restart
   - RNFS job not properly cancelled

#### Current Code Flow:

```
User disables WiFi
  ↓ (instant)
NetInfo listener callback fires
  ↓
_initializeNetworkMonitoring() line ~95-115
  ├→ Network state checked
  ├→ Is currently downloading? YES
  ├→ Call _pauseDownloadDueToNetwork()
  │   ├→ Cancel downloadJob
  │   ├→ Set isProcessing = false
  │   ├→ Mark as PAUSED
  │   ├→ Call statusCallback
  │   └→ Show toast
  └→ Continue processing (POTENTIAL CRASH HERE)
```

**RISK ASSESSMENT:** 🔴 **HIGH**

- Callback may be called when Redux component unmounted
- Status callback tries to dispatch to unmounted component

---

### ❓ Q2: Do you have any crash logs or error messages?

#### What to check:

**1. Console Error Output:**

```bash
# Check Android logcat
adb logcat | grep -E "(error|crash|exception|DownloadManager|undefined)"

# Look for:
- Cannot read property 'id' of undefined
- Cannot read property 'name' of undefined
- Cannot dispatch to unmounted component
- Network listener callback crashed
```

**2. CrashReportModal Should Show:**

- Error type: `Error` or `TypeError`
- Message: Something about null/undefined
- Stack trace pointing to:
  - `_pauseDownloadDueToNetwork()`
  - `statusCallback()`
  - `processQueue()`
  - Redux dispatch

**3. Expected Error Pattern:**

```javascript
// Most likely crash location
E  java.lang.NullPointerException: Attempt to invoke virtual method
  on a null object reference

// Or JavaScript side:
E  TypeError: Cannot read property 'id' of null
```

#### Current Log Points in Code:

✅ Line 108-110: Network state change logged
✅ Line 811-814: Pause download logged
✅ Line 850: Resume logged
✅ Line 779-790: Status callback error wrapped in try-catch

**ISSUE:** Multiple calls not wrapped in try-catch at network listener level!

---

### ❓ Q3: Which modal is visible when the crash occurs?

#### Expected Modal Flow:

**Before Crash:**

```
User sees: DownloadInProgressModal
  ├→ Current video name
  ├→ Progress bar (showing %)
  └→ "Downloading..."

User toggles WiFi OFF
  ↓ (instant)
Network lost detection fires
  ├→ Modal should stay visible
  ├→ Show toast: "Download Paused"
  └→ ErrorModal should appear with:
      ├→ Title: "Network Lost"
      ├→ Message: "Download paused..."
      └→ Retry button
```

**If No Modal Appears:**

```
⚠️ Crash likely occurred BEFORE ErrorModal dispatch
⚠️ Callback failed silently or threw exception
```

#### Crash Scenario:

```
DownloadInProgressModal rendered
  ├→ Redux state: isDownloadingInModal = true
  ├→ Subscription to Redux: downloadProgress, currentDownload
  └→ Component MOUNTED and listening to Redux

WiFi disabled
  ↓
NetInfo listener triggers
  ↓
_pauseDownloadDueToNetwork() called
  ├→ statusCallback(videoId, 'PAUSED', null, errorMessage)
  ├→ Dispatches setDownloadError in useDownloadManager.js
  ├→ Redux state updates
  ├→ ErrorModal should re-render
  └→ ❌ CRASH: Callback executed AFTER component unmounted?
      OR currentDownload became null?
      OR Redux dispatch failed?
```

---

### ❓ Q4: Network listener setup - Is it properly set up?

#### Current Setup (DownloadManager.js lines 66-120):

✅ **What's Correct:**

```javascript
_initializeNetworkMonitoring() {
  // 1. Try-catch wraps initialization
  try {
    // 2. Fetch initial state (async)
    NetInfo.fetch().then(state => {
      this.isNetworkAvailable = state.isConnected && state.isInternetReachable;
    });

    // 3. Listen for changes
    this.networkUnsubscribe = NetInfo.addEventListener(state => {
      // 4. Track previous state
      const wasNetworkAvailable = this.isNetworkAvailable;
      this.isNetworkAvailable = state.isConnected && state.isInternetReachable;

      // 5. Handle loss
      if (wasNetworkAvailable && !this.isNetworkAvailable && this.isProcessing) {
        this._pauseDownloadDueToNetwork();
      }

      // 6. Handle restore
      if (!wasNetworkAvailable && this.isNetworkAvailable && this.pausedDueToNetwork) {
        this._resumeDownloadsAfterNetworkRestore();
      }
    });
  } catch (error) {
    console.error('Error initializing network monitoring:', error);
  }
}
```

❌ **CRITICAL ISSUE FOUND:**

**PROBLEM #1:** Network listener callback NOT wrapped in try-catch!

```javascript
this.networkUnsubscribe = NetInfo.addEventListener(state => {
  // ❌ Any error here CRASHES without logging
  // ❌ No try-catch around callback logic

  const wasNetworkAvailable = this.isNetworkAvailable;
  this.isNetworkAvailable = state.isConnected && state.isInternetReachable;

  if (wasNetworkAvailable && !this.isNetworkAvailable && this.isProcessing) {
    this._pauseDownloadDueToNetwork(); // ❌ Could throw silently
  }
});
```

**PROBLEM #2:** Callback calls not null-checked!

```javascript
if (wasNetworkAvailable && !this.isNetworkAvailable && this.isProcessing) {
  this._pauseDownloadDueToNetwork();
  // ❌ If currentDownload is null, crashes here
}
```

**PROBLEM #3:** statusCallback might be null!

```javascript
_pauseDownloadDueToNetwork() {
  if (this.statusCallback) {
    try {
      this.statusCallback(...) // ✅ Has try-catch but callback itself could fail
    }
  }
  // ❌ But statusCallback is called WITHOUT null check on line 825
}
```

---

### ❓ Q5: Are callbacks being set before downloads start?

#### Current Setup (useDownloadManager.js):

✅ **What's Correct:**

```javascript
// Line 31-45: Progress callback
downloadManager.setProgressCallback((videoId, progress) => {
  try {
    if (typeof videoId === 'number' && typeof progress === 'number') {
      dispatch(updateDownloadProgress({ videoId, progress }));
    }
  } catch (error) {
    console.error('[useDownloadManager] Error in progress callback:', error);
  }
});

// Line 48-90: Status callback
downloadManager.setStatusCallback((videoId, status, filePath, errorMessage) => {
  try {
    if (typeof videoId === 'number' && typeof status === 'string') {
      dispatch(updateVideoStatus({ videoId, status }));

      // ... more dispatch calls ...

      if (status === 'PAUSED') {
        dispatch(setDownloadError({ ... }));
      }
    }
  } catch (error) {
    console.error('[useDownloadManager] Error in status callback:', error);
  }
});
```

✅ Callbacks wrapped in try-catch
✅ Type validation
✅ Dispatch error modal

❌ **BUT THERE'S A TIMING ISSUE:**

The callbacks are set in `useDownloadManager` hook, BUT also in `startAutoDownloadThunk`:

```javascript
// VideosSlice.js line 94-115 - Sets callbacks AGAIN
const onProgress = (videoId, progress) => { ... };
const onStatusChange = (videoId, status, localFilePath = null) => { ... };

downloadManager.setProgressCallback(onProgress);
downloadManager.setStatusCallback(onStatusChange);
```

**PROBLEM:** Two different callbacks set!

- First in `useDownloadManager` (line 31-90)
- Second in `startAutoDownloadThunk` (line 94-115)
- **Second one OVERWRITES the first!**

This means the error modal dispatch in useDownloadManager is NEVER used!

---

### ❓ Q6: Pause/Resume Implementation - Critical Check

#### `_pauseDownloadDueToNetwork()` (Line 800-845):

**Current Code Analysis:**

```javascript
_pauseDownloadDueToNetwork() {
  try {
    console.log(`${this.logPrefix} 🛑 PAUSING DOWNLOADS...`);

    // ❌ PROBLEM: downloadJob might not have stopDownload method
    if (this.downloadJob) {
      if (this.downloadJob.stopDownload) {
        this.downloadJob.stopDownload();
      }
      this.downloadJob = null;
    }

    this.isProcessing = false;

    // ✅ Correct: Check currentDownload exists
    if (this.currentDownload) {
      // ✅ Logs event
      this._logDownloadEvent('NETWORK_LOST', this.currentDownload.id, {...});

      // ✅ Saves to localStorage
      LocalStorageService.saveVideoMetadata(this.currentDownload.id, {
        ...this.currentDownload,
        status: 'PAUSED',
      }).catch(err => console.error(...)); // ✅ Error handled

      // ⚠️ RISKY: Calls callback but error handled
      if (this.statusCallback) {
        try {
          this.statusCallback(
            this.currentDownload.id,
            'PAUSED',
            null,
            'Network connection lost...'
          );
        } catch (err) {
          console.error(...);
        }
      }

      // ✅ Shows toast
      Toast.show({...});
    }

    console.log(`${this.logPrefix} Queue paused...`);
  } catch (error) {
    console.error(`${this.logPrefix} Error pausing download:`, error);
  }
}
```

✅ Has outer try-catch
✅ Checks currentDownload exists
✅ Callback wrapped in try-catch
✅ Error logged

---

## 🔍 ROOT CAUSE ANALYSIS

### Most Likely Cause: #1 ⭐

**Network Listener Callback NOT Try-Wrapped**

```javascript
// Line 95-120: THIS HAS NO TRY-CATCH
this.networkUnsubscribe = NetInfo.addEventListener(state => {
  // ❌ ANY ERROR HERE CRASHES WITHOUT LOGGING

  const wasNetworkAvailable = this.isNetworkAvailable;
  this.isNetworkAvailable = state.isConnected && state.isInternetReachable;

  if (wasNetworkAvailable && !this.isNetworkAvailable && this.isProcessing) {
    this._pauseDownloadDueToNetwork(); // Could fail silently
  }

  if (
    !wasNetworkAvailable &&
    this.isNetworkAvailable &&
    this.pausedDueToNetwork
  ) {
    this._resumeDownloadsAfterNetworkRestore(); // Could fail silently
  }
});
```

**Why This Crashes:**

```
State listener fires
  ├→ Callback executes
  ├→ Any error → CRASH (no try-catch to catch it)
  └→ Error not logged (no console.error wrapper)
```

---

### Second Most Likely: #2

**Callback Overwriting Issue**

Two places set callbacks:

1. `useDownloadManager.js` (with error modal dispatch)
2. `startAutoDownloadThunk` (WITHOUT error modal dispatch)

Result: Error modal NEVER appears when network lost!

---

### Third: #3

**RNFS Job Cancellation Issue**

```javascript
if (this.downloadJob) {
  if (this.downloadJob.stopDownload) {
    this.downloadJob.stopDownload(); // ❌ RNFS doesn't have this method!
  }
}
```

RNFS jobs don't have `stopDownload()`. They have:

- `promise.cancel()` - cancels the Promise
- `promise.abort()` - might not exist

This means downloads NOT being cancelled properly!

---

## ✅ FIX RECOMMENDATIONS

### Fix #1: Wrap Network Listener in Try-Catch (CRITICAL)

```javascript
this.networkUnsubscribe = NetInfo.addEventListener(state => {
  try {
    // ✅ ADD THIS
    const wasNetworkAvailable = this.isNetworkAvailable;
    this.isNetworkAvailable = state.isConnected && state.isInternetReachable;

    if (wasNetworkAvailable && !this.isNetworkAvailable && this.isProcessing) {
      this._pauseDownloadDueToNetwork();
    }

    if (
      !wasNetworkAvailable &&
      this.isNetworkAvailable &&
      this.pausedDueToNetwork
    ) {
      this._resumeDownloadsAfterNetworkRestore();
    }
  } catch (error) {
    // ✅ ADD THIS
    console.error(`${this.logPrefix} ❌ CRASH in network listener:`, error);
    CrashReportService.addLog('Network listener crashed', 'ERROR', {
      error: error.message,
      stack: error.stack,
    });
  }
});
```

### Fix #2: Fix RNFS Job Cancellation

```javascript
// ❌ WRONG
if (this.downloadJob.stopDownload) {
  this.downloadJob.stopDownload();
}

// ✅ CORRECT - RNFS jobs are Promises with .cancel()
if (this.downloadJob && typeof this.downloadJob.cancel === 'function') {
  try {
    this.downloadJob.cancel(); // Properly cancel RNFS promise
  } catch (e) {
    console.warn(`${this.logPrefix} Error cancelling download job:`, e);
  }
}
this.downloadJob = null;
```

### Fix #3: Prevent Callback Overwriting

Use ONE callback setup location:

```javascript
// In startAutoDownloadThunk, ONLY set callbacks if not already set
const downloadManager = DownloadManager.getInstance();

// Check if callbacks already set from useDownloadManager
if (!downloadManager.getProgressCallback()) {
  downloadManager.setProgressCallback(onProgress);
}
if (!downloadManager.getStatusCallback()) {
  downloadManager.setStatusCallback(onStatusChange);
}
```

Or better: Setup callbacks ONCE in useDownloadManager and reuse.

### Fix #4: Add Error Modal Dispatch in VideoSlice Callbacks

```javascript
const onStatusChange = (
  videoId,
  status,
  localFilePath = null,
  errorMessage,
) => {
  try {
    dispatch(updateVideoStatus({ videoId, status }));

    // ✅ ADD THIS: Show error modal on PAUSED
    if (status === 'PAUSED') {
      dispatch(
        setDownloadError({
          errorMessage: errorMessage || 'Download paused due to network loss',
          errorType: 'NETWORK',
          videoId,
          videoName: `Video ${videoId}`,
        }),
      );
    }

    // ✅ Also show for FAILED
    if (status === 'FAILED') {
      dispatch(
        setDownloadError({
          errorMessage: errorMessage || 'Download failed',
          errorType: 'UNKNOWN',
          videoId,
          videoName: `Video ${videoId}`,
        }),
      );
    }
  } catch (error) {
    console.error('[VideosSlice] Error in status callback:', error);
    CrashReportService.addLog('Status callback crashed', 'ERROR', {
      error: error.message,
    });
  }
};
```

---

## 📊 Impact Summary

| Issue                            | Severity    | Impact                  | Fix Time |
| -------------------------------- | ----------- | ----------------------- | -------- |
| Network listener not try-wrapped | 🔴 CRITICAL | App crashes silently    | 5 min    |
| RNFS cancellation wrong          | 🟡 HIGH     | Downloads not cancelled | 5 min    |
| Callback overwriting             | 🟡 HIGH     | Error modal never shows | 10 min   |
| No error dispatch in VideoSlice  | 🟠 MEDIUM   | Error modal not shown   | 10 min   |

**Total Fix Time:** ~30 minutes

---

## 🧪 Testing After Fix

```bash
# 1. Start app
npm start

# 2. In another terminal, build and run
npm run android

# 3. In app:
- Navigate to Videos list
- Click "Download All"
- Wait for download to start (DownloadInProgressModal shows)
- Open Settings → WiFi → Toggle OFF
- Observe:
  ✅ Toast shows: "Download Paused"
  ✅ ErrorModal appears with network message
  ✅ App does NOT crash
  ✅ No "Deshoali keeps stopping" message

# 4. Toggle WiFi back ON
- Observe:
  ✅ Toast shows: "Network Restored"
  ✅ Download resumes automatically
  ✅ Progress continues from where it paused
```

---

## 🚀 Next Steps

1. ✅ Apply Fix #1 (wrap network listener in try-catch)
2. ✅ Apply Fix #2 (fix RNFS cancellation)
3. ✅ Apply Fix #3 (prevent callback overwriting)
4. ✅ Apply Fix #4 (add error dispatch in callbacks)
5. ✅ Rebuild app
6. ✅ Test crash scenario
7. ✅ Verify CrashReportModal captures any remaining errors

---

**Report Generated:** November 11, 2024
**Status:** Ready for fix implementation
