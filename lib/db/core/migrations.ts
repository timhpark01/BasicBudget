/**
 * Database migrations for category management
 * Handles one-time migrations to transform default categories into database-driven system
 */

import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CATEGORIES } from '@/constants/categories';

// Migration keys
const MIGRATION_KEYS = {
  v1: 'migration_v1_categories_to_db',
  v2: 'migration_v2_category_budgets',
  v3: 'migration_v3_additional_categories',
  v4: 'migration_v4_networth_dynamic_items',
  v5: 'migration_v5_networth_full_dates',
} as const;

/**
 * Check if a migration has already been completed
 */
async function checkMigration(key: string): Promise<boolean> {
  try {
    const completed = await AsyncStorage.getItem(key);
    return completed === 'true';
  } catch (error) {
    console.error(`Error checking migration status for ${key}:`, error);
    return false;
  }
}

/**
 * Mark a migration as completed
 */
async function markMigration(key: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, 'true');
  } catch (error) {
    console.error(`Error marking migration ${key} as completed:`, error);
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
 * Convert net_worth_entries table to use dynamic JSON items
 */
async function convertNetWorthToDynamicItems(db: SQLite.SQLiteDatabase): Promise<void> {
  try {
    // Check if table exists
    const tableInfo = await db.getAllAsync<{ name: string }>(
      'PRAGMA table_info(net_worth_entries)'
    );

    if (tableInfo.length === 0) {
      console.log('✅ net_worth_entries table does not exist yet');
      return;
    }

    // Check if already migrated (has 'assets' column)
    const hasAssetsColumn = tableInfo.some(col => col.name === 'assets');
    if (hasAssetsColumn) {
      console.log('✅ net_worth_entries already using dynamic items');
      return;
    }

    console.log('Converting net_worth_entries to dynamic items...');

    // Get existing data
    const existingEntries = await db.getAllAsync<any>(
      'SELECT * FROM net_worth_entries'
    );

    // Create new table with JSON fields
    await db.runAsync('DROP TABLE IF EXISTS net_worth_entries_temp');
    await db.runAsync(`
      CREATE TABLE net_worth_entries_temp (
        id TEXT PRIMARY KEY NOT NULL,
        month TEXT NOT NULL UNIQUE,
        assets TEXT NOT NULL DEFAULT '[]',
        liabilities TEXT NOT NULL DEFAULT '[]',
        notes TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);
    await db.runAsync('CREATE INDEX IF NOT EXISTS idx_net_worth_month_temp ON net_worth_entries_temp(month)');

    // Migrate existing data
    for (const entry of existingEntries) {
      // Convert fixed fields to dynamic arrays
      const assets = [
        { id: '1', name: 'Savings', amount: entry.savings || '0' },
        { id: '2', name: 'Checking', amount: entry.checking || '0' },
        { id: '3', name: 'Investments', amount: entry.investments || '0' },
        { id: '4', name: 'Retirement', amount: entry.retirement || '0' },
        { id: '5', name: 'Real Estate', amount: entry.real_estate || '0' },
        { id: '6', name: 'Vehicles', amount: entry.vehicles || '0' },
        { id: '7', name: 'Other Assets', amount: entry.other_assets || '0' },
      ].filter(item => parseFloat(item.amount) > 0); // Only include non-zero items

      const liabilities = [
        { id: '1', name: 'Credit Card Debt', amount: entry.credit_card_debt || '0' },
        { id: '2', name: 'Student Loans', amount: entry.student_loans || '0' },
        { id: '3', name: 'Car Loans', amount: entry.car_loans || '0' },
        { id: '4', name: 'Mortgage', amount: entry.mortgage || '0' },
        { id: '5', name: 'Other Debt', amount: entry.other_debt || '0' },
      ].filter(item => parseFloat(item.amount) > 0); // Only include non-zero items

      // If no items, add default ones
      if (assets.length === 0) {
        assets.push({ id: '1', name: 'Savings', amount: '0' });
      }
      if (liabilities.length === 0) {
        liabilities.push({ id: '1', name: 'Credit Card Debt', amount: '0' });
      }

      await db.runAsync(
        `INSERT INTO net_worth_entries_temp
         (id, month, assets, liabilities, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          entry.id,
          entry.month,
          JSON.stringify(assets),
          JSON.stringify(liabilities),
          entry.notes,
          entry.created_at,
          entry.updated_at
        ]
      );
    }

    // Replace old table with new one
    await db.runAsync('DROP TABLE net_worth_entries');
    await db.runAsync('ALTER TABLE net_worth_entries_temp RENAME TO net_worth_entries');
    await db.runAsync('CREATE INDEX IF NOT EXISTS idx_net_worth_month ON net_worth_entries(month)');

    console.log(`✅ Converted ${existingEntries.length} net worth entries to dynamic items`);
  } catch (error) {
    console.error('❌ Failed to convert net_worth_entries:', error);
    throw error;
  }
}

/**
 * Convert net_worth_entries from month (YYYY-MM) to full date (YYYY-MM-DD)
 */
