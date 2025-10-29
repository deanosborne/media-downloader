/**
 * SQLite database connection implementation
 */
export class DatabaseConnection {
    constructor(database) {
        this.inTransaction = false;
        this.db = database;
    }
    async run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function (err) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        });
    }
    async get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(row);
                }
            });
        });
    }
    async all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(rows);
                }
            });
        });
    }
    async beginTransaction() {
        if (this.inTransaction) {
            throw new Error('Transaction already in progress');
        }
        await this.run('BEGIN TRANSACTION');
        this.inTransaction = true;
    }
    async commit() {
        if (!this.inTransaction) {
            throw new Error('No transaction in progress');
        }
        await this.run('COMMIT');
        this.inTransaction = false;
    }
    async rollback() {
        if (!this.inTransaction) {
            throw new Error('No transaction in progress');
        }
        await this.run('ROLLBACK');
        this.inTransaction = false;
    }
    async transaction(callback) {
        await this.beginTransaction();
        try {
            const result = await callback();
            await this.commit();
            return result;
        }
        catch (error) {
            await this.rollback();
            throw error;
        }
    }
}
//# sourceMappingURL=DatabaseConnection.js.map