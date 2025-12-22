import * as SQLite from 'expo-sqlite';
import { runMigrations } from './migrations';

const DATABASE_NAME = 'budget.db';
export const CURRENT_SCHEMA_VERSION = 5; // Update this when schema changes

// SQL schema for expenses, budgets, and custom_categories tables
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

  CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY NOT NULL,
    month TEXT NOT NULL UNIQUE,
    budget_amount TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_budgets_month ON budgets(month);

  CREATE TABLE IF NOT EXISTS custom_categories (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    icon TEXT NOT NULL,
    color TEXT NOT NULL,
    position INTEGER NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_custom_categories_active ON custom_categories(is_active);
  CREATE INDEX IF NOT EXISTS idx_custom_categories_position ON custom_categories(position);

  CREATE TABLE IF NOT EXISTS net_worth_entries (
    id TEXT PRIMARY KEY NOT NULL,
    date TEXT NOT NULL UNIQUE,
    assets TEXT NOT NULL DEFAULT '[]',
    liabilities TEXT NOT NULL DEFAULT '[]',
    notes TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_net_worth_date ON net_worth_entries(date);

  CREATE TABLE IF NOT EXISTS schema_version (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    version INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
`;

let databaseInstance: SQLite.SQLiteDatabase | null = null;

/**
 * Check if this is an existing database with data
 */
async function isExistingDatabase(db: SQLite.SQLiteDatabase): Promise<boolean> {
  try {
    // Check if expenses table exists and has any data
    const result = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='expenses'"
    );
    return (result?.count ?? 0) > 0;
  } catch {
    return false;
  }
}

/**
 * Get current schema version from database
 */
async function getSchemaVersion(db: SQLite.SQLiteDatabase): Promise<number> {
  try {
    // First check if schema_version table exists
    const tableExists = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='schema_version'"
    );

    if ((tableExists?.count ?? 0) === 0) {
      return 0; // No version tracking means very old database
    }

    const result = await db.getFirstAsync<{ version: number }>(
      'SELECT version FROM schema_version WHERE id = 1'
    );
    return result?.version ?? 0;
  } catch (error) {
    console.error('Error getting schema version:', error);
    return 0;
  }
}

/**
 * Set schema version in database
 */
async function setSchemaVersion(db: SQLite.SQLiteDatabase, version: number): Promise<void> {
  try {
    const now = Date.now();
    // Create table if it doesn't exist
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS schema_version (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        version INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);

    // Upsert the version
    await db.runAsync(
      `INSERT OR REPLACE INTO schema_version (id, version, updated_at) VALUES (1, ?, ?)`,
      [version, now]
    );
    console.log(`✅ Schema version set to ${version}`);
  } catch (error) {
    console.error('Error setting schema version:', error);
    throw error;
  }
}

/**
 * Initialize the database and create tables if they don't exist
 */
export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  try {
    console.log('🔄 Initializing database...');
    const db = await SQLite.openDatabaseAsync(DATABASE_NAME);

    // Check if this is an existing database or a new one
    const hasExistingData = await isExistingDatabase(db);
    const currentVersion = await getSchemaVersion(db);

    console.log(`📊 Database state: ${hasExistingData ? 'existing' : 'new'}, version: ${currentVersion}`);

    if (hasExistingData && currentVersion < CURRENT_SCHEMA_VERSION) {
      // EXISTING DATABASE - Run migrations FIRST, then ensure schema is complete
      console.log('🔄 Existing database detected, running migrations first...');

      try {
        // Run migrations to transform old structure
        await runMigrations(db);

        // After migrations, ensure all tables exist (in case new tables were added)
        await setupDatabase(db);

        // Update schema version
        await setSchemaVersion(db, CURRENT_SCHEMA_VERSION);

        console.log('✅ Database migration and setup completed successfully');
      } catch (migrationError) {
        console.error('❌ Migration failed:', migrationError);
        console.error('⚠️  Database may be in an inconsistent state');
        // Re-throw to prevent app from starting with corrupted database
        throw new Error('Database migration failed. Please contact support.');
      }
    } else if (!hasExistingData) {
      // NEW DATABASE - Create schema directly and mark all migrations as complete
      console.log('🆕 New database detected, creating fresh schema...');
      await setupDatabase(db);

      // Mark all migrations as complete for new databases
      await runMigrations(db);

      // Set current schema version
      await setSchemaVersion(db, CURRENT_SCHEMA_VERSION);

      console.log('✅ New database created successfully');
    } else {
      // Database is up to date
      console.log('✅ Database is up to date');
      await setupDatabase(db); // Ensure indexes exist
    }

    return db;
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    throw error;
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
