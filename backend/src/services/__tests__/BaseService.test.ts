/**
 * Unit tests for BaseService class
 */

import axios, { AxiosError } from 'axios';
import { BaseService } from '../BaseService.js';
import { IConfigManager } from '../../config/types.js';
import { ILogger, ExternalServiceError, TimeoutError, AuthenticationError } from '../../types/service.js';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Test implementation of BaseService
class TestService extends BaseService {
  constructor(config: IConfigManager, logger: ILogger) {
    super('TestService', config, logger);
  }

  protected getBaseUrl(): string {
    return 'https://api.test.com';
  }

  protected getAuthHeaders(): Record<string, string> {
    return {
      'Authorization': 'Bearer test-token'
    };
  }

  // Expose protected methods for testing
  public async testGet<T>(url: string, params?: any): Promise<T> {
    return this.get<T>(url, params);
  }

  public async testPost<T>(url: string, data?: any): Promise<T> {
    return this.post<T>(url, data);
  }
}

// Mock implementations
const mockConfig: jest.Mocked<IConfigManager> = {
  get: jest.fn(),
  set: jest.fn(),
  getRequired: jest.fn(),
  validate: jest.fn(),
  onConfigChange: jest.fn(),
  getAllConfig: jest.fn()
};

const mockLogger: jest.Mocked<ILogger & { createChildLogger?: jest.Mock }> = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  createChildLogger: jest.fn().mockReturnThis()
};

describe('BaseService', () => {
  let service: TestService;
  let mockAxiosInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);
    
    service = new TestService(mockConfig, mockLogger);
  });

  describe('constructor', () => {
    it('should create axios instance with correct configuration', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://api.test.com',
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        }
      });
    });

    it('should setup request and response interceptors', () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });

    it('should have correct service name', () => {
      expect(service.serviceName).toBe('TestService');
    });
  });

  describe('handleRequest', () => {
    it('should return data on successful request', async () => {
      const mockData = { id: 1, name: 'test' };
      const mockResponse = { data: mockData };
      
      const request = jest.fn().mockResolvedValue(mockResponse);
      
      const result = await service.handleRequest(request);
      
      expect(result).toEqual(mockData);
      expect(request).toHaveBeenCalledTimes(1);
    });

    it('should retry on network errors', async () => {
      const networkError = new Error('Network Error');
      const mockData = { id: 1, name: 'test' };
      const mockResponse = { data: mockData };
      
      const request = jest.fn()
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValue(mockResponse);
      
      const result = await service.handleRequest(request);
      
      expect(result).toEqual(mockData);
      expect(request).toHaveBeenCalledTimes(3);
    });

    it('should transform axios errors to service errors', async () => {
      const axiosError: AxiosError = {
        name: 'AxiosError',
        message: 'Request failed',
        response: {
          status: 401,
          data: { error: 'Unauthorized' },
          headers: {},
          config: { headers: {} } as any,
          statusText: 'Unauthorized'
        },
        config: { headers: {} } as any,
        isAxiosError: true,
        toJSON: () => ({})
      };
      
      const request = jest.fn().mockRejectedValue(axiosError);
      
      await expect(service.handleRequest(request)).rejects.toThrow(AuthenticationError);
    });

    it('should handle timeout errors', async () => {
      const timeoutError: AxiosError = {
        name: 'AxiosError',
        message: 'timeout of 30000ms exceeded',
        code: 'ECONNABORTED',
        config: { headers: {} } as any,
        isAxiosError: true,
        toJSON: () => ({})
      };
      
      const request = jest.fn().mockRejectedValue(timeoutError);
      
      await expect(service.handleRequest(request)).rejects.toThrow(TimeoutError);
    });

    it('should stop retrying after max attempts', async () => {
      const networkError = new Error('Network Error');
      const request = jest.fn().mockRejectedValue(networkError);
      
      await expect(service.handleRequest(request)).rejects.toThrow(ExternalServiceError);
      expect(request).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
    });
  });

  describe('HTTP utility methods', () => {
    it('should make GET requests', async () => {
      const mockData = { result: 'success' };
      mockAxiosInstance.get.mockResolvedValue({ data: mockData });
      
      const result = await service.testGet('/test', { param: 'value' });
      
      expect(result).toEqual(mockData);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/test', { params: { param: 'value' } });
    });

    it('should make POST requests', async () => {
      const mockData = { result: 'created' };
      const postData = { name: 'test' };
      mockAxiosInstance.post.mockResolvedValue({ data: mockData });
      
      const result = await service.testPost('/test', postData);
      
      expect(result).toEqual(mockData);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/test', postData);
    });
  });

  describe('error transformation', () => {
    it('should transform 401 errors to AuthenticationError', async () => {
      const axiosError: AxiosError = {
        name: 'AxiosError',
        message: 'Request failed',
        response: {
          status: 401,
          data: { message: 'Invalid token' },
          headers: {},
          config: { headers: {} } as any,
          statusText: 'Unauthorized'
        },
        config: { headers: {} } as any,
        isAxiosError: true,
        toJSON: () => ({})
      };
      
      mockAxiosInstance.get.mockRejectedValue(axiosError);
      
      await expect(service.testGet('/test')).rejects.toThrow(AuthenticationError);
    });

    it('should transform 429 errors to RateLimitError', async () => {
      const axiosError: AxiosError = {
        name: 'AxiosError',
        message: 'Request failed',
        response: {
          status: 429,
          data: { message: 'Too many requests' },
          headers: {},
          config: { headers: {} } as any,
          statusText: 'Too Many Requests'
        },
        config: { headers: {} } as any,
        isAxiosError: true,
        toJSON: () => ({})
      };
      
      mockAxiosInstance.get.mockRejectedValue(axiosError);
      
      await expect(service.testGet('/test')).rejects.toThrow('Rate limit exceeded');
    });

    it('should transform other HTTP errors to ExternalServiceError', async () => {
      const axiosError: AxiosError = {
        name: 'AxiosError',
        message: 'Request failed',
        response: {
          status: 500,
          data: { message: 'Internal server error' },
          headers: {},
          config: { headers: {} } as any,
          statusText: 'Internal Server Error'
        },
        config: { headers: {} } as any,
        isAxiosError: true,
        toJSON: () => ({})
      };
      
      mockAxiosInstance.get.mockRejectedValue(axiosError);
      
      await expect(service.testGet('/test')).rejects.toThrow(ExternalServiceError);
    });
  });

  describe('getHttpClient', () => {
    it('should return the axios instance', () => {
      const client = service.getHttpClient();
      expect(client).toBe(mockAxiosInstance);
    });
  });
});