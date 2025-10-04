import SQLite from 'react-native-sqlite-storage';

/**
 * SQLite implementation for database operations
 */
class SQLiteDB {
  constructor() {
    this.db = null;
    this.dbName = 'DeshoaliApp.db';
    this.dbVersion = '1.0';
    this.dbDisplayName = 'Deshoali App Database';
    this.dbSize = 200000;
  }

  /**
   * Initialize SQLite database
   * @returns {Promise<boolean>} - Success status
   */
  async init() {
    try {
      this.db = await SQLite.openDatabase(
        this.dbName,
        this.dbVersion,
        this.dbDisplayName,
        this.dbSize,
      );

      // Create key-value table if it doesn't exist
      await this.db.executeSql(`
        CREATE TABLE IF NOT EXISTS key_value_store (
          key TEXT PRIMARY KEY,
          value TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      return true;
    } catch (error) {
      console.error('SQLite init error:', error);
      return false;
    }
  }

  /**
   * Store data with a key
   * @param {string} key - The key to store data under
   * @param {any} value - The value to store (will be JSON stringified)
   * @returns {Promise<boolean>} - Success status
   */
  async setData(key, value) {
    try {
      if (!this.db) {
        await this.init();
      }

      const jsonValue = JSON.stringify(value);
      await this.db.executeSql(
        `INSERT OR REPLACE INTO key_value_store (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)`,
        [key, jsonValue],
      );
      return true;
    } catch (error) {
      console.error('SQLite setData error:', error);
      return false;
    }
  }

  /**
   * Retrieve data by key
   * @param {string} key - The key to retrieve data from
   * @returns {Promise<any|null>} - The stored data or null if not found
   */
  async getData(key) {
    try {
      if (!this.db) {
        await this.init();
      }

      const results = await this.db.executeSql(
        'SELECT value FROM key_value_store WHERE key = ?',
        [key],
      );

      if (results[0].rows.length > 0) {
        const jsonValue = results[0].rows.item(0).value;
        return JSON.parse(jsonValue);
      }
      return null;
    } catch (error) {
      console.error('SQLite getData error:', error);
      return null;
    }
  }

  /**
   * Remove data by key
   * @param {string} key - The key to remove
   * @returns {Promise<boolean>} - Success status
   */
  async removeData(key) {
    try {
      if (!this.db) {
        await this.init();
      }

      await this.db.executeSql('DELETE FROM key_value_store WHERE key = ?', [
        key,
      ]);
      return true;
    } catch (error) {
      console.error('SQLite removeData error:', error);
      return false;
    }
  }

  /**
   * Clear all stored data
   * @returns {Promise<boolean>} - Success status
   */
  async clearAll() {
    try {
      if (!this.db) {
        await this.init();
      }

      await this.db.executeSql('DELETE FROM key_value_store');
      return true;
    } catch (error) {
      console.error('SQLite clearAll error:', error);
      return false;
    }
  }

  /**
   * Get all keys
   * @returns {Promise<string[]>} - Array of all keys
   */
  async getAllKeys() {
    try {
      if (!this.db) {
        await this.init();
      }

      const results = await this.db.executeSql(
        'SELECT key FROM key_value_store ORDER BY key',
      );

      const keys = [];
      for (let i = 0; i < results[0].rows.length; i++) {
        keys.push(results[0].rows.item(i).key);
      }
      return keys;
    } catch (error) {
      console.error('SQLite getAllKeys error:', error);
      return [];
    }
  }

  /**
   * Check if a key exists
   * @param {string} key - The key to check
   * @returns {Promise<boolean>} - Whether the key exists
   */
  async hasKey(key) {
    try {
      if (!this.db) {
        await this.init();
      }

      const results = await this.db.executeSql(
        'SELECT 1 FROM key_value_store WHERE key = ? LIMIT 1',
        [key],
      );

      return results[0].rows.length > 0;
    } catch (error) {
      console.error('SQLite hasKey error:', error);
      return false;
    }
  }

  /**
   * Close database connection
   * @returns {Promise<boolean>} - Success status
   */
  async close() {
    try {
      if (this.db) {
        await this.db.close();
        this.db = null;
      }
      return true;
    } catch (error) {
      console.error('SQLite close error:', error);
      return false;
    }
  }
}

export default SQLiteDB;
