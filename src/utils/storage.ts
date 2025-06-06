import EncryptedStorage from 'react-native-encrypted-storage';
import Logger from './logger'; 

// Wrapper for react-native-encrypted-storage to provide a consistent API
// and centralize error handling/logging for storage operations.

const Storage = {
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await EncryptedStorage.setItem(key, value);
      // Logger.debug(`Storage: Item set successfully (key: ${key})`); // Too verbose for every set
    } catch (error) {
      Logger.error(`Storage: Error setting item (key: ${key})`, error, { key, operation: 'setItem' });
      // Depending on the app's needs, you might want to re-throw the error
      // or handle it silently (as it is now, by just logging).
      // throw error; 
    }
  },

  getItem: async (key: string): Promise<string | null> => {
    try {
      const value = await EncryptedStorage.getItem(key);
      // Logger.debug(`Storage: Item retrieved (key: ${key})`, { value: value ? 'Exists' : 'Not Found' });
      return value;
    } catch (error) {
      Logger.error(`Storage: Error getting item (key: ${key})`, error, { key, operation: 'getItem' });
      return null; // Return null on error to indicate failure or absence
    }
  },

  removeItem: async (key: string): Promise<void> => {
    try {
      await EncryptedStorage.removeItem(key);
      Logger.debug(`Storage: Item removed successfully (key: ${key})`);
    } catch (error) {
      Logger.error(`Storage: Error removing item (key: ${key})`, error, { key, operation: 'removeItem' });
      // throw error;
    }
  },

  clearAll: async (): Promise<void> => {
    // react-native-encrypted-storage does not have a method to clear all items at once.
    // This is a deliberate design choice for security, to prevent accidental mass deletion.
    // If you need to clear multiple items, you must remove them individually by key.
    // This function can iterate over a predefined list of known keys if necessary.
    Logger.warn('Storage.clearAll() called. react-native-encrypted-storage requires individual item removal. This function will attempt to clear known store keys.');
    try {
      // Example: Clearing keys used by Zustand persist middleware and direct auth storage
      // These keys are defined in your store configurations ('auth-storage', 'app-storage') and constants.
      const { STORAGE_KEYS } = await import('@constants/index'); // Dynamically import to avoid circular dependency issues at init
      const knownKeys = [
        STORAGE_KEYS.AUTH_STORE, 
        STORAGE_KEYS.APP_STORE, 
        STORAGE_KEYS.USER_CONSENT_STATUS,
        STORAGE_KEYS.AUTH_TOKEN, // If still used directly by AuthService
        STORAGE_KEYS.AUTH_USER,   // If still used directly by AuthService
      ]; 
      for (const key of knownKeys) {
        if (key) { // Ensure key is defined
          await EncryptedStorage.removeItem(key); 
        }
      }
      Logger.info('Storage: Attempted to clear known keys from EncryptedStorage.');
    } catch (error) {
      Logger.error('Storage: Error during clearAll (manual key removal)', error, { operation: 'clearAll' });
      // throw error;
    }
  },

  // Helper for JSON objects
  setObject: async <T>(key: string, value: T): Promise<void> => {
    try {
      const jsonValue = JSON.stringify(value);
      await Storage.setItem(key, jsonValue); // Use the class's setItem for consistent logging/error handling
    } catch (error) {
      // Error is already logged by Storage.setItem if it throws
      // If Storage.setItem doesn't re-throw, this catch might not be strictly necessary
      // unless JSON.stringify fails (which is rare for valid objects).
      Logger.error(`Storage: Error serializing object before setting (key: ${key})`, error, { key, operation: 'setObject_serialize' });
    }
  },

  getObject: async <T>(key: string): Promise<T | null> => {
    try {
      const jsonValue = await Storage.getItem(key); // Use the class's getItem
      if (jsonValue != null) {
        return JSON.parse(jsonValue) as T;
      }
      return null;
    } catch (error) {
      // Error from Storage.getItem is already logged.
      // This catch handles JSON.parse errors.
      Logger.error(`Storage: Error parsing object after getting (key: ${key})`, error, { key, operation: 'getObject_parse' });
      return null;
    }
  },
};

export default Storage;
