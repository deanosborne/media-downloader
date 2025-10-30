import { ConfigItem } from '../ConfigItem.js';

describe('ConfigItem', () => {
  describe('constructor', () => {
    it('should create a ConfigItem with all properties', () => {
      const item = new ConfigItem({
        key: 'test.key',
        value: 'test value',
        type: 'string',
        encrypted: false,
        description: 'Test configuration item'
      });

      expect(item.key).toBe('test.key');
      expect(item.value).toBe('test value');
      expect(item.type).toBe('string');
      expect(item.encrypted).toBe(false);
      expect(item.description).toBe('Test configuration item');
      expect(item.createdAt).toBeInstanceOf(Date);
      expect(item.updatedAt).toBeInstanceOf(Date);
    });

    it('should create a ConfigItem with minimal properties', () => {
      const item = new ConfigItem({
        key: 'minimal.key',
        value: 'minimal value'
      });

      expect(item.key).toBe('minimal.key');
      expect(item.value).toBe('minimal value');
      expect(item.type).toBe('string'); // default
      expect(item.encrypted).toBe(false); // default
      expect(item.description).toBeUndefined();
    });

    it('should handle encrypted configuration items', () => {
      const item = new ConfigItem({
        key: 'secret.key',
        value: 'encrypted_value',
        encrypted: true
      });

      expect(item.encrypted).toBe(true);
    });
  });

  describe('validation', () => {
    it('should validate required key', () => {
      expect(() => {
        new ConfigItem({
          key: '',
          value: 'test'
        });
      }).toThrow('Key is required');
    });

    it('should validate key format', () => {
      expect(() => {
        new ConfigItem({
          key: 'invalid key with spaces',
          value: 'test'
        });
      }).toThrow('Key must contain only letters, numbers, dots, and underscores');
    });

    it('should allow valid key formats', () => {
      const validKeys = [
        'simple',
        'with.dots',
        'with_underscores',
        'with123numbers',
        'complex.key_with123.parts'
      ];

      validKeys.forEach(key => {
        expect(() => {
          new ConfigItem({ key, value: 'test' });
        }).not.toThrow();
      });
    });
  });

  describe('type handling', () => {
    it('should handle string type', () => {
      const item = new ConfigItem({
        key: 'string.key',
        value: 'string value',
        type: 'string'
      });

      expect(item.getTypedValue()).toBe('string value');
    });

    it('should handle number type', () => {
      const item = new ConfigItem({
        key: 'number.key',
        value: '42',
        type: 'number'
      });

      expect(item.getTypedValue()).toBe(42);
    });

    it('should handle boolean type', () => {
      const trueItem = new ConfigItem({
        key: 'bool.true',
        value: 'true',
        type: 'boolean'
      });

      const falseItem = new ConfigItem({
        key: 'bool.false',
        value: 'false',
        type: 'boolean'
      });

      expect(trueItem.getTypedValue()).toBe(true);
      expect(falseItem.getTypedValue()).toBe(false);
    });

    it('should handle JSON type', () => {
      const jsonValue = { key: 'value', array: [1, 2, 3] };
      const item = new ConfigItem({
        key: 'json.key',
        value: JSON.stringify(jsonValue),
        type: 'json'
      });

      expect(item.getTypedValue()).toEqual(jsonValue);
    });

    it('should handle invalid JSON gracefully', () => {
      const item = new ConfigItem({
        key: 'invalid.json',
        value: 'invalid json string',
        type: 'json'
      });

      expect(() => item.getTypedValue()).toThrow('Invalid JSON value');
    });
  });

  describe('serialization', () => {
    it('should serialize to JSON', () => {
      const item = new ConfigItem({
        key: 'test.key',
        value: 'test value',
        type: 'string',
        encrypted: false,
        description: 'Test item'
      });

      const json = item.toJSON();

      expect(json).toEqual({
        key: 'test.key',
        value: 'test value',
        type: 'string',
        encrypted: false,
        description: 'Test item',
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString()
      });
    });

    it('should mask encrypted values in JSON', () => {
      const item = new ConfigItem({
        key: 'secret.key',
        value: 'secret_value',
        encrypted: true
      });

      const json = item.toJSON();

      expect(json.value).toBe('***ENCRYPTED***');
    });
  });

  describe('update', () => {
    it('should update value and timestamp', () => {
      const item = new ConfigItem({
        key: 'test.key',
        value: 'original value'
      });

      const originalUpdatedAt = item.updatedAt;

      // Wait a bit to ensure timestamp difference
      setTimeout(() => {
        item.updateValue('new value');

        expect(item.value).toBe('new value');
        expect(item.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
      }, 1);
    });

    it('should update description', () => {
      const item = new ConfigItem({
        key: 'test.key',
        value: 'test value'
      });

      item.updateDescription('New description');

      expect(item.description).toBe('New description');
    });
  });

  describe('static methods', () => {
    it('should create from database row', () => {
      const row = {
        key: 'db.key',
        value: 'db value',
        type: 'string',
        encrypted: 0, // SQLite boolean as integer
        description: 'From database',
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z'
      };

      const item = ConfigItem.fromDatabaseRow(row);

      expect(item.key).toBe('db.key');
      expect(item.value).toBe('db value');
      expect(item.encrypted).toBe(false);
      expect(item.createdAt).toEqual(new Date('2023-01-01T00:00:00.000Z'));
    });

    it('should convert to database row', () => {
      const item = new ConfigItem({
        key: 'test.key',
        value: 'test value',
        type: 'string',
        encrypted: true,
        description: 'Test item'
      });

      const row = item.toDatabaseRow();

      expect(row.key).toBe('test.key');
      expect(row.value).toBe('test value');
      expect(row.encrypted).toBe(1); // Boolean as integer for SQLite
      expect(row.created_at).toBe(item.createdAt.toISOString());
      expect(row.updated_at).toBe(item.updatedAt.toISOString());
    });
  });
});