import * as SQLite from 'expo-sqlite';
import {
  CustomCategory,
  CustomCategoryRow,
  CustomCategoryInput,
} from '@/types/database';
import { generateId } from '../../utils/id-generator';
import { DatabaseError, DatabaseConstraintError } from '@/lib/db/core/errors';
import { mapSQLiteErrorToUserMessage } from '@/lib/db/utils/error-mapper';

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
    if (error instanceof DatabaseError) {
      throw error;
    }

    const sqliteError = error as { code?: number; message?: string };
    const userMessage = mapSQLiteErrorToUserMessage(sqliteError);

    throw new DatabaseError(
      userMessage,
      sqliteError.code,
      'get_categories',
      error as Error
    );
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
    // Input validation
    if (!category.name || category.name.trim().length === 0) {
      throw new DatabaseError('Category name is required', undefined, 'validation');
    }

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
    if (error instanceof DatabaseError) {
      throw error;
    }

    const sqliteError = error as { code?: number; message?: string };

    // Handle constraint violations (duplicate category name)
    if (sqliteError.code === 19 || sqliteError.code === 2067) {
      throw new DatabaseConstraintError(
        'A category with this name already exists',
        'unique',
        error as Error
      );
    }

    const userMessage = mapSQLiteErrorToUserMessage(sqliteError);

    throw new DatabaseError(
      userMessage,
      sqliteError.code,
      'create_category',
      error as Error
    );
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
    // Input validation
    if (category.name !== undefined && category.name.trim().length === 0) {
      throw new DatabaseError('Category name cannot be empty', undefined, 'validation');
    }

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
      throw new DatabaseError('Category not found after update', undefined, 'not_found');
    }

    return rowToCustomCategory(result);
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }

    const sqliteError = error as { code?: number; message?: string };

    // Handle constraint violations (duplicate category name)
    if (sqliteError.code === 19 || sqliteError.code === 2067) {
      throw new DatabaseConstraintError(
        'A category with this name already exists',
        'unique',
        error as Error
      );
    }

    const userMessage = mapSQLiteErrorToUserMessage(sqliteError);

    throw new DatabaseError(
      userMessage,
      sqliteError.code,
      'update_category',
      error as Error
    );
  }
}

/**
 * Update an existing custom category with cascading updates to expenses
 * Uses atomic transaction to ensure both custom_categories and expenses tables are updated together
 */
export async function updateCustomCategoryWithCascade(
  db: SQLite.SQLiteDatabase,
  id: string,
  category: Partial<CustomCategoryInput>
): Promise<CustomCategory> {
  try {
    // Input validation
    if (category.name !== undefined && category.name.trim().length === 0) {
      throw new DatabaseError('Category name cannot be empty', undefined, 'validation');
    }

    const now = Date.now();
    let updatedCategory: CustomCategory | null = null;

    // Use exclusive transaction for atomic multi-table updates
    await db.withExclusiveTransactionAsync(async () => {
      // Build dynamic SQL for custom_categories table update
      const categoryUpdates: string[] = [];
      const categoryValues: any[] = [];

      if (category.name !== undefined) {
        categoryUpdates.push('name = ?');
        categoryValues.push(category.name);
      }
      if (category.icon !== undefined) {
        categoryUpdates.push('icon = ?');
        categoryValues.push(category.icon);
      }
      if (category.color !== undefined) {
        categoryUpdates.push('color = ?');
        categoryValues.push(category.color);
      }

      categoryUpdates.push('updated_at = ?');
      categoryValues.push(now);
      categoryValues.push(id);

      // Update custom_categories table
      await db.runAsync(
        `UPDATE custom_categories SET ${categoryUpdates.join(', ')} WHERE id = ?`,
        categoryValues
      );

      // Build dynamic SQL for expenses table cascade update
      const expenseUpdates: string[] = [];
      const expenseValues: any[] = [];

      if (category.name !== undefined) {
        expenseUpdates.push('category_name = ?');
        expenseValues.push(category.name);
      }
      if (category.icon !== undefined) {
        expenseUpdates.push('category_icon = ?');
        expenseValues.push(category.icon);
      }
      if (category.color !== undefined) {
        expenseUpdates.push('category_color = ?');
        expenseValues.push(category.color);
      }

      // Only cascade to expenses if at least one denormalized field is changing
      if (expenseUpdates.length > 0) {
        expenseUpdates.push('updated_at = ?');
        expenseValues.push(now);
        expenseValues.push(id);

        // Update expenses table with cascading changes
        await db.runAsync(
          `UPDATE expenses SET ${expenseUpdates.join(', ')} WHERE category_id = ?`,
          expenseValues
        );
      }
    });

    // Fetch updated category after transaction commits
    const result = await db.getFirstAsync<CustomCategoryRow>(
      'SELECT * FROM custom_categories WHERE id = ?',
      [id]
    );

    if (!result) {
      throw new DatabaseError('Category not found after update', undefined, 'not_found');
    }

    return rowToCustomCategory(result);
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }

    const sqliteError = error as { code?: number; message?: string };

    // Handle constraint violations (duplicate category name)
    if (sqliteError.code === 19 || sqliteError.code === 2067) {
      throw new DatabaseConstraintError(
        'A category with this name already exists',
        'unique',
        error as Error
      );
    }

    const userMessage = mapSQLiteErrorToUserMessage(sqliteError);

    throw new DatabaseError(
      userMessage,
      sqliteError.code,
      'update_category_cascade',
      error as Error
    );
  }
}

