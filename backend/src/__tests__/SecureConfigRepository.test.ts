import { Database } from 'sqlite3';
import { SecureConfigRepository, ConfigAccessMetadata } from '../repositories/SecureConfigRepository';
import { EncryptionManager } from '../utils/encryption';

describe('SecureConfigRepository', () => {
  let db: Database;
  let repository: SecureConfigRepository;

  beforeEach(async () => {
    // Create in-memory database for testing
    db = new Database(':memory:');
    repository = new SecureConfigRepository(db);
    
    // Wait for tables to be initialized
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  afterEach((done) => {
    db.close(done);
  });

  describe('Configuration Management', () => {
    it('should set and get non-sensitive configuration', async () => {
      await repository.setConfig('DOWNLOAD_PATH', '/home/user/downloads');
      const value = await repository.getConfig('DOWNLOAD_PATH');
      
      expect(value).toBe('/home/user/downloads');
    });

    it('should encrypt sensitive configuration', async () => {
      const apiKey = 'secret-api-key-12345';
      await repository.setConfig('TMDB_API_KEY', apiKey);
      
      const value = await repository.getConfig('TMDB_API_KEY');
      expect(value).toBe(apiKey);
      
      // Check that it's actually encrypted in the database
      const rawValue = await new Promise<string>((resolve, reject) => {
        db.get('SELECT value FROM secure_config WHERE key = ?', ['TMDB_API_KEY'], (err, row: any) => {
          if (err) reject(err);
          else resolve(row.value);
        });
      });
      
      expect(rawValue).not.toBe(apiKey);
      expect(EncryptionManager.isEncrypted(rawValue)).toBe(true);
    });

    it('should get all configuration values', async () => {
      await repository.setConfig('TMDB_API_KEY', 'secret-key-123');
      await repository.setConfig('DOWNLOAD_PATH', '/home/user/downloads');
      await repository.setConfig('PLEX_TOKEN', 'plex-token-456');

      const config = await repository.getAllConfig();
      
      expect(config['TMDB_API_KEY']).toBe('secret-key-123');
      expect(config['DOWNLOAD_PATH']).toBe('/home/user/downloads');
      expect(config['PLEX_TOKEN']).toBe('plex-token-456');
    });

    it('should delete configuration values', async () => {
      await repository.setConfig('TEST_KEY', 'test-value');
      
      let value = await repository.getConfig('TEST_KEY');
      expect(value).toBe('test-value');
      
      await repository.deleteConfig('TEST_KEY');
      
      value = await repository.getConfig('TEST_KEY');
      expect(value).toBeNull();
    });

    it('should return null for non-existent keys', async () => {
      const value = await repository.getConfig('NON_EXISTENT_KEY');
      expect(value).toBeNull();
    });

    it('should check if configuration is properly set up', async () => {
      let configured = await repository.isConfigured();
      expect(configured).toBe(false);

      await repository.setConfig('TMDB_API_KEY', 'test-key');
      
      configured = await repository.isConfigured();
      expect(configured).toBe(true);
    });
  });

  describe('Access Logging', () => {
    it('should log configuration access', async () => {
      const metadata: ConfigAccessMetadata = {
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 Test Browser'
      };

      await repository.setConfig('TEST_KEY', 'test-value', metadata);
      await repository.getConfig('TEST_KEY', metadata);

      const logs = repository.getRecentAccessLogs();
      
      expect(logs.length).toBeGreaterThanOrEqual(2);
      expect(logs[0]?.configKey).toBe('TEST_KEY');
      expect(logs[0]?.action).toBe('GET');
      expect(logs[0]?.ipAddress).toBe('192.168.1.100');
      expect(logs[1]?.configKey).toBe('TEST_KEY');
      expect(logs[1]?.action).toBe('SET');
    });

    it('should get access logs from database', async () => {
      await repository.setConfig('TEST_KEY', 'test-value');
      await repository.getConfig('TEST_KEY');

      const logs = await repository.getAccessLogs(10);
      
      expect(logs.length).toBeGreaterThanOrEqual(2);
      expect(logs[0]?.configKey).toBe('TEST_KEY');
      expect(logs[0]?.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('Backup and Restore', () => {
    it('should create and restore backups', async () => {
      // Set up some configuration
      await repository.setConfig('TMDB_API_KEY', 'secret-key-123');
      await repository.setConfig('DOWNLOAD_PATH', '/home/user/downloads');
      await repository.setConfig('PLEX_TOKEN', 'plex-token-456');

      // Create backup
      const backup = await repository.createBackup();
      expect(typeof backup).toBe('string');
      expect(backup.length).toBeGreaterThan(0);

      // Clear configuration
      await repository.deleteConfig('TMDB_API_KEY');
      await repository.deleteConfig('DOWNLOAD_PATH');
      await repository.deleteConfig('PLEX_TOKEN');

      // Verify it's cleared
      let config = await repository.getAllConfig();
      expect(Object.keys(config)).toHaveLength(0);

      // Restore from backup
      await repository.restoreFromBackup(backup);

      // Verify restoration
      config = await repository.getAllConfig();
      expect(config['TMDB_API_KEY']).toBe('secret-key-123');
      expect(config['DOWNLOAD_PATH']).toBe('/home/user/downloads');
      expect(config['PLEX_TOKEN']).toBe('plex-token-456');
    });

    it('should provide encryption key for backup purposes', () => {
      const key = repository.getEncryptionKey();
      expect(typeof key).toBe('string');
      expect(key.length).toBeGreaterThan(40);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Create a separate database instance for this test
      const testDb = new Database(':memory:');
      const testRepository = new SecureConfigRepository(testDb);
      
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Close the database to simulate error
      testDb.close();

      await expect(testRepository.setConfig('TEST_KEY', 'test-value')).rejects.toThrow();
      await expect(testRepository.getConfig('TEST_KEY')).rejects.toThrow();
      await expect(testRepository.getAllConfig()).rejects.toThrow();
    });
  });

  describe('Encryption Key Consistency', () => {
    it('should work with provided encryption key', async () => {
      const encryptionKey = EncryptionManager.generateKey();
      const repository1 = new SecureConfigRepository(db, encryptionKey);
      
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await repository1.setConfig('TMDB_API_KEY', 'secret-key-123');
      
      // Create another repository with the same key
      const repository2 = new SecureConfigRepository(db, encryptionKey);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const value = await repository2.getConfig('TMDB_API_KEY');
      expect(value).toBe('secret-key-123');
    });

    it('should fail with wrong encryption key', async () => {
      const key1 = EncryptionManager.generateKey();
      const key2 = EncryptionManager.generateKey();
      
      const repository1 = new SecureConfigRepository(db, key1);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await repository1.setConfig('TMDB_API_KEY', 'secret-key-123');
      
      // Try to read with different key
      const repository2 = new SecureConfigRepository(db, key2);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await expect(repository2.getConfig('TMDB_API_KEY')).rejects.toThrow();
    });
  });
});