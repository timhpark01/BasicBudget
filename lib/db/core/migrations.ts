/**
 * Database migrations for category management
 * Handles one-time migrations to transform default categories into database-driven system
 */

import * as SQLite from 'expo-sqlite';
import { CATEGORIES } from '@/constants/categories';
import { getTableSchema, getTableIndexes } from './schema';

/**
 * Migration Criticality:
 *
 * CRITICAL migrations (v1-v3, v6-v9):
 * - Core functionality depends on these
 * - Must succeed for app to function properly
 * - Failure will block app startup
 * - Examples: category system, budget tracking, recurring expenses
 *
 * OPTIONAL migrations (v4-v5):
 * - Advanced features that can gracefully degrade
 * - Failure is logged but doesn't block app startup
 * - User can still use core expense tracking
 * - Examples: net worth tracking enhancements
 */
const CRITICAL_MIGRATIONS = ['v1', 'v2', 'v3', 'v6', 'v7', 'v8', 'v9'] as const;
const OPTIONAL_MIGRATIONS = ['v4', 'v5', 'v10'] as const;

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
      const tableSchema = getTableSchema('custom_categories');
      const indexes = getTableIndexes('custom_categories');
      await db.execAsync(`${tableSchema};\n${indexes.join(';\n')};`);
      return;
    }

    const hasPositionColumn = tableInfo.some(col => col.name === 'position');

    if (hasPositionColumn) {
      console.log('✅ Position column already exists');
      return;
    }

    console.log('Adding position column to existing custom_categories table...');

    // Get existing data
    interface LegacyCategoryRow {
      id: string;
      name: string;
      icon: string;
      color: string;
      is_active: number;
      created_at: number;
      updated_at: number;
    }
    const existingCategories = await db.getAllAsync<LegacyCategoryRow>(
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
      await db.runAsync(
        `INSERT INTO custom_categories_temp
         (id, name, icon, color, position, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          category.id,
          category.name,
          category.icon,
          category.color,
          position++,
          category.is_active,
          category.created_at,
          category.updated_at
        ]
      );
    }

    // Replace old table with new one
    const indexes = getTableIndexes('custom_categories');
    await db.execAsync(`
      DROP TABLE custom_categories;
      ALTER TABLE custom_categories_temp RENAME TO custom_categories;

      ${indexes.join(';\n')};
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
        `INSERT OR IGNORE INTO custom_categories
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
 * Uses centralized schema definition from schema.ts
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

    const tableSchema = getTableSchema('category_budgets');
    const indexes = getTableIndexes('category_budgets');
    await db.execAsync(`${tableSchema};\n${indexes.join(';\n')};`);

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
    interface LegacyNetWorthRow {
      id: string;
      month: string;
      savings: string;
      checking: string;
      investments: string;
      retirement: string;
      real_estate: string;
      vehicles: string;
      other_assets: string;
      credit_card_debt: string;
      student_loans: string;
      car_loans: string;
      mortgage: string;
      other_debt: string;
      notes: string | null;
      created_at: number;
      updated_at: number;
    }
    const existingEntries = await db.getAllAsync<LegacyNetWorthRow>(
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
 * Fix Unlabeled category icon and color to match standard
 * Ensures all users (new and existing) have correct icon and color
 */
async function fixUnlabeledIconAndColor(db: SQLite.SQLiteDatabase): Promise<void> {
  try {
    console.log('🔄 Fixing Unlabeled category icon and color...');

    const now = Date.now();
    const correctIcon = 'help-circle-outline';
    const correctColor = '#DC143C'; // Crimson

    // Use exclusive transaction for atomic multi-table updates
    await db.withExclusiveTransactionAsync(async () => {
      // Update the category icon and color in custom_categories table
      const catResult = await db.runAsync(
        `UPDATE custom_categories SET icon = ?, color = ?, updated_at = ? WHERE id = '6'`,
        [correctIcon, correctColor, now]
      );
      console.log(`📝 Updated ${catResult.changes} category record(s)`);

      // Update all expenses that use category_id '6' to have correct icon and color
      const expResult = await db.runAsync(
        `UPDATE expenses SET category_icon = ?, category_color = ?, updated_at = ? WHERE category_id = '6'`,
        [correctIcon, correctColor, now]
      );
      console.log(`📝 Updated ${expResult.changes} expense record(s)`);
    });

    console.log('✅ Successfully fixed Unlabeled category icon and color');
  } catch (error) {
    console.error('❌ Failed to fix Unlabeled icon and color:', error);
    throw error;
  }
}

/**
 * Rename category id='6' to "Unlabeled"
 * Updates both custom_categories table and all expenses using this category
 * Handles all possible old names (Other, Health, etc.) from different app versions
 */
async function renameOtherToUnlabeled(db: SQLite.SQLiteDatabase): Promise<void> {
  try {
    console.log('🔄 Ensuring category id=6 is named "Unlabeled"...');

    // First check what we have
    const beforeCat = await db.getFirstAsync<{ id: string; name: string }>(
      `SELECT id, name FROM custom_categories WHERE id = '6'`
    );
    console.log('📊 Category before migration:', beforeCat);

    const now = Date.now();

    // Use exclusive transaction for atomic multi-table updates
    await db.withExclusiveTransactionAsync(async () => {
      // Update id='6' to "Unlabeled" regardless of current name
      // This handles all app versions (Health, Other, or already Unlabeled)
      const catResult = await db.runAsync(
        `UPDATE custom_categories SET name = ?, updated_at = ? WHERE id = '6'`,
        ['Unlabeled', now]
      );
      console.log(`📝 Updated ${catResult.changes} category record(s)`);

      // Update all expenses with category_id='6' to show "Unlabeled"
      // This fixes expenses that may have old names (Health, Other, etc.)
      const expResult = await db.runAsync(
        `UPDATE expenses SET category_name = ?, updated_at = ? WHERE category_id = '6'`,
        ['Unlabeled', now]
      );
      console.log(`📝 Updated ${expResult.changes} expense record(s)`);
    });

    // Verify the change
    const afterCat = await db.getFirstAsync<{ id: string; name: string }>(
      `SELECT id, name FROM custom_categories WHERE id = '6'`
    );
    console.log('📊 Category after migration:', afterCat);

    console.log('✅ Successfully ensured id=6 is "Unlabeled"');
  } catch (error) {
    console.error('❌ Failed to rename category id=6 to Unlabeled:', error);
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
    interface MonthBasedNetWorthRow {
      id: string;
      month: string;
      assets: string;
      liabilities: string;
      notes: string | null;
      created_at: number;
      updated_at: number;
    }
    const existingEntries = await db.getAllAsync<MonthBasedNetWorthRow>(
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
        `INSERT OR IGNORE INTO custom_categories
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
 * Create recurring_expenses table
 * Uses centralized schema definition from schema.ts
 */
async function createRecurringExpensesTable(db: SQLite.SQLiteDatabase): Promise<void> {
  try {
    // Check if table already exists
    const tableInfo = await db.getAllAsync<{ name: string }>(
      'PRAGMA table_info(recurring_expenses)'
    );

    if (tableInfo.length > 0) {
      console.log('✅ recurring_expenses table already exists');
      return;
    }

    console.log('Creating recurring_expenses table...');

    const tableSchema = getTableSchema('recurring_expenses');
    const indexes = getTableIndexes('recurring_expenses');
    await db.execAsync(`${tableSchema};\n${indexes.join(';\n')};`);

    console.log('✅ recurring_expenses table created successfully');
  } catch (error) {
    console.error('❌ Failed to create recurring_expenses table:', error);
    throw error;
  }
}

/**
 * Fix Unlabeled category name for users affected by buggy v6 migration
 * Some users had id='6' as 'Health' instead of 'Other', causing v6 migration to fail silently
 * This migration ensures id='6' is always named "Unlabeled" regardless of current state
 */
async function fixUnlabeledCategoryName(db: SQLite.SQLiteDatabase): Promise<void> {
  try {
    console.log('🔄 Fixing Unlabeled category name (repair for buggy v6 migration)...');

    // Check current state
    const currentCat = await db.getFirstAsync<{ id: string; name: string }>(
      `SELECT id, name FROM custom_categories WHERE id = '6'`
    );

    if (!currentCat) {
      console.log('⚠️  Category id=6 not found, skipping');
      return;
    }

    console.log(`📊 Current state: id='6', name='${currentCat.name}'`);

    if (currentCat.name === 'Unlabeled') {
      console.log('✅ Already correct, no fix needed');
      return;
    }

    const now = Date.now();

    // Use exclusive transaction for atomic multi-table updates
    await db.withExclusiveTransactionAsync(async () => {
      // Fix the category name
      const catResult = await db.runAsync(
        `UPDATE custom_categories SET name = ?, updated_at = ? WHERE id = '6'`,
        ['Unlabeled', now]
      );
      console.log(`📝 Fixed ${catResult.changes} category record(s)`);

      // Fix all expenses with this category
      const expResult = await db.runAsync(
        `UPDATE expenses SET category_name = ?, updated_at = ? WHERE category_id = '6'`,
        ['Unlabeled', now]
      );
      console.log(`📝 Fixed ${expResult.changes} expense record(s)`);
    });

    console.log(`✅ Successfully fixed category name: '${currentCat.name}' → 'Unlabeled'`);
  } catch (error) {
    console.error('❌ Failed to fix Unlabeled category name:', error);
    throw error;
  }
}

/**
 * Add recurring_expense_id column to expenses table
 * Uses table recreation strategy since SQLite doesn't support ALTER COLUMN
 */
async function addRecurringExpenseIdColumn(db: SQLite.SQLiteDatabase): Promise<void> {
  try {
    // Check if table exists and get its structure
    const tableInfo = await db.getAllAsync<{ name: string }>(
      'PRAGMA table_info(expenses)'
    );

    // If table doesn't exist, skip (setupDatabase will create it)
    if (tableInfo.length === 0) {
      console.log('✅ Expenses table does not exist yet, will be created by setupDatabase');
      return;
    }

    const hasRecurringExpenseIdColumn = tableInfo.some(col => col.name === 'recurring_expense_id');

    if (hasRecurringExpenseIdColumn) {
      console.log('✅ recurring_expense_id column already exists');
      return;
    }

    console.log('Adding recurring_expense_id column to existing expenses table...');

    // Get existing data
    interface LegacyExpenseRow {
      id: string;
      amount: string;
      category_id: string;
      category_name: string;
      category_icon: string;
      category_color: string;
      date: number;
      note: string | null;
      created_at: number;
      updated_at: number;
    }
    const existingExpenses = await db.getAllAsync<LegacyExpenseRow>(
      'SELECT * FROM expenses ORDER BY created_at DESC'
    );

    // Create new table with recurring_expense_id column
    await db.execAsync(`
      DROP TABLE IF EXISTS expenses_temp;

      CREATE TABLE expenses_temp (
        id TEXT PRIMARY KEY NOT NULL,
        amount TEXT NOT NULL,
        category_id TEXT NOT NULL,
        category_name TEXT NOT NULL,
        category_icon TEXT NOT NULL,
        category_color TEXT NOT NULL,
        date INTEGER NOT NULL,
        note TEXT,
        recurring_expense_id TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);

    // Copy existing data (recurring_expense_id will be NULL for existing expenses)
    for (const expense of existingExpenses) {
      await db.runAsync(
        `INSERT INTO expenses_temp
         (id, amount, category_id, category_name, category_icon, category_color, date, note, recurring_expense_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
        [
          expense.id,
          expense.amount,
          expense.category_id,
          expense.category_name,
          expense.category_icon,
          expense.category_color,
          expense.date,
          expense.note,
          expense.created_at,
          expense.updated_at
        ]
      );
    }

    // Replace old table with new one
    const indexes = getTableIndexes('expenses');
    await db.execAsync(`
      DROP TABLE expenses;
      ALTER TABLE expenses_temp RENAME TO expenses;

      ${indexes.join(';\n')};
    `);

    console.log(`✅ recurring_expense_id column added, ${existingExpenses.length} existing expenses migrated`);
  } catch (error) {
    console.error('❌ Failed to add recurring_expense_id column:', error);
    throw error;
  }
}

/**
 * Initialize a new database with default data
 * This function is ONLY for new installations, not migrations
 *
 * @param db - SQLite database instance
 */
export async function initializeNewDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  console.log('🆕 Initializing new database with default data...');

  try {
    const now = Date.now();

    // Insert all 32 default categories in one operation
    // This is more efficient than running migrations that check "if already exists"
    for (let i = 0; i < CATEGORIES.length; i++) {
      const category = CATEGORIES[i];
      await db.runAsync(
        `INSERT OR IGNORE INTO custom_categories
         (id, name, icon, color, position, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
        [category.id, category.name, category.icon, category.color, i, now, now]
      );
    }

    console.log(`✅ Initialized with ${CATEGORIES.length} default categories`);

    // Note: No need to mark migrations as complete - this is a fresh database
    // The schema_version will be set to current version by database.ts
  } catch (error) {
    console.error('❌ Failed to initialize new database:', error);
    throw error;
  }
}

/**
 * V10 Migration: Add category field to net worth items stored in JSON.
 * Reads all net_worth_entries, parses JSON assets/liabilities,
 * adds category field based on name matching, writes back.
 */
async function addNetWorthItemCategories(db: SQLite.SQLiteDatabase): Promise<void> {
  // Check if table exists
  const tableInfo = await db.getAllAsync<{ name: string }>(
    'PRAGMA table_info(net_worth_entries)'
  );

  if (tableInfo.length === 0) {
    console.log('net_worth_entries table does not exist yet, skipping v10');
    return;
  }

  interface NetWorthRowData {
    id: string;
    date: string;
    assets: string;
    liabilities: string;
  }

  const entries = await db.getAllAsync<NetWorthRowData>(
    'SELECT id, date, assets, liabilities FROM net_worth_entries'
  );

  if (entries.length === 0) {
    console.log('No net worth entries to migrate');
    return;
  }

  console.log(`📝 Migrating ${entries.length} net worth entries to add category field...`);

  const assetCategoryMap: Record<string, string> = {
    'Savings': 'liquid',
    'Checking': 'liquid',
    'Investments': 'liquid',
    'Real Estate': 'illiquid',
    'Vehicles': 'illiquid',
    'Other Assets': 'illiquid',
    'Retirement': 'retirement',
    '401k': 'retirement',
    'IRA': 'retirement',
  };

  const timestamp = Date.now();

  for (const entry of entries) {
    try {
      const assets = JSON.parse(entry.assets || '[]');

      let changed = false;

      for (const asset of assets) {
        if (asset.category === undefined) {
          asset.category = assetCategoryMap[asset.name] || 'liquid';
          changed = true;
        }
      }

      if (changed) {
        await db.runAsync(
          'UPDATE net_worth_entries SET assets = ?, updated_at = ? WHERE id = ?',
          [JSON.stringify(assets), timestamp, entry.id]
        );
      }
    } catch (parseError) {
      console.error(`⚠️ Failed to migrate net worth entry ${entry.id} (${entry.date}):`, parseError);
    }
  }

  console.log(`✅ Migrated ${entries.length} net worth entries with category field`);
}

/**
 * Main migration runner - executes all pending migrations
 * This function is ONLY for existing databases that need to be upgraded
 *
 * Uses database schema_version as single source of truth (no AsyncStorage)
 *
 * @param db - SQLite database instance
 * @param fromVersion - Current schema version (0-10), determines which migrations to run
 */
export async function runMigrations(db: SQLite.SQLiteDatabase, fromVersion: number): Promise<void> {
  console.log(`🔄 Starting migration runner from version ${fromVersion}...`);
  console.log(`📋 Migrations to run: v${fromVersion + 1} through v10`);

  try {
    // V1 Migration: Categories with position (CRITICAL)
    if (fromVersion < 1) {
      console.log('🔄 Running v1 database migrations (categories with position)...');
      try {
        await addPositionColumn(db);
        await migrateDefaultCategories(db);
        console.log('✅ v1 migrations completed successfully');
      } catch (error) {
        // v1 is CRITICAL - category system is core to app functionality
        // Failure will prevent app from starting
        console.error('❌ v1 migration FAILED (CRITICAL):', error);
        throw new Error(`v1 migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      console.log('✅ v1 migrations already completed (version >= 1)');
    }

    // V2 Migration: Category budgets table (CRITICAL)
    if (fromVersion < 2) {
      console.log('🔄 Running v2 database migrations (category budgets table)...');
      try {
        await createCategoryBudgetsTable(db);
        console.log('✅ v2 migrations completed successfully');
      } catch (error) {
        // v2 is CRITICAL - budget tracking is core functionality
        // Failure will prevent app from starting
        console.error('❌ v2 migration FAILED (CRITICAL):', error);
        throw new Error(`v2 migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      console.log('✅ v2 migrations already completed (version >= 2)');
    }

    // V3 Migration: Additional categories (CRITICAL)
    if (fromVersion < 3) {
      console.log('🔄 Running v3 database migrations (additional categories)...');
      try {
        await addAdditionalCategories(db);
        console.log('✅ v3 migrations completed successfully');
      } catch (error) {
        // v3 is CRITICAL - users need full category set
        // Failure will prevent app from starting
        console.error('❌ v3 migration FAILED (CRITICAL):', error);
        throw new Error(`v3 migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      console.log('✅ v3 migrations already completed (version >= 3)');
    }

    // V4 Migration: Net worth dynamic items (OPTIONAL)
    if (fromVersion < 4) {
      console.log('🔄 Running v4 database migrations (net worth dynamic items)...');
      try {
        await convertNetWorthToDynamicItems(db);
        console.log('✅ v4 migrations completed successfully');
      } catch (error) {
        // v4 is OPTIONAL - net worth is an advanced feature
        // App can function without it, log error but continue
        console.error('❌ v4 migration failed (OPTIONAL migration):', error);
        console.warn('⚠️  Net worth feature may not function correctly');
        console.warn('⚠️  Core expense tracking is unaffected');
        // Don't throw - allow app to continue
      }
    } else {
      console.log('✅ v4 migrations already completed (version >= 4)');
    }

    // V5 Migration: Net worth full dates (OPTIONAL)
    if (fromVersion < 5) {
      console.log('🔄 Running v5 database migrations (net worth full dates)...');
      try {
        await migrateNetWorthToFullDates(db);
        console.log('✅ v5 migrations completed successfully');
      } catch (error) {
        // v5 is OPTIONAL - net worth date format enhancement
        // App can function without it, log error but continue
        console.error('❌ v5 migration failed (OPTIONAL migration):', error);
        console.warn('⚠️  Net worth date tracking may not function correctly');
        console.warn('⚠️  Core expense tracking is unaffected');
        // Don't throw - allow app to continue
      }
    } else {
      console.log('✅ v5 migrations already completed (version >= 5)');
    }

    // V6 Migration: Rename "Other" to "Unlabeled" (CRITICAL)
    if (fromVersion < 6) {
      console.log('🔄 Running v6 database migrations (rename Other to Unlabeled)...');
      try {
        await renameOtherToUnlabeled(db);
        console.log('✅ v6 migrations completed successfully');
      } catch (error) {
        // v6 is CRITICAL - category naming is important for UX
        // Failure will prevent app from starting
        console.error('❌ v6 migration FAILED (CRITICAL):', error);
        throw new Error(`v6 migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      console.log('✅ v6 migrations already completed (version >= 6)');
    }

    // V7 Migration: Fix Unlabeled category icon and color (CRITICAL)
    if (fromVersion < 7) {
      console.log('🔄 Running v7 database migrations (fix Unlabeled icon and color)...');
      try {
        await fixUnlabeledIconAndColor(db);
        console.log('✅ v7 migrations completed successfully');
      } catch (error) {
        // v7 is CRITICAL - ensures consistent UX for protected category
        // Failure will prevent app from starting
        console.error('❌ v7 migration FAILED (CRITICAL):', error);
        throw new Error(`v7 migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      console.log('✅ v7 migrations already completed (version >= 7)');
    }

    // V8 Migration: Recurring expenses (CRITICAL)
    if (fromVersion < 8) {
      console.log('🔄 Running v8 database migrations (recurring expenses)...');
      console.log('  → Creating recurring_expenses table...');
      console.log('  → Adding recurring_expense_id column to expenses table...');
      try {
        await createRecurringExpensesTable(db);
        console.log('  ✅ recurring_expenses table created');
        await addRecurringExpenseIdColumn(db);
        console.log('  ✅ recurring_expense_id column added');
        console.log('✅ v8 migrations completed successfully');
      } catch (error) {
        // v8 is CRITICAL - recurring expenses are core functionality
        // Failure will prevent app from starting
        console.error('❌ v8 migration FAILED (CRITICAL):', error);
        if (error instanceof Error) {
          console.error('Error details:', error.message);
          console.error('Stack trace:', error.stack);
        }
        throw new Error(`v8 migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      console.log('✅ v8 migrations already completed (version >= 8)');
    }

    // V9 Migration: Fix Unlabeled category name (CRITICAL)
    if (fromVersion < 9) {
      console.log('🔄 Running v9 database migrations (fix Unlabeled category name)...');
      try {
        await fixUnlabeledCategoryName(db);
        console.log('✅ v9 migrations completed successfully');
      } catch (error) {
        // v9 is CRITICAL - fixes data corruption from buggy v6 migration
        // Failure will prevent app from starting
        console.error('❌ v9 migration FAILED (CRITICAL):', error);
        throw new Error(`v9 migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      console.log('✅ v9 migrations already completed (version >= 9)');
    }

    // V10 Migration: Net worth item categories (OPTIONAL)
    if (fromVersion < 10) {
      console.log('🔄 Running v10 database migrations (net worth item categories)...');
      try {
        await addNetWorthItemCategories(db);
        console.log('✅ v10 migrations completed successfully');
      } catch (error) {
        // v10 is OPTIONAL - net worth category enhancement
        // App can function without it (name-based fallback exists)
        console.error('⚠️ v10 migration failed (OPTIONAL):', error);
        console.warn('Net worth category breakdowns may not include custom-named items');
      }
    } else {
      console.log('✅ v10 migrations already completed (version >= 10)');
    }

    console.log('✅ All migrations completed successfully');
  } catch (error) {
    console.error('❌ CRITICAL Migration failed:', error);
    throw error;
  }
}
