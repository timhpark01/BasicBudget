import * as SQLite from 'expo-sqlite';
import {
  RecurringExpense,
  RecurringExpenseInput,
  RecurringExpenseRow,
  RecurrenceFrequency,
  IoniconsName,
} from '@/types/database';
import { generateId } from '../../utils/id-generator';
import { DatabaseError } from '@/lib/db/core/errors';
import { mapSQLiteErrorToUserMessage } from '@/lib/db/utils/error-mapper';

/**
 * Transform database row to RecurringExpense object
 */
function rowToRecurringExpense(row: RecurringExpenseRow): RecurringExpense {
  return {
    id: row.id,
    amount: row.amount,
    category: {
      id: row.category_id,
      name: row.category_name,
      icon: row.category_icon as IoniconsName,
      color: row.category_color,
    },
    note: row.note || '',
    frequency: row.frequency as RecurrenceFrequency,
    dayOfWeek: row.day_of_week !== null ? row.day_of_week : undefined,
    dayOfMonth: row.day_of_month !== null ? row.day_of_month : undefined,
    monthOfYear: row.month_of_year !== null ? row.month_of_year : undefined,
    startDate: new Date(row.start_date),
    endDate: row.end_date !== null ? new Date(row.end_date) : undefined,
    lastGeneratedDate: row.last_generated_date !== null ? new Date(row.last_generated_date) : undefined,
    isActive: row.is_active === 1,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * CREATE: Insert a new recurring expense into the database
 */
export async function createRecurringExpense(
  db: SQLite.SQLiteDatabase,
  expense: RecurringExpenseInput
): Promise<RecurringExpense> {
  try {
    // Input validation (fail fast)
    if (!expense.category) {
      throw new DatabaseError('Category is required', undefined, 'validation');
    }

    const amountNum = parseFloat(expense.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      throw new DatabaseError('Amount must be a positive number', undefined, 'validation');
    }

    if (!expense.frequency) {
      throw new DatabaseError('Frequency is required', undefined, 'validation');
    }

    // Validate frequency-specific fields
    if (expense.frequency === 'weekly' && (expense.dayOfWeek === undefined || expense.dayOfWeek < 0 || expense.dayOfWeek > 6)) {
      throw new DatabaseError('Day of week (0-6) is required for weekly frequency', undefined, 'validation');
    }

    if ((expense.frequency === 'monthly' || expense.frequency === 'yearly') && (expense.dayOfMonth === undefined || expense.dayOfMonth < 1 || expense.dayOfMonth > 31)) {
      throw new DatabaseError('Day of month (1-31) is required for monthly/yearly frequency', undefined, 'validation');
    }

    if (expense.frequency === 'yearly' && (expense.monthOfYear === undefined || expense.monthOfYear < 1 || expense.monthOfYear > 12)) {
      throw new DatabaseError('Month of year (1-12) is required for yearly frequency', undefined, 'validation');
    }

    // Generate ID and timestamps
    const id = generateId();
    const timestamp = Date.now();
    const startDateTimestamp = expense.startDate.getTime();
    const endDateTimestamp = expense.endDate ? expense.endDate.getTime() : null;

    // Insert into database
    await db.runAsync(
      `INSERT INTO recurring_expenses (
        id, amount, category_id, category_name, category_icon, category_color,
        note, frequency, day_of_week, day_of_month, month_of_year,
        start_date, end_date, last_generated_date, is_active,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 1, ?, ?)`,
      [
        id,
        expense.amount,
        expense.category.id,
        expense.category.name,
        expense.category.icon,
        expense.category.color,
        expense.note || null,
        expense.frequency,
        expense.dayOfWeek !== undefined ? expense.dayOfWeek : null,
        expense.dayOfMonth !== undefined ? expense.dayOfMonth : null,
        expense.monthOfYear !== undefined ? expense.monthOfYear : null,
        startDateTimestamp,
        endDateTimestamp,
        timestamp,
        timestamp,
      ]
    );

    return {
      id,
      amount: expense.amount,
      category: expense.category,
      note: expense.note,
      frequency: expense.frequency,
      dayOfWeek: expense.dayOfWeek,
      dayOfMonth: expense.dayOfMonth,
      monthOfYear: expense.monthOfYear,
      startDate: expense.startDate,
      endDate: expense.endDate,
      lastGeneratedDate: undefined,
      isActive: true,
      createdAt: new Date(timestamp),
      updatedAt: new Date(timestamp),
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
      'create_recurring_expense',
      error as Error
    );
  }
}

/**
 * READ: Get all recurring expenses from the database, sorted by creation date
 */
export async function getAllRecurringExpenses(
  db: SQLite.SQLiteDatabase,
  includeInactive: boolean = false
): Promise<RecurringExpense[]> {
  try {
    const query = includeInactive
      ? 'SELECT * FROM recurring_expenses ORDER BY created_at DESC'
      : 'SELECT * FROM recurring_expenses WHERE is_active = 1 ORDER BY created_at DESC';

    const rows = await db.getAllAsync<RecurringExpenseRow>(query);

    return rows.map(rowToRecurringExpense);
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
      'get_all_recurring_expenses',
      error as Error
    );
  }
}

/**
 * READ: Get a single recurring expense by ID
 */
export async function getRecurringExpenseById(
  db: SQLite.SQLiteDatabase,
  id: string
): Promise<RecurringExpense | null> {
  try {
    // Input validation
    if (!id || id.trim() === '') {
      throw new DatabaseError('Recurring expense ID is required', undefined, 'validation');
    }

    const row = await db.getFirstAsync<RecurringExpenseRow>(
      'SELECT * FROM recurring_expenses WHERE id = ?',
      [id]
    );

    return row ? rowToRecurringExpense(row) : null;
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
      'get_recurring_expense_by_id',
      error as Error
    );
  }
}

