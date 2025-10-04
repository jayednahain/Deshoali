import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * AsyncStorage implementation for database operations
 */
class AsyncStorageDB {
  /**
   * Store data with a key
   * @param {string} key - The key to store data under
   * @param {any} value - The value to store (will be JSON stringified)
   * @returns {Promise<boolean>} - Success status
   */
  async setData(key, value) {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
      return true;
    } catch (error) {
      console.error('AsyncStorage setData error:', error);
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
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (error) {
      console.error('AsyncStorage getData error:', error);
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
      await AsyncStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('AsyncStorage removeData error:', error);
      return false;
    }
  }

  /**
   * Clear all stored data
   * @returns {Promise<boolean>} - Success status
   */
  async clearAll() {
    try {
      await AsyncStorage.clear();
      return true;
    } catch (error) {
      console.error('AsyncStorage clearAll error:', error);
      return false;
    }
  }

  /**
   * Get all keys
   * @returns {Promise<string[]>} - Array of all keys
   */
  async getAllKeys() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      return keys;
    } catch (error) {
      console.error('AsyncStorage getAllKeys error:', error);
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
      const value = await AsyncStorage.getItem(key);
      return value !== null;
    } catch (error) {
      console.error('AsyncStorage hasKey error:', error);
      return false;
    }
  }
}

export default AsyncStorageDB;
