/**
 * Database migrations for category management
 * Handles one-time migrations to transform default categories into database-driven system
 */

import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CATEGORIES } from '@/constants/categories';

const MIGRATION_KEY = 'migration_v1_categories_to_db';
const MIGRATION_V2_KEY = 'migration_v2_category_budgets';
const MIGRATION_V3_KEY = 'migration_v3_additional_categories';

/**
 * Check if migration has already been completed
 */
async function checkMigrationCompleted(): Promise<boolean> {
  try {
    const completed = await AsyncStorage.getItem(MIGRATION_KEY);
    return completed === 'true';
  } catch (error) {
    console.error('Error checking migration status:', error);
    return false;
  }
}

/**
 * Mark migration as completed
 */
async function markMigrationCompleted(): Promise<void> {
  try {
    await AsyncStorage.setItem(MIGRATION_KEY, 'true');
  } catch (error) {
    console.error('Error marking migration as completed:', error);
    throw error;
  }
}

/**
 * Check if v2 migration (category budgets) has already been completed
 */
async function checkMigrationV2Completed(): Promise<boolean> {
  try {
    const completed = await AsyncStorage.getItem(MIGRATION_V2_KEY);
    return completed === 'true';
  } catch (error) {
    console.error('Error checking migration v2 status:', error);
    return false;
  }
}

/**
 * Mark v2 migration as completed
 */
async function markMigrationV2Completed(): Promise<void> {
  try {
    await AsyncStorage.setItem(MIGRATION_V2_KEY, 'true');
  } catch (error) {
    console.error('Error marking migration v2 as completed:', error);
    throw error;
  }
}

/**
 * Check if v3 migration (additional categories) has already been completed
 */
async function checkMigrationV3Completed(): Promise<boolean> {
  try {
    const completed = await AsyncStorage.getItem(MIGRATION_V3_KEY);
    return completed === 'true';
  } catch (error) {
    console.error('Error checking migration v3 status:', error);
    return false;
  }
}

/**
 * Mark v3 migration as completed
 */
async function markMigrationV3Completed(): Promise<void> {
  try {
    await AsyncStorage.setItem(MIGRATION_V3_KEY, 'true');
  } catch (error) {
    console.error('Error marking migration v3 as completed:', error);
    throw error;
  }
}

/**
 * Add position column to custom_categories table
 * Uses table recreation strategy since SQLite doesn't support ALTER COLUMN
 */
async function addPositionColumn(db: SQLite.SQLiteDatabase): Promise<void> {
  try {
    // Check if table exists and get its structure
    const tableInfo = await db.getAllAsync<{ name: string }>(
      'PRAGMA table_info(custom_categories)'
    );

    // If table doesn't exist, skip (setupDatabase will create it)
    if (tableInfo.length === 0) {
      console.log('✅ Table does not exist yet, will be created by setupDatabase');
      // Create the table with position column for new installations
      await db.execAsync(`
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
      `);
      return;
    }

    const hasPositionColumn = tableInfo.some(col => col.name === 'position');

    if (hasPositionColumn) {
      console.log('✅ Position column already exists');
      return;
    }

    console.log('Adding position column to existing custom_categories table...');

    // Get existing data
    const existingCategories = await db.getAllAsync(
      'SELECT * FROM custom_categories ORDER BY created_at DESC'
    );

    // Create new table with position column
    await db.execAsync(`
      DROP TABLE IF EXISTS custom_categories_temp;

      CREATE TABLE custom_categories_temp (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        icon TEXT NOT NULL,
        color TEXT NOT NULL,
        position INTEGER NOT NULL,
        is_active INTEGER DEFAULT 1,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);

    // Copy existing data with auto-assigned positions starting at 12
    // (positions 0-11 reserved for default categories)
    let position = 12;
    for (const category of existingCategories) {
      const cat = category as any; // Type assertion for database row
      await db.runAsync(
        `INSERT INTO custom_categories_temp
         (id, name, icon, color, position, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          cat.id,
          cat.name,
          cat.icon,
          cat.color,
          position++,
          cat.is_active,
          cat.created_at,
          cat.updated_at
        ]
      );
    }

    // Replace old table with new one
    await db.execAsync(`
      DROP TABLE custom_categories;
      ALTER TABLE custom_categories_temp RENAME TO custom_categories;

      CREATE INDEX IF NOT EXISTS idx_custom_categories_active ON custom_categories(is_active);
      CREATE INDEX IF NOT EXISTS idx_custom_categories_position ON custom_categories(position);
    `);

    console.log(`✅ Position column added, ${existingCategories.length} existing categories migrated`);
  } catch (error) {
    console.error('❌ Failed to add position column:', error);
    throw error;
  }
}

/**
 * Migrate default categories from constants to database
 */
