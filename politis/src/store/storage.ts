import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage, type StateStorage } from 'zustand/middleware';
import { logger } from '@/lib/logger';

/**
 * AsyncStorage wrapped so storage failures (blocked/full storage, private browsing) never
 * block app start-up: reads fall back to "no saved state", writes are skipped and logged.
 */
const safeStorage: StateStorage = {
  async getItem(name) {
    try {
      return await AsyncStorage.getItem(name);
    } catch (error) {
      logger.error('storage.get', error);
      return null;
    }
  },
  async setItem(name, value) {
    try {
      await AsyncStorage.setItem(name, value);
    } catch (error) {
      logger.error('storage.set', error);
    }
  },
  async removeItem(name) {
    try {
      await AsyncStorage.removeItem(name);
    } catch (error) {
      logger.error('storage.remove', error);
    }
  },
};

export const persistStorage = createJSONStorage(() => safeStorage);
