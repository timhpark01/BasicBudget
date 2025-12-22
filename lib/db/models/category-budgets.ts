import * as SQLite from 'expo-sqlite';
import { CategoryBudget, CategoryBudgetInput, CategoryBudgetRow } from '@/types/database';
import { generateId } from '../../utils/id-generator';

/**
 * Transform database row to CategoryBudget object
 */
function rowToCategoryBudget(row: CategoryBudgetRow): CategoryBudget {
  return {
    id: row.id,
    month: row.month,
    categoryId: row.category_id,
    budgetAmount: row.budget_amount,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * Get category budget for a specific month and category
 * @param db Database instance
 * @param month Month in "YYYY-MM" format
 * @param categoryId Category ID
 * @returns Category budget, or null if not set
 */
export async function getCategoryBudget(
  db: SQLite.SQLiteDatabase,
  month: string,
  categoryId: string
): Promise<CategoryBudget | null> {
  try {
    const row = await db.getFirstAsync<CategoryBudgetRow>(
      'SELECT * FROM category_budgets WHERE month = ? AND category_id = ?',
      [month, categoryId]
    );

    return row ? rowToCategoryBudget(row) : null;
  } catch (error) {
    console.error('Failed to get category budget:', error);
    return null;
  }
}

/**
 * Get all category budgets for a specific month
 * @param db Database instance
 * @param month Month in "YYYY-MM" format
 * @returns Array of category budgets for the month
 */
export async function getCategoryBudgetsForMonth(
  db: SQLite.SQLiteDatabase,
  month: string
): Promise<CategoryBudget[]> {
  try {
    const rows = await db.getAllAsync<CategoryBudgetRow>(
      'SELECT * FROM category_budgets WHERE month = ?',
      [month]
    );

    return rows.map(rowToCategoryBudget);
  } catch (error) {
    console.error('Failed to get category budgets for month:', error);
    return [];
  }
}

/**
 * Set (create or update) category budget
 * @param db Database instance
 * @param budgetInput Category budget input data
 * @returns The created or updated category budget
 */
export async function setCategoryBudget(
  db: SQLite.SQLiteDatabase,
  budgetInput: CategoryBudgetInput
): Promise<CategoryBudget> {
  try {
    // Validation
    const amountNum = parseFloat(budgetInput.budgetAmount);
    if (isNaN(amountNum) || amountNum < 0) {
      throw new Error('Budget amount must be a non-negative number');
    }

    // Validate month format (YYYY-MM)
    const monthRegex = /^\d{4}-\d{2}$/;
    if (!monthRegex.test(budgetInput.month)) {
      throw new Error('Invalid month format. Expected YYYY-MM');
    }

    // Check if budget exists for this month and category
    const existing = await getCategoryBudget(db, budgetInput.month, budgetInput.categoryId);
    const timestamp = Date.now();

    if (existing) {
      // Update existing budget
      await db.runAsync(
        `UPDATE category_budgets SET budget_amount = ?, updated_at = ?
         WHERE month = ? AND category_id = ?`,
        [budgetInput.budgetAmount, timestamp, budgetInput.month, budgetInput.categoryId]
      );

      return {
        id: existing.id,
        month: budgetInput.month,
        categoryId: budgetInput.categoryId,
        budgetAmount: budgetInput.budgetAmount,
        createdAt: existing.createdAt,
        updatedAt: new Date(timestamp),
      };
    } else {
      // Create new budget
      const id = generateId();

      await db.runAsync(
        `INSERT INTO category_budgets (id, month, category_id, budget_amount, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, budgetInput.month, budgetInput.categoryId, budgetInput.budgetAmount, timestamp, timestamp]
      );

      return {
        id,
        month: budgetInput.month,
        categoryId: budgetInput.categoryId,
        budgetAmount: budgetInput.budgetAmount,
        createdAt: new Date(timestamp),
        updatedAt: new Date(timestamp),
      };
    }
  } catch (error) {
    console.error('Failed to set category budget:', error);
    throw new Error('Failed to save category budget. Please try again.');
  }
}

/**
 * Delete a category budget
 * @param db Database instance
 * @param month Month in "YYYY-MM" format
 * @param categoryId Category ID
 */
export async function deleteCategoryBudget(
  db: SQLite.SQLiteDatabase,
  month: string,
  categoryId: string
): Promise<void> {
  try {
    await db.runAsync(
      'DELETE FROM category_budgets WHERE month = ? AND category_id = ?',
      [month, categoryId]
    );
  } catch (error) {
    console.error('Failed to delete category budget:', error);
    throw new Error('Failed to delete category budget. Please try again.');
  }
}

/**
 * Delete all category budgets for a specific month
 * @param db Database instance
 * @param month Month in "YYYY-MM" format
 */
export async function deleteCategoryBudgetsForMonth(
  db: SQLite.SQLiteDatabase,
  month: string
): Promise<void> {
  try {
    await db.runAsync('DELETE FROM category_budgets WHERE month = ?', [month]);
  } catch (error) {
    console.error('Failed to delete category budgets for month:', error);
    throw new Error('Failed to delete category budgets. Please try again.');
  }
}
