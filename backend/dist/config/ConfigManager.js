/**
 * Central configuration manager for the media downloader application
 */
import { EventEmitter } from 'events';
import { CONFIG_SCHEMA, ENV_MAPPING, getDefaultValues } from './schema.js';
export class ConfigManager extends EventEmitter {
    constructor(storage) {
        super();
        this.cache = new Map();
        this.initialized = false;
        this.changeListeners = new Set();
        this.storage = storage;
    }
    /**
     * Initialize the configuration manager
     */
    async initialize() {
        if (this.initialized) {
            return;
        }
        // Load configuration from storage
        await this.loadFromStorage();
        // Load from environment variables
        await this.loadFromEnvironment();
        // Apply default values for missing configuration
        await this.applyDefaults();
        this.initialized = true;
    }
    /**
     * Get a configuration value
     */
    get(key) {
        this.ensureInitialized();
        return this.cache.get(key);
    }
    /**
     * Get a required configuration value (throws if not found)
     */
    getRequired(key) {
        const value = this.get(key);
        if (value === undefined || value === null || value === '') {
            throw new Error(`Required configuration key '${key}' is not set`);
        }
        return value;
    }
    /**
     * Set a configuration value
     */
    async set(key, value) {
        this.ensureInitialized();
        const oldValue = this.cache.get(key);
        // Update cache
        this.cache.set(key, value);
        // Persist to storage
        await this.storage.set(key, value);
        // Emit change event
        const changeEvent = {
            key,
            oldValue,
            newValue: value,
            timestamp: new Date()
        };
        this.emit('configChange', changeEvent);
        // Notify listeners
        this.changeListeners.forEach(listener => {
            try {
                listener(key, value);
            }
            catch (error) {
                console.error('Error in config change listener:', error);
            }
        });
    }
    /**
     * Get all configuration as a flat object
     */
    async getAllConfig() {
        this.ensureInitialized();
        const config = {};
        for (const [key, value] of this.cache.entries()) {
            config[key] = value;
        }
        return config;
    }
    /**
     * Get configuration as a structured object matching AppConfig interface
     */
    async getStructuredConfig() {
        const flatConfig = await this.getAllConfig();
        return this.flatToStructured(flatConfig);
    }
    /**
     * Validate the current configuration
     */
    async validate() {
        this.ensureInitialized();
        const errors = [];
        const warnings = [];
        // Validate each field according to schema
        for (const section of CONFIG_SCHEMA) {
            for (const field of section.fields) {
                const value = this.cache.get(field.key);
                // Check required fields
                if (field.required && (value === undefined || value === null || value === '')) {
                    errors.push({
                        key: field.key,
                        message: `Required field '${field.key}' is not set`,
                        severity: 'error'
                    });
                    continue;
                }
                // Run field validator if value exists
                if (value !== undefined && field.validator) {
                    const validationError = field.validator(value);
                    if (validationError) {
                        validationError.key = field.key;
                        if (validationError.severity === 'error') {
                            errors.push(validationError);
                        }
                        else {
                            warnings.push({
                                key: field.key,
                                message: validationError.message
                            });
                        }
                    }
                }
            }
        }
        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }
    /**
     * Register a callback for configuration changes
     */
    onConfigChange(callback) {
        this.changeListeners.add(callback);
    }
    /**
     * Remove a configuration change callback
     */
    offConfigChange(callback) {
        this.changeListeners.delete(callback);
    }
    /**
     * Check if the application is properly configured
     */
    async isConfigured() {
        const validation = await this.validate();
        return validation.isValid;
    }
    /**
     * Reset configuration to defaults
     */
    async resetToDefaults() {
        this.cache.clear();
        await this.applyDefaults();
        // Clear storage and save defaults
        const allKeys = Array.from(this.cache.keys());
        for (const key of allKeys) {
            await this.storage.set(key, this.cache.get(key));
        }
        this.emit('configReset');
    }
    /**
     * Load configuration from storage
     */
    async loadFromStorage() {
        try {
            const storedConfig = await this.storage.getAll();
            for (const [key, value] of Object.entries(storedConfig)) {
                this.cache.set(key, value);
            }
        }
        catch (error) {
            console.warn('Failed to load configuration from storage:', error);
        }
    }
    /**
     * Load configuration from environment variables
     */
    async loadFromEnvironment() {
        for (const [configKey, envKey] of Object.entries(ENV_MAPPING)) {
            const envValue = process.env[envKey];
            if (envValue !== undefined) {
                // Convert string values to appropriate types
                let processedValue = envValue;
                // Find the field definition to determine type
                const field = CONFIG_SCHEMA
                    .flatMap(section => section.fields)
                    .find(f => f.key === configKey);
                if (field) {
                    switch (field.type) {
                        case 'number':
                            processedValue = parseInt(envValue, 10);
                            if (isNaN(processedValue)) {
                                console.warn(`Invalid number value for ${configKey}: ${envValue}`);
                                continue;
                            }
                            break;
                        case 'boolean':
                            processedValue = envValue.toLowerCase() === 'true';
                            break;
                        // 'string' and 'path' remain as strings
                    }
                }
                this.cache.set(configKey, processedValue);
            }
        }
    }
    /**
     * Apply default values for missing configuration
     */
    async applyDefaults() {
        const defaults = getDefaultValues();
        for (const [key, defaultValue] of Object.entries(defaults)) {
            if (!this.cache.has(key)) {
                this.cache.set(key, defaultValue);
            }
        }
    }
    /**
     * Convert flat configuration to structured format
     */
    flatToStructured(flatConfig) {
        const structured = {};
        for (const [key, value] of Object.entries(flatConfig)) {
            const parts = key.split('.');
            let current = structured;
            for (let i = 0; i < parts.length - 1; i++) {
                const part = parts[i];
                if (part && !current[part]) {
                    current[part] = {};
                }
                if (part) {
                    current = current[part];
                }
            }
            const lastPart = parts[parts.length - 1];
            if (lastPart) {
                current[lastPart] = value;
            }
        }
        return structured;
    }
    /**
     * Ensure the manager is initialized
     */
    ensureInitialized() {
        if (!this.initialized) {
            throw new Error('ConfigManager must be initialized before use. Call initialize() first.');
        }
    }
}
//# sourceMappingURL=ConfigManager.js.map