/**
 * UPDATE: Update an existing recurring expense
 */
export async function updateRecurringExpense(
  db: SQLite.SQLiteDatabase,
  id: string,
  expense: Partial<RecurringExpenseInput>
): Promise<RecurringExpense> {
  try {
    // Input validation
    if (!id || id.trim() === '') {
      throw new DatabaseError('Recurring expense ID is required', undefined, 'validation');
    }

    // Get existing recurring expense
    const existing = await getRecurringExpenseById(db, id);
    if (!existing) {
      throw new DatabaseError('Recurring expense not found', undefined, 'validation');
    }

    // Merge updates with existing data
    const updated = {
      amount: expense.amount !== undefined ? expense.amount : existing.amount,
      category: expense.category !== undefined ? expense.category : existing.category,
      note: expense.note !== undefined ? expense.note : existing.note,
      frequency: expense.frequency !== undefined ? expense.frequency : existing.frequency,
      dayOfWeek: expense.dayOfWeek !== undefined ? expense.dayOfWeek : existing.dayOfWeek,
      dayOfMonth: expense.dayOfMonth !== undefined ? expense.dayOfMonth : existing.dayOfMonth,
      monthOfYear: expense.monthOfYear !== undefined ? expense.monthOfYear : existing.monthOfYear,
      startDate: expense.startDate !== undefined ? expense.startDate : existing.startDate,
      endDate: expense.endDate !== undefined ? expense.endDate : existing.endDate,
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
    const startDateTimestamp = updated.startDate.getTime();
    const endDateTimestamp = updated.endDate ? updated.endDate.getTime() : null;

    await db.runAsync(
      `UPDATE recurring_expenses SET
        amount = ?, category_id = ?, category_name = ?, category_icon = ?,
        category_color = ?, note = ?, frequency = ?, day_of_week = ?,
        day_of_month = ?, month_of_year = ?, start_date = ?, end_date = ?,
        updated_at = ?
      WHERE id = ?`,
      [
        updated.amount,
        updated.category.id,
        updated.category.name,
        updated.category.icon,
        updated.category.color,
        updated.note || null,
        updated.frequency,
        updated.dayOfWeek !== undefined ? updated.dayOfWeek : null,
        updated.dayOfMonth !== undefined ? updated.dayOfMonth : null,
        updated.monthOfYear !== undefined ? updated.monthOfYear : null,
        startDateTimestamp,
        endDateTimestamp,
        timestamp,
        id,
      ]
    );

    return {
      id,
      amount: updated.amount,
      category: updated.category,
      note: updated.note,
      frequency: updated.frequency,
      dayOfWeek: updated.dayOfWeek,
      dayOfMonth: updated.dayOfMonth,
      monthOfYear: updated.monthOfYear,
      startDate: updated.startDate,
      endDate: updated.endDate,
      lastGeneratedDate: existing.lastGeneratedDate,
      isActive: existing.isActive,
      createdAt: existing.createdAt,
      updatedAt: new Date(timestamp),
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
      'update_recurring_expense',
      error as Error
    );
  }
}

/**
 * DELETE: Delete a recurring expense by ID
 */
export async function deleteRecurringExpense(
  db: SQLite.SQLiteDatabase,
  id: string
): Promise<void> {
  try {
    // Input validation
    if (!id || id.trim() === '') {
      throw new DatabaseError('Recurring expense ID is required', undefined, 'validation');
    }

    await db.runAsync('DELETE FROM recurring_expenses WHERE id = ?', [id]);
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
      'delete_recurring_expense',
      error as Error
    );
  }
}

/**
 * DELETE: Delete all expenses generated by a recurring expense
 */
export async function deleteGeneratedExpenses(
  db: SQLite.SQLiteDatabase,
  recurringExpenseId: string
): Promise<void> {
  try {
    // Input validation
    if (!recurringExpenseId || recurringExpenseId.trim() === '') {
      throw new DatabaseError('Recurring expense ID is required', undefined, 'validation');
    }

    await db.runAsync('DELETE FROM expenses WHERE recurring_expense_id = ?', [recurringExpenseId]);
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
      'delete_generated_expenses',
      error as Error
    );
  }
}

/**
 * UPDATE: Toggle active status of a recurring expense
 */
export async function toggleRecurringExpenseActive(
  db: SQLite.SQLiteDatabase,
  id: string,
  isActive: boolean
): Promise<void> {
  try {
    // Input validation
    if (!id || id.trim() === '') {
      throw new DatabaseError('Recurring expense ID is required', undefined, 'validation');
    }

    const timestamp = Date.now();

    await db.runAsync(
      'UPDATE recurring_expenses SET is_active = ?, updated_at = ? WHERE id = ?',
      [isActive ? 1 : 0, timestamp, id]
    );
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
      'toggle_recurring_expense_active',
      error as Error
    );
  }
}

/**
 * UPDATE: Update last_generated_date for a recurring expense
 */
export async function updateLastGeneratedDate(
  db: SQLite.SQLiteDatabase,
  id: string,
  lastGeneratedDate: Date
): Promise<void> {
  try {
    // Input validation
    if (!id || id.trim() === '') {
      throw new DatabaseError('Recurring expense ID is required', undefined, 'validation');
    }

    const timestamp = Date.now();
    const lastGenTimestamp = lastGeneratedDate.getTime();

    await db.runAsync(
      'UPDATE recurring_expenses SET last_generated_date = ?, updated_at = ? WHERE id = ?',
      [lastGenTimestamp, timestamp, id]
    );
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
      'update_last_generated_date',
      error as Error
    );
  }
}
