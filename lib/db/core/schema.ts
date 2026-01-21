/**
 * Centralized Database Schema Definitions
 *
 * This file is the single source of truth for all database table schemas.
 * Both database.ts and migrations.ts import from here to ensure consistency.
 */

/**
 * Table schema definitions
 * Each table's CREATE statement is defined once here
 */
export const TABLE_SCHEMAS = {
  expenses: `
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
    )
  `,

  budgets: `
    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY NOT NULL,
      month TEXT NOT NULL UNIQUE,
      budget_amount TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `,

  custom_categories: `
    CREATE TABLE IF NOT EXISTS custom_categories (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      icon TEXT NOT NULL,
      color TEXT NOT NULL,
      position INTEGER NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `,

  net_worth_entries: `
    CREATE TABLE IF NOT EXISTS net_worth_entries (
      id TEXT PRIMARY KEY NOT NULL,
      date TEXT NOT NULL UNIQUE,
      assets TEXT NOT NULL DEFAULT '[]',
      liabilities TEXT NOT NULL DEFAULT '[]',
      notes TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `,

  schema_version: `
    CREATE TABLE IF NOT EXISTS schema_version (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      version INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `,

  category_budgets: `
    CREATE TABLE IF NOT EXISTS category_budgets (
      id TEXT PRIMARY KEY NOT NULL,
      month TEXT NOT NULL,
      category_id TEXT NOT NULL,
      budget_amount TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      UNIQUE(month, category_id)
    )
  `,
} as const;

/**
 * Index definitions for each table
 * Organized by table name for clarity
 */
export const TABLE_INDEXES = {
  expenses: [
    'CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date)',
    'CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id)',
  ],

  budgets: [
    'CREATE INDEX IF NOT EXISTS idx_budgets_month ON budgets(month)',
  ],

  custom_categories: [
    'CREATE INDEX IF NOT EXISTS idx_custom_categories_active ON custom_categories(is_active)',
    'CREATE INDEX IF NOT EXISTS idx_custom_categories_position ON custom_categories(position)',
  ],

  net_worth_entries: [
    'CREATE INDEX IF NOT EXISTS idx_net_worth_date ON net_worth_entries(date)',
  ],

  category_budgets: [
    'CREATE INDEX IF NOT EXISTS idx_category_budgets_month ON category_budgets(month)',
    'CREATE INDEX IF NOT EXISTS idx_category_budgets_category ON category_budgets(category_id)',
  ],

  schema_version: [],
} as const;

/**
 * Generate complete schema SQL for database initialization
 * Combines all table definitions and their indexes
 */
export function generateCompleteSchema(): string {
  const tables = Object.values(TABLE_SCHEMAS).join(';\n\n');
  const indexes = Object.values(TABLE_INDEXES)
    .flat()
    .join(';\n');

  return `${tables};\n\n${indexes};`;
}

/**
 * Get schema for a specific table
 * Useful for migrations that need to recreate tables
 */
export function getTableSchema(tableName: keyof typeof TABLE_SCHEMAS): string {
  return TABLE_SCHEMAS[tableName];
}

/**
 * Get indexes for a specific table
 * Useful for migrations that need to recreate indexes
 */
export function getTableIndexes(tableName: keyof typeof TABLE_INDEXES): string[] {
  return TABLE_INDEXES[tableName];
}
