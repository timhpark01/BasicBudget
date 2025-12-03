import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'budget.db';

// SQL schema for expenses table
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY NOT NULL,
    amount TEXT NOT NULL,
    category_id TEXT NOT NULL,
    category_name TEXT NOT NULL,
    category_icon TEXT NOT NULL,
    category_color TEXT NOT NULL,
    date INTEGER NOT NULL,
    note TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
  CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
`;

let databaseInstance: SQLite.SQLiteDatabase | null = null;

/**
 * Initialize the database and create tables if they don't exist
 */
export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  try {
    const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
    await setupDatabase(db);
    return db;
  } catch (error) {
    console.error('Failed to initialize database:', error);

    // Attempt recovery: delete corrupted database and recreate
    try {
      await SQLite.deleteDatabaseAsync(DATABASE_NAME);
      const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
      await setupDatabase(db);
      return db;
    } catch (recoveryError) {
      console.error('Failed to recover database:', recoveryError);
      throw new Error('Unable to initialize database. Please reinstall the app.');
    }
  }
}

/**
 * Create database schema (tables and indexes)
 */
async function setupDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  try {
    await db.execAsync(SCHEMA);
    console.log('Database schema created successfully');
  } catch (error) {
    console.error('Failed to create database schema:', error);
    throw error;
  }
}

/**
 * Get or create database instance (singleton pattern)
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!databaseInstance) {
    databaseInstance = await initDatabase();
  }
  return databaseInstance;
}