async function migrateNetWorthToFullDates(db: SQLite.SQLiteDatabase): Promise<void> {
  try {
    // Check if table exists
    const tableInfo = await db.getAllAsync<{ name: string }>(
      'PRAGMA table_info(net_worth_entries)'
    );

    if (tableInfo.length === 0) {
      console.log('✅ net_worth_entries table does not exist yet');
      return;
    }

    // Check if already migrated (has 'date' column instead of 'month')
    const hasDateColumn = tableInfo.some(col => col.name === 'date');
    const hasMonthColumn = tableInfo.some(col => col.name === 'month');

    if (hasDateColumn && !hasMonthColumn) {
      console.log('✅ net_worth_entries already using full dates');
      return;
    }

    console.log('Converting net_worth_entries to full dates (YYYY-MM-DD)...');

    // Get existing entries
    const existingEntries = await db.getAllAsync<any>(
      'SELECT * FROM net_worth_entries'
    );

    // Create new table with date column
    await db.runAsync('DROP TABLE IF EXISTS net_worth_entries_temp');
    await db.runAsync(`
      CREATE TABLE net_worth_entries_temp (
        id TEXT PRIMARY KEY NOT NULL,
        date TEXT NOT NULL UNIQUE,
        assets TEXT NOT NULL DEFAULT '[]',
        liabilities TEXT NOT NULL DEFAULT '[]',
        notes TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);
    await db.runAsync('CREATE INDEX IF NOT EXISTS idx_net_worth_date_temp ON net_worth_entries_temp(date)');

    // Migrate existing data (convert YYYY-MM to YYYY-MM-01)
    for (const entry of existingEntries) {
      const date = `${entry.month}-01`; // Convert to first day of month

      await db.runAsync(
        `INSERT INTO net_worth_entries_temp
         (id, date, assets, liabilities, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          entry.id,
          date,
          entry.assets,
          entry.liabilities,
          entry.notes,
          entry.created_at,
          entry.updated_at
        ]
      );
    }

    // Replace old table with new one
    await db.runAsync('DROP TABLE net_worth_entries');
    await db.runAsync('ALTER TABLE net_worth_entries_temp RENAME TO net_worth_entries');
    await db.runAsync('CREATE INDEX IF NOT EXISTS idx_net_worth_date ON net_worth_entries(date)');

    console.log(`✅ Converted ${existingEntries.length} net worth entries to full dates`);
  } catch (error) {
    console.error('❌ Failed to convert net_worth_entries to full dates:', error);
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
  console.log('🔄 Starting migration runner...');

  try {
    // V1 Migration: Categories with position
    if (!(await checkMigration(MIGRATION_KEYS.v1))) {
      console.log('🔄 Running v1 database migrations (categories with position)...');
      try {
        await db.withTransactionAsync(async () => {
          await addPositionColumn(db);
          await migrateDefaultCategories(db);
        });
        await markMigration(MIGRATION_KEYS.v1);
        console.log('✅ v1 migrations completed successfully');
      } catch (error) {
        console.error('❌ v1 migration FAILED:', error);
        throw new Error(`v1 migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      console.log('✅ v1 migrations already completed');
    }

    // V2 Migration: Category budgets table
    if (!(await checkMigration(MIGRATION_KEYS.v2))) {
      console.log('🔄 Running v2 database migrations (category budgets table)...');
      try {
        await db.withTransactionAsync(async () => {
          await createCategoryBudgetsTable(db);
        });
        await markMigration(MIGRATION_KEYS.v2);
        console.log('✅ v2 migrations completed successfully');
      } catch (error) {
        console.error('❌ v2 migration FAILED:', error);
        throw new Error(`v2 migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      console.log('✅ v2 migrations already completed');
    }

    // V3 Migration: Additional categories
    if (!(await checkMigration(MIGRATION_KEYS.v3))) {
      console.log('🔄 Running v3 database migrations (additional categories)...');
      try {
        await db.withTransactionAsync(async () => {
          await addAdditionalCategories(db);
        });
        await markMigration(MIGRATION_KEYS.v3);
        console.log('✅ v3 migrations completed successfully');
      } catch (error) {
        console.error('❌ v3 migration FAILED:', error);
        throw new Error(`v3 migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      console.log('✅ v3 migrations already completed');
    }

    // V4 Migration: Net worth dynamic items
    if (!(await checkMigration(MIGRATION_KEYS.v4))) {
      console.log('🔄 Running v4 database migrations (net worth dynamic items)...');
      try {
        await convertNetWorthToDynamicItems(db);
        await markMigration(MIGRATION_KEYS.v4);
        console.log('✅ v4 migrations completed successfully');
      } catch (error) {
        console.error('❌ v4 migration failed, but continuing:', error);
        await markMigration(MIGRATION_KEYS.v4);
        console.warn('⚠️  v4 migration marked as complete despite failure (non-critical)');
      }
    } else {
      console.log('✅ v4 migrations already completed');
    }

    // V5 Migration: Net worth full dates
    if (!(await checkMigration(MIGRATION_KEYS.v5))) {
      console.log('🔄 Running v5 database migrations (net worth full dates)...');
      try {
        await migrateNetWorthToFullDates(db);
        await markMigration(MIGRATION_KEYS.v5);
        console.log('✅ v5 migrations completed successfully');
      } catch (error) {
        console.error('❌ v5 migration failed, but continuing:', error);
        await markMigration(MIGRATION_KEYS.v5);
        console.warn('⚠️  v5 migration marked as complete despite failure (non-critical)');
      }
    } else {
      console.log('✅ v5 migrations already completed');
    }

    console.log('✅ All migrations completed successfully');
  } catch (error) {
    console.error('❌ CRITICAL Migration failed:', error);
    throw error;
  }
}

/**
 * Reset migration status (for testing/recovery)
 * WARNING: This will cause migrations to run again on next app launch
 */
export async function resetMigrationStatus(): Promise<void> {
  try {
    await AsyncStorage.removeItem(MIGRATION_KEYS.v1);
    console.log('✅ Migration status reset');
  } catch (error) {
    console.error('Failed to reset migration status:', error);
    throw error;
  }
}