async function migrateDefaultCategories(db: SQLite.SQLiteDatabase): Promise<void> {
  try {
    // Check if defaults already migrated (look for categories with IDs 1-12)
    const existingDefaults = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM custom_categories
       WHERE id IN ('1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12')`
    );

    if (existingDefaults && existingDefaults.count > 0) {
      console.log(`✅ Default categories already migrated (${existingDefaults.count}/12)`);
      return;
    }

    console.log('Migrating 12 default categories to database...');

    const now = Date.now();

    // Insert all 12 default categories with positions 0-11
    for (let i = 0; i < CATEGORIES.length; i++) {
      const category = CATEGORIES[i];
      await db.runAsync(
        `INSERT INTO custom_categories
         (id, name, icon, color, position, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
        [category.id, category.name, category.icon, category.color, i, now, now]
      );
    }

    console.log(`✅ Migrated 12 default categories (positions 0-11)`);
  } catch (error) {
    console.error('❌ Failed to migrate default categories:', error);
    throw error;
  }
}

/**
 * Create category_budgets table
 */
async function createCategoryBudgetsTable(db: SQLite.SQLiteDatabase): Promise<void> {
  try {
    // Check if table already exists
    const tableInfo = await db.getAllAsync<{ name: string }>(
      'PRAGMA table_info(category_budgets)'
    );

    if (tableInfo.length > 0) {
      console.log('✅ category_budgets table already exists');
      return;
    }

    console.log('Creating category_budgets table...');

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS category_budgets (
        id TEXT PRIMARY KEY NOT NULL,
        month TEXT NOT NULL,
        category_id TEXT NOT NULL,
        budget_amount TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        UNIQUE(month, category_id)
      );

      CREATE INDEX IF NOT EXISTS idx_category_budgets_month ON category_budgets(month);
      CREATE INDEX IF NOT EXISTS idx_category_budgets_category ON category_budgets(category_id);
    `);

    console.log('✅ category_budgets table created successfully');
  } catch (error) {
    console.error('❌ Failed to create category_budgets table:', error);
    throw error;
  }
}

/**
 * Add new categories (13-32) for existing users
 */
async function addAdditionalCategories(db: SQLite.SQLiteDatabase): Promise<void> {
  try {
    // Check if new categories already exist
    const existingNew = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM custom_categories
       WHERE id IN ('13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32')`
    );

    if (existingNew && existingNew.count > 0) {
      console.log(`✅ Additional categories already migrated (${existingNew.count}/20)`);
      return;
    }

    console.log('Adding 20 new categories (13-32) to database...');

    const now = Date.now();

    // Insert categories 13-32 (the new ones)
    for (let i = 12; i < CATEGORIES.length; i++) {
      const category = CATEGORIES[i];
      await db.runAsync(
        `INSERT INTO custom_categories
         (id, name, icon, color, position, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
        [category.id, category.name, category.icon, category.color, i, now, now]
      );
    }

    console.log(`✅ Added ${CATEGORIES.length - 12} new categories (positions 12-31)`);
  } catch (error) {
    console.error('❌ Failed to add additional categories:', error);
    throw error;
  }
}

/**
 * Main migration runner - executes all pending migrations
 */
export async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  try {
    // Check if v1 migration already completed
    const completed = await checkMigrationCompleted();
    if (!completed) {
      console.log('🔄 Running v1 database migrations...');

      // Wrap v1 migrations in a transaction for atomicity
      await db.withTransactionAsync(async () => {
        // Step 1: Add position column to existing table
        await addPositionColumn(db);

        // Step 2: Migrate default categories to database
        await migrateDefaultCategories(db);
      });

      // Mark v1 migration as completed
      await markMigrationCompleted();

      console.log('✅ v1 migrations completed successfully');
    } else {
      console.log('✅ v1 migrations already completed');
    }

    // Check if v2 migration already completed
    const v2Completed = await checkMigrationV2Completed();
    if (!v2Completed) {
      console.log('🔄 Running v2 database migrations...');

      // Wrap v2 migrations in a transaction for atomicity
      await db.withTransactionAsync(async () => {
        // Step 1: Create category_budgets table
        await createCategoryBudgetsTable(db);
      });

      // Mark v2 migration as completed
      await markMigrationV2Completed();

      console.log('✅ v2 migrations completed successfully');
    } else {
      console.log('✅ v2 migrations already completed');
    }

    // Check if v3 migration already completed
    const v3Completed = await checkMigrationV3Completed();
    if (!v3Completed) {
      console.log('🔄 Running v3 database migrations...');

      // Wrap v3 migrations in a transaction for atomicity
      await db.withTransactionAsync(async () => {
        // Step 1: Add additional categories (13-32)
        await addAdditionalCategories(db);
      });

      // Mark v3 migration as completed
      await markMigrationV3Completed();

      console.log('✅ v3 migrations completed successfully');
    } else {
      console.log('✅ v3 migrations already completed');
    }

    console.log('✅ All migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    // Don't mark as completed - will retry on next app launch
    throw error;
  }
}

/**
 * Reset migration status (for testing/recovery)
 * WARNING: This will cause migrations to run again on next app launch
 */
export async function resetMigrationStatus(): Promise<void> {
  try {
    await AsyncStorage.removeItem(MIGRATION_KEY);
    console.log('✅ Migration status reset');
  } catch (error) {
    console.error('Failed to reset migration status:', error);
    throw error;
  }
}
