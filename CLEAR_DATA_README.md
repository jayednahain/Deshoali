# Clear Downloaded Data - Testing Tool

This script helps you clear downloaded video data for testing purposes.

## Usage

### Clear Everything (Default)

Clears both AsyncStorage metadata and downloaded video files:

```bash
node clear.js
# or
node clear.js all
```

### Clear Only Video Files

Keeps metadata in AsyncStorage but deletes video files:

```bash
node clear.js files
```

**Result:** Videos will show as FAILED (file missing), retry button will appear

### Clear Only AsyncStorage

Keeps video files but clears metadata:

```bash
node clear.js storage
```

**Result:** App forgets about downloads, files remain on disk

### Show Storage Info

Display current storage usage without clearing:

```bash
node clear.js info
```

### Help

```bash
node clear.js --help
```

## Requirements

- Android device or emulator connected
- ADB (Android Debug Bridge) installed
- USB debugging enabled on device

## What It Does

### Mode: `all` (default)

1. ✅ Clears AsyncStorage (video metadata)
2. ✅ Force stops the app
3. ℹ️ You need to restart: `npx react-native run-android`

### Mode: `files`

1. ✅ Deletes all .mp4 files from app storage
2. ✅ Keeps AsyncStorage metadata
3. ℹ️ Restart app - videos will show as FAILED

### Mode: `storage`

1. ✅ Clears AsyncStorage only
2. ✅ Keeps video files on disk
3. ℹ️ App forgets downloads but files remain

### Mode: `info`

1. 📊 Shows number of downloaded files
2. 📊 Shows file sizes
3. ❌ Doesn't delete anything

## Testing Scenarios

### Test Fresh Install

```bash
node clear.js all
npx react-native run-android
```

**Expected:** App starts fresh, all videos show as NEW, auto-download begins

### Test Retry Failed Downloads

```bash
node clear.js files
# Restart app
```

**Expected:** Videos show as FAILED with retry button

### Test File Verification

```bash
node clear.js files
# Don't restart yet - delete specific files manually
adb shell rm /storage/emulated/0/Android/data/com.deshoali/files/videos/1.mp4
# Restart app
```

**Expected:** Only video 1 shows as FAILED, others as DOWNLOADED

## Troubleshooting

### No device connected

```
❌ No Android device/emulator connected!
```

**Solution:**

- Start emulator: `emulator -avd <emulator_name>`
- Or connect physical device with USB debugging enabled

### ADB not found

```
❌ Failed to check for devices. Is ADB installed?
```

**Solution:**

- macOS: `brew install android-platform-tools`
- Or add Android SDK platform-tools to PATH

### Permission denied

```
❌ Permission denied
```

**Solution:**

```bash
chmod +x clear.js
```

## File Locations

### AsyncStorage

- Location: `/data/data/com.deshoali/databases/RKStorage`
- Cleared by: `pm clear` command

### Video Files

- Location: `/storage/emulated/0/Android/data/com.deshoali/files/videos/`
- Format: `{video_id}.mp4`
- Example: `1.mp4`, `2.mp4`, `3.mp4`

## Examples

### Example 1: Test Sequential Downloads

```bash
# Clear everything
node clear.js all

# Start app
npx react-native run-android

# Watch Metro logs for:
# [DownloadManager] Starting download for video 1
# [DownloadManager] Video 1 progress: 10%
# ...
# [DownloadManager] Video 1 download complete
# [DownloadManager] Starting download for video 2
```

### Example 2: Test Retry Mechanism

```bash
# Delete only files (keep metadata)
node clear.js files

# Restart app - videos show as FAILED

# Tap retry button on first video

# Watch logs for retry download
```

### Example 3: Test Storage Check

```bash
# Check what's downloaded
node clear.js info

# Output:
# ℹ️  Total video files: 3
#   - 1.mp4: 45M
#   - 2.mp4: 32M
#   - 3.mp4: 28M
```

## Notes

- **Safe to use:** Only affects app data, not system
- **No root required:** Uses standard ADB commands
- **Reversible:** Just re-run download to restore videos
- **Fast:** Clears in seconds

## Development Tips

### Quick Test Cycle

```bash
# 1. Make code changes
# 2. Clear data
node clear.js all

# 3. Rebuild and run
npx react-native run-android

# 4. Test download flow
# 5. Repeat
```

### Debug Specific Video

```bash
# Delete only video 2
adb shell rm /storage/emulated/0/Android/data/com.deshoali/files/videos/2.mp4

# Restart app
# Video 2 shows as FAILED, others as DOWNLOADED
```

### Check Raw AsyncStorage

```bash
# View AsyncStorage database
adb shell "run-as com.deshoali cat /data/data/com.deshoali/databases/RKStorage"

# Or with SQLite
adb shell
run-as com.deshoali
cd databases
sqlite3 RKStorage
.tables
SELECT * FROM catalystLocalStorage;
```

---

**Created:** January 2025
**Purpose:** Testing Phase 2 Download Manager
**Maintainer:** Development Team
