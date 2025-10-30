/**
 * Base service class providing common HTTP functionality and error handling
 */

import axios, { AxiosInstance, AxiosResponse, AxiosError, AxiosRequestConfig } from 'axios';
import { IConfigManager } from '../config/types.js';
import { 
  IBaseService, 
  ILogger, 
  ServiceError, 
  ExternalServiceError, 
  TimeoutError, 
  AuthenticationError, 
  RateLimitError,
  ServiceConfig,
  RetryConfig,
  RequestLog,
  ResponseLog
} from '../types/service.js';

export abstract class BaseService implements IBaseService {
  protected httpClient: AxiosInstance;
  protected config: IConfigManager;
  protected logger: ILogger;
  public readonly serviceName: string;
  private retryConfig: RetryConfig;

  constructor(
    serviceName: string,
    config: IConfigManager, 
    logger: ILogger,
    serviceConfig?: ServiceConfig
  ) {
    this.serviceName = serviceName;
    this.config = config;
    this.logger = logger.createChildLogger ? logger.createChildLogger(serviceName) : logger;
    this.retryConfig = {
      retries: serviceConfig?.retries || 3,
      retryDelay: serviceConfig?.retryDelay || 1000,
      retryCondition: this.defaultRetryCondition
    };
    
    this.httpClient = this.createHttpClient(serviceConfig);
    this.setupInterceptors();
  }

  // Abstract methods that must be implemented by subclasses
  protected abstract getBaseUrl(): string;
  protected abstract getAuthHeaders(): Record<string, string>;

  // Optional method for service-specific configuration
  protected getServiceConfig(): ServiceConfig {
    return {};
  }

  public getHttpClient(): AxiosInstance {
    return this.httpClient;
  }

  private createHttpClient(serviceConfig?: ServiceConfig): AxiosInstance {
    const config: AxiosRequestConfig = {
      baseURL: this.getBaseUrl(),
      timeout: serviceConfig?.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
        ...serviceConfig?.headers
      }
    };

    return axios.create(config);
  }

  private setupInterceptors(): void {
    // Request interceptor for logging
    this.httpClient.interceptors.request.use(
      (config) => {
        const requestLog: RequestLog = {
          method: config.method?.toUpperCase() || 'GET',
          url: config.url || '',
          headers: this.sanitizeHeaders(config.headers || {}),
          body: config.data,
          timestamp: new Date(),
          service: this.serviceName
        };

        this.logger.debug('HTTP Request', requestLog);
        return config;
      },
      (error) => {
        this.logger.error('Request interceptor error', { error: error.message, service: this.serviceName });
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging
    this.httpClient.interceptors.response.use(
      (response) => {
        const responseLog: ResponseLog = {
          status: response.status,
          headers: this.sanitizeHeaders(response.headers || {}),
          body: response.data,
          duration: Date.now() - new Date((response.config as any).metadata?.startTime || Date.now()).getTime(),
          timestamp: new Date(),
          service: this.serviceName
        };

        this.logger.debug('HTTP Response', responseLog);
        return response;
      },
      (error) => {
        if (error.response) {
          const responseLog: ResponseLog = {
            status: error.response.status,
            headers: this.sanitizeHeaders(error.response.headers || {}),
            body: error.response.data,
            duration: Date.now() - new Date((error.config as any)?.metadata?.startTime || Date.now()).getTime(),
            timestamp: new Date(),
            service: this.serviceName
          };

          this.logger.error('HTTP Error Response', responseLog);
        }
        return Promise.reject(error);
      }
    );
  }

  public async handleRequest<T>(request: () => Promise<AxiosResponse<T>>): Promise<T> {
    let lastError: Error | undefined;
    
    for (let attempt = 0; attempt <= this.retryConfig.retries; attempt++) {
      try {
        const startTime = Date.now();
        const response = await request();
        
        this.logger.debug('Request successful', {
          service: this.serviceName,
          attempt: attempt + 1,
          duration: Date.now() - startTime
        });

        return response.data;
      } catch (error) {
        lastError = error as Error;
        const axiosError = error as AxiosError;
        
        this.logger.warn('Request failed', {
          service: this.serviceName,
          attempt: attempt + 1,
          error: axiosError.message,
          status: axiosError.response?.status
        });

        // Don't retry on the last attempt or if retry condition fails
        if (attempt === this.retryConfig.retries || !this.shouldRetry(axiosError)) {
          break;
        }

        // Wait before retrying
        await this.delay(this.retryConfig.retryDelay * Math.pow(2, attempt));
      }
    }

    // Transform and throw the final error
    if (lastError) {
      throw this.transformError(lastError as AxiosError);
    }
    
    throw new ExternalServiceError(
      `Request failed after ${this.retryConfig.retries} retries`,
      this.serviceName
    );
  }

  private shouldRetry(error: AxiosError): boolean {
    return this.retryConfig.retryCondition ? this.retryConfig.retryCondition(error) : false;
  }

  private defaultRetryCondition(error: AxiosError): boolean {
    // Retry on network errors or 5xx server errors
    return !error.response || (error.response.status >= 500 && error.response.status < 600);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  protected transformError(error: AxiosError): ServiceError {
    const message = error.message || 'Unknown service error';
    
    if (!error.response) {
      // Network error or timeout
      if (error.code === 'ECONNABORTED') {
        return new TimeoutError(
          `Request timeout for ${this.serviceName}`,
          this.serviceName,
          error
        );
      }
      return new ExternalServiceError(
        `Network error in ${this.serviceName}: ${message}`,
        this.serviceName,
        error
      );
    }

    const status = error.response.status;
    const responseData = error.response.data;
    const errorMessage = (responseData as any)?.message || (responseData as any)?.error || message;

    switch (status) {
      case 401:
        return new AuthenticationError(
          `Authentication failed for ${this.serviceName}: ${errorMessage}`,
          this.serviceName,
          error
        );
      case 429:
        return new RateLimitError(
          `Rate limit exceeded for ${this.serviceName}: ${errorMessage}`,
          this.serviceName,
          error
        );
      case 404:
        return new ExternalServiceError(
          `Resource not found in ${this.serviceName}: ${errorMessage}`,
          this.serviceName,
          error
        );
      default:
        return new ExternalServiceError(
          `${this.serviceName} API error (${status}): ${errorMessage}`,
          this.serviceName,
          error
        );
    }
  }

  private sanitizeHeaders(headers: Record<string, any>): Record<string, string> {
    const sanitized: Record<string, string> = {};
    const sensitiveKeys = ['authorization', 'cookie', 'x-api-key', 'token'];

    Object.entries(headers).forEach(([key, value]) => {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '***REDACTED***';
      } else {
        sanitized[key] = String(value);
      }
    });

    return sanitized;
  }

  // Utility method for making GET requests
  protected async get<T>(url: string, params?: any): Promise<T> {
    return this.handleRequest(() => this.httpClient.get<T>(url, { params }));
  }

  // Utility method for making POST requests
  protected async post<T>(url: string, data?: any): Promise<T> {
    return this.handleRequest(() => this.httpClient.post<T>(url, data));
  }

  // Utility method for making PUT requests
  protected async put<T>(url: string, data?: any): Promise<T> {
    return this.handleRequest(() => this.httpClient.put<T>(url, data));
  }

  // Utility method for making DELETE requests
  protected async delete<T>(url: string): Promise<T> {
    return this.handleRequest(() => this.httpClient.delete<T>(url));
  }
}