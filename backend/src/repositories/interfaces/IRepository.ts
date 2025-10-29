/**
 * Base repository interface defining common CRUD operations
 */

export interface QueryCriteria {
  where?: Record<string, any>;
  orderBy?: string;
  limit?: number;
  offset?: number;
}

export interface IRepository<T> {
  /**
   * Find a single entity by its ID
   */
  findById(id: string | number): Promise<T | null>;

  /**
   * Find all entities matching the given criteria
   */
  findAll(criteria?: QueryCriteria): Promise<T[]>;

  /**
   * Find a single entity matching the given criteria
   */
  findOne(criteria: QueryCriteria): Promise<T | null>;

  /**
   * Create a new entity
   */
  create(entity: Partial<T>): Promise<T>;

  /**
   * Update an existing entity by ID
   */
  update(id: string | number, updates: Partial<T>): Promise<T>;

  /**
   * Delete an entity by ID
   */
  delete(id: string | number): Promise<void>;

  /**
   * Count entities matching the given criteria
   */
  count(criteria?: QueryCriteria): Promise<number>;

  /**
   * Check if an entity exists by ID
   */
  exists(id: string | number): Promise<boolean>;
}