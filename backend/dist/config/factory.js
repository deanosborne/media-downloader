/**
 * Factory functions for creating configured instances
 */
import { ConfigManager } from './ConfigManager.js';
import { DatabaseConfigStorage, SecureConfigStorage } from './storage.js';
/**
 * Create a ConfigManager instance with database storage
 */
export async function createConfigManager(db, useEncryption = true) {
    const baseStorage = new DatabaseConfigStorage(db);
    const storage = useEncryption ? new SecureConfigStorage(baseStorage) : baseStorage;
    const configManager = new ConfigManager(storage);
    await configManager.initialize();
    return configManager;
}
/**
 * Create a ConfigManager instance for testing with in-memory storage
 */
export async function createTestConfigManager() {
    const { MemoryConfigStorage } = await import('./storage.js');
    const storage = new MemoryConfigStorage();
    const configManager = new ConfigManager(storage);
    await configManager.initialize();
    return configManager;
}
//# sourceMappingURL=factory.js.map