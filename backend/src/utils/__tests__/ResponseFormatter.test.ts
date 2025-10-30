import { ResponseFormatter } from '../ResponseFormatter.js';
import { ValidationError, NotFoundError } from '../../types/errors.js';

describe('ResponseFormatter', () => {
  describe('success', () => {
    it('should format successful response with data', () => {
      const data = { id: 1, name: 'test' };
      const result = ResponseFormatter.success(data);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(data);
      expect(result.meta).toBeDefined();
      expect(result.meta.timestamp).toBeInstanceOf(Date);
    });

    it('should format successful response with pagination', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const pagination = { page: 1, limit: 10, total: 2 };
      const result = ResponseFormatter.success(data, { pagination });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(data);
      expect(result.meta.pagination).toEqual(pagination);
    });

    it('should format successful response with custom message', () => {
      const result = ResponseFormatter.success(null, { message: 'Operation completed' });

      expect(result.success).toBe(true);
      expect(result.meta.message).toBe('Operation completed');
    });
  });

  describe('error', () => {
    it('should format error response from AppError', () => {
      const error = new ValidationError('Invalid input', 'email', 'invalid-email');
      const result = ResponseFormatter.error(error);

      expect(result.success).toBe(false);
      expect(result.error.message).toBe('Invalid input');
      expect(result.error.type).toBe('ValidationError');
      expect(result.error.statusCode).toBe(400);
    });

    it('should format error response from string', () => {
      const result = ResponseFormatter.error('Something went wrong');

      expect(result.success).toBe(false);
      expect(result.error.message).toBe('Something went wrong');
      expect(result.error.type).toBe('Error');
    });

    it('should format error response from generic Error', () => {
      const error = new Error('Generic error');
      const result = ResponseFormatter.error(error);

      expect(result.success).toBe(false);
      expect(result.error.message).toBe('Generic error');
      expect(result.error.type).toBe('Error');
    });

    it('should include stack trace in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Test error');
      const result = ResponseFormatter.error(error);

      expect(result.error.stack).toBeDefined();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('paginated', () => {
    it('should format paginated response', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const pagination = { page: 1, limit: 10, total: 20, totalPages: 2 };
      const result = ResponseFormatter.paginated(data, pagination);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(data);
      expect(result.meta.pagination).toEqual(pagination);
    });
  });

  describe('created', () => {
    it('should format created response', () => {
      const data = { id: 1, name: 'new item' };
      const result = ResponseFormatter.created(data);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(data);
      expect(result.meta.message).toBe('Resource created successfully');
    });

    it('should format created response with custom message', () => {
      const data = { id: 1 };
      const result = ResponseFormatter.created(data, 'User created');

      expect(result.meta.message).toBe('User created');
    });
  });

  describe('updated', () => {
    it('should format updated response', () => {
      const data = { id: 1, name: 'updated item' };
      const result = ResponseFormatter.updated(data);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(data);
      expect(result.meta.message).toBe('Resource updated successfully');
    });
  });

  describe('deleted', () => {
    it('should format deleted response', () => {
      const result = ResponseFormatter.deleted();

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
      expect(result.meta.message).toBe('Resource deleted successfully');
    });
  });

  describe('noContent', () => {
    it('should format no content response', () => {
      const result = ResponseFormatter.noContent();

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
      expect(result.meta.message).toBe('No content');
    });
  });
});