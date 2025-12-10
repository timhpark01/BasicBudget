/**
 * Database test utilities
 * Provides helpers for setting up and tearing down test databases
 */

import * as SQLite from 'expo-sqlite';

/**
 * Creates a test database instance
 * Each test should use a unique database name to avoid conflicts
 */
export async function createTestDatabase(name: string = 'test.db'): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(name);
  return db;
}

/**
 * Clears all data from a database
 */
export async function clearDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  try {
    await db.execAsync(`
      DELETE FROM expenses;
      DELETE FROM budgets;
      DELETE FROM custom_categories;
    `);
  } catch (err) {
    // Tables might not exist yet, that's okay
    console.log('Error clearing database:', err);
  }
}

/**
 * Closes and deletes a test database
 */
export async function deleteTestDatabase(
  db: SQLite.SQLiteDatabase,
  name: string = 'test.db'
): Promise<void> {
  try {
    await db.closeAsync();
    await SQLite.deleteDatabaseAsync(name);
  } catch (err) {
    // Database might already be closed, that's okay
    console.log('Error deleting database:', err);
  }
}

/**
 * Initialize database schema for testing
 */
export async function initTestDatabaseSchema(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY NOT NULL,
      amount TEXT NOT NULL,
      category_id TEXT NOT NULL,
      category_name TEXT NOT NULL,
      category_icon TEXT NOT NULL,
      category_color TEXT NOT NULL,
      date INTEGER NOT NULL,
      note TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY NOT NULL,
      month TEXT NOT NULL UNIQUE,
      amount TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS custom_categories (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      icon TEXT NOT NULL,
      color TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
    CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
    CREATE INDEX IF NOT EXISTS idx_budgets_month ON budgets(month);
    CREATE INDEX IF NOT EXISTS idx_custom_categories_active ON custom_categories(is_active);
  `);
}

/**
 * Creates a complete test database with schema
 */
export async function createTestDatabaseWithSchema(
  name: string = 'test.db'
): Promise<SQLite.SQLiteDatabase> {
  const db = await createTestDatabase(name);
  await initTestDatabaseSchema(db);
  return db;
}

/**
 * Inserts test expenses into database
 */
export async function insertTestExpenses(
  db: SQLite.SQLiteDatabase,
  expenses: Array<{
    id: string;
    amount: string;
    category_id: string;
    category_name: string;
    category_icon: string;
    category_color: string;
    date: number;
    note: string;
  }>
): Promise<void> {
  for (const expense of expenses) {
    await db.runAsync(
      `INSERT INTO expenses (id, amount, category_id, category_name, category_icon, category_color, date, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        expense.id,
        expense.amount,
        expense.category_id,
        expense.category_name,
        expense.category_icon,
        expense.category_color,
        expense.date,
        expense.note
      ]
    );
  }
}

/**
 * Inserts test budgets into database
 */
export async function insertTestBudgets(
  db: SQLite.SQLiteDatabase,
  budgets: Array<{
    id: string;
    month: string;
    amount: string;
    created_at: number;
    updated_at: number;
  }>
): Promise<void> {
  for (const budget of budgets) {
    await db.runAsync(
      `INSERT INTO budgets (id, month, amount, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      [budget.id, budget.month, budget.amount, budget.created_at, budget.updated_at]
    );
  }
}

/**
 * Inserts test custom categories into database
 */
export async function insertTestCustomCategories(
  db: SQLite.SQLiteDatabase,
  categories: Array<{
    id: string;
    name: string;
    icon: string;
    color: string;
    is_active: number;
    created_at: number;
    updated_at: number;
  }>
): Promise<void> {
  for (const category of categories) {
    await db.runAsync(
      `INSERT INTO custom_categories (id, name, icon, color, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        category.id,
        category.name,
        category.icon,
        category.color,
        category.is_active,
        category.created_at,
        category.updated_at
      ]
    );
  }
}
