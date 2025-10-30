// Main store exports
export { AppProvider, useAppContext, AppContext } from './AppContext';
export { useQueue, useConfig, useUserPreferences, useAppLoading } from './hooks';
export { appReducer, initialState, defaultUserPreferences } from './reducer';
export { 
  userPreferencesStorage, 
  appStateStorage, 
  hydrateState, 
  persistState, 
  clearStoredState,
  isStorageAvailable 
} from './storage';

// Re-export types for convenience
export type {
  AppState,
  AppActions,
  AppContextType,
  AppActionType,
  UserPreferences,
} from '../types';