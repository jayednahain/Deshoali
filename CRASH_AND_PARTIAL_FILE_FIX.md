# 🔴 CRITICAL ISSUES FOUND & FIXES

**Date:** November 11, 2024
**Issues:** App crash + Partial files marked as DOWNLOADED

---

## 🔴 ISSUE #1: App Still Crashing

### Root Cause Found:

**In `App.js` line 27:**

```javascript
ErrorUtils.setGlobalHandler(errorHandler);
```

❌ **PROBLEM:** `ErrorUtils` is NOT imported!

- This causes a crash when trying to set the error handler
- App crashes before even showing the error modal

### Fix for Issue #1:

```javascript
// ADD THIS IMPORT at the top of App.js
import { ErrorUtils } from 'react-native';

// THEN use it:
ErrorUtils.setGlobalHandler(errorHandler);
```

---

## 🔴 ISSUE #2: Partial Files Marked as DOWNLOADED

### The Problem:

When you close the app during download (at 20%, 50%, etc.), the file is:

1. **Partially downloaded** (not complete)
2. **Marked as PAUSED** or **FAILED** (correct)
3. **BUT** when you close/reopen app, sometimes it shows as **DOWNLOADED** ❌

This happens because:

**In `downloadVideo()` method (line ~370-400):**

```javascript
const downloadResult = await this._performDownload(
  videoId,
  downloadUrl,
  filePath,
);

if (downloadResult.success) {
  // ❌ PROBLEM: No verification file is actually complete!
  const downloadedFileExists = await FileSystemService.checkFileExists(
    filePath,
  );

  if (!downloadedFileExists) {
    throw new Error('Downloaded file not found after completion');
  }

  // This just checks if file EXISTS, not if it's COMPLETE!
  // A 20MB partial file will pass this check!

  await LocalStorageService.saveVideoMetadata(video.id, {
    ...video,
    status: 'DOWNLOADED', // ❌ Marks as DOWNLOADED
    localFilePath: filePath,
    downloadProgress: 100, // ❌ Shows 100% even if partial!
    downloadedAt: Date.now(),
  });

  return true;
}
```

### Solution: Add File Size Validation Threshold

**The fix requires:**

1. Get expected file size from download response headers
2. Compare actual file size with expected size
3. Only mark as DOWNLOADED if >= 95% complete

Here's the implementation:

#### Step 1: Add method to FileSystemService to get file size

```javascript
// Add to FileSystemService.js
async getFileSize(filePath) {
  try {
    const stat = await RNFS.stat(filePath);
    return stat.size; // Size in bytes
  } catch (error) {
    console.error('Error getting file size:', error);
    return null;
  }
}
```

#### Step 2: Modify \_performDownload to track content length

```javascript
async _performDownload(videoId, downloadUrl, filePath) {
  return new Promise(resolve => {
    try {
      let contentLength = 0; // Track total size

      const options = {
        fromUrl: downloadUrl,
        toFile: filePath,
        background: true,
        discretionary: true,
        progress: res => {
          // ✅ Capture content length from first progress event
          if (contentLength === 0 && res.contentLength > 0) {
            contentLength = res.contentLength;
            console.log(
              `${this.logPrefix} Video ${videoId} total size: ${(contentLength / 1024 / 1024).toFixed(2)}MB`
            );
          }

          // ... rest of progress tracking ...
        },
      };

      this.downloadJob = RNFS.downloadFile(options);

      this.downloadJob.promise
        .then(async result => {
          this.downloadJob = null;

          if (result.statusCode === 200) {
            // ✅ NEW: Verify file size matches expected
            const actualSize = await FileSystemService.getFileSize(filePath);
            const expectedSize = contentLength;

            if (expectedSize === 0) {
              console.warn(`${this.logPrefix} No content length available, but HTTP 200`);
              // Accept it if server didn't send content-length
              resolve({ success: true });
              return;
            }

            // Calculate completion percentage
            const completionPercent = (actualSize / expectedSize) * 100;

            console.log(
              `${this.logPrefix} Video ${videoId} download verification:`,
              {
                expected: `${(expectedSize / 1024 / 1024).toFixed(2)}MB`,
                actual: `${(actualSize / 1024 / 1024).toFixed(2)}MB`,
                completionPercent: completionPercent.toFixed(1) + '%',
              }
            );

            // ✅ THRESHOLD: Only mark as success if >= 95% complete
            const MIN_COMPLETION_PERCENT = 95;

            if (completionPercent >= MIN_COMPLETION_PERCENT) {
              console.log(
                `${this.logPrefix} ✅ Video ${videoId} download verified (${completionPercent.toFixed(1)}%)`
              );
              this._updateProgress(videoId, 100);
              resolve({ success: true });
            } else {
              console.error(
                `${this.logPrefix} ❌ Incomplete download: ${completionPercent.toFixed(1)}% (threshold: ${MIN_COMPLETION_PERCENT}%)`
              );
              resolve({
                success: false,
                error: `Incomplete download: ${completionPercent.toFixed(1)}%`,
              });
            }
          } else {
            console.error(
              `${this.logPrefix} Download failed with status ${result.statusCode}`
            );
            resolve({ success: false, error: `HTTP ${result.statusCode}` });
          }
        })
        .catch(error => {
          // ... error handling ...
        });
    } catch (error) {
      console.error(`${this.logPrefix} Error setting up download:`, error);
      resolve({ success: false, error: error.message });
    }
  });
}
```

