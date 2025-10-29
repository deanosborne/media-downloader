/**
 * Unit tests for ConfigManager
 */
import { ConfigManager } from '../ConfigManager.js';
import { MemoryConfigStorage } from '../storage.js';
describe('ConfigManager', () => {
    let configManager;
    let storage;
    beforeEach(async () => {
        storage = new MemoryConfigStorage();
        configManager = new ConfigManager(storage);
        await configManager.initialize();
    });
    describe('initialization', () => {
        it('should initialize successfully', async () => {
            const newStorage = new MemoryConfigStorage();
            const newManager = new ConfigManager(newStorage);
            await expect(newManager.initialize()).resolves.not.toThrow();
        });
        it('should load default values during initialization', async () => {
            const port = configManager.get('server.port');
            expect(port).toBe(5000);
            const tmdbBaseUrl = configManager.get('tmdb.baseUrl');
            expect(tmdbBaseUrl).toBe('https://api.themoviedb.org/3');
        });
        it('should not reinitialize if already initialized', async () => {
            const spy = jest.spyOn(storage, 'getAll');
            await configManager.initialize();
            // Should not call storage again
            expect(spy).not.toHaveBeenCalled();
        });
    });
    describe('get and set operations', () => {
        it('should get and set configuration values', async () => {
            await configManager.set('tmdb.apiKey', 'test-api-key');
            const apiKey = configManager.get('tmdb.apiKey');
            expect(apiKey).toBe('test-api-key');
        });
        it('should return undefined for non-existent keys', () => {
            const value = configManager.get('non.existent.key');
            expect(value).toBeUndefined();
        });
        it('should throw error for required keys that are not set', () => {
            expect(() => configManager.getRequired('tmdb.apiKey')).toThrow("Required configuration key 'tmdb.apiKey' is not set");
        });
        it('should return required values when they exist', async () => {
            await configManager.set('tmdb.apiKey', 'test-key');
            const apiKey = configManager.getRequired('tmdb.apiKey');
            expect(apiKey).toBe('test-key');
        });
        it('should persist values to storage', async () => {
            const setSpy = jest.spyOn(storage, 'set');
            await configManager.set('test.key', 'test-value');
            expect(setSpy).toHaveBeenCalledWith('test.key', 'test-value');
        });
    });
    describe('configuration change notifications', () => {
        it('should notify listeners when configuration changes', async () => {
            const listener = jest.fn();
            configManager.onConfigChange(listener);
            await configManager.set('test.key', 'new-value');
            expect(listener).toHaveBeenCalledWith('test.key', 'new-value');
        });
        it('should emit configChange event', async () => {
            const eventListener = jest.fn();
            configManager.on('configChange', eventListener);
            await configManager.set('test.key', 'new-value');
            expect(eventListener).toHaveBeenCalledWith(expect.objectContaining({
                key: 'test.key',
                newValue: 'new-value',
                timestamp: expect.any(Date)
            }));
        });
        it('should remove listeners', async () => {
            const listener = jest.fn();
            configManager.onConfigChange(listener);
            configManager.offConfigChange(listener);
            await configManager.set('test.key', 'new-value');
            expect(listener).not.toHaveBeenCalled();
        });
        it('should handle listener errors gracefully', async () => {
            const errorListener = jest.fn(() => {
                throw new Error('Listener error');
            });
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
            configManager.onConfigChange(errorListener);
            await expect(configManager.set('test.key', 'value')).resolves.not.toThrow();
            expect(consoleErrorSpy).toHaveBeenCalled();
            consoleErrorSpy.mockRestore();
        });
    });
    describe('validation', () => {
        it('should validate required fields', async () => {
            const result = await configManager.validate();
            expect(result.isValid).toBe(false);
            expect(result.errors).toEqual(expect.arrayContaining([
                expect.objectContaining({
                    key: 'tmdb.apiKey',
                    severity: 'error'
                })
            ]));
        });
        it('should pass validation when all required fields are set', async () => {
            // Set all required fields
            await configManager.set('tmdb.apiKey', 'valid-api-key-12345');
            await configManager.set('jackett.url', 'http://localhost:9117');
            await configManager.set('jackett.apiKey', 'valid-jackett-key');
            await configManager.set('realDebrid.apiKey', 'valid-rd-key-12345');
            await configManager.set('plex.url', 'http://localhost:32400');
            await configManager.set('plex.token', 'valid-plex-token');
            await configManager.set('plex.paths.movies', '/movies');
            await configManager.set('plex.paths.tvShows', '/tv');
            await configManager.set('plex.paths.books', '/books');
            await configManager.set('plex.paths.audiobooks', '/audiobooks');
            await configManager.set('download.path', '/downloads');
            const result = await configManager.validate();
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });
        it('should validate field types', async () => {
            await configManager.set('server.port', 'invalid-port');
            const result = await configManager.validate();
            expect(result.errors).toEqual(expect.arrayContaining([
                expect.objectContaining({
                    key: 'server.port',
                    message: expect.stringContaining('Port must be a number')
                })
            ]));
        });
    });
    describe('getAllConfig', () => {
        it('should return all configuration as flat object', async () => {
            await configManager.set('test.key1', 'value1');
            await configManager.set('test.key2', 'value2');
            const config = await configManager.getAllConfig();
            expect(config).toEqual(expect.objectContaining({
                'test.key1': 'value1',
                'test.key2': 'value2'
            }));
        });
    });
    describe('getStructuredConfig', () => {
        it('should return configuration in structured format', async () => {
            await configManager.set('tmdb.apiKey', 'test-key');
            await configManager.set('plex.paths.movies', '/movies');
            const config = await configManager.getStructuredConfig();
            expect(config).toEqual(expect.objectContaining({
                tmdb: expect.objectContaining({
                    apiKey: 'test-key'
                }),
                plex: expect.objectContaining({
                    paths: expect.objectContaining({
                        movies: '/movies'
                    })
                })
            }));
        });
    });
    describe('isConfigured', () => {
        it('should return false when required configuration is missing', async () => {
            const isConfigured = await configManager.isConfigured();
            expect(isConfigured).toBe(false);
        });
        it('should return true when all required configuration is present', async () => {
            // Set minimal required configuration
            await configManager.set('tmdb.apiKey', 'valid-api-key-12345');
            await configManager.set('jackett.url', 'http://localhost:9117');
            await configManager.set('jackett.apiKey', 'valid-jackett-key');
            await configManager.set('realDebrid.apiKey', 'valid-rd-key-12345');
            await configManager.set('plex.url', 'http://localhost:32400');
            await configManager.set('plex.token', 'valid-plex-token');
            await configManager.set('plex.paths.movies', '/movies');
            await configManager.set('plex.paths.tvShows', '/tv');
            await configManager.set('plex.paths.books', '/books');
            await configManager.set('plex.paths.audiobooks', '/audiobooks');
            await configManager.set('download.path', '/downloads');
            const isConfigured = await configManager.isConfigured();
            expect(isConfigured).toBe(true);
        });
    });
    describe('resetToDefaults', () => {
        it('should reset configuration to default values', async () => {
            await configManager.set('tmdb.apiKey', 'custom-key');
            await configManager.set('server.port', 8080);
            await configManager.resetToDefaults();
            expect(configManager.get('tmdb.apiKey')).toBeUndefined();
            expect(configManager.get('server.port')).toBe(5000); // default value
        });
        it('should emit configReset event', async () => {
            const eventListener = jest.fn();
            configManager.on('configReset', eventListener);
            await configManager.resetToDefaults();
            expect(eventListener).toHaveBeenCalled();
        });
    });
    describe('error handling', () => {
        it('should throw error when accessing uninitialized manager', () => {
            const uninitializedManager = new ConfigManager(storage);
            expect(() => uninitializedManager.get('test.key')).toThrow('ConfigManager must be initialized before use');
        });
        it('should handle storage errors gracefully during initialization', async () => {
            const errorStorage = {
                ...storage,
                getAll: jest.fn().mockRejectedValue(new Error('Storage error'))
            };
            const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
            const manager = new ConfigManager(errorStorage);
            await expect(manager.initialize()).resolves.not.toThrow();
            expect(consoleWarnSpy).toHaveBeenCalledWith('Failed to load configuration from storage:', expect.any(Error));
            consoleWarnSpy.mockRestore();
        });
    });
});
//# sourceMappingURL=ConfigManager.test.js.map