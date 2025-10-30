/**
 * Service layer type definitions
 */

import { AxiosInstance, AxiosResponse, AxiosError } from 'axios';

// Base service error types
export abstract class ServiceError extends Error {
  abstract readonly statusCode: number;
  abstract readonly isOperational: boolean;
  readonly service: string;
  readonly originalError: Error | undefined;

  constructor(message: string, service: string, originalError?: Error) {
    super(message);
    this.service = service;
    this.originalError = originalError;
    this.name = this.constructor.name;
  }
}

export class ValidationError extends ServiceError {
  readonly statusCode = 400;
  readonly isOperational = true;
}

export class NotFoundError extends ServiceError {
  readonly statusCode = 404;
  readonly isOperational = true;
}

export class ExternalServiceError extends ServiceError {
  readonly statusCode = 502;
  readonly isOperational = true;
}

export class TimeoutError extends ServiceError {
  readonly statusCode = 408;
  readonly isOperational = true;
}

export class AuthenticationError extends ServiceError {
  readonly statusCode = 401;
  readonly isOperational = true;
}

export class RateLimitError extends ServiceError {
  readonly statusCode = 429;
  readonly isOperational = true;
}

// Service configuration interface
export interface ServiceConfig {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  baseURL?: string;
  headers?: Record<string, string>;
}

// Request/Response logging interface
export interface RequestLog {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: any;
  timestamp: Date;
  service: string;
}

export interface ResponseLog {
  status: number;
  headers: Record<string, string>;
  body?: any;
  duration: number;
  timestamp: Date;
  service: string;
}

// Logger interface
export interface ILogger {
  debug(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, meta?: any): void;
  createChildLogger?(serviceName: string): ILogger;
}

// Base service interface
export interface IBaseService {
  readonly serviceName: string;
  getHttpClient(): AxiosInstance;
  handleRequest<T>(request: () => Promise<AxiosResponse<T>>): Promise<T>;
}

// Dependency injection container interface
export interface IServiceContainer {
  register<T>(name: string, factory: () => T): void;
  get<T>(name: string): T;
  has(name: string): boolean;
}

// Cache interface for service responses
export interface IServiceCache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

// Retry configuration
export interface RetryConfig {
  retries: number;
  retryDelay: number;
  retryCondition?: (error: AxiosError) => boolean;
}