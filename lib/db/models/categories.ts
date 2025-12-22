import * as SQLite from 'expo-sqlite';
import {
  CustomCategory,
  CustomCategoryRow,
  CustomCategoryInput,
} from '@/types/database';
import { generateId } from '../../utils/id-generator';

/**
 * Convert database row to CustomCategory object
 */
function rowToCustomCategory(row: CustomCategoryRow): CustomCategory {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon as any,
    color: row.color,
    position: row.position,
    isActive: row.is_active === 1,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * Get all active custom categories
 */
export async function getCustomCategories(
  db: SQLite.SQLiteDatabase
): Promise<CustomCategory[]> {
  try {
    const result = await db.getAllAsync<CustomCategoryRow>(
      'SELECT * FROM custom_categories WHERE is_active = 1 ORDER BY position ASC'
    );
    return result.map(rowToCustomCategory);
  } catch (error) {
    console.error('Failed to get custom categories:', error);
    throw error;
  }
}

/**
 * Create a new custom category
 */
export async function createCustomCategory(
  db: SQLite.SQLiteDatabase,
  category: CustomCategoryInput
): Promise<CustomCategory> {
  try {
    const id = `custom_${generateId()}`;
    const now = Date.now();

    // Get the max position and assign position + 1
    const maxPositionResult = await db.getFirstAsync<{ maxPos: number | null }>(
      'SELECT MAX(position) as maxPos FROM custom_categories'
    );
    const position = (maxPositionResult?.maxPos ?? -1) + 1;

    await db.runAsync(
      `INSERT INTO custom_categories (id, name, icon, color, position, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
      [id, category.name, category.icon, category.color, position, now, now]
    );

    return {
      id,
      name: category.name,
      icon: category.icon as any,
      color: category.color,
      position,
      isActive: true,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    };
  } catch (error) {
    console.error('Failed to create custom category:', error);
    throw error;
  }
}

/**
 * Update an existing custom category
 */
export async function updateCustomCategory(
  db: SQLite.SQLiteDatabase,
  id: string,
  category: Partial<CustomCategoryInput>
): Promise<CustomCategory> {
  try {
    const now = Date.now();
    const updates: string[] = [];
    const values: any[] = [];

    if (category.name !== undefined) {
      updates.push('name = ?');
      values.push(category.name);
    }
    if (category.icon !== undefined) {
      updates.push('icon = ?');
      values.push(category.icon);
    }
    if (category.color !== undefined) {
      updates.push('color = ?');
      values.push(category.color);
    }

    updates.push('updated_at = ?');
    values.push(now);
    values.push(id);

    await db.runAsync(
      `UPDATE custom_categories SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    // Fetch updated category
    const result = await db.getFirstAsync<CustomCategoryRow>(
      'SELECT * FROM custom_categories WHERE id = ?',
      [id]
    );

    if (!result) {
      throw new Error('Category not found after update');
    }

    return rowToCustomCategory(result);
  } catch (error) {
    console.error('Failed to update custom category:', error);
    throw error;
  }
}

/**
 * Soft delete a custom category (set is_active = 0)
 */
export async function deleteCustomCategory(
  db: SQLite.SQLiteDatabase,
  id: string
): Promise<void> {
  try {
    const now = Date.now();
    await db.runAsync(
      'UPDATE custom_categories SET is_active = 0, updated_at = ? WHERE id = ?',
      [now, id]
    );
  } catch (error) {
    console.error('Failed to delete custom category:', error);
    throw error;
  }
}

/**
 * Get count of expenses using a specific category
 */
export async function getExpenseCountByCategory(
  db: SQLite.SQLiteDatabase,
  categoryId: string
): Promise<number> {
  try {
    const result = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM expenses WHERE category_id = ?',
      [categoryId]
    );
    return result?.count || 0;
  } catch (error) {
    console.error('Failed to get expense count:', error);
    throw error;
  }
}

/**
 * Reassign all expenses from one category to another
 */
export async function reassignExpensesToCategory(
  db: SQLite.SQLiteDatabase,
  fromCategoryId: string,
  toCategory: { id: string; name: string; icon: string; color: string }
): Promise<void> {
  try {
    const now = Date.now();
    await db.runAsync(
      `UPDATE expenses
       SET category_id = ?,
           category_name = ?,
           category_icon = ?,
           category_color = ?,
           updated_at = ?
       WHERE category_id = ?`,
      [
        toCategory.id,
        toCategory.name,
        toCategory.icon,
        toCategory.color,
        now,
        fromCategoryId,
      ]
    );
  } catch (error) {
    console.error('Failed to reassign expenses:', error);
    throw error;
  }
}

/**
 * Reorder categories by updating their positions
 * @param db - Database instance
 * @param categoryIds - Array of category IDs in the desired order
 */
export async function reorderCategories(
  db: SQLite.SQLiteDatabase,
  categoryIds: string[]
): Promise<void> {
  try {
    const now = Date.now();

    // Use transaction for atomic updates
    await db.withTransactionAsync(async () => {
      for (let i = 0; i < categoryIds.length; i++) {
        await db.runAsync(
          'UPDATE custom_categories SET position = ?, updated_at = ? WHERE id = ?',
          [i, now, categoryIds[i]]
        );
      }
    });
  } catch (error) {
    console.error('Failed to reorder categories:', error);
    throw error;
  }
}