/**
 * Soft delete a custom category (set is_active = 0)
 * Reassigns all expenses from this category to the default "Other" category
 * Uses atomic transaction to ensure both operations succeed or fail together
 */
export async function deleteCustomCategory(
  db: SQLite.SQLiteDatabase,
  id: string
): Promise<void> {
  try {
    await db.withExclusiveTransactionAsync(async () => {
      const now = Date.now();

      // Step 1: Soft delete category
      await db.runAsync(
        'UPDATE custom_categories SET is_active = 0, updated_at = ? WHERE id = ?',
        [now, id]
      );

      // Step 2: Reassign expenses to default "Other" category
      // Default category details (typically category ID "12" for Other)
      const defaultCategory = { id: '12', name: 'Other', icon: 'help-circle', color: '#666666' };
      await db.runAsync(
        `UPDATE expenses
         SET category_id = ?, category_name = ?, category_icon = ?, category_color = ?, updated_at = ?
         WHERE category_id = ?`,
        [defaultCategory.id, defaultCategory.name, defaultCategory.icon, defaultCategory.color, now, id]
      );

      // Both operations commit together or roll back together
    });
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }

    const sqliteError = error as { code?: number; message?: string };
    const userMessage = mapSQLiteErrorToUserMessage(sqliteError);

    throw new DatabaseError(
      userMessage,
      sqliteError.code,
      'delete_category',
      error as Error
    );
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
    if (error instanceof DatabaseError) {
      throw error;
    }

    const sqliteError = error as { code?: number; message?: string };
    const userMessage = mapSQLiteErrorToUserMessage(sqliteError);

    throw new DatabaseError(
      userMessage,
      sqliteError.code,
      'get_expense_count',
      error as Error
    );
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
    if (error instanceof DatabaseError) {
      throw error;
    }

    const sqliteError = error as { code?: number; message?: string };
    const userMessage = mapSQLiteErrorToUserMessage(sqliteError);

    throw new DatabaseError(
      userMessage,
      sqliteError.code,
      'reassign_expenses',
      error as Error
    );
  }
}

/**
 * Validate category positions and repair if gaps or duplicates exist
 * Positions should be sequential starting from 0 (0, 1, 2, 3...)
 * @param db - Database instance
 * @returns Result indicating whether repair was performed
 */
export async function validateAndRepairPositions(
  db: SQLite.SQLiteDatabase
): Promise<{ repaired: boolean; message: string }> {
  try {
    // Load all active categories ordered by position
    const categories = await db.getAllAsync<{ id: string; position: number }>(
      'SELECT id, position FROM custom_categories WHERE is_active = 1 ORDER BY position ASC'
    );

    // Check if positions are sequential (0, 1, 2, 3...)
    const needsRepair = categories.some((cat, index) => cat.position !== index);

    if (!needsRepair) {
      return { repaired: false, message: 'Positions are valid' };
    }

    // Repair positions: renumber all categories sequentially
    const now = Date.now();
    await db.withExclusiveTransactionAsync(async () => {
      for (let i = 0; i < categories.length; i++) {
        await db.runAsync(
          'UPDATE custom_categories SET position = ?, updated_at = ? WHERE id = ?',
          [i, now, categories[i].id]
        );
      }
    });

    return {
      repaired: true,
      message: `Repaired ${categories.length} category positions`,
    };
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }

    const sqliteError = error as { code?: number; message?: string };
    const userMessage = mapSQLiteErrorToUserMessage(sqliteError);

    throw new DatabaseError(
      userMessage,
      sqliteError.code,
      'validate_positions',
      error as Error
    );
  }
}

/**
 * Reorder categories by updating their positions
 * Uses atomic transaction to ensure all position updates succeed together
 * @param db - Database instance
 * @param categoryIds - Array of category IDs in the desired order
 */
export async function reorderCategories(
  db: SQLite.SQLiteDatabase,
  categoryIds: string[]
): Promise<void> {
  try {
    // Validate input: ensure no duplicates
    const uniqueIds = new Set(categoryIds);
    if (uniqueIds.size !== categoryIds.length) {
      throw new DatabaseError(
        'Duplicate category IDs in reorder list',
        undefined,
        'validation'
      );
    }

    const now = Date.now();

    // Use exclusive transaction for atomic updates
    await db.withExclusiveTransactionAsync(async () => {
      for (let i = 0; i < categoryIds.length; i++) {
        await db.runAsync(
          'UPDATE custom_categories SET position = ?, updated_at = ? WHERE id = ?',
          [i, now, categoryIds[i]]
        );
      }
    });
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }

    const sqliteError = error as { code?: number; message?: string };
    const userMessage = mapSQLiteErrorToUserMessage(sqliteError);

    throw new DatabaseError(
      userMessage,
      sqliteError.code,
      'reorder_categories',
      error as Error
    );
  }
}
