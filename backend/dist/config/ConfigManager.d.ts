/**
 * Central configuration manager for the media downloader application
 */
import { EventEmitter } from 'events';
import { IConfigManager, IConfigStorage, ValidationResult, AppConfig } from './types.js';
export declare class ConfigManager extends EventEmitter implements IConfigManager {
    private storage;
    private cache;
    private initialized;
    private changeListeners;
    constructor(storage: IConfigStorage);
    /**
     * Initialize the configuration manager
     */
    initialize(): Promise<void>;
    /**
     * Get a configuration value
     */
    get<T>(key: string): T | undefined;
    /**
     * Get a required configuration value (throws if not found)
     */
    getRequired<T>(key: string): T;
    /**
     * Set a configuration value
     */
    set(key: string, value: any): Promise<void>;
    /**
     * Get all configuration as a flat object
     */
    getAllConfig(): Promise<Record<string, any>>;
    /**
     * Get configuration as a structured object matching AppConfig interface
     */
    getStructuredConfig(): Promise<Partial<AppConfig>>;
    /**
     * Validate the current configuration
     */
    validate(): Promise<ValidationResult>;
    /**
     * Register a callback for configuration changes
     */
    onConfigChange(callback: (key: string, value: any) => void): void;
    /**
     * Remove a configuration change callback
     */
    offConfigChange(callback: (key: string, value: any) => void): void;
    /**
     * Check if the application is properly configured
     */
    isConfigured(): Promise<boolean>;
    /**
     * Reset configuration to defaults
     */
    resetToDefaults(): Promise<void>;
    /**
     * Load configuration from storage
     */
    private loadFromStorage;
    /**
     * Load configuration from environment variables
     */
    private loadFromEnvironment;
    /**
     * Apply default values for missing configuration
     */
    private applyDefaults;
    /**
     * Convert flat configuration to structured format
     */
    private flatToStructured;
    /**
     * Ensure the manager is initialized
     */
    private ensureInitialized;
}
//# sourceMappingURL=ConfigManager.d.ts.map