/**
 * expo-sqlite mock for testing
 * Provides an in-memory implementation of SQLite database
 */

class MockSQLiteDatabase {
  constructor(databaseName) {
    this.databaseName = databaseName;
    this.tables = {};
    this.isOpen = true;
  }

  async execAsync(queries) {
    if (!this.isOpen) {
      throw new Error('Database is closed');
    }

    // Handle array of queries
    const queryList = Array.isArray(queries) ? queries : [{ sql: queries, args: [] }];

    for (const query of queryList) {
      const sql = typeof query === 'string' ? query : query.sql;
      const args = typeof query === 'object' ? query.args || [] : [];
      await this._executeSQL(sql, args);
    }
  }

  async runAsync(sql, args = []) {
    if (!this.isOpen) {
      throw new Error('Database is closed');
    }

    return await this._executeSQL(sql, args);
  }

  async getFirstAsync(sql, args = []) {
    if (!this.isOpen) {
      throw new Error('Database is closed');
    }

    const result = await this._executeSQL(sql, args);
    return result.rows && result.rows.length > 0 ? result.rows[0] : null;
  }

  async getAllAsync(sql, args = []) {
    if (!this.isOpen) {
      throw new Error('Database is closed');
    }

    const result = await this._executeSQL(sql, args);
    return result.rows || [];
  }

  async closeAsync() {
    this.isOpen = false;
  }

  async deleteAsync() {
    this.tables = {};
    this.isOpen = false;
  }

  // Internal method to execute SQL
  async _executeSQL(sql, args = []) {
    const normalizedSQL = sql.trim().toUpperCase();

    // Handle CREATE TABLE
    if (normalizedSQL.startsWith('CREATE TABLE')) {
      const match = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/i);
      if (match) {
        const tableName = match[1];
        if (!this.tables[tableName]) {
          this.tables[tableName] = [];
        }
      }
      return { rows: [], changes: 0, lastInsertRowId: 0 };
    }

    // Handle CREATE INDEX
    if (normalizedSQL.startsWith('CREATE INDEX')) {
      return { rows: [], changes: 0, lastInsertRowId: 0 };
    }

    // Handle INSERT
    if (normalizedSQL.startsWith('INSERT INTO')) {
      const match = sql.match(/INSERT INTO (\w+)/i);
      if (match) {
        const tableName = match[1];
        if (!this.tables[tableName]) {
          this.tables[tableName] = [];
        }

        // Create a row object from args
        const row = {};
        // Simple placeholder replacement for common patterns
        if (sql.includes('VALUES')) {
          const placeholders = (sql.match(/\?/g) || []).length;
          for (let i = 0; i < placeholders && i < args.length; i++) {
            row[`col${i}`] = args[i];
          }
        }

        this.tables[tableName].push(row);
        return {
          rows: [],
          changes: 1,
          lastInsertRowId: this.tables[tableName].length
        };
      }
    }

    // Handle SELECT
    if (normalizedSQL.startsWith('SELECT')) {
      const match = sql.match(/FROM (\w+)/i);
      if (match) {
        const tableName = match[1];
        const rows = this.tables[tableName] || [];
        return { rows: [...rows], changes: 0, lastInsertRowId: 0 };
      }
      return { rows: [], changes: 0, lastInsertRowId: 0 };
    }

    // Handle UPDATE
    if (normalizedSQL.startsWith('UPDATE')) {
      const match = sql.match(/UPDATE (\w+)/i);
      if (match) {
        const tableName = match[1];
        const rows = this.tables[tableName] || [];
        return { rows: [], changes: rows.length, lastInsertRowId: 0 };
      }
      return { rows: [], changes: 0, lastInsertRowId: 0 };
    }

    // Handle DELETE
    if (normalizedSQL.startsWith('DELETE FROM')) {
      const match = sql.match(/DELETE FROM (\w+)/i);
      if (match) {
        const tableName = match[1];
        const count = (this.tables[tableName] || []).length;
        this.tables[tableName] = [];
        return { rows: [], changes: count, lastInsertRowId: 0 };
      }
      return { rows: [], changes: 0, lastInsertRowId: 0 };
    }

    // Handle PRAGMA
    if (normalizedSQL.startsWith('PRAGMA')) {
      return { rows: [], changes: 0, lastInsertRowId: 0 };
    }

    // Default response for unknown queries
    return { rows: [], changes: 0, lastInsertRowId: 0 };
  }

  // Helper method to manually add data to a table for testing
  __insertTestData(tableName, rows) {
    if (!this.tables[tableName]) {
      this.tables[tableName] = [];
    }
    this.tables[tableName].push(...rows);
  }

  // Helper method to get table data for debugging
  __getTableData(tableName) {
    return this.tables[tableName] || [];
  }

  // Helper method to clear all tables
  __clearAllTables() {
    this.tables = {};
  }
}

const databases = {};

const SQLiteMock = {
  openDatabaseAsync: jest.fn(async (databaseName, options) => {
    if (!databases[databaseName]) {
      databases[databaseName] = new MockSQLiteDatabase(databaseName);
    }
    return databases[databaseName];
  }),

  openDatabaseSync: jest.fn((databaseName, options) => {
    if (!databases[databaseName]) {
      databases[databaseName] = new MockSQLiteDatabase(databaseName);
    }
    return databases[databaseName];
  }),

  deleteDatabaseAsync: jest.fn(async (databaseName) => {
    if (databases[databaseName]) {
      await databases[databaseName].deleteAsync();
      delete databases[databaseName];
    }
  }),

  deleteDatabaseSync: jest.fn((databaseName) => {
    if (databases[databaseName]) {
      databases[databaseName].tables = {};
      databases[databaseName].isOpen = false;
      delete databases[databaseName];
    }
  }),

  // Helper to clear all databases between tests
  __clearAllDatabases: () => {
    Object.keys(databases).forEach((dbName) => {
      databases[dbName].__clearAllTables();
    });
  },

  // Helper to get a specific database for debugging
  __getDatabase: (databaseName) => {
    return databases[databaseName];
  }
};

export default SQLiteMock;
export { MockSQLiteDatabase };
