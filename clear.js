#!/usr/bin/env node

/**
 * Clear Downloaded Video Data - Testing Tool
 *
 * Usage:
 *   node clear.js           # Clear everything (default)
 *   node clear.js all       # Clear AsyncStorage + video files
 *   node clear.js files     # Clear only video files (metadata kept)
 *   node clear.js storage   # Clear only AsyncStorage (files kept)
 *   node clear.js info      # Show storage info only
 */

const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// App configuration
const APP_PACKAGE = 'com.deshoali';
const VIDEO_DIR = `/storage/emulated/0/Android/data/${APP_PACKAGE}/files/videos`;

class DataCleaner {
  constructor() {
    this.mode = process.argv[2] || 'all';
  }

  async run() {
    try {
      console.log('🧹 Deshoali Data Cleaner\n');

      if (this.mode === '--help' || this.mode === '-h') {
        this.showHelp();
        return;
      }

      // Check if device is connected
      const deviceConnected = await this.checkDevice();
      if (!deviceConnected) {
        console.log('❌ No Android device/emulator connected!');
        console.log(
          '💡 Start emulator or connect device with USB debugging enabled',
        );
        process.exit(1);
      }

      // Check if app is installed
      const appInstalled = await this.checkAppInstalled();
      if (!appInstalled) {
        console.log('❌ Deshoali app is not installed on the device!');
        console.log('💡 Run: npx react-native run-android');
        process.exit(1);
      }

      switch (this.mode) {
        case 'all':
          await this.clearAll();
          break;
        case 'files':
          await this.clearFiles();
          break;
        case 'storage':
          await this.clearAsyncStorage();
          break;
        case 'info':
          await this.showInfo();
          break;
        default:
          console.log(`❌ Unknown mode: ${this.mode}`);
          this.showHelp();
          process.exit(1);
      }
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  }

  async checkDevice() {
    try {
      const { stdout } = await execAsync('adb devices');
      const lines = stdout
        .split('\n')
        .filter(line => line.includes('\tdevice'));
      return lines.length > 0;
    } catch (error) {
      console.log('❌ Failed to check for devices. Is ADB installed?');
      return false;
    }
  }

  async checkAppInstalled() {
    try {
      const { stdout } = await execAsync(
        `adb shell pm list packages | grep ${APP_PACKAGE}`,
      );
      return stdout.includes(APP_PACKAGE);
    } catch (error) {
      return false;
    }
  }

  async clearAll() {
    console.log('🗑️  Mode: Clear Everything (AsyncStorage + Video Files)\n');

    // Stop app first
    await this.stopApp();

    // Clear AsyncStorage
    await this.clearAsyncStorage();

    // Clear video files
    await this.clearFiles();

    console.log('✅ All data cleared successfully!');
    console.log('💡 Restart app: npx react-native run-android');
    console.log(
      '📱 Expected: All videos will show as NEW, auto-download will start\n',
    );
  }

  async clearFiles() {
    console.log('🗑️  Mode: Clear Video Files Only (Keep AsyncStorage)\n');

    try {
      // Check if video directory exists
      const { stdout: dirCheck } = await execAsync(
        `adb shell "ls ${VIDEO_DIR} 2>/dev/null || echo 'DIR_NOT_FOUND'"`,
      );

      if (dirCheck.includes('DIR_NOT_FOUND')) {
        console.log('📂 Video directory does not exist yet');
        console.log('💡 No video files to clear');
        return;
      }

      // List current files
      const { stdout: fileList } = await execAsync(
        `adb shell "ls -la ${VIDEO_DIR}"`,
      );
      const files = fileList.split('\n').filter(line => line.includes('.mp4'));

      if (files.length === 0) {
        console.log('📂 No video files found');
        return;
      }

      console.log(`📂 Found ${files.length} video file(s):`);
      files.forEach(file => {
        const parts = file.trim().split(/\s+/);
        const filename = parts[parts.length - 1];
        const size = parts[4];
        console.log(`   - ${filename} (${this.formatBytes(size)})`);
      });

      // Delete all .mp4 files
      await execAsync(`adb shell "rm -f ${VIDEO_DIR}/*.mp4"`);

      console.log('✅ Video files cleared successfully!');
      console.log(
        '💡 Restart app to see videos as FAILED with retry buttons\n',
      );
    } catch (error) {
      console.log(
        "ℹ️  No video files to clear (directory empty or doesn't exist)",
      );
    }
  }

  async clearAsyncStorage() {
    console.log('🗑️  Mode: Clear AsyncStorage Only (Keep Video Files)\n');

    try {
      // Stop app to ensure clean clear
      await this.stopApp();

      // Clear app data (this clears AsyncStorage)
      console.log('🧹 Clearing AsyncStorage...');
      await execAsync(`adb shell pm clear ${APP_PACKAGE}`);

      console.log('✅ AsyncStorage cleared successfully!');
      console.log('💡 App data reset - will start as fresh install');
      console.log(
        '📱 Expected: App forgets downloads, but files remain on disk\n',
      );
    } catch (error) {
      console.log('❌ Failed to clear AsyncStorage:', error.message);
    }
  }

  async stopApp() {
    try {
      console.log('⏹️  Stopping Deshoali app...');
      await execAsync(`adb shell am force-stop ${APP_PACKAGE}`);
      console.log('✅ App stopped');
    } catch (error) {
      console.log('ℹ️  App was not running');
    }
  }

  async showInfo() {
    console.log('📊 Storage Information\n');

    try {
      // Check AsyncStorage data
      console.log('🗃️  AsyncStorage Status:');
      try {
        const { stdout: packageInfo } = await execAsync(
          `adb shell dumpsys package ${APP_PACKAGE} | grep "dataDir"`,
        );
        if (packageInfo.includes('dataDir')) {
          console.log('   ✅ App data directory exists');
        } else {
          console.log('   ❌ App data not found');
        }
      } catch (error) {
        console.log(
          '   ❓ Cannot check AsyncStorage (app may not be installed)',
        );
      }

      // Check video files
      console.log('\n📂 Video Files:');
      const { stdout: dirCheck } = await execAsync(
        `adb shell "ls ${VIDEO_DIR} 2>/dev/null || echo 'DIR_NOT_FOUND'"`,
      );

      if (dirCheck.includes('DIR_NOT_FOUND')) {
        console.log('   📂 Video directory does not exist');
        console.log('   💡 No downloads have been attempted yet');
        return;
      }

      const { stdout: fileList } = await execAsync(
        `adb shell "ls -la ${VIDEO_DIR}"`,
      );
      const files = fileList.split('\n').filter(line => line.includes('.mp4'));

      if (files.length === 0) {
        console.log('   📂 Directory exists but no video files found');
        return;
      }

      console.log(`   📊 Found ${files.length} video file(s):`);

      let totalSize = 0;
      files.forEach(file => {
        const parts = file.trim().split(/\s+/);
        const filename = parts[parts.length - 1];
        const size = parseInt(parts[4], 10);
        totalSize += size;
        console.log(`      - ${filename}: ${this.formatBytes(size)}`);
      });

      console.log(`   📏 Total size: ${this.formatBytes(totalSize)}`);

      // Check available space
      const { stdout: spaceInfo } = await execAsync(
        `adb shell "df ${VIDEO_DIR}"`,
      );
      const spaceLines = spaceInfo
        .split('\n')
        .filter(line => line.includes('/'));
      if (spaceLines.length > 0) {
        const spaceParts = spaceLines[0].trim().split(/\s+/);
        const available = parseInt(spaceParts[3], 10) * 1024; // Convert from KB to bytes
        console.log(`   💾 Available space: ${this.formatBytes(available)}`);
      }
    } catch (error) {
      console.log('❌ Error getting storage info:', error.message);
    }
  }

  formatBytes(bytes) {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
  }

  showHelp() {
    console.log(`
📖 Deshoali Data Cleaner - Usage

🧹 Clear Everything (Default):
   node clear.js
   node clear.js all
   → Clears AsyncStorage + video files
   → App starts fresh, all videos show as NEW

📄 Clear Only Video Files:
   node clear.js files
   → Keeps metadata, deletes .mp4 files
   → Videos show as FAILED with retry buttons

🗃️  Clear Only AsyncStorage:
   node clear.js storage
   → Keeps video files, clears metadata
   → App forgets downloads, files remain

📊 Show Storage Info:
   node clear.js info
   → Display current storage without clearing

❓ Help:
   node clear.js --help

🔧 Requirements:
   - Android device/emulator connected
   - ADB (Android Debug Bridge) installed
   - USB debugging enabled on device

📱 Testing Scenarios:

   Fresh Install Test:
   $ node clear.js all
   $ npx react-native run-android
   → Watch sequential downloads start

   Retry Test:
   $ node clear.js files
   → Restart app, tap retry buttons

   Storage Check:
   $ node clear.js info
   → See downloaded files and sizes
`);
  }
}

// Run the cleaner
const cleaner = new DataCleaner();
cleaner.run().catch(console.error);
