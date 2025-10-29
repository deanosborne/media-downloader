/**
 * Configuration type definitions and interfaces for the media downloader application
 */
export interface IConfigManager {
    get<T>(key: string): T | undefined;
    set(key: string, value: any): Promise<void>;
    getRequired<T>(key: string): T;
    validate(): Promise<ValidationResult>;
    onConfigChange(callback: (key: string, value: any) => void): void;
    getAllConfig(): Promise<Record<string, any>>;
}
export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
}
export interface ValidationError {
    key: string;
    message: string;
    severity: 'error' | 'warning';
}
export interface ValidationWarning {
    key: string;
    message: string;
}
export interface AppConfig {
    server: {
        port: number;
    };
    tmdb: {
        apiKey: string;
        baseUrl: string;
    };
    jackett: {
        url: string;
        apiKey: string;
    };
    realDebrid: {
        apiKey: string;
    };
    plex: {
        url: string;
        token: string;
        paths: {
            movies: string;
            tvShows: string;
            books: string;
            audiobooks: string;
        };
    };
    download: {
        path: string;
        autoDownload: boolean;
        preferredResolution: string;
        minSeeders: number;
    };
}
export interface ConfigSection {
    name: string;
    required: boolean;
    fields: ConfigField[];
}
export interface ConfigField {
    key: string;
    type: 'string' | 'number' | 'boolean' | 'path';
    required: boolean;
    sensitive?: boolean;
    defaultValue?: any;
    validator?: (value: any) => ValidationError | null;
}
export interface EnvMapping {
    [configKey: string]: string;
}
export interface ConfigChangeEvent {
    key: string;
    oldValue: any;
    newValue: any;
    timestamp: Date;
}
export interface IConfigStorage {
    get(key: string): Promise<any>;
    set(key: string, value: any): Promise<void>;
    getAll(): Promise<Record<string, any>>;
    delete(key: string): Promise<void>;
    exists(key: string): Promise<boolean>;
}
export interface ISecureConfigStorage extends IConfigStorage {
    encrypt(value: string): string;
    decrypt(encryptedValue: string): string;
}
//# sourceMappingURL=types.d.ts.map