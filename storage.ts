// storage.js
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Simple wrapper for cross-platform key-value storage
const storage = {
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      try {
        localStorage.setItem(key, value);
        return Promise.resolve();
      } catch (e) {
        console.error("localStorage setItem error:", e);
        return Promise.reject(e);
      }
    } else {
      return AsyncStorage.setItem(key, value);
    }
  },

  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      try {
        const value = localStorage.getItem(key);
        return Promise.resolve(value);
      } catch (e) {
        console.error("localStorage getItem error:", e);
        return Promise.reject(e);
      }
    } else {
      return AsyncStorage.getItem(key);
    }
  },

  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      try {
        localStorage.removeItem(key);
        return Promise.resolve();
      } catch (e) {
        console.error("localStorage removeItem error:", e);
        return Promise.reject(e);
      }
    } else {
      return AsyncStorage.removeItem(key);
    }
  },

  multiGet: async (keys: string[]): Promise<readonly [string, string | null][]> => {
    if (Platform.OS === 'web') {
      try {
        const results: [string, string | null][] = keys.map(key => [key, localStorage.getItem(key)]);
        return Promise.resolve(results);
      } catch (e) {
        console.error("localStorage multiGet simulation error:", e);
        return Promise.reject(e);
      }
    } else {
      return AsyncStorage.multiGet(keys);
    }
  },

  multiSet: async (keyValuePairs: [string, string][]): Promise<void> => {
    if (Platform.OS === 'web') {
      try {
        keyValuePairs.forEach(([key, value]) => {
          localStorage.setItem(key, value);
        });
        return Promise.resolve();
      } catch (e) {
        console.error("localStorage multiSet simulation error:", e);
        return Promise.reject(e);
      }
    } else {
      return AsyncStorage.multiSet(keyValuePairs);
    }
  },

  multiRemove: async (keys: string[]): Promise<void> => {
    if (Platform.OS === 'web') {
      try {
        keys.forEach(key => {
          localStorage.removeItem(key);
        });
        return Promise.resolve();
      } catch (e) {
        console.error("localStorage multiRemove simulation error:", e);
        return Promise.reject(e);
      }
    } else {
      return AsyncStorage.multiRemove(keys);
    }
  },

  getAllKeys: async (): Promise<readonly string[]> => {
    if (Platform.OS === 'web') {
      try {
        const keys = Object.keys(localStorage);
        return Promise.resolve(keys);
      } catch (e) {
        console.error("localStorage getAllKeys simulation error:", e);
        return Promise.reject(e);
      }
    } else {
      return AsyncStorage.getAllKeys();
    }
  },

  clear: async (): Promise<void> => {
    if (Platform.OS === 'web') {
      try {
        // Be careful: localStorage.clear() clears EVERYTHING, including potentially
        // unrelated data if other apps run on the same domain in development.
        // It's often safer to remove specific keys.
        // For this example, we'll stick to removing only the SYNC_KEYS if possible,
        // but provide a clear() that mimics AsyncStorage.clear().
        localStorage.clear();
        return Promise.resolve();
      } catch (e) {
        console.error("localStorage clear error:", e);
        return Promise.reject(e);
      }
    } else {
      return AsyncStorage.clear();
    }
  },
};

export default storage;