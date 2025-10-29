/**
 * Configuration validation schemas and field definitions
 */
import { ConfigSection, EnvMapping } from './types.js';
export declare const ENV_MAPPING: EnvMapping;
export declare const CONFIG_SCHEMA: ConfigSection[];
export declare const getRequiredFields: () => string[];
export declare const getSensitiveFields: () => string[];
export declare const getDefaultValues: () => Record<string, any>;
//# sourceMappingURL=schema.d.ts.map