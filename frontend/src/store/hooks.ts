import { useCallback, useMemo } from 'react';
import { useAppContext } from './AppContext';
import { QueueItem, QueueStatus, MediaType, UserPreferences } from '../types';

/**
 * Hook for queue-specific operations and selectors
 */
export const useQueue = () => {
  const { state, actions } = useAppContext();

  // Selectors
  const queueItems = state.queue.items;
  const queueLoading = state.queue.loading;
  const queueError = state.queue.error;
  const lastUpdated = state.queue.lastUpdated;

  // Computed values
  const queueStats = useMemo(() => {
    return {
      total: queueItems.length,
      notStarted: queueItems.filter(item => item.status === QueueStatus.NOT_STARTED).length,
      inProgress: queueItems.filter(item => item.status === QueueStatus.IN_PROGRESS).length,
      completed: queueItems.filter(item => item.status === QueueStatus.COMPLETED).length,
      error: queueItems.filter(item => item.status === QueueStatus.ERROR).length,
    };
  }, [queueItems]);

  // Filtered selectors
  const getItemsByStatus = useCallback((status: QueueStatus): QueueItem[] => {
    return queueItems.filter(item => item.status === status);
  }, [queueItems]);

  const getItemsByType = useCallback((type: MediaType): QueueItem[] => {
    return queueItems.filter(item => item.type === type);
  }, [queueItems]);

  const getItemById = useCallback((id: string): QueueItem | undefined => {
    return queueItems.find(item => item.id === id);
  }, [queueItems]);

  // Search functionality
  const searchItems = useCallback((query: string): QueueItem[] => {
    if (!query.trim()) return queueItems;
    
    const lowercaseQuery = query.toLowerCase();
    return queueItems.filter(item =>
      item.name.toLowerCase().includes(lowercaseQuery) ||
      item.episodeName?.toLowerCase().includes(lowercaseQuery)
    );
  }, [queueItems]);

  return {
    // Data
    items: queueItems,
    stats: queueStats,
    loading: queueLoading,
    error: queueError,
    lastUpdated,
    
    // Selectors
    getItemsByStatus,
    getItemsByType,
    getItemById,
    searchItems,
    
    // Actions
    addToQueue: actions.addToQueue,
    updateQueueItem: actions.updateQueueItem,
    removeFromQueue: actions.removeFromQueue,
    refreshQueue: actions.refreshQueue,
    clearQueueError: actions.clearQueueError,
  };
};

/**
 * Hook for configuration-specific operations
 */
export const useConfig = () => {
  const { state, actions } = useAppContext();

  const config = state.config.data;
  const configLoading = state.config.loading;
  const configError = state.config.error;
  const isConfigValid = state.config.isValid;

  // Get specific configuration value with type safety
  const getConfigValue = useCallback(<T>(
    path: string,
    defaultValue?: T
  ): T | undefined => {
    if (!config) return defaultValue;

    const keys = path.split('.');
    let value: any = config;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return defaultValue;
      }
    }

    return value as T;
  }, [config]);

  // Check if specific configuration section is complete
  const isSectionValid = useCallback((section: keyof typeof config): boolean => {
    if (!config) return false;
    
    const sectionData = config[section];
    if (!sectionData || typeof sectionData !== 'object') return false;
    
    // Check if all values in the section are non-empty
    return Object.values(sectionData).every(value => 
      value !== undefined && value !== null && value !== ''
    );
  }, [config]);

  return {
    // Data
    config,
    loading: configLoading,
    error: configError,
    isValid: isConfigValid,
    
    // Utilities
    getConfigValue,
    isSectionValid,
    
    // Actions
    updateConfig: actions.updateConfig,
    updateConfigSection: actions.updateConfigSection,
    refreshConfig: actions.refreshConfig,
    clearConfigError: actions.clearConfigError,
  };
};

/**
 * Hook for user preferences operations
 */
export const useUserPreferences = () => {
  const { state, actions } = useAppContext();

  const preferences = state.user.preferences;
  const userLoading = state.user.loading;
  const userError = state.user.error;

  // Specific preference getters
  const theme = preferences.theme;
  const language = preferences.language;
  const autoRefresh = preferences.autoRefresh;
  const refreshInterval = preferences.refreshInterval;
  const notifications = preferences.notifications;
  const ui = preferences.ui;

  // Update specific preference sections
  const updateNotifications = useCallback((updates: Partial<UserPreferences['notifications']>) => {
    return actions.updateUserPreferences({
      notifications: { ...preferences.notifications, ...updates }
    });
  }, [actions.updateUserPreferences, preferences.notifications]);

  const updateUI = useCallback((updates: Partial<UserPreferences['ui']>) => {
    return actions.updateUserPreferences({
      ui: { ...preferences.ui, ...updates }
    });
  }, [actions.updateUserPreferences, preferences.ui]);

  const updateTheme = useCallback((theme: UserPreferences['theme']) => {
    return actions.updateUserPreferences({ theme });
  }, [actions.updateUserPreferences]);

  const updateLanguage = useCallback((language: string) => {
    return actions.updateUserPreferences({ language });
  }, [actions.updateUserPreferences]);

  const updateAutoRefresh = useCallback((autoRefresh: boolean, refreshInterval?: number) => {
    const updates: Partial<UserPreferences> = { autoRefresh };
    if (refreshInterval !== undefined) {
      updates.refreshInterval = refreshInterval;
    }
    return actions.updateUserPreferences(updates);
  }, [actions.updateUserPreferences]);

  return {
    // Data
    preferences,
    loading: userLoading,
    error: userError,
    
    // Specific preferences
    theme,
    language,
    autoRefresh,
    refreshInterval,
    notifications,
    ui,
    
    // Specific updaters
    updateNotifications,
    updateUI,
    updateTheme,
    updateLanguage,
    updateAutoRefresh,
    
    // General actions
    updateUserPreferences: actions.updateUserPreferences,
    resetUserPreferences: actions.resetUserPreferences,
    clearUserError: actions.clearUserError,
  };
};

/**
 * Hook for app-wide loading states
 */
export const useAppLoading = () => {
  const { state } = useAppContext();

  const isLoading = state.queue.loading || state.config.loading || state.user.loading;
  const hasErrors = !!(state.queue.error || state.config.error || state.user.error);

  const loadingStates = {
    queue: state.queue.loading,
    config: state.config.loading,
    user: state.user.loading,
  };

  const errors = {
    queue: state.queue.error,
    config: state.config.error,
    user: state.user.error,
  };

  return {
    isLoading,
    hasErrors,
    loadingStates,
    errors,
  };
};