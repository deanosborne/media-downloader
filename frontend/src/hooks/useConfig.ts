import { useCallback } from 'react';
import { useApi } from './useApi';
import { configApi } from '../services';
import { AppConfig } from '../types';

/**
 * Hook for managing application configuration
 */
export function useConfig() {
  const {
    data: config,
    loading: configLoading,
    error: configError,
    refetch: refetchConfig,
  } = useApi(() => configApi.get(), []);

  // Update entire configuration
  const updateConfig = useCallback(async (updates: Partial<AppConfig>): Promise<AppConfig> => {
    try {
      const updatedConfig = await configApi.update(updates);
      await refetchConfig(); // Refresh config after updating
      return updatedConfig;
    } catch (error) {
      throw error;
    }
  }, [refetchConfig]);

  // Update specific configuration section
  const updateConfigSection = useCallback(async <T>(
    section: keyof AppConfig,
    updates: Partial<T>
  ): Promise<T> => {
    try {
      const updatedSection = await configApi.updateSection(section as string, updates);
      await refetchConfig(); // Refresh config after updating section
      return updatedSection;
    } catch (error) {
      throw error;
    }
  }, [refetchConfig]);

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

  // Check if configuration is valid/complete
  const isConfigValid = useCallback((): boolean => {
    if (!config) return false;

    // Check required configuration fields
    const requiredFields = [
      'tmdb.apiKey',
      'jackett.url',
      'jackett.apiKey',
      'realDebrid.apiKey',
      'plex.url',
      'plex.token',
      'download.path',
    ];

    return requiredFields.every(field => {
      const value = getConfigValue(field);
      return value !== undefined && value !== null && value !== '';
    });
  }, [config, getConfigValue]);

  return {
    // Data
    config,
    isConfigValid: isConfigValid(),
    
    // Loading states
    loading: configLoading,
    error: configError,
    
    // Actions
    updateConfig,
    updateConfigSection,
    getConfigValue,
    refetchConfig,
  };
}

/**
 * Hook for managing a specific configuration section
 */
export function useConfigSection<T>(section: keyof AppConfig) {
  const {
    data: sectionData,
    loading,
    error,
    refetch,
  } = useApi(() => configApi.getSection<T>(section as string), [section]);

  const updateSection = useCallback(async (updates: Partial<T>): Promise<T> => {
    try {
      const updatedSection = await configApi.updateSection(section as string, updates);
      await refetch(); // Refresh section after updating
      return updatedSection;
    } catch (error) {
      throw error;
    }
  }, [section, refetch]);

  return {
    data: sectionData,
    loading,
    error,
    updateSection,
    refetch,
  };
}