/**
 * Integration tests for ConfigRepository
 */
import sqlite3 from 'sqlite3';
import { ConfigRepository } from '../ConfigRepository.js';
import { DatabaseConnection } from '../DatabaseConnection.js';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
describe('ConfigRepository', () => {
    let db;
    let connection;
    let repository;
    let testDbPath;
    beforeEach(async () => {
        // Create a temporary test database
        testDbPath = path.join(os.tmpdir(), `config_test_${Date.now()}.db`);
        db = new sqlite3.Database(testDbPath);
        connection = new DatabaseConnection(db);
        repository = new ConfigRepository(connection);
        // Create the config table
        await connection.run(`
      CREATE TABLE config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    });
    afterEach(async () => {
        // Close database and clean up
        await new Promise((resolve) => {
            db.close(() => resolve());
        });
        try {
            await fs.unlink(testDbPath);
        }
        catch (error) {
            // Ignore cleanup errors
        }
    });
    describe('createConfigItem', () => {
        it('should create a new config item', async () => {
            const configData = {
                key: 'test.setting',
                value: 'test value'
            };
            const created = await repository.createConfigItem(configData);
            expect(created.key).toBe('test.setting');
            expect(created.value).toBe('test value');
            expect(created.updatedAt).toBeInstanceOf(Date);
        });
        it('should throw error for missing key', async () => {
            await expect(repository.createConfigItem({
                key: '',
                value: 'test'
            })).rejects.toThrow('Key and value are required');
        });
        it('should throw error for duplicate key', async () => {
            await repository.createConfigItem({
                key: 'duplicate.key',
                value: 'value1'
            });
            await expect(repository.createConfigItem({
                key: 'duplicate.key',
                value: 'value2'
            })).rejects.toThrow("Configuration key 'duplicate.key' already exists");
        });
    });
    describe('setValue and getValue', () => {
        it('should set and get configuration values', async () => {
            await repository.setValue('api.key', 'secret123');
            const value = await repository.getValue('api.key');
            expect(value).toBe('secret123');
        });
        it('should return null for non-existent key', async () => {
            const value = await repository.getValue('non.existent');
            expect(value).toBeNull();
        });
        it('should update existing configuration', async () => {
            await repository.setValue('update.test', 'original');
            await repository.setValue('update.test', 'updated');
            const value = await repository.getValue('update.test');
            expect(value).toBe('updated');
        });
    });
    describe('getValues', () => {
        it('should get multiple configuration values', async () => {
            await repository.setValue('key1', 'value1');
            await repository.setValue('key2', 'value2');
            const values = await repository.getValues(['key1', 'key2', 'key3']);
            expect(values).toEqual({
                key1: 'value1',
                key2: 'value2',
                key3: null
            });
        });
    });
    describe('setValues', () => {
        it('should set multiple configuration values', async () => {
            const values = {
                'bulk.key1': 'bulk value 1',
                'bulk.key2': 'bulk value 2',
                'bulk.key3': 'bulk value 3'
            };
            const results = await repository.setValues(values);
            expect(results).toHaveLength(3);
            expect(results[0]?.key).toBe('bulk.key1');
            expect(results[0]?.value).toBe('bulk value 1');
            // Verify values were set
            const retrieved = await repository.getValues(Object.keys(values));
            expect(retrieved).toEqual(values);
        });
    });
    describe('getAllAsObject', () => {
        it('should return all configuration as object', async () => {
            await repository.setValue('setting1', 'value1');
            await repository.setValue('setting2', 'value2');
            await repository.setValue('setting3', 'value3');
            const allConfig = await repository.getAllAsObject();
            expect(allConfig).toEqual({
                setting1: 'value1',
                setting2: 'value2',
                setting3: 'value3'
            });
        });
    });
    describe('hasKey', () => {
        it('should check if key exists', async () => {
            await repository.setValue('exists.key', 'value');
            const exists = await repository.hasKey('exists.key');
            const notExists = await repository.hasKey('not.exists');
            expect(exists).toBe(true);
            expect(notExists).toBe(false);
        });
    });
    describe('deleteByKey', () => {
        it('should delete configuration by key', async () => {
            await repository.setValue('delete.me', 'value');
            expect(await repository.hasKey('delete.me')).toBe(true);
            await repository.deleteByKey('delete.me');
            expect(await repository.hasKey('delete.me')).toBe(false);
        });
    });
    describe('getKeysLike', () => {
        it('should find keys matching pattern', async () => {
            await repository.setValue('api.tmdb.key', 'tmdb123');
            await repository.setValue('api.jackett.url', 'http://jackett');
            await repository.setValue('plex.url', 'http://plex');
            const apiKeys = await repository.getKeysLike('api');
            expect(apiKeys).toHaveLength(2);
            expect(apiKeys).toContain('api.tmdb.key');
            expect(apiKeys).toContain('api.jackett.url');
            expect(apiKeys).not.toContain('plex.url');
        });
    });
    describe('getByPrefix', () => {
        it('should get configurations by key prefix', async () => {
            await repository.setValue('tmdb.api.key', 'tmdb123');
            await repository.setValue('tmdb.base.url', 'https://api.themoviedb.org');
            await repository.setValue('jackett.url', 'http://jackett');
            const tmdbConfigs = await repository.getByPrefix('tmdb');
            expect(tmdbConfigs).toHaveLength(2);
            expect(tmdbConfigs[0]?.key).toBe('tmdb.api.key');
            expect(tmdbConfigs[1]?.key).toBe('tmdb.base.url');
        });
    });
    describe('bulkUpdate', () => {
        it('should update multiple configurations in transaction', async () => {
            // Set initial values
            await repository.setValue('bulk1', 'original1');
            await repository.setValue('bulk2', 'original2');
            const updates = {
                bulk1: 'updated1',
                bulk2: 'updated2',
                bulk3: 'new3'
            };
            await repository.bulkUpdate(updates);
            const values = await repository.getValues(Object.keys(updates));
            expect(values).toEqual(updates);
        });
        it('should rollback on error during bulk update', async () => {
            await repository.setValue('existing', 'original');
            // Mock an error during bulk update
            const originalSetValue = repository.setValue.bind(repository);
            let callCount = 0;
            repository.setValue = jest.fn().mockImplementation(async (key, value) => {
                callCount++;
                if (callCount === 2) {
                    throw new Error('Simulated error');
                }
                return originalSetValue(key, value);
            });
            await expect(repository.bulkUpdate({
                existing: 'updated',
                new_key: 'new_value'
            })).rejects.toThrow('Simulated error');
            // Verify original value wasn't changed
            const value = await repository.getValue('existing');
            expect(value).toBe('original');
        });
    });
});
//# sourceMappingURL=ConfigRepository.test.js.map