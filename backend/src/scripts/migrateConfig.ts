/**
 * Configuration migration script
 * Migrates configuration from old format to new ConfigManager format
 */

import { initializeDatabase } from '../database/index.js';
import { ENV_MAPPING } from '../config/schema.js';

async function migrateConfiguration(): Promise<void> {
  console.log('🔄 Starting configuration migration...');
  
  try {
    const { configManager } = await initializeDatabase();
    
    // Load environment variables into ConfigManager if they don't exist
    let migratedCount = 0;
    
    for (const [configKey, envKey] of Object.entries(ENV_MAPPING)) {
      const envValue = process.env[envKey];
      const existingValue = configManager.get(configKey);
      
      if (envValue && !existingValue) {
        // Convert string values to appropriate types
        let processedValue: any = envValue;
        
        // Handle boolean conversion
        if (configKey === 'download.autoDownload') {
          processedValue = envValue.toLowerCase() === 'true';
        }
        
        // Handle number conversion
        if (configKey === 'server.port' || configKey === 'download.minSeeders') {
          const numValue = parseInt(envValue, 10);
          if (!isNaN(numValue)) {
            processedValue = numValue;
          }
        }
        
        await configManager.set(configKey, processedValue);
        console.log(`✓ Migrated ${envKey} -> ${configKey}`);
        migratedCount++;
      }
    }
    
    if (migratedCount > 0) {
      console.log(`✅ Migration completed! ${migratedCount} configuration values migrated.`);
      
      // Validate the migrated configuration
      const validation = await configManager.validate();
      if (validation.isValid) {
        console.log('✅ Configuration validation passed.');
      } else {
        console.log('⚠️  Configuration validation warnings:');
        validation.errors.forEach(error => {
          console.log(`   - ${error.key}: ${error.message}`);
        });
        validation.warnings.forEach(warning => {
          console.log(`   - ${warning.key}: ${warning.message}`);
        });
      }
    } else {
      console.log('ℹ️  No configuration migration needed.');
    }
    
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run migration if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateConfiguration()
    .then(() => {
      console.log('Migration script completed.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

export { migrateConfiguration };