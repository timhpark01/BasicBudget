import * as SQLite from 'expo-sqlite';
import { runMigrations, initializeNewDatabase } from './migrations';
import { generateCompleteSchema } from './schema';

const DATABASE_NAME = 'budget.db';
export const CURRENT_SCHEMA_VERSION = 5; // Update this when schema changes

let databaseInstance: SQLite.SQLiteDatabase | null = null;
let initializationPromise: Promise<SQLite.SQLiteDatabase> | null = null;
let isInitializing = false;

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
      console.log(`🔄 Existing database detected (version ${currentVersion}), running migrations...`);

      try {
        // Run migrations to transform old structure (pass current version)
        await runMigrations(db, currentVersion);

        // After migrations, ensure all tables exist (in case new tables were added)
        await setupDatabase(db);

        // Update schema version to current
        await setSchemaVersion(db, CURRENT_SCHEMA_VERSION);

        console.log('✅ Database migration and setup completed successfully');
      } catch (migrationError) {
        console.error('❌ Migration failed:', migrationError);
        console.error('⚠️  Database may be in an inconsistent state');
        // Re-throw to prevent app from starting with corrupted database
        throw new Error('Database migration failed. Please contact support.');
      }
    } else if (!hasExistingData) {
      // NEW DATABASE - Create fresh schema and initialize with default data
      console.log('🆕 New database detected, creating fresh schema...');

      // Step 1: Create all tables with current schema
      await setupDatabase(db);

      // Step 2: Initialize with default data (categories, etc.)
      await initializeNewDatabase(db);

      // Step 3: Set current schema version (no migrations needed for new DB)
      await setSchemaVersion(db, CURRENT_SCHEMA_VERSION);

      console.log('✅ New database created and initialized successfully');
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
 * Uses centralized schema definitions from schema.ts
 */
async function setupDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  try {
    const schema = generateCompleteSchema();
    await db.execAsync(schema);
    console.log('Database schema created successfully');
  } catch (error) {
    console.error('Failed to create database schema:', error);
    throw error;
  }
}

/**
 * Get or create database instance (singleton pattern with proper async handling)
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  // If already initialized, return immediately
  if (databaseInstance) {
    return databaseInstance;
  }

  // Wait for any in-progress initialization
  if (isInitializing && initializationPromise) {
    return initializationPromise;
  }

  // Set mutex before creating promise
  isInitializing = true;
  initializationPromise = initDatabase();

  try {
    databaseInstance = await initializationPromise;
    return databaseInstance;
  } catch (error) {
    // On failure, clear instance so retry is possible
    databaseInstance = null;
    throw error;
  } finally {
    // Clear promise AFTER setting instance/error
    initializationPromise = null;
    isInitializing = false;
  }
}
