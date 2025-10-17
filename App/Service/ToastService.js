/**
 * ToastService - Centralized Toast Notification System
 *
 * Provides a unified interface for displaying toast notifications throughout the app
 * Integrates with react-native-toast-message library
 * Supports different toast types with consistent styling
 *
 * Features:
 * - Success, Error, Warning, Info toast types
 * - Download progress toasts
 * - Network status toasts
 * - Custom positioning and duration
 * - Multi-language support
 *
 * @version 1.0.0
 * @author Deshoali Team
 * @created 2024-12-21
 */

import Toast from 'react-native-toast-message';

/**
 * ToastService Class
 * Provides static methods for showing different types of toast notifications
 */
class ToastService {
  // Default configuration
  static defaultConfig = {
    position: 'top',
    visibilityTime: 4000,
    autoHide: true,
    topOffset: 50,
    bottomOffset: 40,
  };

  /**
   * Show success toast
   * @param {string} title - Toast title
   * @param {string} message - Toast message
   * @param {object} options - Additional options
   */
  static showSuccess(title, message = '', options = {}) {
    console.log('[ToastService] Showing success toast:', title, message);

    Toast.show({
      type: 'success',
      text1: title,
      text2: message,
      position: options.position || this.defaultConfig.position,
      visibilityTime: options.duration || this.defaultConfig.visibilityTime,
      autoHide:
        options.autoHide !== undefined
          ? options.autoHide
          : this.defaultConfig.autoHide,
      topOffset: options.topOffset || this.defaultConfig.topOffset,
      bottomOffset: options.bottomOffset || this.defaultConfig.bottomOffset,
      onShow: options.onShow,
      onHide: options.onHide,
      onPress: options.onPress,
    });
  }

  /**
   * Show error toast
   * @param {string} title - Toast title
   * @param {string} message - Toast message
   * @param {object} options - Additional options
   */
  static showError(title, message = '', options = {}) {
    console.log('[ToastService] Showing error toast:', title, message);

    Toast.show({
      type: 'error',
      text1: title,
      text2: message,
      position: options.position || this.defaultConfig.position,
      visibilityTime: options.duration || 6000, // Longer duration for errors
      autoHide:
        options.autoHide !== undefined
          ? options.autoHide
          : this.defaultConfig.autoHide,
      topOffset: options.topOffset || this.defaultConfig.topOffset,
      bottomOffset: options.bottomOffset || this.defaultConfig.bottomOffset,
      onShow: options.onShow,
      onHide: options.onHide,
      onPress: options.onPress,
    });
  }

  /**
   * Show warning toast
   * @param {string} title - Toast title
   * @param {string} message - Toast message
   * @param {object} options - Additional options
   */
  static showWarning(title, message = '', options = {}) {
    console.log('[ToastService] Showing warning toast:', title, message);

    Toast.show({
      type: 'info', // Use info type for warnings with custom styling
      text1: title,
      text2: message,
      position: options.position || this.defaultConfig.position,
      visibilityTime: options.duration || 5000,
      autoHide:
        options.autoHide !== undefined
          ? options.autoHide
          : this.defaultConfig.autoHide,
      topOffset: options.topOffset || this.defaultConfig.topOffset,
      bottomOffset: options.bottomOffset || this.defaultConfig.bottomOffset,
      onShow: options.onShow,
      onHide: options.onHide,
      onPress: options.onPress,
    });
  }

  /**
   * Show info toast
   * @param {string} title - Toast title
   * @param {string} message - Toast message
   * @param {object} options - Additional options
   */
  static showInfo(title, message = '', options = {}) {
    console.log('[ToastService] Showing info toast:', title, message);

    Toast.show({
      type: 'info',
      text1: title,
      text2: message,
      position: options.position || this.defaultConfig.position,
      visibilityTime: options.duration || this.defaultConfig.visibilityTime,
      autoHide:
        options.autoHide !== undefined
          ? options.autoHide
          : this.defaultConfig.autoHide,
      topOffset: options.topOffset || this.defaultConfig.topOffset,
      bottomOffset: options.bottomOffset || this.defaultConfig.bottomOffset,
      onShow: options.onShow,
      onHide: options.onHide,
      onPress: options.onPress,
    });
  }

