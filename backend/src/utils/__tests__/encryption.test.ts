import { encrypt, decrypt, generateKey, hash, verify } from '../encryption.js';

describe('Encryption Utilities', () => {
  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt text successfully', () => {
      const key = generateKey();
      const plaintext = 'Hello, World!';
      
      const encrypted = encrypt(plaintext, key);
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted).toContain(':'); // Should contain IV separator
      
      const decrypted = decrypt(encrypted, key);
      expect(decrypted).toBe(plaintext);
    });

    it('should produce different encrypted values for same input', () => {
      const key = generateKey();
      const plaintext = 'test data';
      
      const encrypted1 = encrypt(plaintext, key);
      const encrypted2 = encrypt(plaintext, key);
      
      expect(encrypted1).not.toBe(encrypted2);
      
      // But both should decrypt to the same value
      expect(decrypt(encrypted1, key)).toBe(plaintext);
      expect(decrypt(encrypted2, key)).toBe(plaintext);
    });

    it('should handle empty strings', () => {
      const key = generateKey();
      const plaintext = '';
      
      const encrypted = encrypt(plaintext, key);
      const decrypted = decrypt(encrypted, key);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should handle unicode characters', () => {
      const key = generateKey();
      const plaintext = '🔐 Unicode test: café, naïve, résumé';
      
      const encrypted = encrypt(plaintext, key);
      const decrypted = decrypt(encrypted, key);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should throw error with wrong key', () => {
      const key1 = generateKey();
      const key2 = generateKey();
      const plaintext = 'secret data';
      
      const encrypted = encrypt(plaintext, key1);
      
      expect(() => {
        decrypt(encrypted, key2);
      }).toThrow();
    });

    it('should throw error with malformed encrypted data', () => {
      const key = generateKey();
      
      expect(() => {
        decrypt('invalid-encrypted-data', key);
      }).toThrow();
      
      expect(() => {
        decrypt('no-separator-here', key);
      }).toThrow();
    });
  });

  describe('generateKey', () => {
    it('should generate a 32-byte key', () => {
      const key = generateKey();
      expect(key).toHaveLength(64); // 32 bytes = 64 hex characters
    });

    it('should generate different keys each time', () => {
      const key1 = generateKey();
      const key2 = generateKey();
      
      expect(key1).not.toBe(key2);
    });

    it('should generate keys with only hex characters', () => {
      const key = generateKey();
      expect(key).toMatch(/^[0-9a-f]+$/);
    });
  });

  describe('hash and verify', () => {
    it('should hash and verify passwords successfully', async () => {
      const password = 'mySecretPassword123!';
      
      const hashed = await hash(password);
      expect(hashed).not.toBe(password);
      expect(hashed).toContain('$'); // bcrypt format
      
      const isValid = await verify(password, hashed);
      expect(isValid).toBe(true);
    });

    it('should reject wrong passwords', async () => {
      const password = 'correctPassword';
      const wrongPassword = 'wrongPassword';
      
      const hashed = await hash(password);
      const isValid = await verify(wrongPassword, hashed);
      
      expect(isValid).toBe(false);
    });

    it('should handle empty passwords', async () => {
      const password = '';
      
      const hashed = await hash(password);
      const isValid = await verify(password, hashed);
      
      expect(isValid).toBe(true);
    });

    it('should produce different hashes for same password', async () => {
      const password = 'samePassword';
      
      const hash1 = await hash(password);
      const hash2 = await hash(password);
      
      expect(hash1).not.toBe(hash2);
      
      // But both should verify correctly
      expect(await verify(password, hash1)).toBe(true);
      expect(await verify(password, hash2)).toBe(true);
    });

    it('should handle unicode passwords', async () => {
      const password = '密码123!@#';
      
      const hashed = await hash(password);
      const isValid = await verify(password, hashed);
      
      expect(isValid).toBe(true);
    });
  });
});