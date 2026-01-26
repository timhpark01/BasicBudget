/**
 * Schema Validation Tests
 * Ensures schema.ts includes all columns/tables that migrations create
 * Prevents schema drift between new users and migrated users
 */

import { TABLE_SCHEMAS, TABLE_INDEXES } from '../lib/db/core/schema';

describe('Schema Validation', () => {
  describe('Schema Definitions', () => {
    it('should have recurring_expense_id column in expenses table schema', () => {
      const expensesSchema = TABLE_SCHEMAS.expenses;

      expect(expensesSchema).toContain('recurring_expense_id');
      expect(expensesSchema).toContain('recurring_expense_id TEXT');
    });

    it('should have recurring_expense_id index in expenses table', () => {
      const expensesIndexes = TABLE_INDEXES.expenses;

      const hasRecurringIndex = expensesIndexes.some(idx =>
        idx.includes('idx_expenses_recurring') && idx.includes('recurring_expense_id')
      );

      expect(hasRecurringIndex).toBe(true);
    });

    it('should have position column in custom_categories table', () => {
      const categoriesSchema = TABLE_SCHEMAS.custom_categories;

      expect(categoriesSchema).toContain('position');
      expect(categoriesSchema).toContain('position INTEGER NOT NULL');
    });

    it('should have category_budgets table', () => {
      expect(TABLE_SCHEMAS.category_budgets).toBeDefined();
      expect(TABLE_SCHEMAS.category_budgets).toContain('CREATE TABLE');
      expect(TABLE_SCHEMAS.category_budgets).toContain('category_id');
      expect(TABLE_SCHEMAS.category_budgets).toContain('budget_amount');
    });

    it('should have recurring_expenses table', () => {
      expect(TABLE_SCHEMAS.recurring_expenses).toBeDefined();
      expect(TABLE_SCHEMAS.recurring_expenses).toContain('CREATE TABLE');
      expect(TABLE_SCHEMAS.recurring_expenses).toContain('frequency');
      expect(TABLE_SCHEMAS.recurring_expenses).toContain('start_date');
    });

    it('should have net_worth_entries table with date column (not month)', () => {
      const networthSchema = TABLE_SCHEMAS.net_worth_entries;

      expect(networthSchema).toContain('date TEXT NOT NULL UNIQUE');
      expect(networthSchema).not.toContain('month TEXT');
    });

    it('should have net_worth_entries table with dynamic items (assets/liabilities)', () => {
      const networthSchema = TABLE_SCHEMAS.net_worth_entries;

      expect(networthSchema).toContain('assets TEXT NOT NULL');
      expect(networthSchema).toContain('liabilities TEXT NOT NULL');
      expect(networthSchema).toContain("DEFAULT '[]'");
    });

    it('should have all expected tables defined', () => {
      const requiredTables = [
        'expenses',
        'budgets',
        'custom_categories',
        'net_worth_entries',
        'schema_version',
        'category_budgets',
        'recurring_expenses',
      ];

      for (const tableName of requiredTables) {
        expect(TABLE_SCHEMAS[tableName as keyof typeof TABLE_SCHEMAS]).toBeDefined();
      }
    });

    it('should have indexes for all major tables', () => {
      const tablesNeedingIndexes = [
        'expenses',
        'budgets',
        'custom_categories',
        'net_worth_entries',
        'category_budgets',
        'recurring_expenses',
      ];

      for (const tableName of tablesNeedingIndexes) {
        const indexes = TABLE_INDEXES[tableName as keyof typeof TABLE_INDEXES];
        expect(indexes).toBeDefined();
        expect(Array.isArray(indexes)).toBe(true);
      }
    });
  });

  describe('Migration v8 Compatibility', () => {
    it('should include recurring_expense_id column added by migration v8', () => {
      // Migration v8 adds recurring_expense_id to expenses table
      // Verify schema.ts has this column so new users get it too

      const expensesSchema = TABLE_SCHEMAS.expenses;
      const hasColumn = expensesSchema.includes('recurring_expense_id');

      if (!hasColumn) {
        fail(
          'Migration v8 adds recurring_expense_id column to expenses table, ' +
          'but schema.ts does not include it. New users will have different schema than migrated users!'
        );
      }

      expect(hasColumn).toBe(true);
    });

    it('should include recurring_expenses table created by migration v8', () => {
      // Migration v8 creates recurring_expenses table
      // Verify schema.ts has this table

      const recurringExpensesSchema = TABLE_SCHEMAS.recurring_expenses;

      expect(recurringExpensesSchema).toBeDefined();
      expect(recurringExpensesSchema).toContain('CREATE TABLE');
    });
  });

  describe('Migration v1 Compatibility', () => {
    it('should include position column added by migration v1', () => {
      // Migration v1 adds position column to custom_categories
      const categoriesSchema = TABLE_SCHEMAS.custom_categories;

      expect(categoriesSchema).toContain('position INTEGER NOT NULL');
    });
  });

  describe('Migration v5 Compatibility', () => {
    it('should use date (not month) for net_worth_entries', () => {
      // Migration v5 changed from 'month' to 'date'
      const networthSchema = TABLE_SCHEMAS.net_worth_entries;

      expect(networthSchema).toContain('date TEXT');
      expect(networthSchema).not.toContain('month TEXT');
    });
  });

  describe('Schema Structure', () => {
    it('should have valid SQL syntax for all table definitions', () => {
      for (const [tableName, schema] of Object.entries(TABLE_SCHEMAS)) {
        // Check basic SQL syntax
        expect(schema).toMatch(/CREATE TABLE/i);
        expect(schema).toContain('(');
        expect(schema).toContain(')');

        // Check has at least one column
        expect(schema).toMatch(/\w+\s+(TEXT|INTEGER|REAL|BLOB)/i);
      }
    });

    it('should have valid index definitions', () => {
      for (const [tableName, indexes] of Object.entries(TABLE_INDEXES)) {
        for (const index of indexes as string[]) {
          if (index) {
            expect(index).toMatch(/CREATE INDEX/i);
            expect(index).toContain('ON');
            expect(index).toContain('(');
            expect(index).toContain(')');
          }
        }
      }
    });

    it('should have primary keys for all main tables', () => {
      const tablesNeedingPK = [
        'expenses',
        'budgets',
        'custom_categories',
        'net_worth_entries',
        'category_budgets',
        'recurring_expenses',
      ];

      for (const tableName of tablesNeedingPK) {
        const schema = TABLE_SCHEMAS[tableName as keyof typeof TABLE_SCHEMAS];
        expect(schema).toMatch(/PRIMARY KEY/i);
      }
    });

    it('should have timestamps (created_at, updated_at) for main tables', () => {
      const tablesNeedingTimestamps = [
        'expenses',
        'budgets',
        'custom_categories',
        'net_worth_entries',
        'category_budgets',
        'recurring_expenses',
      ];

      for (const tableName of tablesNeedingTimestamps) {
        const schema = TABLE_SCHEMAS[tableName as keyof typeof TABLE_SCHEMAS];
        expect(schema).toContain('created_at');
        expect(schema).toContain('updated_at');
      }
    });
  });

  describe('Schema Completeness Checklist', () => {
    /**
     * This test documents all migrations and ensures schema.ts includes their changes
     * When adding a new migration, add a test here to verify schema.ts is updated
     */

    it('[v1] includes position column', () => {
      expect(TABLE_SCHEMAS.custom_categories).toContain('position INTEGER NOT NULL');
    });

    it('[v2] includes category_budgets table', () => {
      expect(TABLE_SCHEMAS.category_budgets).toBeDefined();
    });

    it('[v3] allows for 32 categories (no schema change needed)', () => {
      // v3 just adds more default categories, no schema change
      expect(true).toBe(true);
    });

    it('[v4] includes dynamic net worth items (JSON columns)', () => {
      const schema = TABLE_SCHEMAS.net_worth_entries;
      expect(schema).toContain('assets TEXT');
      expect(schema).toContain('liabilities TEXT');
    });

    it('[v5] uses date instead of month in net_worth_entries', () => {
      const schema = TABLE_SCHEMAS.net_worth_entries;
      expect(schema).toContain('date TEXT NOT NULL UNIQUE');
      expect(schema).not.toContain('month TEXT');
    });

    it('[v6] no schema change (just renames data)', () => {
      // v6 renames "Other" to "Unlabeled", no schema change
      expect(true).toBe(true);
    });

    it('[v7] no schema change (just fixes data)', () => {
      // v7 fixes icon/color, no schema change
      expect(true).toBe(true);
    });

    it('[v8] includes recurring_expenses table and recurring_expense_id column', () => {
      expect(TABLE_SCHEMAS.recurring_expenses).toBeDefined();
      expect(TABLE_SCHEMAS.expenses).toContain('recurring_expense_id');
      expect(TABLE_INDEXES.expenses).toContain(
        'CREATE INDEX IF NOT EXISTS idx_expenses_recurring ON expenses(recurring_expense_id)'
      );
    });

    it('[v9] no schema change (just fixes data)', () => {
      // v9 fixes Unlabeled name, no schema change
      expect(true).toBe(true);
    });
  });
});
