import { EncryptionManager, SecureConfigManager } from '../utils/encryption';
import { ConfigurationError } from '../types/errors';

describe('Encryption and Secure Configuration', () => {
  describe('EncryptionManager', () => {
    let encryptionManager: EncryptionManager;

    beforeEach(() => {
      encryptionManager = new EncryptionManager();
    });

    it('should encrypt and decrypt data correctly', () => {
      const plaintext = 'secret-api-key-12345';
      const encrypted = encryptionManager.encrypt(plaintext);
      const decrypted = encryptionManager.decrypt(encrypted);

      expect(encrypted).not.toBe(plaintext);
      expect(decrypted).toBe(plaintext);
    });

    it('should generate different encrypted values for same input', () => {
      const plaintext = 'secret-api-key-12345';
      const encrypted1 = encryptionManager.encrypt(plaintext);
      const encrypted2 = encryptionManager.encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2);
      expect(encryptionManager.decrypt(encrypted1)).toBe(plaintext);
      expect(encryptionManager.decrypt(encrypted2)).toBe(plaintext);
    });

    it('should detect encrypted values', () => {
      const plaintext = 'secret-api-key-12345';
      const encrypted = encryptionManager.encrypt(plaintext);

      expect(EncryptionManager.isEncrypted(plaintext)).toBe(false);
      expect(EncryptionManager.isEncrypted(encrypted)).toBe(true);
      expect(EncryptionManager.isEncrypted('short')).toBe(false);
      expect(EncryptionManager.isEncrypted('')).toBe(false);
    });

    it('should work with provided encryption key', () => {
      const key = EncryptionManager.generateKey();
      const manager1 = new EncryptionManager(key);
      const manager2 = new EncryptionManager(key);

      const plaintext = 'secret-data';
      const encrypted = manager1.encrypt(plaintext);
      const decrypted = manager2.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should throw error for invalid encryption key', () => {
      expect(() => {
        new EncryptionManager('invalid-key');
      }).toThrow(ConfigurationError);
    });

    it('should throw error for decryption with wrong key', () => {
      const manager1 = new EncryptionManager();
      const manager2 = new EncryptionManager();

      const plaintext = 'secret-data';
      const encrypted = manager1.encrypt(plaintext);

      expect(() => {
        manager2.decrypt(encrypted);
      }).toThrow(ConfigurationError);
    });

    it('should generate valid encryption keys', () => {
      const key = EncryptionManager.generateKey();
      expect(typeof key).toBe('string');
      expect(key.length).toBeGreaterThan(40); // Base64 encoded 32-byte key

      // Should be able to create manager with generated key
      expect(() => {
        new EncryptionManager(key);
      }).not.toThrow();
    });
  });

  describe('SecureConfigManager', () => {
    let secureManager: SecureConfigManager;

    beforeEach(() => {
      secureManager = new SecureConfigManager();
    });

    it('should identify sensitive keys', () => {
      expect(secureManager.isSensitiveKey('TMDB_API_KEY')).toBe(true);
      expect(secureManager.isSensitiveKey('JACKETT_API_KEY')).toBe(true);
      expect(secureManager.isSensitiveKey('REAL_DEBRID_API_KEY')).toBe(true);
      expect(secureManager.isSensitiveKey('PLEX_TOKEN')).toBe(true);
      expect(secureManager.isSensitiveKey('CUSTOM_PASSWORD')).toBe(true);
      expect(secureManager.isSensitiveKey('JWT_SECRET')).toBe(true);
      
      expect(secureManager.isSensitiveKey('DOWNLOAD_PATH')).toBe(false);
      expect(secureManager.isSensitiveKey('PLEX_URL')).toBe(false);
      expect(secureManager.isSensitiveKey('PORT')).toBe(false);
    });

    it('should encrypt sensitive values', () => {
      const apiKey = 'secret-api-key-12345';
      const encrypted = secureManager.encryptValue('TMDB_API_KEY', apiKey);
      
      expect(encrypted).not.toBe(apiKey);
      expect(EncryptionManager.isEncrypted(encrypted)).toBe(true);
    });

    it('should not encrypt non-sensitive values', () => {
      const path = '/home/user/downloads';
      const result = secureManager.encryptValue('DOWNLOAD_PATH', path);
      
      expect(result).toBe(path);
      expect(EncryptionManager.isEncrypted(result)).toBe(false);
    });

    it('should decrypt encrypted values', () => {
      const apiKey = 'secret-api-key-12345';
      const encrypted = secureManager.encryptValue('TMDB_API_KEY', apiKey);
      const decrypted = secureManager.decryptValue('TMDB_API_KEY', encrypted);
      
      expect(decrypted).toBe(apiKey);
    });

    it('should not decrypt non-encrypted values', () => {
      const path = '/home/user/downloads';
      const result = secureManager.decryptValue('DOWNLOAD_PATH', path);
      
      expect(result).toBe(path);
    });

    it('should not double-encrypt already encrypted values', () => {
      const apiKey = 'secret-api-key-12345';
      const encrypted1 = secureManager.encryptValue('TMDB_API_KEY', apiKey);
      const encrypted2 = secureManager.encryptValue('TMDB_API_KEY', encrypted1);
      
      expect(encrypted2).toBe(encrypted1);
    });

    it('should add custom sensitive keys', () => {
      expect(secureManager.isSensitiveKey('CUSTOM_SECRET')).toBe(true); // Contains SECRET
      
      secureManager.addSensitiveKey('CUSTOM_CONFIG');
      expect(secureManager.isSensitiveKey('CUSTOM_CONFIG')).toBe(true);
    });

    it('should create and restore backups', () => {
      const configData = {
        'TMDB_API_KEY': 'secret-key-123',
        'DOWNLOAD_PATH': '/home/user/downloads',
        'PLEX_TOKEN': 'plex-token-456'
      };

      const backup = secureManager.createBackup(configData);
      expect(typeof backup).toBe('string');
      expect(backup.length).toBeGreaterThan(0);

      const restored = secureManager.restoreFromBackup(backup);
      expect(restored).toEqual(configData);
    });

    it('should throw error for invalid backup data', () => {
      expect(() => {
        secureManager.restoreFromBackup('invalid-backup-data');
      }).toThrow(ConfigurationError);

      expect(() => {
        secureManager.restoreFromBackup(Buffer.from('{"invalid": "backup"}').toString('base64'));
      }).toThrow(ConfigurationError);
    });

    it('should provide encryption key for backup', () => {
      const key = secureManager.getEncryptionKey();
      expect(typeof key).toBe('string');
      expect(key.length).toBeGreaterThan(40);

      // Should be able to create new manager with this key
      const newManager = new SecureConfigManager(key);
      expect(newManager.getEncryptionKey()).toBe(key);
    });
  });
});