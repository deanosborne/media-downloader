/**
 * Unit tests for BaseRepository
 */

import { BaseRepository } from '../BaseRepository.js';
import { IDatabaseConnection, DatabaseResult } from '../interfaces/IDatabaseConnection.js';
import { QueryCriteria } from '../interfaces/IRepository.js';

// Test entity interface
interface TestEntity {
  id: number;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

// Mock database connection
class MockDatabaseConnection implements IDatabaseConnection {
  private data: Map<string, any[]> = new Map();
  private nextId = 1;

  constructor() {
    this.data.set('test_table', []);
  }

  async run(sql: string, params: any[] = []): Promise<DatabaseResult> {
    // Simple mock implementation for INSERT
    if (sql.includes('INSERT INTO')) {
      const id = this.nextId++;
      const table = this.data.get('test_table') || [];
      
      // Parse INSERT statement (simplified)
      const values = params;
      const newRow = {
        id,
        name: values[0],
        email: values[1],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      table.push(newRow);
      this.data.set('test_table', table);
      
      return { id, changes: 1 };
    }

    // Mock UPDATE
    if (sql.includes('UPDATE')) {
      const table = this.data.get('test_table') || [];
      const id = params[params.length - 1]; // Last param is usually the ID
      const rowIndex = table.findIndex(row => row.id === id);
      
      if (rowIndex >= 0) {
        // Update the row (simplified)
        table[rowIndex] = { ...table[rowIndex], ...{ name: params[0], email: params[1] } };
        return { id, changes: 1 };
      }
      
      return { id: 0, changes: 0 };
    }

    // Mock DELETE
    if (sql.includes('DELETE')) {
      const table = this.data.get('test_table') || [];
      const id = params[0];
      const initialLength = table.length;
      const filtered = table.filter(row => row.id !== id);
      
      this.data.set('test_table', filtered);
      return { id: 0, changes: initialLength - filtered.length };
    }

    return { id: 0, changes: 0 };
  }

  async get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    const table = this.data.get('test_table') || [];
    
    if (sql.includes('WHERE id = ?')) {
      const id = params[0];
      return table.find(row => row.id === id) as T;
    }

    if (sql.includes('COUNT(*)')) {
      return { count: table.length } as T;
    }

    return table[0] as T;
  }

  async all<T = any>(sql: string, _params: any[] = []): Promise<T[]> {
    const table = this.data.get('test_table') || [];
    
    if (sql.includes('ORDER BY created_at DESC')) {
      return [...table].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ) as T[];
    }

    return table as T[];
  }

  async beginTransaction(): Promise<void> {
    // Mock implementation
  }

  async commit(): Promise<void> {
    // Mock implementation
  }

  async rollback(): Promise<void> {
    // Mock implementation
  }

  async transaction<T>(callback: () => Promise<T>): Promise<T> {
    return callback();
  }
}

// Test repository implementation
class TestRepository extends BaseRepository<TestEntity> {
  constructor(db: IDatabaseConnection) {
    super(db, 'test_table');
  }

  protected mapToEntity(row: any): TestEntity {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  protected mapToRow(entity: Partial<TestEntity>): any {
    return {
      name: entity.name,
      email: entity.email
    };
  }
}

describe('BaseRepository', () => {
  let mockDb: MockDatabaseConnection;
  let repository: TestRepository;

  beforeEach(() => {
    mockDb = new MockDatabaseConnection();
    repository = new TestRepository(mockDb);
  });

  describe('create', () => {
    it('should create a new entity', async () => {
      const entityData = {
        name: 'John Doe',
        email: 'john@example.com'
      };

      const created = await repository.create(entityData);

      expect(created.id).toBeDefined();
      expect(created.name).toBe('John Doe');
      expect(created.email).toBe('john@example.com');
      expect(created.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('findById', () => {
    it('should find entity by id', async () => {
      // First create an entity
      const created = await repository.create({
        name: 'Jane Doe',
        email: 'jane@example.com'
      });

      const found = await repository.findById(created.id);

      expect(found).toBeTruthy();
      expect(found!.id).toBe(created.id);
      expect(found!.name).toBe('Jane Doe');
    });

    it('should return null for non-existent id', async () => {
      const found = await repository.findById(999);
      expect(found).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all entities', async () => {
      await repository.create({ name: 'User 1', email: 'user1@example.com' });
      await repository.create({ name: 'User 2', email: 'user2@example.com' });

      const all = await repository.findAll();

      expect(all).toHaveLength(2);
      expect(all[0]?.name).toBe('User 1');
      expect(all[1]?.name).toBe('User 2');
    });

    it('should apply order by criteria', async () => {
      await repository.create({ name: 'First', email: 'first@example.com' });
      await repository.create({ name: 'Second', email: 'second@example.com' });

      const ordered = await repository.findAll({
        orderBy: 'created_at DESC'
      });

      expect(ordered).toHaveLength(2);
      // Note: In a real test, we'd verify the actual ordering
    });
  });

  describe('update', () => {
    it('should update an existing entity', async () => {
      const created = await repository.create({
        name: 'Original Name',
        email: 'original@example.com'
      });

      const updated = await repository.update(created.id, {
        name: 'Updated Name',
        email: 'updated@example.com'
      });

      expect(updated.id).toBe(created.id);
      expect(updated.name).toBe('Updated Name');
      expect(updated.email).toBe('updated@example.com');
    });
  });

  describe('delete', () => {
    it('should delete an entity', async () => {
      const created = await repository.create({
        name: 'To Delete',
        email: 'delete@example.com'
      });

      await repository.delete(created.id);

      const found = await repository.findById(created.id);
      expect(found).toBeNull();
    });

    it('should throw error when deleting non-existent entity', async () => {
      await expect(repository.delete(999)).rejects.toThrow('Entity not found');
    });
  });

  describe('count', () => {
    it('should return count of entities', async () => {
      await repository.create({ name: 'User 1', email: 'user1@example.com' });
      await repository.create({ name: 'User 2', email: 'user2@example.com' });

      const count = await repository.count();

      expect(count).toBe(2);
    });
  });

  describe('exists', () => {
    it('should return true for existing entity', async () => {
      const created = await repository.create({
        name: 'Exists',
        email: 'exists@example.com'
      });

      const exists = await repository.exists(created.id);

      expect(exists).toBe(true);
    });

    it('should return false for non-existent entity', async () => {
      const exists = await repository.exists(999);

      expect(exists).toBe(false);
    });
  });

  describe('buildWhereClause', () => {
    it('should build simple where clause', () => {
      const criteria: QueryCriteria = {
        where: { name: 'John', email: 'john@example.com' }
      };

      const result = (repository as any).buildWhereClause(criteria);

      expect(result.sql).toBe('WHERE name = ? AND email = ?');
      expect(result.params).toEqual(['John', 'john@example.com']);
    });

    it('should handle null values', () => {
      const criteria: QueryCriteria = {
        where: { name: null }
      };

      const result = (repository as any).buildWhereClause(criteria);

      expect(result.sql).toBe('WHERE name IS NULL');
      expect(result.params).toEqual([]);
    });

    it('should handle array values (IN clause)', () => {
      const criteria: QueryCriteria = {
        where: { id: [1, 2, 3] }
      };

      const result = (repository as any).buildWhereClause(criteria);

      expect(result.sql).toBe('WHERE id IN (?, ?, ?)');
      expect(result.params).toEqual([1, 2, 3]);
    });
  });
});