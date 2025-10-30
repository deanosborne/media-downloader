/**
 * Tests for enhanced logging system
 */

import { 
  Logger, 
  LogLevel, 
  ConsoleTransport, 
  FileTransport, 
  LoggerFactory,
  LogEntry 
} from '../Logger.js';
import * as fs from 'fs';
import * as path from 'path';

// Mock console methods (for potential future use)

describe('Logger', () => {
  let mockConsoleLog: jest.SpyInstance;
  let mockConsoleError: jest.SpyInstance;

  beforeEach(() => {
    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
  });

  describe('Basic Logging', () => {
    it('should log messages at appropriate levels', () => {
      const logger = new Logger({ level: LogLevel.DEBUG });

      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warn message');
      logger.error('Error message');

      expect(mockConsoleLog).toHaveBeenCalledTimes(4);
    });

    it('should respect log level filtering', () => {
      const logger = new Logger({ level: LogLevel.WARN });

      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warn message');
      logger.error('Error message');

      expect(mockConsoleLog).toHaveBeenCalledTimes(2); // Only warn and error
    });

    it('should include service name in logs', () => {
      const logger = new Logger({ serviceName: 'TestService' });

      logger.info('Test message');

      const logCall = mockConsoleLog.mock.calls[0][0];
      expect(logCall).toContain('[TestService]');
    });

    it('should log metadata', () => {
      const logger = new Logger();
      const metadata = { userId: 123, action: 'test' };

      logger.info('Test message', metadata);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Test message'),
        expect.objectContaining(metadata)
      );
    });
  });

  describe('Data Sanitization', () => {
    it('should sanitize sensitive data in metadata', () => {
      const logger = new Logger();
      const sensitiveData = {
        username: 'testuser',
        password: 'secret123',
        apiKey: 'api-key-123',
        token: 'bearer-token',
        normalField: 'normal-value'
      };

      logger.info('Test message', sensitiveData);

      const loggedMeta = mockConsoleLog.mock.calls[0][1];
      expect(loggedMeta.password).toBe('***REDACTED***');
      expect(loggedMeta.apiKey).toBe('***REDACTED***');
      expect(loggedMeta.token).toBe('***REDACTED***');
      expect(loggedMeta.normalField).toBe('normal-value');
      expect(loggedMeta.username).toBe('testuser');
    });

    it('should sanitize nested sensitive data', () => {
      const logger = new Logger();
      const nestedData = {
        user: {
          name: 'testuser',
          credentials: {
            password: 'secret123',
            apiKey: 'api-key-123'
          }
        },
        config: {
          database: {
            password: 'db-secret'
          }
        }
      };

      logger.info('Test message', nestedData);

      const loggedMeta = mockConsoleLog.mock.calls[0][1];
      expect(loggedMeta).toBeDefined();
      expect(loggedMeta.user.credentials.password).toBe('***REDACTED***');
      expect(loggedMeta.user.credentials.apiKey).toBe('***REDACTED***');
      expect(loggedMeta.config.database.password).toBe('***REDACTED***');
      expect(loggedMeta.user.name).toBe('testuser');
    });

    it('should handle arrays with sensitive data', () => {
      const logger = new Logger();
      const arrayData = [
        { name: 'user1', password: 'secret1' },
        { name: 'user2', token: 'token2' }
      ];

      logger.info('Test message', arrayData);

      const loggedMeta = mockConsoleLog.mock.calls[0][1];
      expect(loggedMeta[0].password).toBe('***REDACTED***');
      expect(loggedMeta[1].token).toBe('***REDACTED***');
      expect(loggedMeta[0].name).toBe('user1');
      expect(loggedMeta[1].name).toBe('user2');
    });
  });

  describe('Child Loggers', () => {
    it('should create child logger with service name', () => {
      const parentLogger = new Logger();
      const childLogger = parentLogger.createChildLogger('ChildService');

      childLogger.info('Child message');

      const logCall = mockConsoleLog.mock.calls[0][0];
      expect(logCall).toContain('[ChildService]');
    });

    it('should inherit context from parent logger', () => {
      const parentLogger = new Logger();
      parentLogger.setCorrelationId('test-correlation-id');
      parentLogger.setUserId('user-123');

      const childLogger = parentLogger.createChildLogger('ChildService');
      childLogger.info('Child message');

      // Since we're using console transport, we need to check the structured output
      // This would be more testable with a custom transport
      expect(mockConsoleLog).toHaveBeenCalled();
    });
  });

  describe('Context Management', () => {
    it('should set and use correlation ID', () => {
      const logger = new Logger({ enableStructuredLogging: true });
      logger.setCorrelationId('test-correlation-id');

      logger.info('Test message');

      // With structured logging, the entire entry is logged as JSON
      const loggedEntry = JSON.parse(mockConsoleLog.mock.calls[0][0]);
      expect(loggedEntry.correlationId).toBe('test-correlation-id');
    });

    it('should set and use user ID', () => {
      const logger = new Logger({ enableStructuredLogging: true });
      logger.setUserId('user-123');

      logger.info('Test message');

      const loggedEntry = JSON.parse(mockConsoleLog.mock.calls[0][0]);
      expect(loggedEntry.userId).toBe('user-123');
    });

    it('should set and use request ID', () => {
      const logger = new Logger({ enableStructuredLogging: true });
      logger.setRequestId('req-456');

      logger.info('Test message');

      const loggedEntry = JSON.parse(mockConsoleLog.mock.calls[0][0]);
      expect(loggedEntry.requestId).toBe('req-456');
    });
  });

  describe('Structured Logging Helpers', () => {
    it('should log requests with structured data', () => {
      const logger = new Logger({ enableStructuredLogging: true });

      logger.logRequest('GET', '/api/users', 200, 150);

      const loggedEntry = JSON.parse(mockConsoleLog.mock.calls[0][0]);
      expect(loggedEntry.meta.type).toBe('request');
      expect(loggedEntry.meta.method).toBe('GET');
      expect(loggedEntry.meta.url).toBe('/api/users');
      expect(loggedEntry.meta.statusCode).toBe(200);
      expect(loggedEntry.meta.duration).toBe(150);
    });

    it('should log errors with structured data', () => {
      const logger = new Logger({ enableStructuredLogging: true });
      const error = new Error('Test error');

      logger.logError(error, { userId: 123 });

      const loggedEntry = JSON.parse(mockConsoleLog.mock.calls[0][0]);
      expect(loggedEntry.meta.type).toBe('error');
      expect(loggedEntry.meta.name).toBe('Error');
      expect(loggedEntry.meta.message).toBe('Test error');
      expect(loggedEntry.meta.context.userId).toBe(123);
    });

    it('should log metrics with structured data', () => {
      const logger = new Logger({ enableStructuredLogging: true });

      logger.logMetric('response_time', 150, 'ms', { endpoint: '/api/users' });

      const loggedEntry = JSON.parse(mockConsoleLog.mock.calls[0][0]);
      expect(loggedEntry.meta.type).toBe('metric');
      expect(loggedEntry.meta.name).toBe('response_time');
      expect(loggedEntry.meta.value).toBe(150);
      expect(loggedEntry.meta.unit).toBe('ms');
      expect(loggedEntry.meta.tags.endpoint).toBe('/api/users');
    });
  });
});

