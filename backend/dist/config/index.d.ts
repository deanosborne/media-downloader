/**
 * Configuration management module exports
 */
export { ConfigManager } from './ConfigManager.js';
export { DatabaseConfigStorage, SecureConfigStorage, MemoryConfigStorage } from './storage.js';
export type { IConfigManager, IConfigStorage, ISecureConfigStorage, AppConfig, ValidationResult, ValidationError, ValidationWarning, ConfigSection, ConfigField, ConfigChangeEvent, EnvMapping } from './types.js';
export { CONFIG_SCHEMA, ENV_MAPPING, getRequiredFields, getSensitiveFields, getDefaultValues } from './schema.js';
export { createConfigManager, createTestConfigManager } from './factory.js';
//# sourceMappingURL=index.d.ts.map