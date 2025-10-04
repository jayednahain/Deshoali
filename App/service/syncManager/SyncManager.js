import NetInfo from '@react-native-community/netinfo';
import { AppState } from 'react-native';
import databaseManager, { DB_KEYS } from '../../DBConfig';
import { videoDownloadManager } from '../downloadManager';

/**
 * Sync Manager Class
 * Handles network status changes, app lifecycle events, and data synchronization
 */
class SyncManager {
  constructor() {
    this.isOnline = true;
    this.appState = AppState.currentState;
    this.networkUnsubscribe = null;
    this.appStateSubscription = null;
    this.syncCallbacks = [];
    this.networkCallbacks = [];

    this.initialize();
  }

  /**
   * Initialize sync manager
   */
  initialize() {
    this.setupNetworkListener();
    this.setupAppStateListener();
    this.performInitialSync();
  }

  /**
   * Setup network connection listener
   */
  setupNetworkListener() {
    this.networkUnsubscribe = NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected && state.isInternetReachable;

      console.log('Network status changed:', {
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
        wasOffline,
        isNowOnline: this.isOnline,
      });

      // Notify network status callbacks
      this.networkCallbacks.forEach(callback => {
        callback({
          isOnline: this.isOnline,
          wasOffline,
          connectionType: state.type,
        });
      });

      // Handle network recovery
      if (wasOffline && this.isOnline) {
        this.handleNetworkRecovery();
      }
    });
  }

  /**
   * Setup app state listener
   */
  setupAppStateListener() {
    this.appStateSubscription = AppState.addEventListener(
      'change',
      nextAppState => {
        const previousAppState = this.appState;
        this.appState = nextAppState;

        console.log('App state changed:', { previousAppState, nextAppState });

        if (previousAppState === 'background' && nextAppState === 'active') {
          // App came to foreground
          this.handleAppForeground();
        } else if (
          previousAppState === 'active' &&
          nextAppState === 'background'
        ) {
          // App went to background
          this.handleAppBackground();
        }
      },
    );
  }

  /**
   * Perform initial sync when app starts
   */
  async performInitialSync() {
    try {
      console.log('Performing initial sync...');

      // Clear any interrupted download states
      await videoDownloadManager.clearDownloadStates();

      // Check initial network status
      const netInfo = await NetInfo.fetch();
      this.isOnline = netInfo.isConnected && netInfo.isInternetReachable;

      // Store initial network status
      await databaseManager.setData(DB_KEYS.OFFLINE_MODE, !this.isOnline);

      // Notify sync callbacks
      this.syncCallbacks.forEach(callback => {
        callback({
          type: 'initial-sync',
          isOnline: this.isOnline,
          timestamp: new Date().toISOString(),
        });
      });

      console.log('Initial sync completed');
    } catch (error) {
      console.error('Error performing initial sync:', error);
    }
  }

  /**
   * Handle network recovery (offline -> online)
   */
  async handleNetworkRecovery() {
    try {
      console.log('Handling network recovery...');

      // Update offline mode status
      await databaseManager.setData(DB_KEYS.OFFLINE_MODE, false);

      // Notify sync callbacks
      this.syncCallbacks.forEach(callback => {
        callback({
          type: 'network-recovery',
          isOnline: true,
          timestamp: new Date().toISOString(),
        });
      });

      console.log('Network recovery handled');
    } catch (error) {
      console.error('Error handling network recovery:', error);
    }
  }

  /**
   * Handle app coming to foreground
   */
  async handleAppForeground() {
    try {
      console.log('Handling app foreground...');

      // Check current network status
      const netInfo = await NetInfo.fetch();
      const wasOffline = !this.isOnline;
      this.isOnline = netInfo.isConnected && netInfo.isInternetReachable;

      // Clear interrupted download states
      await videoDownloadManager.clearDownloadStates();

      // If network status changed while app was in background
      if (wasOffline !== !this.isOnline) {
        await databaseManager.setData(DB_KEYS.OFFLINE_MODE, !this.isOnline);

        if (this.isOnline) {
          await this.handleNetworkRecovery();
        }
      }

      // Notify sync callbacks
      this.syncCallbacks.forEach(callback => {
        callback({
          type: 'app-foreground',
          isOnline: this.isOnline,
          networkChanged: wasOffline !== !this.isOnline,
          timestamp: new Date().toISOString(),
        });
      });

      console.log('App foreground handled');
    } catch (error) {
      console.error('Error handling app foreground:', error);
    }
  }

  /**
   * Handle app going to background
   */
  async handleAppBackground() {
    try {
      console.log('Handling app background...');

      // Update last active timestamp
      await databaseManager.setData('last_active', new Date().toISOString());

      // Notify sync callbacks
      this.syncCallbacks.forEach(callback => {
        callback({
          type: 'app-background',
          isOnline: this.isOnline,
          timestamp: new Date().toISOString(),
        });
      });

      console.log('App background handled');
    } catch (error) {
      console.error('Error handling app background:', error);
    }
  }

  /**
   * Subscribe to sync events
   * @param {Function} callback - Callback function
   */
  subscribeToSync(callback) {
    this.syncCallbacks.push(callback);
  }

  /**
   * Subscribe to network status changes
   * @param {Function} callback - Callback function
   */
  subscribeToNetwork(callback) {
    this.networkCallbacks.push(callback);
  }

  /**
   * Unsubscribe from sync events
   * @param {Function} callback - Callback function to remove
   */
  unsubscribeFromSync(callback) {
    this.syncCallbacks = this.syncCallbacks.filter(cb => cb !== callback);
  }

  /**
   * Unsubscribe from network events
   * @param {Function} callback - Callback function to remove
   */
  unsubscribeFromNetwork(callback) {
    this.networkCallbacks = this.networkCallbacks.filter(cb => cb !== callback);
  }

  /**
   * Get current network status
   * @returns {boolean} - Whether device is online
   */
  getNetworkStatus() {
    return this.isOnline;
  }

  /**
   * Get current app state
   * @returns {string} - Current app state
   */
  getAppState() {
    return this.appState;
  }

  /**
   * Force sync check
   */
  async forceSyncCheck() {
    try {
      const netInfo = await NetInfo.fetch();
      const wasOffline = !this.isOnline;
      this.isOnline = netInfo.isConnected && netInfo.isInternetReachable;

      if (wasOffline && this.isOnline) {
        await this.handleNetworkRecovery();
      }

      // Notify sync callbacks
      this.syncCallbacks.forEach(callback => {
        callback({
          type: 'force-sync',
          isOnline: this.isOnline,
          timestamp: new Date().toISOString(),
        });
      });

      return this.isOnline;
    } catch (error) {
      console.error('Error performing force sync check:', error);
      return this.isOnline;
    }
  }

  /**
   * Check if device has been offline for extended period
   * @returns {Promise<boolean>} - Whether device has been offline for a long time
   */
  async hasBeenOfflineLong() {
    try {
      const lastSync = await databaseManager.getData(DB_KEYS.LAST_SYNC);
      if (!lastSync) return true;

      const lastSyncTime = new Date(lastSync);
      const now = new Date();
      const hoursSinceSync = (now - lastSyncTime) / (1000 * 60 * 60);

      return hoursSinceSync > 24; // Consider 24 hours as "long time"
    } catch (error) {
      console.error('Error checking offline duration:', error);
      return true;
    }
  }

  /**
   * Get sync statistics
   * @returns {Promise<Object>} - Sync statistics
   */
  async getSyncStats() {
    try {
      const lastSync = await databaseManager.getData(DB_KEYS.LAST_SYNC);
      const isOfflineMode = await databaseManager.getData(DB_KEYS.OFFLINE_MODE);
      const lastActive = await databaseManager.getData('last_active');

      return {
        lastSync,
        isOfflineMode: isOfflineMode || false,
        lastActive,
        currentNetworkStatus: this.isOnline,
        appState: this.appState,
      };
    } catch (error) {
      console.error('Error getting sync stats:', error);
      return {
        lastSync: null,
        isOfflineMode: true,
        lastActive: null,
        currentNetworkStatus: false,
        appState: 'unknown',
      };
    }
  }

  /**
   * Cleanup sync manager
   */
  cleanup() {
    if (this.networkUnsubscribe) {
      this.networkUnsubscribe();
    }

    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }

    this.syncCallbacks = [];
    this.networkCallbacks = [];
  }
}

// Export singleton instance
const syncManager = new SyncManager();
export default syncManager;
