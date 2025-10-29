/**
 * Unit tests for DatabaseConnection
 */
import sqlite3 from 'sqlite3';
import { DatabaseConnection } from '../DatabaseConnection.js';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
describe('DatabaseConnection', () => {
    let db;
    let connection;
    let testDbPath;
    beforeEach(async () => {
        // Create a temporary test database
        testDbPath = path.join(os.tmpdir(), `test_${Date.now()}.db`);
        db = new sqlite3.Database(testDbPath);
        connection = new DatabaseConnection(db);
        // Create a test table
        await connection.run(`
      CREATE TABLE test_table (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        value INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    });
    afterEach(async () => {
        // Close database and clean up
        await new Promise((resolve) => {
            db.close(() => resolve());
        });
        try {
            await fs.unlink(testDbPath);
        }
        catch (error) {
            // Ignore cleanup errors
        }
    });
    describe('run', () => {
        it('should execute INSERT statement and return result', async () => {
            const result = await connection.run('INSERT INTO test_table (name, value) VALUES (?, ?)', ['test', 42]);
            expect(result.id).toBeGreaterThan(0);
            expect(result.changes).toBe(1);
        });
        it('should execute UPDATE statement', async () => {
            // First insert a record
            const insertResult = await connection.run('INSERT INTO test_table (name, value) VALUES (?, ?)', ['original', 1]);
            // Then update it
            const updateResult = await connection.run('UPDATE test_table SET name = ?, value = ? WHERE id = ?', ['updated', 2, insertResult.id]);
            expect(updateResult.changes).toBe(1);
        });
        it('should execute DELETE statement', async () => {
            // First insert a record
            const insertResult = await connection.run('INSERT INTO test_table (name, value) VALUES (?, ?)', ['to_delete', 1]);
            // Then delete it
            const deleteResult = await connection.run('DELETE FROM test_table WHERE id = ?', [insertResult.id]);
            expect(deleteResult.changes).toBe(1);
        });
    });
    describe('get', () => {
        it('should return single row', async () => {
            // Insert test data
            await connection.run('INSERT INTO test_table (name, value) VALUES (?, ?)', ['test_get', 123]);
            const row = await connection.get('SELECT * FROM test_table WHERE name = ?', ['test_get']);
            expect(row).toBeTruthy();
            expect(row.name).toBe('test_get');
            expect(row.value).toBe(123);
        });
        it('should return undefined for non-existent row', async () => {
            const row = await connection.get('SELECT * FROM test_table WHERE name = ?', ['non_existent']);
            expect(row).toBeUndefined();
        });
    });
    describe('all', () => {
        it('should return multiple rows', async () => {
            // Insert test data
            await connection.run('INSERT INTO test_table (name, value) VALUES (?, ?)', ['row1', 1]);
            await connection.run('INSERT INTO test_table (name, value) VALUES (?, ?)', ['row2', 2]);
            const rows = await connection.all('SELECT * FROM test_table ORDER BY value');
            expect(rows).toHaveLength(2);
            expect(rows[0].name).toBe('row1');
            expect(rows[1].name).toBe('row2');
        });
        it('should return empty array when no rows match', async () => {
            const rows = await connection.all('SELECT * FROM test_table WHERE name = ?', ['non_existent']);
            expect(rows).toEqual([]);
        });
    });
    describe('transactions', () => {
        it('should begin, commit transaction', async () => {
            await connection.beginTransaction();
            await connection.run('INSERT INTO test_table (name, value) VALUES (?, ?)', ['transaction_test', 1]);
            await connection.commit();
            // Verify the data was committed
            const row = await connection.get('SELECT * FROM test_table WHERE name = ?', ['transaction_test']);
            expect(row).toBeTruthy();
            expect(row.name).toBe('transaction_test');
        });
        it('should rollback transaction', async () => {
            await connection.beginTransaction();
            await connection.run('INSERT INTO test_table (name, value) VALUES (?, ?)', ['rollback_test', 1]);
            await connection.rollback();
            // Verify the data was rolled back
            const row = await connection.get('SELECT * FROM test_table WHERE name = ?', ['rollback_test']);
            expect(row).toBeUndefined();
        });
        it('should execute callback within transaction', async () => {
            const result = await connection.transaction(async () => {
                await connection.run('INSERT INTO test_table (name, value) VALUES (?, ?)', ['callback_test', 1]);
                return 'success';
            });
            expect(result).toBe('success');
            // Verify the data was committed
            const row = await connection.get('SELECT * FROM test_table WHERE name = ?', ['callback_test']);
            expect(row).toBeTruthy();
        });
        it('should rollback on error in transaction callback', async () => {
            await expect(connection.transaction(async () => {
                await connection.run('INSERT INTO test_table (name, value) VALUES (?, ?)', ['error_test', 1]);
                throw new Error('Test error');
            })).rejects.toThrow('Test error');
            // Verify the data was rolled back
            const row = await connection.get('SELECT * FROM test_table WHERE name = ?', ['error_test']);
            expect(row).toBeUndefined();
        });
        it('should throw error when beginning transaction while one is active', async () => {
            await connection.beginTransaction();
            await expect(connection.beginTransaction()).rejects.toThrow('Transaction already in progress');
            await connection.rollback(); // Clean up
        });
        it('should throw error when committing without active transaction', async () => {
            await expect(connection.commit()).rejects.toThrow('No transaction in progress');
        });
        it('should throw error when rolling back without active transaction', async () => {
            await expect(connection.rollback()).rejects.toThrow('No transaction in progress');
        });
    });
});
//# sourceMappingURL=DatabaseConnection.test.js.map