/**
 * Factory functions for creating configured instances
 */

import { Database } from 'sqlite3';
import { ConfigManager } from './ConfigManager.js';
import { DatabaseConfigStorage, SecureConfigStorage } from './storage.js';

/**
 * Create a ConfigManager instance with database storage
 */
export async function createConfigManager(db: Database, useEncryption = true): Promise<ConfigManager> {
  const baseStorage = new DatabaseConfigStorage(db);
  const storage = useEncryption ? new SecureConfigStorage(baseStorage) : baseStorage;
  
  const configManager = new ConfigManager(storage);
  await configManager.initialize();
  
  return configManager;
}

/**
 * Create a ConfigManager instance for testing with in-memory storage
 */
export async function createTestConfigManager(): Promise<ConfigManager> {
  const { MemoryConfigStorage } = await import('./storage.js');
  const storage = new MemoryConfigStorage();
  
  const configManager = new ConfigManager(storage);
  await configManager.initialize();
  
  return configManager;
}