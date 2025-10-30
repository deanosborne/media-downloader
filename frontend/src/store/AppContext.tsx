import React, { createContext, useContext, useReducer, useCallback, useEffect, ReactNode } from 'react';
import { AppContextType, AppState, AppActions, QueueItem, AppConfig, UserPreferences } from '../types';
import { appReducer, initialState } from './reducer';
import { hydrateState, persistState, userPreferencesStorage } from './storage';
import { queueApi, configApi } from '../services';

// Create the context
const AppContext = createContext<AppContextType | null>(null);

// Custom hook to use the app context
export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

// Provider props
interface AppProviderProps {
  children: ReactNode;
  initialData?: Partial<AppState>;
}

// App Provider component
export const AppProvider: React.FC<AppProviderProps> = ({ children, initialData }) => {
  // Initialize state with hydrated data
  const [state, dispatch] = useReducer(
    appReducer,
    initialData ? { ...initialState, ...initialData } : hydrateState(initialState)
  );

  // Persist state changes
  useEffect(() => {
    persistState(state);
  }, [state]);

  // Queue actions
  const addToQueue = useCallback(async (item: Partial<QueueItem>): Promise<void> => {
    try {
      dispatch({ type: 'QUEUE_LOADING', payload: true });
      const newItem = await queueApi.create(item);
      dispatch({ type: 'QUEUE_ADD_ITEM', payload: newItem });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add item to queue';
      dispatch({ type: 'QUEUE_ERROR', payload: errorMessage });
      throw error;
    } finally {
      dispatch({ type: 'QUEUE_LOADING', payload: false });
    }
  }, []);

  const updateQueueItem = useCallback(async (id: string, updates: Partial<QueueItem>): Promise<void> => {
    try {
      dispatch({ type: 'QUEUE_LOADING', payload: true });
      const updatedItem = await queueApi.update(id, updates);
      dispatch({ type: 'QUEUE_UPDATE_ITEM', payload: { id, updates: updatedItem } });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update queue item';
      dispatch({ type: 'QUEUE_ERROR', payload: errorMessage });
      throw error;
    } finally {
      dispatch({ type: 'QUEUE_LOADING', payload: false });
    }
  }, []);

  const removeFromQueue = useCallback(async (id: string): Promise<void> => {
    try {
      dispatch({ type: 'QUEUE_LOADING', payload: true });
      await queueApi.delete(id);
      dispatch({ type: 'QUEUE_REMOVE_ITEM', payload: id });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove item from queue';
      dispatch({ type: 'QUEUE_ERROR', payload: errorMessage });
      throw error;
    } finally {
      dispatch({ type: 'QUEUE_LOADING', payload: false });
    }
  }, []);

  const refreshQueue = useCallback(async (): Promise<void> => {
    try {
      dispatch({ type: 'QUEUE_LOADING', payload: true });
      const items = await queueApi.getAll();
      dispatch({ type: 'QUEUE_SUCCESS', payload: items });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh queue';
      dispatch({ type: 'QUEUE_ERROR', payload: errorMessage });
      throw error;
    }
  }, []);

  const clearQueueError = useCallback((): void => {
    dispatch({ type: 'QUEUE_CLEAR_ERROR' });
  }, []);

  // Config actions
  const updateConfig = useCallback(async (config: Partial<AppConfig>): Promise<void> => {
    try {
      dispatch({ type: 'CONFIG_LOADING', payload: true });
      const updatedConfig = await configApi.update(config);
      dispatch({ type: 'CONFIG_SUCCESS', payload: updatedConfig });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update configuration';
      dispatch({ type: 'CONFIG_ERROR', payload: errorMessage });
      throw error;
    }
  }, []);

  const updateConfigSection = useCallback(async (
    section: keyof AppConfig,
    updates: any
  ): Promise<void> => {
    try {
      dispatch({ type: 'CONFIG_LOADING', payload: true });
      await configApi.updateSection(section as string, updates);
      
      // Update the local state optimistically
      const currentConfig = state.config.data;
      if (currentConfig) {
        const updatedConfig = {
          ...currentConfig,
          [section]: {
            ...currentConfig[section],
            ...updates,
          },
        };
        dispatch({ type: 'CONFIG_SUCCESS', payload: updatedConfig });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update configuration section';
      dispatch({ type: 'CONFIG_ERROR', payload: errorMessage });
      throw error;
    }
  }, [state.config.data]);

  const refreshConfig = useCallback(async (): Promise<void> => {
    try {
      dispatch({ type: 'CONFIG_LOADING', payload: true });
      const config = await configApi.get();
      dispatch({ type: 'CONFIG_SUCCESS', payload: config });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh configuration';
      dispatch({ type: 'CONFIG_ERROR', payload: errorMessage });
      throw error;
    }
  }, []);

  const clearConfigError = useCallback((): void => {
    dispatch({ type: 'CONFIG_CLEAR_ERROR' });
  }, []);

  // User preferences actions
  const updateUserPreferences = useCallback(async (preferences: Partial<UserPreferences>): Promise<void> => {
    try {
      dispatch({ type: 'USER_LOADING', payload: true });
      const updatedPreferences = userPreferencesStorage.update(preferences);
      dispatch({ type: 'USER_SUCCESS', payload: updatedPreferences });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update user preferences';
      dispatch({ type: 'USER_ERROR', payload: errorMessage });
      throw error;
    }
  }, []);

  const resetUserPreferences = useCallback(async (): Promise<void> => {
    try {
      dispatch({ type: 'USER_LOADING', payload: true });
      const defaultPreferences = userPreferencesStorage.reset();
      dispatch({ type: 'USER_SUCCESS', payload: defaultPreferences });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to reset user preferences';
      dispatch({ type: 'USER_ERROR', payload: errorMessage });
      throw error;
    }
  }, []);

  const clearUserError = useCallback((): void => {
    dispatch({ type: 'USER_CLEAR_ERROR' });
  }, []);

  // Combine all actions
  const actions: AppActions = {
    // Queue actions
    addToQueue,
    updateQueueItem,
    removeFromQueue,
    refreshQueue,
    clearQueueError,
    
    // Config actions
    updateConfig,
    updateConfigSection,
    refreshConfig,
    clearConfigError,
    
    // User preferences actions
    updateUserPreferences,
    resetUserPreferences,
    clearUserError,
  };

  // Auto-refresh queue if enabled
  useEffect(() => {
    if (state.user.preferences.autoRefresh) {
      const interval = setInterval(() => {
        refreshQueue().catch(console.error);
      }, state.user.preferences.refreshInterval);

      return () => clearInterval(interval);
    }
  }, [state.user.preferences.autoRefresh, state.user.preferences.refreshInterval, refreshQueue]);

  // Initial data loading
  useEffect(() => {
    // Load initial queue data
    refreshQueue().catch(console.error);
    
    // Load initial config data
    refreshConfig().catch(console.error);
  }, [refreshQueue, refreshConfig]);

  const contextValue: AppContextType = {
    state,
    actions,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

// Export the context for testing purposes
export { AppContext };