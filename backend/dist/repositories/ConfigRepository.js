/**
 * Configuration repository implementation
 */
import { BaseRepository } from './BaseRepository.js';
export class ConfigRepository extends BaseRepository {
    constructor(db) {
        super(db, 'config');
    }
    getPrimaryKeyField() {
        return 'key';
    }
    mapToEntity(row) {
        return {
            key: row.key,
            value: row.value,
            updatedAt: new Date(row.updated_at)
        };
    }
    mapToRow(entity) {
        const row = {};
        if (entity.key !== undefined)
            row.key = entity.key;
        if (entity.value !== undefined)
            row.value = entity.value;
        return row;
    }
    /**
     * Find configuration by key
     */
    async findByKey(key) {
        return this.findById(key);
    }
    /**
     * Get configuration value by key
     */
    async getValue(key) {
        const config = await this.findByKey(key);
        return config ? config.value : null;
    }
    /**
     * Set configuration value
     */
    async setValue(key, value) {
        const existing = await this.findByKey(key);
        if (existing) {
            return this.update(key, { value });
        }
        else {
            return this.create({ key, value });
        }
    }
    /**
     * Get multiple configuration values
     */
    async getValues(keys) {
        const configs = await this.findAll({
            where: { key: keys }
        });
        const result = {};
        // Initialize all keys with null
        keys.forEach(key => {
            result[key] = null;
        });
        // Set found values
        configs.forEach(config => {
            result[config.key] = config.value;
        });
        return result;
    }
    /**
     * Set multiple configuration values
     */
    async setValues(values) {
        const results = [];
        for (const [key, value] of Object.entries(values)) {
            const result = await this.setValue(key, value);
            results.push(result);
        }
        return results;
    }
    /**
     * Get all configuration as a key-value object
     */
    async getAllAsObject() {
        const configs = await this.findAll();
        const result = {};
        configs.forEach(config => {
            result[config.key] = config.value;
        });
        return result;
    }
    /**
     * Delete configuration by key
     */
    async deleteByKey(key) {
        return this.delete(key);
    }
    /**
     * Check if configuration exists
     */
    async hasKey(key) {
        return this.exists(key);
    }
    /**
     * Get configuration keys matching a pattern
     */
    async getKeysLike(pattern) {
        const sql = `SELECT key FROM ${this.tableName} WHERE key LIKE ?`;
        const rows = await this.db.all(sql, [`%${pattern}%`]);
        return rows.map(row => row.key);
    }
    /**
     * Get configurations by key prefix
     */
    async getByPrefix(prefix) {
        const sql = `SELECT * FROM ${this.tableName} WHERE key LIKE ? ORDER BY key`;
        const rows = await this.db.all(sql, [`${prefix}%`]);
        return rows.map(row => this.mapToEntity(row));
    }
    /**
     * Bulk update configurations with transaction
     */
    async bulkUpdate(updates) {
        await this.db.transaction(async () => {
            for (const [key, value] of Object.entries(updates)) {
                await this.setValue(key, value);
            }
        });
    }
    /**
     * Override create method to handle string primary key
     */
    async create(entity) {
        const row = this.mapToRow(entity);
        const fields = Object.keys(row);
        const placeholders = fields.map(() => '?').join(', ');
        const values = Object.values(row);
        const sql = `INSERT INTO ${this.tableName} (${fields.join(', ')}) VALUES (${placeholders})`;
        await this.db.run(sql, values);
        const created = await this.findById(entity.key);
        if (!created) {
            throw new Error('Failed to retrieve created entity');
        }
        return created;
    }
    /**
     * Create configuration item with validation
     */
    async createConfigItem(data) {
        // Validate required fields
        if (!data.key || data.value === undefined) {
            throw new Error('Key and value are required');
        }
        // Check if key already exists
        const existing = await this.findByKey(data.key);
        if (existing) {
            throw new Error(`Configuration key '${data.key}' already exists`);
        }
        return this.create(data);
    }
}
//# sourceMappingURL=ConfigRepository.js.map