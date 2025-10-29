/**
 * Configuration storage implementations
 */
import { IConfigStorage, ISecureConfigStorage } from './types.js';
import { Database } from 'sqlite3';
/**
 * Database-based configuration storage
 */
export declare class DatabaseConfigStorage implements IConfigStorage {
    private db;
    constructor(db: Database);
    get(key: string): Promise<any>;
    set(key: string, value: any): Promise<void>;
    getAll(): Promise<Record<string, any>>;
    delete(key: string): Promise<void>;
    exists(key: string): Promise<boolean>;
}
/**
 * Secure configuration storage with encryption for sensitive data
 */
export declare class SecureConfigStorage implements ISecureConfigStorage {
    private storage;
    private encryptionKey;
    private sensitiveFields;
    constructor(storage: IConfigStorage, encryptionKey?: string);
    private generateEncryptionKey;
    encrypt(value: string): string;
    decrypt(encryptedValue: string): string;
    private isSensitive;
    get(key: string): Promise<any>;
    set(key: string, value: any): Promise<void>;
    getAll(): Promise<Record<string, any>>;
    delete(key: string): Promise<void>;
    exists(key: string): Promise<boolean>;
}
/**
 * In-memory configuration storage for testing
 */
export declare class MemoryConfigStorage implements IConfigStorage {
    private data;
    get(key: string): Promise<any>;
    set(key: string, value: any): Promise<void>;
    getAll(): Promise<Record<string, any>>;
    delete(key: string): Promise<void>;
    exists(key: string): Promise<boolean>;
    clear(): void;
}
//# sourceMappingURL=storage.d.ts.map