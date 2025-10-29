/**
 * Central configuration manager for the media downloader application
 */

import { EventEmitter } from 'events';
import { 
  IConfigManager, 
  IConfigStorage, 
  ValidationResult, 
  ValidationError, 
  ValidationWarning,
  ConfigChangeEvent,
  AppConfig 
} from './types.js';
import { CONFIG_SCHEMA, ENV_MAPPING, getDefaultValues } from './schema.js';

export class ConfigManager extends EventEmitter implements IConfigManager {
  private storage: IConfigStorage;
  private cache: Map<string, any> = new Map();
  private initialized: boolean = false;
  private changeListeners: Set<(key: string, value: any) => void> = new Set();

  constructor(storage: IConfigStorage) {
    super();
    this.storage = storage;
  }

  /**
   * Initialize the configuration manager
   */
  async initialize(): Promise<void> {
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
  get<T>(key: string): T | undefined {
    this.ensureInitialized();
    return this.cache.get(key) as T;
  }

  /**
   * Get a required configuration value (throws if not found)
   */
  getRequired<T>(key: string): T {
    const value = this.get<T>(key);
    if (value === undefined || value === null || value === '') {
      throw new Error(`Required configuration key '${key}' is not set`);
    }
    return value;
  }

  /**
   * Set a configuration value
   */
  async set(key: string, value: any): Promise<void> {
    this.ensureInitialized();
    
    const oldValue = this.cache.get(key);
    
    // Update cache
    this.cache.set(key, value);
    
    // Persist to storage
    await this.storage.set(key, value);
    
    // Emit change event
    const changeEvent: ConfigChangeEvent = {
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
      } catch (error) {
        console.error('Error in config change listener:', error);
      }
    });
  }

  /**
   * Get all configuration as a flat object
   */
  async getAllConfig(): Promise<Record<string, any>> {
    this.ensureInitialized();
    const config: Record<string, any> = {};
    
    for (const [key, value] of this.cache.entries()) {
      config[key] = value;
    }
    
    return config;
  }

  /**
   * Get configuration as a structured object matching AppConfig interface
   */
  async getStructuredConfig(): Promise<Partial<AppConfig>> {
    const flatConfig = await this.getAllConfig();
    return this.flatToStructured(flatConfig);
  }

  /**
   * Validate the current configuration
   */
  async validate(): Promise<ValidationResult> {
    this.ensureInitialized();
    
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
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
            } else {
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
  onConfigChange(callback: (key: string, value: any) => void): void {
    this.changeListeners.add(callback);
  }

  /**
   * Remove a configuration change callback
   */
  offConfigChange(callback: (key: string, value: any) => void): void {
    this.changeListeners.delete(callback);
  }

  /**
   * Check if the application is properly configured
   */
  async isConfigured(): Promise<boolean> {
    const validation = await this.validate();
    return validation.isValid;
  }

  /**
   * Reset configuration to defaults
   */
  async resetToDefaults(): Promise<void> {
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
  private async loadFromStorage(): Promise<void> {
    try {
      const storedConfig = await this.storage.getAll();
      for (const [key, value] of Object.entries(storedConfig)) {
        this.cache.set(key, value);
      }
    } catch (error) {
      console.warn('Failed to load configuration from storage:', error);
    }
  }

  /**
   * Load configuration from environment variables
   */
  private async loadFromEnvironment(): Promise<void> {
    for (const [configKey, envKey] of Object.entries(ENV_MAPPING)) {
      const envValue = process.env[envKey];
      if (envValue !== undefined) {
        // Convert string values to appropriate types
        let processedValue: any = envValue;
        
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
  private async applyDefaults(): Promise<void> {
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
  private flatToStructured(flatConfig: Record<string, any>): Partial<AppConfig> {
    const structured: any = {};
    
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
    
    return structured as Partial<AppConfig>;
  }

  /**
   * Ensure the manager is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('ConfigManager must be initialized before use. Call initialize() first.');
    }
  }
}