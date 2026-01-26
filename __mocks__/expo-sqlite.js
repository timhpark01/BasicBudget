/**
 * expo-sqlite mock for testing
 * Provides an in-memory implementation of SQLite database
 */

class MockSQLiteDatabase {
  constructor(databaseName) {
    this.databaseName = databaseName;
    this.tables = {};
    this.tableSchemas = {}; // Store table structure information
    this.indexes = {}; // Store index information
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
      const tableMatch = sql.match(/CREATE TABLE (?:IF NOT EXISTS )?(\w+)/i);
      if (tableMatch) {
        const tableName = tableMatch[1];
        if (!this.tables[tableName]) {
          this.tables[tableName] = [];
        }

        // Parse column definitions
        const columnsMatch = sql.match(/\(([\s\S]*)\)/);
        if (columnsMatch) {
          const columnDefs = columnsMatch[1];
          const columns = this._parseColumnDefinitions(columnDefs);
          this.tableSchemas[tableName] = columns;
        }
      }
      return { rows: [], changes: 0, lastInsertRowId: 0 };
    }

    // Handle CREATE INDEX
    if (normalizedSQL.startsWith('CREATE INDEX')) {
      const indexMatch = sql.match(/CREATE INDEX (?:IF NOT EXISTS )?(\w+) ON (\w+)/i);
      if (indexMatch) {
        const indexName = indexMatch[1];
        const tableName = indexMatch[2];
        if (!this.indexes[tableName]) {
          this.indexes[tableName] = [];
        }
        this.indexes[tableName].push({
          name: indexName,
          sql: sql.trim()
        });
      }
      return { rows: [], changes: 0, lastInsertRowId: 0 };
    }

    // Handle INSERT
    if (normalizedSQL.startsWith('INSERT')) {
      const match = sql.match(/INSERT (?:OR REPLACE |OR IGNORE )?INTO (\w+)/i);
      if (match) {
        const tableName = match[1];
        if (!this.tables[tableName]) {
          this.tables[tableName] = [];
        }

        // Parse column names from INSERT statement
        const columnsMatch = sql.match(/\(([^)]+)\)\s+VALUES/i);
        const columnNames = columnsMatch
          ? columnsMatch[1].split(',').map(c => c.trim())
          : [];

        // Create a row object from column names and args
        const row = {};
        if (columnNames.length > 0 && args.length > 0) {
          columnNames.forEach((colName, i) => {
            if (i < args.length) {
              row[colName] = args[i];
            }
          });
        } else {
          // Fallback to generic column names
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

        // Handle WHERE clauses for simple ID lookups
        const whereMatch = sql.match(/WHERE\s+id\s*=\s*(\d+)/i);
        if (whereMatch) {
          const id = whereMatch[1];
          const filtered = rows.filter(row => row.id === id || row.id === parseInt(id));
          return { rows: [...filtered], changes: 0, lastInsertRowId: 0 };
        }

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

    // Handle DROP TABLE
    if (normalizedSQL.startsWith('DROP TABLE')) {
      const match = sql.match(/DROP TABLE (?:IF EXISTS )?(\w+)/i);
      if (match) {
        const tableName = match[1];
        delete this.tables[tableName];
        delete this.tableSchemas[tableName];
        delete this.indexes[tableName];
        return { rows: [], changes: 0, lastInsertRowId: 0 };
      }
      return { rows: [], changes: 0, lastInsertRowId: 0 };
    }

    // Handle ALTER TABLE
    if (normalizedSQL.startsWith('ALTER TABLE')) {
      const renameMatch = sql.match(/ALTER TABLE (\w+) RENAME TO (\w+)/i);
      if (renameMatch) {
        const oldName = renameMatch[1];
        const newName = renameMatch[2];
        if (this.tables[oldName]) {
          this.tables[newName] = this.tables[oldName];
          delete this.tables[oldName];
        }
        if (this.tableSchemas[oldName]) {
          this.tableSchemas[newName] = this.tableSchemas[oldName];
          delete this.tableSchemas[oldName];
        }
        if (this.indexes[oldName]) {
          this.indexes[newName] = this.indexes[oldName];
          delete this.indexes[oldName];
        }
        return { rows: [], changes: 0, lastInsertRowId: 0 };
      }
      return { rows: [], changes: 0, lastInsertRowId: 0 };
    }

    // Handle PRAGMA
    if (normalizedSQL.startsWith('PRAGMA')) {
      // PRAGMA table_info(table_name)
      const tableInfoMatch = sql.match(/PRAGMA table_info\((\w+)\)/i);
      if (tableInfoMatch) {
        const tableName = tableInfoMatch[1];
        const schema = this.tableSchemas[tableName] || [];
        return { rows: schema, changes: 0, lastInsertRowId: 0 };
      }
      return { rows: [], changes: 0, lastInsertRowId: 0 };
    }

    // Handle SELECT from sqlite_master (for index queries)
    if (normalizedSQL.includes('SQLITE_MASTER')) {
      const tableMatch = sql.match(/tbl_name\s*=\s*['"]?(\w+)['"]?/i);
      if (tableMatch) {
        const tableName = tableMatch[1];
        const indexes = this.indexes[tableName] || [];
        return { rows: indexes, changes: 0, lastInsertRowId: 0 };
      }

      // Count tables query
      const countMatch = sql.match(/SELECT COUNT\(\*\) as count FROM sqlite_master WHERE type='table' AND name='(\w+)'/i);
      if (countMatch) {
        const tableName = countMatch[1];
        const exists = this.tables[tableName] !== undefined;
        return { rows: [{ count: exists ? 1 : 0 }], changes: 0, lastInsertRowId: 0 };
      }

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
    this.tableSchemas = {};
    this.indexes = {};
  }

  // Parse column definitions from CREATE TABLE statement
  _parseColumnDefinitions(columnDefsStr) {
    const columns = [];
    // Split by comma, but respect parentheses for CHECK constraints
    const parts = columnDefsStr.split(/,(?![^()]*\))/);

    let cid = 0;
    for (const part of parts) {
      const trimmed = part.trim();

      // Skip empty parts
      if (!trimmed) continue;

      // Skip CHECK constraints and other table-level constraints
      if (trimmed.match(/^(CHECK|UNIQUE|FOREIGN KEY|PRIMARY KEY)\s*\(/i)) {
        continue;
      }

      // Parse column definition: name TYPE [constraints]
      // Allow for optional constraints
      const colMatch = trimmed.match(/^(\w+)\s+([A-Z]+)(.*)$/i);
      if (colMatch) {
        const name = colMatch[1];
        const type = colMatch[2].toUpperCase();
        const constraints = colMatch[3] ? colMatch[3].trim() : '';

        // Parse constraints
        const isPrimary = /PRIMARY KEY/i.test(constraints) ? 1 : 0;
        const isNotNull = /NOT NULL/i.test(constraints) ? 1 : 0;

        // Parse default value
        let dflt_value = null;
        const defaultMatch = constraints.match(/DEFAULT\s+(['"]?[^,\s]+['"]?|'[^']*'|"[^"]*")/i);
        if (defaultMatch) {
          dflt_value = defaultMatch[1].replace(/^['"]|['"]$/g, '');
        }

        columns.push({
          cid: cid++,
          name,
          type,
          notnull: isNotNull,
          dflt_value,
          pk: isPrimary
        });
      }
    }

    return columns;
  }

  // Support for transactions
  async withTransactionAsync(callback) {
    return await callback();
  }

  async withExclusiveTransactionAsync(callback) {
    return await callback();
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

module.exports = SQLiteMock;
module.exports.default = SQLiteMock;
