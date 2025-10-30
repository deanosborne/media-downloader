/**
 * Enhanced logging system with structured logging, rotation, and management
 */

import { ILogger } from '../types/service.js';
import * as fs from 'fs';
import * as path from 'path';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  timestamp: string;
  level: string;
  service?: string;
  message: string;
  meta?: any;
  correlationId?: string;
  userId?: string;
  requestId?: string;
}

export interface LoggerOptions {
  level?: LogLevel;
  serviceName?: string;
  enableFileLogging?: boolean;
  logDirectory?: string;
  maxFileSize?: number; // in bytes
  maxFiles?: number;
  enableConsoleLogging?: boolean;
  enableStructuredLogging?: boolean;
  enableLogRotation?: boolean;
}

export interface LogTransport {
  log(entry: LogEntry): void;
  close?(): void;
}

export class ConsoleTransport implements LogTransport {
  private enableStructured: boolean;

  constructor(enableStructured = false) {
    this.enableStructured = enableStructured;
  }

  log(entry: LogEntry): void {
    if (this.enableStructured) {
      console.log(JSON.stringify(entry));
    } else {
      const servicePrefix = entry.service ? `[${entry.service}]` : '';
      const logMessage = `${entry.timestamp} ${entry.level} ${servicePrefix} ${entry.message}`;
      
      if (entry.meta) {
        console.log(logMessage, entry.meta);
      } else {
        console.log(logMessage);
      }
    }
  }
}

export class FileTransport implements LogTransport {
  private logDirectory: string;
  private maxFileSize: number;
  private maxFiles: number;
  private currentLogFile: string;
  private currentFileSize: number = 0;

  constructor(
    logDirectory: string = './logs',
    maxFileSize: number = 10 * 1024 * 1024, // 10MB
    maxFiles: number = 5
  ) {
    this.logDirectory = logDirectory;
    this.maxFileSize = maxFileSize;
    this.maxFiles = maxFiles;
    this.currentLogFile = this.getCurrentLogFile();
    this.ensureLogDirectory();
  }

  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.logDirectory)) {
      fs.mkdirSync(this.logDirectory, { recursive: true });
    }
  }

  private getCurrentLogFile(): string {
    const date = new Date().toISOString().split('T')[0];
    return path.join(this.logDirectory, `app-${date}.log`);
  }

  private rotateLogFile(): void {
    if (!fs.existsSync(this.currentLogFile)) {
      return;
    }

    const stats = fs.statSync(this.currentLogFile);
    if (stats.size >= this.maxFileSize) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const rotatedFile = this.currentLogFile.replace('.log', `-${timestamp}.log`);
      
      fs.renameSync(this.currentLogFile, rotatedFile);
      this.currentFileSize = 0;
      
      // Clean up old log files
      this.cleanupOldLogs();
    }
  }

  private cleanupOldLogs(): void {
    try {
      const files = fs.readdirSync(this.logDirectory)
        .filter(file => file.startsWith('app-') && file.endsWith('.log'))
        .map(file => ({
          name: file,
          path: path.join(this.logDirectory, file),
          mtime: fs.statSync(path.join(this.logDirectory, file)).mtime
        }))
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

      // Keep only the most recent files
      const filesToDelete = files.slice(this.maxFiles);
      filesToDelete.forEach(file => {
        fs.unlinkSync(file.path);
      });
    } catch (error) {
      console.error('Error cleaning up old log files:', error);
    }
  }

  log(entry: LogEntry): void {
    try {
      this.rotateLogFile();
      
      const logLine = JSON.stringify(entry) + '\n';
      fs.appendFileSync(this.currentLogFile, logLine);
      this.currentFileSize += logLine.length;
    } catch (error) {
      console.error('Error writing to log file:', error);
      // Fallback to console
      console.log(JSON.stringify(entry));
    }
  }

  close(): void {
    // File transport doesn't need explicit closing
  }
}

export class Logger implements ILogger {
  private logLevel: LogLevel;
  private serviceName: string | undefined;
  private transports: LogTransport[] = [];
  private correlationId: string | undefined;
  private userId: string | undefined;
  private requestId: string | undefined;

  constructor(options: LoggerOptions = {}) {
    this.logLevel = options.level ?? LogLevel.INFO;
    this.serviceName = options.serviceName;
    
    // Setup transports
    if (options.enableConsoleLogging !== false) {
      this.transports.push(new ConsoleTransport(options.enableStructuredLogging));
    }
    
    if (options.enableFileLogging) {
      this.transports.push(new FileTransport(
        options.logDirectory,
        options.maxFileSize,
        options.maxFiles
      ));
    }
  }

  debug(message: string, meta?: any): void {
    if (this.logLevel <= LogLevel.DEBUG) {
      this.log('DEBUG', message, meta);
    }
  }

  info(message: string, meta?: any): void {
    if (this.logLevel <= LogLevel.INFO) {
      this.log('INFO', message, meta);
    }
  }

