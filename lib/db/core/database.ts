import * as SQLite from 'expo-sqlite';
import { runMigrations, initializeNewDatabase } from './migrations';
import { generateCompleteSchema } from './schema';

const DATABASE_NAME = 'budget.db';
export const CURRENT_SCHEMA_VERSION = 9; // Update this when schema changes

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
 * Verify that the database schema matches the reported version
 * Returns true if migration is needed (schema doesn't match version)
 */
async function verifySchemaIntegrity(db: SQLite.SQLiteDatabase, reportedVersion: number): Promise<boolean> {
  try {
    // Check for v8 schema: recurring_expense_id column should exist
    if (reportedVersion >= 8) {
      const expensesColumns = await db.getAllAsync<{ name: string }>(
        'PRAGMA table_info(expenses)'
      );
      const hasRecurringColumn = expensesColumns.some(col => col.name === 'recurring_expense_id');
      if (!hasRecurringColumn) {
        console.log('❌ Schema mismatch: version is 8+ but recurring_expense_id column missing');
        return true; // Needs migration
      }

      // Check if recurring_expenses table exists
      const recurringTableExists = await db.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='recurring_expenses'"
      );
      if ((recurringTableExists?.count ?? 0) === 0) {
        console.log('❌ Schema mismatch: version is 8+ but recurring_expenses table missing');
        return true; // Needs migration
      }
    }

    return false; // Schema is OK
  } catch (error) {
    console.error('Error verifying schema integrity:', error);
    return true; // If we can't verify, assume migration is needed
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

    console.log(`📊 Database state: ${hasExistingData ? 'existing' : 'new'}, version: ${currentVersion}, target: ${CURRENT_SCHEMA_VERSION}`);

    // Force migration verification - check if schema actually matches version
    let forceMigration = false;
    if (hasExistingData && currentVersion > 0 && currentVersion >= CURRENT_SCHEMA_VERSION) {
      const needsMigration = await verifySchemaIntegrity(db, currentVersion);
      if (needsMigration) {
        console.log(`⚠️  Schema integrity check failed! Forcing migration from version ${currentVersion - 1}`);
        forceMigration = true;
      }
    }

    if (hasExistingData && (currentVersion < CURRENT_SCHEMA_VERSION || forceMigration)) {
      // EXISTING DATABASE - Run migrations FIRST, then ensure schema is complete
      const migrationFromVersion = forceMigration ? currentVersion - 1 : currentVersion;
      console.log(`🔄 Existing database detected (version ${migrationFromVersion} → ${CURRENT_SCHEMA_VERSION}), running migrations...`);

      try {
        // Run migrations to transform old structure (pass current version)
        await runMigrations(db, migrationFromVersion);

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
 * Force database re-initialization (useful for development/debugging)
 */
export async function resetDatabaseInstance(): Promise<void> {
  console.log('🔄 Forcing database re-initialization...');
  databaseInstance = null;
  initializationPromise = null;
  isInitializing = false;
}

/**
 * Get or create database instance (singleton pattern with proper async handling)
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  // If already initialized, verify it's still valid
  if (databaseInstance) {
    // In development, occasionally verify schema integrity
    if (__DEV__) {
      try {
        const currentVersion = await getSchemaVersion(databaseInstance);
        if (currentVersion < CURRENT_SCHEMA_VERSION) {
          console.log(`⚠️  Database version mismatch detected! Current: ${currentVersion}, Expected: ${CURRENT_SCHEMA_VERSION}`);
          console.log('🔄 Forcing re-initialization...');
          databaseInstance = null;
          // Fall through to re-initialize
        } else {
          return databaseInstance;
        }
      } catch (error) {
        console.error('Error checking schema version, forcing re-init:', error);
        databaseInstance = null;
        // Fall through to re-initialize
      }
    } else {
      return databaseInstance;
    }
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
