import * as SQLite from 'expo-sqlite';
import { Expense, ExpenseInput, ExpenseRow, IoniconsName } from '@/types/database';
import { generateId } from '../../utils/id-generator';
import { DatabaseError } from '@/lib/db/core/errors';
import { mapSQLiteErrorToUserMessage } from '@/lib/db/utils/error-mapper';

/**
 * Transform database row to Expense object
 */
function rowToExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    amount: row.amount,
    category: {
      id: row.category_id,
      name: row.category_name,
      icon: row.category_icon as IoniconsName,
      color: row.category_color,
    },
    date: new Date(row.date),
    note: row.note || '',
    recurringExpenseId: row.recurring_expense_id || undefined,
  };
}

/**
 * CREATE: Insert a new expense into the database
 */
export async function createExpense(
  db: SQLite.SQLiteDatabase,
  expense: ExpenseInput,
  recurringExpenseId?: string
): Promise<Expense> {
  try {
    // Input validation (fail fast)
    if (!expense.category) {
      throw new DatabaseError('Category is required', undefined, 'validation');
    }

    const amountNum = parseFloat(expense.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      throw new DatabaseError('Amount must be a positive number', undefined, 'validation');
    }

    // Generate ID and timestamps
    const id = generateId();
    const timestamp = Date.now();
    const dateTimestamp = expense.date.getTime();

    // Insert into database
    await db.runAsync(
      `INSERT INTO expenses (
        id, amount, category_id, category_name, category_icon, category_color,
        date, note, recurring_expense_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        expense.amount,
        expense.category.id,
        expense.category.name,
        expense.category.icon,
        expense.category.color,
        dateTimestamp,
        expense.note || null,
        recurringExpenseId || null,
        timestamp,
        timestamp,
      ]
    );

    return {
      id,
      amount: expense.amount,
      category: expense.category,
      date: expense.date,
      note: expense.note,
      recurringExpenseId: recurringExpenseId,
    };
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
      'create_expense',
      error as Error
    );
  }
}

/**
 * READ: Get all expenses from the database, sorted by date (newest first)
 */
export async function getAllExpenses(
  db: SQLite.SQLiteDatabase
): Promise<Expense[]> {
  try {
    const rows = await db.getAllAsync<ExpenseRow>(
      'SELECT * FROM expenses ORDER BY date DESC'
    );

    return rows.map(rowToExpense);
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
      'get_all_expenses',
      error as Error
    );
  }
}

/**
 * READ: Get a single expense by ID
 */
export async function getExpenseById(
  db: SQLite.SQLiteDatabase,
  id: string
): Promise<Expense | null> {
  try {
    // Input validation
    if (!id || id.trim() === '') {
      throw new DatabaseError('Expense ID is required', undefined, 'validation');
    }

    const row = await db.getFirstAsync<ExpenseRow>(
      'SELECT * FROM expenses WHERE id = ?',
      [id]
    );

    return row ? rowToExpense(row) : null;
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
      'get_expense_by_id',
      error as Error
    );
  }
}

/**
 * UPDATE: Update an existing expense
 */
export async function updateExpense(
  db: SQLite.SQLiteDatabase,
  id: string,
  expense: Partial<ExpenseInput>
): Promise<Expense> {
  try {
    // Input validation
    if (!id || id.trim() === '') {
      throw new DatabaseError('Expense ID is required', undefined, 'validation');
    }

    // Get existing expense
    const existing = await getExpenseById(db, id);
    if (!existing) {
      throw new DatabaseError('Expense not found', undefined, 'validation');
    }

    // Merge updates with existing data
    const updated = {
      amount: expense.amount !== undefined ? expense.amount : existing.amount,
      category: expense.category !== undefined ? expense.category : existing.category,
      date: expense.date !== undefined ? expense.date : existing.date,
      note: expense.note !== undefined ? expense.note : existing.note,
    };

    // Validation
    if (!updated.category) {
      throw new DatabaseError('Category is required', undefined, 'validation');
    }

    const amountNum = parseFloat(updated.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      throw new DatabaseError('Amount must be a positive number', undefined, 'validation');
    }

    // Update in database
    const timestamp = Date.now();
    const dateTimestamp = updated.date.getTime();

    await db.runAsync(
      `UPDATE expenses SET
        amount = ?, category_id = ?, category_name = ?, category_icon = ?,
        category_color = ?, date = ?, note = ?, updated_at = ?
      WHERE id = ?`,
      [
        updated.amount,
        updated.category.id,
        updated.category.name,
        updated.category.icon,
        updated.category.color,
        dateTimestamp,
        updated.note || null,
        timestamp,
        id,
      ]
    );

    return {
      id,
      amount: updated.amount,
      category: updated.category,
      date: updated.date,
      note: updated.note,
      recurringExpenseId: existing.recurringExpenseId,
    };
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
      'update_expense',
      error as Error
    );
  }
}

/**
 * DELETE: Delete an expense by ID
 */
export async function deleteExpense(
  db: SQLite.SQLiteDatabase,
  id: string
): Promise<void> {
  try {
    // Input validation
    if (!id || id.trim() === '') {
      throw new DatabaseError('Expense ID is required', undefined, 'validation');
    }

    await db.runAsync('DELETE FROM expenses WHERE id = ?', [id]);
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
      'delete_expense',
      error as Error
    );
  }
}

/**
 * DELETE ALL: Delete all expenses (for testing/reset)
 */
export async function deleteAllExpenses(
  db: SQLite.SQLiteDatabase
): Promise<void> {
  try {
    await db.runAsync('DELETE FROM expenses');
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
      'delete_all_expenses',
      error as Error
    );
  }
}

/**
 * READ: Get all expenses for a specific category
 */
export async function getExpensesByCategory(
  db: SQLite.SQLiteDatabase,
  categoryId: string
): Promise<Expense[]> {
  try {
    // Input validation
    if (!categoryId || categoryId.trim() === '') {
      throw new DatabaseError('Category ID is required', undefined, 'validation');
    }

    const rows = await db.getAllAsync<ExpenseRow>(
      'SELECT * FROM expenses WHERE category_id = ? ORDER BY date DESC',
      [categoryId]
    );

    return rows.map(rowToExpense);
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
      'get_expenses_by_category',
      error as Error
    );
  }
}
