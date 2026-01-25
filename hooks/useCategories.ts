import { useState, useEffect, useCallback, useMemo } from 'react';
import * as SQLite from 'expo-sqlite';
import { Category, CustomCategory, CustomCategoryInput } from '@/types/database';
import { getDatabase } from '@/lib/db/core/database';
import {
  getCustomCategories,
  createCustomCategory,
  updateCustomCategory,
  updateCustomCategoryWithCascade,
  deleteCustomCategory,
  getExpenseCountByCategory,
  reassignExpensesToCategory,
  reorderCategories as reorderCategoriesDb,
} from '@/lib/db/models/categories';

export interface UseCategoriesReturn {
  allCategories: Category[];
  customCategories: CustomCategory[];
  loading: boolean;
  error: Error | null;
  addCategory: (category: CustomCategoryInput) => Promise<void>;
  updateCategory: (id: string, category: Partial<CustomCategoryInput>) => Promise<void>;
  deleteCategory: (id: string, force?: boolean) => Promise<boolean>;
  reorderCategories: (categoryIds: string[]) => Promise<void>;
  refreshCategories: () => Promise<void>;
}

const MAX_CUSTOM_CATEGORIES = 20;

export function useCategories(
  options?: { onCategoryChanged?: (categoryId: string) => Promise<void> }
): UseCategoriesReturn {
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);

  // Initialize database and load custom categories
  useEffect(() => {
    async function init() {
      try {
        const database = await getDatabase();
        setDb(database);
        await loadCustomCategories(database);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // Load custom categories from database
  async function loadCustomCategories(database: SQLite.SQLiteDatabase) {
    try {
      const loaded = await getCustomCategories(database);
      setCustomCategories(loaded);
      setError(null);
    } catch (err) {
      setError(err as Error);
    }
  }

  // All categories are now in the database (including former defaults)
  const allCategories = useMemo(() => {
    return customCategories;
  }, [customCategories]);

  // Add a new custom category
  const addCategory = useCallback(
    async (category: CustomCategoryInput): Promise<void> => {
      if (!db) throw new Error('Database not initialized');

      // Check limit
      if (customCategories.length >= MAX_CUSTOM_CATEGORIES) {
        throw new Error(
          `You can only have up to ${MAX_CUSTOM_CATEGORIES} custom categories.`
        );
      }

      // Check for duplicate name
      const nameExists = allCategories.some(
        (c) => c.name.toLowerCase() === category.name.toLowerCase()
      );
      if (nameExists) {
        throw new Error('A category with this name already exists.');
      }

      try {
        const newCategory = await createCustomCategory(db, category);
        setCustomCategories((prev) => [newCategory, ...prev]);
        setError(null);
      } catch (err) {
        await loadCustomCategories(db);
        throw err;
      }
    },
    [db, customCategories, allCategories]
  );

  // Update an existing category
  const updateCategory = useCallback(
    async (id: string, category: Partial<CustomCategoryInput>): Promise<void> => {
      if (!db) throw new Error('Database not initialized');

      // Protect "Unlabeled" category from being renamed or having icon/color changed
      const categoryToUpdate = allCategories.find((c) => c.id === id);
      if (id === '6' || categoryToUpdate?.name === 'Unlabeled') {
        if (category.name && category.name !== 'Unlabeled') {
          throw new Error('Cannot rename the "Unlabeled" category.');
        }
        if (category.icon !== undefined || category.color !== undefined) {
          throw new Error('Cannot change the icon or color of the "Unlabeled" category.');
        }
      }

      // Check for duplicate name if name is being updated
      if (category.name) {
        const nameExists = allCategories.some(
          (c) => c.id !== id && c.name.toLowerCase() === category.name!.toLowerCase()
        );
        if (nameExists) {
          throw new Error('A category with this name already exists.');
        }
      }

      try {
        const updated = await updateCustomCategoryWithCascade(db, id, category);
        setCustomCategories((prev) =>
          prev.map((c) => (c.id === id ? updated : c))
        );
        setError(null);

        // Trigger cache invalidation callback if provided
        if (options?.onCategoryChanged) {
          await options.onCategoryChanged(id);
        }
      } catch (err) {
        await loadCustomCategories(db);
        throw err;
      }
    },
    [db, allCategories, options]
  );

  // Delete a category
  // Returns true if deleted, false if user needs to reassign expenses first
  // If force=true, deletes regardless of expenses (with automatic reassignment)
  const deleteCategory = useCallback(
    async (id: string, force: boolean = false): Promise<boolean> => {
      if (!db) throw new Error('Database not initialized');

      // Protect "Unlabeled" category from deletion (used for reassignment)
      const categoryToDelete = allCategories.find((c) => c.id === id);
      if (id === '6' || categoryToDelete?.name === 'Unlabeled') {
        throw new Error('Cannot delete the "Unlabeled" category.');
      }

      try {
        // Check if any expenses use this category (unless forced)
        if (!force) {
          const expenseCount = await getExpenseCountByCategory(db, id);

          if (expenseCount > 0) {
            // Return false to indicate expenses need to be reassigned
            return false;
          }
        }

        // Delete (with automatic reassignment if needed)
        await deleteCustomCategory(db, id);
        setCustomCategories((prev) => prev.filter((c) => c.id !== id));
        setError(null);
        return true;
      } catch (err) {
        await loadCustomCategories(db);
        throw err;
      }
    },
    [db, allCategories]
  );

  // Reassign expenses and delete category
  const reassignAndDelete = useCallback(
    async (fromCategoryId: string): Promise<void> => {
      if (!db) throw new Error('Database not initialized');

      try {
        // Find "Unlabeled" category as the default reassignment target
        const unlabeledCategory = allCategories.find((c) => c.name === 'Unlabeled');
        if (!unlabeledCategory) {
          throw new Error('Unlabeled category not found');
        }

        // Reassign all expenses to "Unlabeled"
        await reassignExpensesToCategory(db, fromCategoryId, unlabeledCategory);

        // Now delete the category
        await deleteCustomCategory(db, fromCategoryId);
        setCustomCategories((prev) => prev.filter((c) => c.id !== fromCategoryId));
        setError(null);
      } catch (err) {
        await loadCustomCategories(db);
        throw err;
      }
    },
    [db, allCategories]
  );

  // Refresh categories from database
  const refreshCategories = useCallback(async (): Promise<void> => {
    if (!db) return;

    setLoading(true);
    try {
      await loadCustomCategories(db);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [db]);

  // Reorder categories
  const reorderCategories = useCallback(
    async (categoryIds: string[]): Promise<void> => {
      if (!db) throw new Error('Database not initialized');

      try {
        // Optimistically update UI
        const reordered = categoryIds
          .map((id) => customCategories.find((c) => c.id === id))
          .filter((c): c is CustomCategory => c !== undefined);

        setCustomCategories(reordered);

        // Persist to database
        await reorderCategoriesDb(db, categoryIds);
        setError(null);
      } catch (err) {
        // Rollback on error
        await loadCustomCategories(db);
        throw err;
      }
    },
    [db, customCategories]
  );

  return {
    allCategories,
    customCategories,
    loading,
    error,
    addCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
    refreshCategories,
  };
}
