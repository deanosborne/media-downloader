import { UserPreferences, AppState, STORAGE_KEYS } from '../types';
import { defaultUserPreferences } from './reducer';

/**
 * Storage utilities for persisting app state
 */

// Generic storage functions
const getStorageItem = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    if (item === null) return defaultValue;
    return JSON.parse(item);
  } catch (error) {
    console.warn(`Failed to parse stored item for key "${key}":`, error);
    return defaultValue;
  }
};

const setStorageItem = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Failed to store item for key "${key}":`, error);
  }
};

const removeStorageItem = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn(`Failed to remove item for key "${key}":`, error);
  }
};

// User preferences storage
export const userPreferencesStorage = {
  get: (): UserPreferences => {
    return getStorageItem(STORAGE_KEYS.USER_PREFERENCES, defaultUserPreferences);
  },

  set: (preferences: UserPreferences): void => {
    setStorageItem(STORAGE_KEYS.USER_PREFERENCES, preferences);
  },

  update: (updates: Partial<UserPreferences>): UserPreferences => {
    const current = userPreferencesStorage.get();
    const updated = { ...current, ...updates };
    userPreferencesStorage.set(updated);
    return updated;
  },

  reset: (): UserPreferences => {
    userPreferencesStorage.set(defaultUserPreferences);
    return defaultUserPreferences;
  },

  remove: (): void => {
    removeStorageItem(STORAGE_KEYS.USER_PREFERENCES);
  },
};

// App state storage (for selective persistence)
export const appStateStorage = {
  get: (): Partial<AppState> | null => {
    return getStorageItem(STORAGE_KEYS.APP_STATE, null);
  },

  set: (state: Partial<AppState>): void => {
    // Only persist certain parts of the state
    const persistableState = {
      user: state.user,
      // Don't persist queue or config data as they should be fetched fresh
    };
    setStorageItem(STORAGE_KEYS.APP_STATE, persistableState);
  },

  remove: (): void => {
    removeStorageItem(STORAGE_KEYS.APP_STATE);
  },
};

// State hydration utility
export const hydrateState = (initialState: AppState): AppState => {
  try {
    // Load user preferences from storage
    const storedPreferences = userPreferencesStorage.get();
    
    // Load any other persisted state
    const storedState = appStateStorage.get();

    return {
      ...initialState,
      user: {
        ...initialState.user,
        preferences: storedPreferences,
      },
      // Merge any other stored state
      ...(storedState || {}),
    };
  } catch (error) {
    console.warn('Failed to hydrate state from storage:', error);
    return initialState;
  }
};

// State persistence utility
export const persistState = (state: AppState): void => {
  try {
    // Persist user preferences
    userPreferencesStorage.set(state.user.preferences);
    
    // Persist selective app state
    appStateStorage.set(state);
  } catch (error) {
    console.warn('Failed to persist state to storage:', error);
  }
};

// Clear all stored data
export const clearStoredState = (): void => {
  userPreferencesStorage.remove();
  appStateStorage.remove();
};

// Check if storage is available
export const isStorageAvailable = (): boolean => {
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
};