  warn(message: string, meta?: any): void {
    if (this.logLevel <= LogLevel.WARN) {
      this.log('WARN', message, meta);
    }
  }

  error(message: string, meta?: any): void {
    if (this.logLevel <= LogLevel.ERROR) {
      this.log('ERROR', message, meta);
    }
  }

  private log(level: string, message: string, meta?: any): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(this.serviceName && { service: this.serviceName }),
      ...(meta && { meta: this.sanitizeMeta(meta) }),
      ...(this.correlationId && { correlationId: this.correlationId }),
      ...(this.userId && { userId: this.userId }),
      ...(this.requestId && { requestId: this.requestId })
    };

    this.transports.forEach(transport => {
      try {
        transport.log(entry);
      } catch (error) {
        console.error('Error in log transport:', error);
      }
    });
  }

  private sanitizeMeta(meta: any): any {
    if (typeof meta !== 'object' || meta === null) {
      return meta;
    }

    const sensitiveKeys = [
      'password', 'token', 'key', 'secret', 'authorization',
      'apikey', 'auth', 'cookie', 'session'
    ];
    
    const sanitizeObject = (obj: any): any => {
      if (!obj || typeof obj !== 'object') return obj;
      
      const result = Array.isArray(obj) ? [...obj] : { ...obj };
      
      Object.keys(result).forEach(key => {
        if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive.toLowerCase()))) {
          result[key] = '***REDACTED***';
        } else if (typeof result[key] === 'object' && result[key] !== null) {
          result[key] = sanitizeObject(result[key]);
        }
      });
      
      return result;
    };

    return sanitizeObject(meta);
  }

  createChildLogger(serviceName: string): Logger {
    const childLogger = new Logger({
      level: this.logLevel,
      serviceName,
      enableConsoleLogging: this.transports.some(t => t instanceof ConsoleTransport),
      enableFileLogging: this.transports.some(t => t instanceof FileTransport)
    });
    
    // Copy context
    if (this.correlationId) childLogger.correlationId = this.correlationId;
    if (this.userId) childLogger.userId = this.userId;
    if (this.requestId) childLogger.requestId = this.requestId;
    
    return childLogger;
  }

  // Context management methods
  setCorrelationId(correlationId: string): Logger {
    this.correlationId = correlationId;
    return this;
  }

  setUserId(userId: string): Logger {
    this.userId = userId;
    return this;
  }

  setRequestId(requestId: string): Logger {
    this.requestId = requestId;
    return this;
  }

  // Utility methods
  addTransport(transport: LogTransport): void {
    this.transports.push(transport);
  }

  removeTransport(transport: LogTransport): void {
    const index = this.transports.indexOf(transport);
    if (index > -1) {
      this.transports.splice(index, 1);
    }
  }

  close(): void {
    this.transports.forEach(transport => {
      if (transport.close) {
        transport.close();
      }
    });
  }

  // Performance logging helpers
  time(label: string): void {
    this.debug(`Timer started: ${label}`, { timerStart: label, timestamp: Date.now() });
  }

  timeEnd(label: string): void {
    this.debug(`Timer ended: ${label}`, { timerEnd: label, timestamp: Date.now() });
  }

  // Structured logging helpers
  logRequest(method: string, url: string, statusCode?: number, duration?: number, meta?: any): void {
    this.info(`${method} ${url}${statusCode ? ` ${statusCode}` : ''}${duration ? ` (${duration}ms)` : ''}`, {
      type: 'request',
      method,
      url,
      statusCode,
      duration,
      ...meta
    });
  }

  logError(error: Error, context?: any): void {
    this.error(`${error.name}: ${error.message}`, {
      type: 'error',
      name: error.name,
      message: error.message,
      stack: error.stack,
      context
    });
  }

  logMetric(name: string, value: number, unit?: string, tags?: Record<string, string>): void {
    this.info(`Metric: ${name} = ${value}${unit ? ` ${unit}` : ''}`, {
      type: 'metric',
      name,
      value,
      unit,
      tags
    });
  }
}

// Logger factory
export class LoggerFactory {
  private static defaultOptions: LoggerOptions = {
    level: process.env['NODE_ENV'] === 'development' ? LogLevel.DEBUG : LogLevel.INFO,
    enableConsoleLogging: true,
    enableFileLogging: process.env['NODE_ENV'] === 'production',
    enableStructuredLogging: process.env['NODE_ENV'] === 'production',
    logDirectory: './logs',
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5
  };

  static setDefaultOptions(options: Partial<LoggerOptions>): void {
    this.defaultOptions = { ...this.defaultOptions, ...options };
  }

  static createLogger(serviceName?: string, options?: Partial<LoggerOptions>): Logger {
    const loggerOptions: LoggerOptions = {
      ...this.defaultOptions,
      ...options
    };
    
    if (serviceName) {
      loggerOptions.serviceName = serviceName;
    }
    
    return new Logger(loggerOptions);
  }
}

// Default logger instance
export const defaultLogger = LoggerFactory.createLogger('app');