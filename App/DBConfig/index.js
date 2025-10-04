import AsyncStorageDB from './asyncStorage';
import SQLiteDB from './SQLiteConfig';

/**
 * Database Configuration Manager
 * Provides a unified interface for data storage operations
 * Can switch between AsyncStorage and SQLite implementations
 */

// Choose your database implementation here
// Options: 'asyncstorage' or 'sqlite'
const DB_TYPE = 'asyncstorage';

class DatabaseManager {
  constructor() {
    this.db = null;
    this.initialized = false;
  }

  /**
   * Initialize the database instance
   * @returns {Promise<boolean>} - Success status
   */
  async init() {
    try {
      if (this.initialized) {
        return true;
      }

      switch (DB_TYPE.toLowerCase()) {
        case 'sqlite':
          this.db = new SQLiteDB();
          await this.db.init();
          break;
        case 'asyncstorage':
        default:
          this.db = new AsyncStorageDB();
          break;
      }

      this.initialized = true;
      console.log(`Database initialized with ${DB_TYPE} implementation`);
      return true;
    } catch (error) {
      console.error('Database initialization error:', error);
      return false;
    }
  }

  /**
   * Ensure database is initialized before operations
   * @private
   */
  async _ensureInitialized() {
    if (!this.initialized) {
      await this.init();
    }
  }

  /**
   * Store data with a key
   * @param {string} key - The key to store data under
   * @param {any} value - The value to store
   * @returns {Promise<boolean>} - Success status
   */
  async setData(key, value) {
    await this._ensureInitialized();
    return await this.db.setData(key, value);
  }

  /**
   * Retrieve data by key
   * @param {string} key - The key to retrieve data from
   * @returns {Promise<any|null>} - The stored data or null if not found
   */
  async getData(key) {
    await this._ensureInitialized();
    return await this.db.getData(key);
  }

  /**
   * Remove data by key
   * @param {string} key - The key to remove
   * @returns {Promise<boolean>} - Success status
   */
  async removeData(key) {
    await this._ensureInitialized();
    return await this.db.removeData(key);
  }

  /**
   * Clear all stored data
   * @returns {Promise<boolean>} - Success status
   */
  async clearAll() {
    await this._ensureInitialized();
    return await this.db.clearAll();
  }

  /**
   * Get all keys
   * @returns {Promise<string[]>} - Array of all keys
   */
  async getAllKeys() {
    await this._ensureInitialized();
    return await this.db.getAllKeys();
  }

  /**
   * Check if a key exists
   * @param {string} key - The key to check
   * @returns {Promise<boolean>} - Whether the key exists
   */
  async hasKey(key) {
    await this._ensureInitialized();
    return await this.db.hasKey(key);
  }

  /**
   * Get current database type
   * @returns {string} - The current database implementation type
   */
  getDBType() {
    return DB_TYPE;
  }

  /**
   * Close database connection (mainly for SQLite)
   * @returns {Promise<boolean>} - Success status
   */
  async close() {
    if (this.db && typeof this.db.close === 'function') {
      return await this.db.close();
    }
    return true;
  }
}

// Export singleton instance
const databaseManager = new DatabaseManager();
export default databaseManager;

// Constants for commonly used keys
export const DB_KEYS = {
  JWT_TOKEN: 'jwt_token',
  VIDEO_STATUS: 'video_status',
  DOWNLOAD_PROGRESS: 'download_progress',
  VIDEO_LIST: 'video_list',
  USER_PREFERENCES: 'user_preferences',
  LAST_SYNC: 'last_sync',
  OFFLINE_MODE: 'offline_mode',
};
