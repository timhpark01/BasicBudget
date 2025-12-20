/**
 * Database Health Check Utility
 * Provides diagnostic tools to verify database integrity and migration status
 */

import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface HealthCheckResult {
  healthy: boolean;
  schemaVersion: number;
  issues: string[];
  warnings: string[];
  tableInfo: {
    expenses: { exists: boolean; rowCount: number; hasRequiredColumns: boolean };
    budgets: { exists: boolean; rowCount: number; hasRequiredColumns: boolean };
    custom_categories: { exists: boolean; rowCount: number; hasPositionColumn: boolean };
    net_worth_entries: { exists: boolean; rowCount: number; hasDateColumn: boolean };
    category_budgets: { exists: boolean; rowCount: number };
  };
  migrationStatus: {
    v1: boolean;
    v2: boolean;
    v3: boolean;
    v4: boolean;
    v5: boolean;
  };
}

/**
 * Check if a table exists in the database
 */
async function tableExists(db: SQLite.SQLiteDatabase, tableName: string): Promise<boolean> {
  try {
    const result = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name=?",
      [tableName]
    );
    return (result?.count ?? 0) > 0;
  } catch {
    return false;
  }
}

/**
 * Get row count for a table
 */
async function getRowCount(db: SQLite.SQLiteDatabase, tableName: string): Promise<number> {
  try {
    const result = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${tableName}`
    );
    return result?.count ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Check if a column exists in a table
 */
async function columnExists(
  db: SQLite.SQLiteDatabase,
  tableName: string,
  columnName: string
): Promise<boolean> {
  try {
    const columns = await db.getAllAsync<{ name: string }>(
      `PRAGMA table_info(${tableName})`
    );
    return columns.some(col => col.name === columnName);
  } catch {
    return false;
  }
}

/**
 * Get schema version from database
 */
async function getSchemaVersion(db: SQLite.SQLiteDatabase): Promise<number> {
  try {
    const exists = await tableExists(db, 'schema_version');
    if (!exists) return 0;

    const result = await db.getFirstAsync<{ version: number }>(
      'SELECT version FROM schema_version WHERE id = 1'
    );
    return result?.version ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Get migration status from AsyncStorage
 */
async function getMigrationStatus(): Promise<{
  v1: boolean;
  v2: boolean;
  v3: boolean;
  v4: boolean;
  v5: boolean;
}> {
  try {
    const [v1, v2, v3, v4, v5] = await Promise.all([
      AsyncStorage.getItem('migration_v1_categories_to_db'),
      AsyncStorage.getItem('migration_v2_category_budgets'),
      AsyncStorage.getItem('migration_v3_additional_categories'),
      AsyncStorage.getItem('migration_v4_networth_dynamic_items'),
      AsyncStorage.getItem('migration_v5_networth_full_dates'),
    ]);

    return {
      v1: v1 === 'true',
      v2: v2 === 'true',
      v3: v3 === 'true',
      v4: v4 === 'true',
      v5: v5 === 'true',
    };
  } catch {
    return { v1: false, v2: false, v3: false, v4: false, v5: false };
  }
}

/**
 * Perform comprehensive database health check
 */
export async function performHealthCheck(db: SQLite.SQLiteDatabase): Promise<HealthCheckResult> {
  const issues: string[] = [];
  const warnings: string[] = [];

  console.log('🔍 Starting database health check...');

  // Get schema version
  const schemaVersion = await getSchemaVersion(db);
  console.log(`📊 Schema version: ${schemaVersion}`);

  // Check migration status
  const migrationStatus = await getMigrationStatus();

  // Check expenses table
  const expensesExists = await tableExists(db, 'expenses');
  const expensesCount = expensesExists ? await getRowCount(db, 'expenses') : 0;
  const expensesHasRequiredColumns =
    expensesExists &&
    (await columnExists(db, 'expenses', 'id')) &&
    (await columnExists(db, 'expenses', 'amount')) &&
    (await columnExists(db, 'expenses', 'category_id'));

  if (!expensesExists) {
    issues.push('expenses table does not exist');
  } else if (!expensesHasRequiredColumns) {
    issues.push('expenses table is missing required columns');
  }

  // Check budgets table
  const budgetsExists = await tableExists(db, 'budgets');
  const budgetsCount = budgetsExists ? await getRowCount(db, 'budgets') : 0;
  const budgetsHasRequiredColumns =
    budgetsExists &&
    (await columnExists(db, 'budgets', 'id')) &&
    (await columnExists(db, 'budgets', 'month')) &&
    (await columnExists(db, 'budgets', 'budget_amount'));

  if (!budgetsExists) {
    issues.push('budgets table does not exist');
  } else if (!budgetsHasRequiredColumns) {
    issues.push('budgets table is missing required columns');
  }

  // Check custom_categories table
  const categoriesExists = await tableExists(db, 'custom_categories');
  const categoriesCount = categoriesExists ? await getRowCount(db, 'custom_categories') : 0;
  const categoriesHasPosition = categoriesExists
    ? await columnExists(db, 'custom_categories', 'position')
    : false;

  if (!categoriesExists) {
    issues.push('custom_categories table does not exist');
  } else if (!categoriesHasPosition && schemaVersion >= 1) {
    issues.push('custom_categories table missing position column (v1 migration may have failed)');
  }

  // Check net_worth_entries table
  const networthExists = await tableExists(db, 'net_worth_entries');
  const networthCount = networthExists ? await getRowCount(db, 'net_worth_entries') : 0;
  const networthHasDate = networthExists
    ? await columnExists(db, 'net_worth_entries', 'date')
    : false;

  if (networthExists && !networthHasDate && schemaVersion >= 5) {
    warnings.push('net_worth_entries uses old month column instead of date (v5 migration may have failed)');
  }

  // Check category_budgets table
  const categoryBudgetsExists = await tableExists(db, 'category_budgets');
  const categoryBudgetsCount = categoryBudgetsExists
    ? await getRowCount(db, 'category_budgets')
    : 0;

  if (!categoryBudgetsExists && schemaVersion >= 2) {
    issues.push('category_budgets table does not exist (v2 migration may have failed)');
  }

  // Check for inconsistencies
  if (categoriesCount < 12 && categoriesCount > 0) {
    warnings.push(`Only ${categoriesCount} categories found (expected at least 12 default categories)`);
  }

  // Check migration status consistency
  if (migrationStatus.v1 && !categoriesHasPosition) {
    warnings.push('v1 migration marked complete but position column missing');
  }

  if (migrationStatus.v2 && !categoryBudgetsExists) {
    warnings.push('v2 migration marked complete but category_budgets table missing');
  }

  const healthy = issues.length === 0;

  const result: HealthCheckResult = {
    healthy,
    schemaVersion,
    issues,
    warnings,
    tableInfo: {
      expenses: {
        exists: expensesExists,
        rowCount: expensesCount,
        hasRequiredColumns: expensesHasRequiredColumns,
      },
      budgets: {
        exists: budgetsExists,
        rowCount: budgetsCount,
        hasRequiredColumns: budgetsHasRequiredColumns,
      },
      custom_categories: {
        exists: categoriesExists,
        rowCount: categoriesCount,
        hasPositionColumn: categoriesHasPosition,
      },
      net_worth_entries: {
        exists: networthExists,
        rowCount: networthCount,
        hasDateColumn: networthHasDate,
      },
      category_budgets: {
        exists: categoryBudgetsExists,
        rowCount: categoryBudgetsCount,
      },
    },
    migrationStatus,
  };

  console.log('✅ Health check complete');
  if (healthy) {
    console.log('✅ Database is healthy');
  } else {
    console.log(`⚠️  Found ${issues.length} issue(s) and ${warnings.length} warning(s)`);
  }

  return result;
}

/**
 * Print health check results in a readable format
 */
export function printHealthCheckResults(result: HealthCheckResult): void {
  console.log('\n=== DATABASE HEALTH CHECK RESULTS ===\n');
  console.log(`Overall Status: ${result.healthy ? '✅ HEALTHY' : '❌ UNHEALTHY'}`);
  console.log(`Schema Version: ${result.schemaVersion}`);

  console.log('\n--- Migration Status ---');
  console.log(`v1 (Categories with position): ${result.migrationStatus.v1 ? '✅' : '❌'}`);
  console.log(`v2 (Category budgets): ${result.migrationStatus.v2 ? '✅' : '❌'}`);
  console.log(`v3 (Additional categories): ${result.migrationStatus.v3 ? '✅' : '❌'}`);
  console.log(`v4 (Net worth dynamic items): ${result.migrationStatus.v4 ? '✅' : '❌'}`);
  console.log(`v5 (Net worth full dates): ${result.migrationStatus.v5 ? '✅' : '❌'}`);

  console.log('\n--- Table Information ---');
  console.log(`Expenses: ${result.tableInfo.expenses.exists ? `✅ (${result.tableInfo.expenses.rowCount} rows)` : '❌ Missing'}`);
  console.log(`Budgets: ${result.tableInfo.budgets.exists ? `✅ (${result.tableInfo.budgets.rowCount} rows)` : '❌ Missing'}`);
  console.log(`Custom Categories: ${result.tableInfo.custom_categories.exists ? `✅ (${result.tableInfo.custom_categories.rowCount} rows)` : '❌ Missing'}`);
  console.log(`  - Has position column: ${result.tableInfo.custom_categories.hasPositionColumn ? '✅' : '❌'}`);
  console.log(`Net Worth: ${result.tableInfo.net_worth_entries.exists ? `✅ (${result.tableInfo.net_worth_entries.rowCount} rows)` : '❌ Missing'}`);
  console.log(`  - Has date column: ${result.tableInfo.net_worth_entries.hasDateColumn ? '✅' : '❌'}`);
  console.log(`Category Budgets: ${result.tableInfo.category_budgets.exists ? `✅ (${result.tableInfo.category_budgets.rowCount} rows)` : '❌ Missing'}`);

  if (result.issues.length > 0) {
    console.log('\n--- ISSUES ---');
    result.issues.forEach((issue, index) => {
      console.log(`${index + 1}. ❌ ${issue}`);
    });
  }

  if (result.warnings.length > 0) {
    console.log('\n--- WARNINGS ---');
    result.warnings.forEach((warning, index) => {
      console.log(`${index + 1}. ⚠️  ${warning}`);
    });
  }

  console.log('\n=====================================\n');
}