  /**
   * Show download progress toast
   * @param {string} fileName - Name of file being downloaded
   * @param {number} progress - Download progress (0-100)
   * @param {object} options - Additional options
   */
  static showDownloadProgress(fileName, progress = 0, options = {}) {
    const progressText = `${Math.round(progress)}% completed`;

    console.log(
      '[ToastService] Showing download progress toast:',
      fileName,
      progressText,
    );

    Toast.show({
      type: 'info',
      text1: `Downloading: ${fileName}`,
      text2: progressText,
      position: options.position || 'bottom',
      visibilityTime: options.duration || 2000,
      autoHide: options.autoHide !== undefined ? options.autoHide : true,
      topOffset: options.topOffset || this.defaultConfig.topOffset,
      bottomOffset: options.bottomOffset || this.defaultConfig.bottomOffset,
      onShow: options.onShow,
      onHide: options.onHide,
      onPress: options.onPress,
    });
  }

  /**
   * Show download completed toast
   * @param {string} fileName - Name of downloaded file
   * @param {object} options - Additional options
   */
  static showDownloadCompleted(fileName, options = {}) {
    console.log('[ToastService] Showing download completed toast:', fileName);

    this.showSuccess(
      'Download Completed',
      `${fileName} downloaded successfully`,
      {
        position: 'bottom',
        ...options,
      },
    );
  }

  /**
   * Show download failed toast
   * @param {string} fileName - Name of file that failed to download
   * @param {string} error - Error message
   * @param {object} options - Additional options
   */
  static showDownloadFailed(fileName, error = 'Unknown error', options = {}) {
    console.log(
      '[ToastService] Showing download failed toast:',
      fileName,
      error,
    );

    this.showError('Download Failed', `${fileName}: ${error}`, {
      position: 'bottom',
      duration: 6000,
      ...options,
    });
  }

  /**
   * Show network status toast
   * @param {boolean} isOnline - Network status
   * @param {object} options - Additional options
   */
  static showNetworkStatus(isOnline, options = {}) {
    console.log(
      '[ToastService] Showing network status toast:',
      isOnline ? 'Online' : 'Offline',
    );

    if (isOnline) {
      this.showSuccess('Back Online', 'Internet connection restored', {
        duration: 3000,
        ...options,
      });
    } else {
      this.showWarning('No Internet Connection', 'You are now offline', {
        duration: 5000,
        ...options,
      });
    }
  }

  /**
   * Show storage warning toast
   * @param {string} availableSpace - Available storage space
   * @param {object} options - Additional options
   */
  static showStorageWarning(availableSpace, options = {}) {
    console.log(
      '[ToastService] Showing storage warning toast:',
      availableSpace,
    );

    this.showWarning('Low Storage Space', `Only ${availableSpace} available`, {
      duration: 6000,
      position: 'bottom',
      ...options,
    });
  }

  /**
   * Show sync completed toast
   * @param {number} syncedCount - Number of items synced
   * @param {object} options - Additional options
   */
  static showSyncCompleted(syncedCount = 0, options = {}) {
    console.log('[ToastService] Showing sync completed toast:', syncedCount);

    this.showSuccess('Sync Completed', `${syncedCount} items synchronized`, {
      duration: 3000,
      ...options,
    });
  }

  /**
   * Show custom toast with full control
   * @param {object} config - Complete toast configuration
   */
  static showCustom(config = {}) {
    console.log('[ToastService] Showing custom toast:', config);

    Toast.show({
      ...this.defaultConfig,
      ...config,
    });
  }

  /**
   * Hide current toast
   */
  static hide() {
    console.log('[ToastService] Hiding current toast');
    Toast.hide();
  }

  /**
   * Get toast configuration for App.js setup
   * Returns simple configuration without inline styles
   */
  static getToastConfig() {
    return {
      // Use default toast configurations provided by react-native-toast-message
      // Custom styling can be added later without inline styles
    };
  }
}

export default ToastService;