#### Step 3: Modify downloadVideo to handle partial files on app restart

```javascript
async downloadVideo(video) {
  try {
    // ... existing code ...

    const filePath = await FileSystemService.getVideoFilePath(video.id, 'mp4');

    // ✅ NEW: Check if partial file exists
    const fileExists = await FileSystemService.checkFileExists(filePath);
    if (fileExists) {
      // Get file size
      const fileSize = await FileSystemService.getFileSize(filePath);
      const stat = await RNFS.stat(filePath);

      // If file is very small (<1MB), it's probably partial
      if (fileSize && fileSize < 1024 * 1024) {  // Less than 1MB
        console.log(
          `${this.logPrefix} Found partial file for video ${video.id} (${(fileSize / 1024 / 1024).toFixed(2)}MB), deleting...`
        );

        // Delete partial file and download fresh
        try {
          await RNFS.unlink(filePath);
        } catch (err) {
          console.warn(`${this.logPrefix} Error deleting partial file:`, err);
        }
      } else if (fileSize && fileSize > 1024 * 1024) {  // > 1MB
        // Likely a complete/valid file
        console.log(
          `${this.logPrefix} Video ${video.id} file exists and is ${(fileSize / 1024 / 1024).toFixed(2)}MB`
        );

        // Verify it's actually complete by checking metadata
        const metadata = await LocalStorageService.getVideoMetadata(video.id);
        if (metadata?.status === 'DOWNLOADED') {
          return true;  // It's complete
        }
      }
    }

    // ... continue with download ...
  } catch (error) {
    // ... error handling ...
  }
}
```

---

## 📊 Summary of Both Fixes

### Fix #1: ErrorUtils Import (5 minutes)

```javascript
// In App.js, add import
import { ErrorUtils } from 'react-native';
```

### Fix #2: File Size Validation (30 minutes)

1. Add `getFileSize()` method to FileSystemService
2. Track `contentLength` in `_performDownload()`
3. Verify actual file size >= 95% of expected
4. Clean up partial files on app restart
5. Use 1MB threshold to identify partial downloads

---

## 🧪 Testing After Fixes

**Test #1: Crash Handler**

1. App should NOT crash when starting
2. CrashReportModal should appear if error occurs
3. ErrorUtils handler should capture errors

**Test #2: Partial File Handling**

1. Start download → Stop at 50%
2. App marks as PAUSED ✅
3. Close app
4. Reopen app → File still PAUSED ✅
5. Press retry → Download continues OR restarts
6. After 100% complete → File marked DOWNLOADED ✅
7. Play video → Should work without errors ✅

---

## 🚀 Implementation Order

1. ✅ Fix App.js ErrorUtils import (CRITICAL - prevents crash)
2. ✅ Add FileSystemService.getFileSize() method
3. ✅ Update \_performDownload() with file size verification
4. ✅ Update downloadVideo() to clean partial files
5. ✅ Rebuild and test
