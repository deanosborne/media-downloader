import { MockFactory } from './factory.js';

describe('MockFactory', () => {
  describe('createMockConfig', () => {
    it('should create a mock config manager', () => {
      const mockConfig = MockFactory.createMockConfig();
      
      expect(mockConfig.get).toBeDefined();
      expect(mockConfig.set).toBeDefined();
      expect(mockConfig.getRequired).toBeDefined();
      expect(mockConfig.validate).toBeDefined();
      expect(mockConfig.onConfigChange).toBeDefined();
      expect(mockConfig.getAllConfig).toBeDefined();
    });

    it('should allow overrides', () => {
      const mockConfig = MockFactory.createMockConfig({
        get: jest.fn().mockReturnValue('test-value')
      });
      
      expect(mockConfig.get('test-key')).toBe('test-value');
    });
  });

  describe('createMockLogger', () => {
    it('should create a mock logger', () => {
      const mockLogger = MockFactory.createMockLogger();
      
      expect(mockLogger.debug).toBeDefined();
      expect(mockLogger.info).toBeDefined();
      expect(mockLogger.warn).toBeDefined();
      expect(mockLogger.error).toBeDefined();
      expect(mockLogger.createChildLogger).toBeDefined();
    });

    it('should create child logger', () => {
      const mockLogger = MockFactory.createMockLogger();
      const childLogger = mockLogger.createChildLogger!('test');
      
      expect(childLogger).toBeDefined();
      expect(childLogger.debug).toBeDefined();
      expect(childLogger.info).toBeDefined();
      expect(childLogger.warn).toBeDefined();
      expect(childLogger.error).toBeDefined();
    });
  });

  describe('createMockCache', () => {
    it('should create a mock cache', () => {
      const mockCache = MockFactory.createMockCache();
      
      expect(mockCache.get).toBeDefined();
      expect(mockCache.set).toBeDefined();
      expect(mockCache.delete).toBeDefined();
      expect(mockCache.clear).toBeDefined();
    });
  });

  describe('createMockAxiosResponse', () => {
    it('should create a mock axios response', () => {
      const data = { test: 'data' };
      const response = MockFactory.createMockAxiosResponse(data, 200);
      
      expect(response.data).toEqual(data);
      expect(response.status).toBe(200);
      expect(response.statusText).toBe('OK');
    });
  });

  describe('createMockAxiosError', () => {
    it('should create a mock axios error', () => {
      const error = MockFactory.createMockAxiosError('Test error', 500, 'ECONNREFUSED');
      
      expect(error.message).toBe('Test error');
      expect(error.response.status).toBe(500);
      expect(error.code).toBe('ECONNREFUSED');
    });
  });
});