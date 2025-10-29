/**
 * Configuration management module exports
 */

// Main ConfigManager class
export { ConfigManager } from './ConfigManager.js';

// Storage implementations
export { 
  DatabaseConfigStorage, 
  SecureConfigStorage, 
  MemoryConfigStorage 
} from './storage.js';

// Types and interfaces
export type {
  IConfigManager,
  IConfigStorage,
  ISecureConfigStorage,
  AppConfig,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ConfigSection,
  ConfigField,
  ConfigChangeEvent,
  EnvMapping
} from './types.js';

// Schema and validation
export {
  CONFIG_SCHEMA,
  ENV_MAPPING,
  getRequiredFields,
  getSensitiveFields,
  getDefaultValues
} from './schema.js';

// Factory functions
export {
  createConfigManager,
  createTestConfigManager
} from './factory.js';