import * as SQLite from 'expo-sqlite';
import { Expense, ExpenseInput, ExpenseRow } from '@/types/database';
import { generateId } from '../../utils/id-generator';

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
      icon: row.category_icon as any,
      color: row.category_color,
    },
    date: new Date(row.date),
    note: row.note || '',
  };
}

/**
 * CREATE: Insert a new expense into the database
 */
export async function createExpense(
  db: SQLite.SQLiteDatabase,
  expense: ExpenseInput
): Promise<Expense> {
  try {
    // Validation
    if (!expense.category) {
      throw new Error('Category is required');
    }

    const amountNum = parseFloat(expense.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      throw new Error('Amount must be a positive number');
    }

    // Generate ID and timestamps
    const id = generateId();
    const timestamp = Date.now();
    const dateTimestamp = expense.date.getTime();

    // Insert into database
    await db.runAsync(
      `INSERT INTO expenses (
        id, amount, category_id, category_name, category_icon, category_color,
        date, note, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        expense.amount,
        expense.category.id,
        expense.category.name,
        expense.category.icon,
        expense.category.color,
        dateTimestamp,
        expense.note || null,
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
    };
  } catch (error) {
    console.error('Failed to create expense:', error);
    throw new Error('Failed to save expense. Please try again.');
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
    console.error('Failed to get expenses:', error);
    throw new Error('Failed to load expenses. Please try again.');
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
    const row = await db.getFirstAsync<ExpenseRow>(
      'SELECT * FROM expenses WHERE id = ?',
      [id]
    );

    return row ? rowToExpense(row) : null;
  } catch (error) {
    console.error('Failed to get expense:', error);
    return null;
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
    // Get existing expense
    const existing = await getExpenseById(db, id);
    if (!existing) {
      throw new Error('Expense not found');
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
      throw new Error('Category is required');
    }

    const amountNum = parseFloat(updated.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      throw new Error('Amount must be a positive number');
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
    };
  } catch (error) {
    console.error('Failed to update expense:', error);
    throw new Error('Failed to update expense. Please try again.');
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
    await db.runAsync('DELETE FROM expenses WHERE id = ?', [id]);
  } catch (error) {
    console.error('Failed to delete expense:', error);
    throw new Error('Failed to delete expense. Please try again.');
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
    console.error('Failed to delete all expenses:', error);
    throw new Error('Failed to delete expenses. Please try again.');
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
    const rows = await db.getAllAsync<ExpenseRow>(
      'SELECT * FROM expenses WHERE category_id = ? ORDER BY date DESC',
      [categoryId]
    );

    return rows.map(rowToExpense);
  } catch (error) {
    console.error('Failed to get expenses by category:', error);
    throw new Error('Failed to load category expenses. Please try again.');
  }
}
