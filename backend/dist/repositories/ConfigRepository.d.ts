/**
 * Configuration repository implementation
 */
import { BaseRepository } from './BaseRepository.js';
import { IDatabaseConnection } from './interfaces/IDatabaseConnection.js';
import { ConfigItem, CreateConfigItemData } from '../models/ConfigItem.js';
export declare class ConfigRepository extends BaseRepository<ConfigItem> {
    constructor(db: IDatabaseConnection);
    protected getPrimaryKeyField(): string;
    protected mapToEntity(row: any): ConfigItem;
    protected mapToRow(entity: Partial<ConfigItem>): any;
    /**
     * Find configuration by key
     */
    findByKey(key: string): Promise<ConfigItem | null>;
    /**
     * Get configuration value by key
     */
    getValue(key: string): Promise<string | null>;
    /**
     * Set configuration value
     */
    setValue(key: string, value: string): Promise<ConfigItem>;
    /**
     * Get multiple configuration values
     */
    getValues(keys: string[]): Promise<Record<string, string | null>>;
    /**
     * Set multiple configuration values
     */
    setValues(values: Record<string, string>): Promise<ConfigItem[]>;
    /**
     * Get all configuration as a key-value object
     */
    getAllAsObject(): Promise<Record<string, string>>;
    /**
     * Delete configuration by key
     */
    deleteByKey(key: string): Promise<void>;
    /**
     * Check if configuration exists
     */
    hasKey(key: string): Promise<boolean>;
    /**
     * Get configuration keys matching a pattern
     */
    getKeysLike(pattern: string): Promise<string[]>;
    /**
     * Get configurations by key prefix
     */
    getByPrefix(prefix: string): Promise<ConfigItem[]>;
    /**
     * Bulk update configurations with transaction
     */
    bulkUpdate(updates: Record<string, string>): Promise<void>;
    /**
     * Override create method to handle string primary key
     */
    create(entity: Partial<ConfigItem>): Promise<ConfigItem>;
    /**
     * Create configuration item with validation
     */
    createConfigItem(data: CreateConfigItemData): Promise<ConfigItem>;
}
//# sourceMappingURL=ConfigRepository.d.ts.map