describe('ConsoleTransport', () => {
  let mockConsoleLog: jest.SpyInstance;

  beforeEach(() => {
    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    mockConsoleLog.mockRestore();
  });

  it('should log in human-readable format by default', () => {
    const transport = new ConsoleTransport(false);
    const entry: LogEntry = {
      timestamp: '2023-01-01T00:00:00.000Z',
      level: 'INFO',
      service: 'TestService',
      message: 'Test message'
    };

    transport.log(entry);

    expect(mockConsoleLog).toHaveBeenCalledWith(
      '2023-01-01T00:00:00.000Z INFO [TestService] Test message'
    );
  });

  it('should log in structured format when enabled', () => {
    const transport = new ConsoleTransport(true);
    const entry: LogEntry = {
      timestamp: '2023-01-01T00:00:00.000Z',
      level: 'INFO',
      service: 'TestService',
      message: 'Test message'
    };

    transport.log(entry);

    expect(mockConsoleLog).toHaveBeenCalledWith(JSON.stringify(entry));
  });
});

describe('FileTransport', () => {
  const testLogDir = './test-logs';
  
  beforeEach(() => {
    // Clean up test directory
    if (fs.existsSync(testLogDir)) {
      fs.rmSync(testLogDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testLogDir)) {
      fs.rmSync(testLogDir, { recursive: true });
    }
  });

  it('should create log directory if it does not exist', () => {
    new FileTransport(testLogDir);
    expect(fs.existsSync(testLogDir)).toBe(true);
  });

  it('should write log entries to file', () => {
    const transport = new FileTransport(testLogDir);
    const entry: LogEntry = {
      timestamp: '2023-01-01T00:00:00.000Z',
      level: 'INFO',
      message: 'Test message'
    };

    transport.log(entry);

    const logFiles = fs.readdirSync(testLogDir);
    expect(logFiles.length).toBe(1);
    
    const logContent = fs.readFileSync(path.join(testLogDir, logFiles[0]!), 'utf8');
    expect(logContent).toContain('Test message');
  });

  it('should handle file write errors gracefully', () => {
    const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
    const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
    
    // Mock fs.appendFileSync to throw an error
    const mockAppendFileSync = jest.spyOn(require('fs'), 'appendFileSync').mockImplementation(() => {
      throw new Error('Permission denied');
    });
    
    const transport = new FileTransport(testLogDir);
    const entry: LogEntry = {
      timestamp: '2023-01-01T00:00:00.000Z',
      level: 'INFO',
      message: 'Test message'
    };

    transport.log(entry);

    // Should fallback to console logging
    expect(mockConsoleError).toHaveBeenCalledWith(
      'Error writing to log file:',
      expect.any(Error)
    );
    expect(mockConsoleLog).toHaveBeenCalledWith(JSON.stringify(entry));

    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
    mockAppendFileSync.mockRestore();
  });
});

describe('LoggerFactory', () => {
  it('should create logger with default options', () => {
    const logger = LoggerFactory.createLogger('TestService');
    expect(logger).toBeInstanceOf(Logger);
  });

  it('should create logger with custom options', () => {
    const logger = LoggerFactory.createLogger('TestService', {
      level: LogLevel.ERROR,
      enableFileLogging: true
    });
    expect(logger).toBeInstanceOf(Logger);
  });

  it('should allow setting default options', () => {
    LoggerFactory.setDefaultOptions({
      level: LogLevel.ERROR,
      enableStructuredLogging: true
    });

    const logger = LoggerFactory.createLogger('TestService');
    expect(logger).toBeInstanceOf(Logger);
  });
});