import * as SQLite from 'expo-sqlite';
import { Budget, BudgetInput, BudgetRow } from '@/types/database';
import { generateId } from '../../utils/id-generator';
import { DatabaseError } from '@/lib/db/core/errors';
import { mapSQLiteErrorToUserMessage } from '@/lib/db/utils/error-mapper';

/**
 * Transform database row to Budget object
 */
function rowToBudget(row: BudgetRow): Budget {
  return {
    id: row.id,
    month: row.month,
    budgetAmount: row.budget_amount,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * Get budget for a specific month
 * @param db Database instance
 * @param month Month in "YYYY-MM" format
 * @returns Budget for the month, or null if not set
 */
export async function getBudgetForMonth(
  db: SQLite.SQLiteDatabase,
  month: string
): Promise<Budget | null> {
  try {
    // Input validation
    const monthRegex = /^\d{4}-\d{2}$/;
    if (!monthRegex.test(month)) {
      throw new DatabaseError('Invalid month format. Expected YYYY-MM', undefined, 'validation');
    }

    const row = await db.getFirstAsync<BudgetRow>(
      'SELECT * FROM budgets WHERE month = ?',
      [month]
    );

    return row ? rowToBudget(row) : null;
  } catch (error) {
    // If already a DatabaseError, re-throw as-is
    if (error instanceof DatabaseError) {
      throw error;
    }

    // Map SQLite errors to user messages
    const sqliteError = error as { code?: number; message?: string };
    const userMessage = mapSQLiteErrorToUserMessage(sqliteError);

    throw new DatabaseError(
      userMessage,
      sqliteError.code,
      'get_budget_for_month',
      error as Error
    );
  }
}

/**
 * Set (create or update) budget for a specific month
 * @param db Database instance
 * @param budgetInput Budget input data (month and amount)
 * @returns The created or updated budget
 */
export async function setBudgetForMonth(
  db: SQLite.SQLiteDatabase,
  budgetInput: BudgetInput
): Promise<Budget> {
  try {
    // Input validation (fail fast)
    const amountNum = parseFloat(budgetInput.budgetAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      throw new DatabaseError('Budget amount must be a positive number', undefined, 'validation');
    }

    // Validate month format (YYYY-MM)
    const monthRegex = /^\d{4}-\d{2}$/;
    if (!monthRegex.test(budgetInput.month)) {
      throw new DatabaseError('Invalid month format. Expected YYYY-MM', undefined, 'validation');
    }

    // Check if budget exists for this month
    const existing = await getBudgetForMonth(db, budgetInput.month);
    const timestamp = Date.now();

    if (existing) {
      // Update existing budget
      await db.runAsync(
        `UPDATE budgets SET budget_amount = ?, updated_at = ? WHERE month = ?`,
        [budgetInput.budgetAmount, timestamp, budgetInput.month]
      );

      return {
        id: existing.id,
        month: budgetInput.month,
        budgetAmount: budgetInput.budgetAmount,
        createdAt: existing.createdAt,
        updatedAt: new Date(timestamp),
      };
    } else {
      // Create new budget
      const id = generateId();

      await db.runAsync(
        `INSERT INTO budgets (id, month, budget_amount, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
        [id, budgetInput.month, budgetInput.budgetAmount, timestamp, timestamp]
      );

      return {
        id,
        month: budgetInput.month,
        budgetAmount: budgetInput.budgetAmount,
        createdAt: new Date(timestamp),
        updatedAt: new Date(timestamp),
      };
    }
  } catch (error) {
    // If already a DatabaseError (validation), re-throw as-is
    if (error instanceof DatabaseError) {
      throw error;
    }

    // Map SQLite errors to user messages
    const sqliteError = error as { code?: number; message?: string };
    const userMessage = mapSQLiteErrorToUserMessage(sqliteError);

    throw new DatabaseError(
      userMessage,
      sqliteError.code,
      'set_budget_for_month',
      error as Error
    );
  }
}

/**
 * Get all budgets, sorted by month (newest first)
 */
export async function getAllBudgets(
  db: SQLite.SQLiteDatabase
): Promise<Budget[]> {
  try {
    const rows = await db.getAllAsync<BudgetRow>(
      'SELECT * FROM budgets ORDER BY month DESC'
    );

    return rows.map(rowToBudget);
  } catch (error) {
    // If already a DatabaseError, re-throw as-is
    if (error instanceof DatabaseError) {
      throw error;
    }

    // Map SQLite errors to user messages
    const sqliteError = error as { code?: number; message?: string };
    const userMessage = mapSQLiteErrorToUserMessage(sqliteError);

    throw new DatabaseError(
      userMessage,
      sqliteError.code,
      'get_all_budgets',
      error as Error
    );
  }
}

/**
 * Delete a budget by ID
 */
export async function deleteBudget(
  db: SQLite.SQLiteDatabase,
  id: string
): Promise<void> {
  try {
    // Input validation
    if (!id || id.trim() === '') {
      throw new DatabaseError('Budget ID is required', undefined, 'validation');
    }

    await db.runAsync('DELETE FROM budgets WHERE id = ?', [id]);
  } catch (error) {
    // If already a DatabaseError, re-throw as-is
    if (error instanceof DatabaseError) {
      throw error;
    }

    // Map SQLite errors to user messages
    const sqliteError = error as { code?: number; message?: string };
    const userMessage = mapSQLiteErrorToUserMessage(sqliteError);

    throw new DatabaseError(
      userMessage,
      sqliteError.code,
      'delete_budget',
      error as Error
    );
  }
}

/**
 * Delete budget for a specific month
 */
export async function deleteBudgetForMonth(
  db: SQLite.SQLiteDatabase,
  month: string
): Promise<void> {
  try {
    // Input validation
    const monthRegex = /^\d{4}-\d{2}$/;
    if (!monthRegex.test(month)) {
      throw new DatabaseError('Invalid month format. Expected YYYY-MM', undefined, 'validation');
    }

    await db.runAsync('DELETE FROM budgets WHERE month = ?', [month]);
  } catch (error) {
    // If already a DatabaseError, re-throw as-is
    if (error instanceof DatabaseError) {
      throw error;
    }

    // Map SQLite errors to user messages
    const sqliteError = error as { code?: number; message?: string };
    const userMessage = mapSQLiteErrorToUserMessage(sqliteError);

    throw new DatabaseError(
      userMessage,
      sqliteError.code,
      'delete_budget_for_month',
      error as Error
    );
  }
}
