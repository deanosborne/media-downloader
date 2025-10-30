import {
  userPreferencesStorage,
  appStateStorage,
  hydrateState,
  persistState,
  clearStoredState,
  isStorageAvailable,
} from '../storage';
import { initialState, defaultUserPreferences } from '../reducer';
import { STORAGE_KEYS, AppState, UserPreferences } from '../../types';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('Storage utilities', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  describe('userPreferencesStorage', () => {
    it('should get default preferences when none are stored', () => {
      const preferences = userPreferencesStorage.get();
      expect(preferences).toEqual(defaultUserPreferences);
    });

    it('should get stored preferences', () => {
      const customPreferences: UserPreferences = {
        ...defaultUserPreferences,
        theme: 'dark',
        language: 'es',
      };

      localStorageMock.setItem(
        STORAGE_KEYS.USER_PREFERENCES,
        JSON.stringify(customPreferences)
      );

      const preferences = userPreferencesStorage.get();
      expect(preferences).toEqual(customPreferences);
    });

    it('should set preferences', () => {
      const customPreferences: UserPreferences = {
        ...defaultUserPreferences,
        theme: 'dark',
      };

      userPreferencesStorage.set(customPreferences);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.USER_PREFERENCES,
        JSON.stringify(customPreferences)
      );
    });

    it('should update preferences', () => {
      const initialPreferences: UserPreferences = {
        ...defaultUserPreferences,
        theme: 'light',
      };

      localStorageMock.setItem(
        STORAGE_KEYS.USER_PREFERENCES,
        JSON.stringify(initialPreferences)
      );

      const updates = { theme: 'dark' as const, language: 'es' };
      const updatedPreferences = userPreferencesStorage.update(updates);

      expect(updatedPreferences.theme).toBe('dark');
      expect(updatedPreferences.language).toBe('es');
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.USER_PREFERENCES,
        JSON.stringify(updatedPreferences)
      );
    });

    it('should reset preferences', () => {
      const customPreferences: UserPreferences = {
        ...defaultUserPreferences,
        theme: 'dark',
      };

      localStorageMock.setItem(
        STORAGE_KEYS.USER_PREFERENCES,
        JSON.stringify(customPreferences)
      );

      const resetPreferences = userPreferencesStorage.reset();

      expect(resetPreferences).toEqual(defaultUserPreferences);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.USER_PREFERENCES,
        JSON.stringify(defaultUserPreferences)
      );
    });

    it('should remove preferences', () => {
      userPreferencesStorage.remove();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.USER_PREFERENCES);
    });

    it('should handle JSON parse errors gracefully', () => {
      localStorageMock.setItem(STORAGE_KEYS.USER_PREFERENCES, 'invalid-json');

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const preferences = userPreferencesStorage.get();

      expect(preferences).toEqual(defaultUserPreferences);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('appStateStorage', () => {
    it('should get null when no state is stored', () => {
      const state = appStateStorage.get();
      expect(state).toBe(null);
    });

    it('should get stored state', () => {
      const mockState = {
        user: {
          preferences: defaultUserPreferences,
          loading: false,
          error: null,
        },
      };

      localStorageMock.setItem(STORAGE_KEYS.APP_STATE, JSON.stringify(mockState));

      const state = appStateStorage.get();
      expect(state).toEqual(mockState);
    });

    it('should set state (only persistable parts)', () => {
      const fullState: AppState = {
        ...initialState,
        queue: {
          items: [
            {
              id: '1',
              name: 'Test Movie',
              type: 'movie' as any,
              status: 'not_started' as any,
              progress: 0,
              isSeasonPack: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
          loading: false,
          error: null,
          lastUpdated: new Date(),
        },
      };

      appStateStorage.set(fullState);

      const expectedPersistedState = {
        user: fullState.user,
      };

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.APP_STATE,
        JSON.stringify(expectedPersistedState)
      );
    });

    it('should remove state', () => {
      appStateStorage.remove();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.APP_STATE);
    });
  });

  describe('hydrateState', () => {
    it('should return initial state when no stored data', () => {
      const hydratedState = hydrateState(initialState);
      expect(hydratedState).toEqual(initialState);
    });

    it('should hydrate state with stored preferences', () => {
      const customPreferences: UserPreferences = {
        ...defaultUserPreferences,
        theme: 'dark',
        language: 'es',
      };

      localStorageMock.setItem(
        STORAGE_KEYS.USER_PREFERENCES,
        JSON.stringify(customPreferences)
      );

      const hydratedState = hydrateState(initialState);

      expect(hydratedState.user.preferences).toEqual(customPreferences);
      expect(hydratedState.queue).toEqual(initialState.queue);
      expect(hydratedState.config).toEqual(initialState.config);
    });

    it('should handle hydration errors gracefully', () => {
      localStorageMock.setItem(STORAGE_KEYS.USER_PREFERENCES, 'invalid-json');

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const hydratedState = hydrateState(initialState);

      expect(hydratedState).toEqual(initialState);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('persistState', () => {
    it('should persist user preferences', () => {
      const state: AppState = {
        ...initialState,
        user: {
          ...initialState.user,
          preferences: {
            ...defaultUserPreferences,
            theme: 'dark',
          },
        },
      };

      persistState(state);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.USER_PREFERENCES,
        JSON.stringify(state.user.preferences)
      );
    });

    it('should handle persistence errors gracefully', () => {
      const state: AppState = initialState;

      // Mock setItem to throw an error
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('Storage quota exceeded');
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      expect(() => persistState(state)).not.toThrow();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('clearStoredState', () => {
    it('should clear all stored data', () => {
      clearStoredState();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.USER_PREFERENCES);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.APP_STATE);
    });
  });

  describe('isStorageAvailable', () => {
    it('should return true when localStorage is available', () => {
      expect(isStorageAvailable()).toBe(true);
    });

    it('should return false when localStorage throws an error', () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('Storage not available');
      });

      expect(isStorageAvailable()).toBe(false);
    });
  });
});