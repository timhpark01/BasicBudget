import { useState, useEffect, useCallback, useMemo } from 'react';
import * as SQLite from 'expo-sqlite';
import { Category, CustomCategory, CustomCategoryInput } from '@/types/database';
import { getDatabase } from '@/lib/database';
import { CATEGORIES } from '@/constants/categories';
import {
  getCustomCategories,
  createCustomCategory,
  updateCustomCategory,
  deleteCustomCategory,
  getExpenseCountByCategory,
  reassignExpensesToCategory,
} from '@/lib/categories-db';

export interface UseCategoriesReturn {
  allCategories: Category[];
  customCategories: CustomCategory[];
  loading: boolean;
  error: Error | null;
  addCategory: (category: CustomCategoryInput) => Promise<void>;
  updateCategory: (id: string, category: Partial<CustomCategoryInput>) => Promise<void>;
  deleteCategory: (id: string) => Promise<boolean>;
  refreshCategories: () => Promise<void>;
}

const MAX_CUSTOM_CATEGORIES = 20;

export function useCategories(): UseCategoriesReturn {
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

  // Merge default + custom categories
  const allCategories = useMemo(() => {
    return [...CATEGORIES, ...customCategories];
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

  // Update an existing custom category
  const updateCategory = useCallback(
    async (id: string, category: Partial<CustomCategoryInput>): Promise<void> => {
      if (!db) throw new Error('Database not initialized');

      // Check if trying to update a default category
      const isDefaultCategory = CATEGORIES.some((c) => c.id === id);
      if (isDefaultCategory) {
        throw new Error('Cannot edit default categories.');
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
        const updated = await updateCustomCategory(db, id, category);
        setCustomCategories((prev) =>
          prev.map((c) => (c.id === id ? updated : c))
        );
        setError(null);
      } catch (err) {
        await loadCustomCategories(db);
        throw err;
      }
    },
    [db, allCategories]
  );

  // Delete a custom category
  // Returns true if deleted, false if user needs to reassign expenses first
  const deleteCategory = useCallback(
    async (id: string): Promise<boolean> => {
      if (!db) throw new Error('Database not initialized');

      // Check if trying to delete a default category
      const isDefaultCategory = CATEGORIES.some((c) => c.id === id);
      if (isDefaultCategory) {
        throw new Error('Cannot delete default categories.');
      }

      try {
        // Check if any expenses use this category
        const expenseCount = await getExpenseCountByCategory(db, id);

        if (expenseCount > 0) {
          // Return false to indicate expenses need to be reassigned
          return false;
        }

        // No expenses, safe to delete
        await deleteCustomCategory(db, id);
        setCustomCategories((prev) => prev.filter((c) => c.id !== id));
        setError(null);
        return true;
      } catch (err) {
        await loadCustomCategories(db);
        throw err;
      }
    },
    [db]
  );

  // Reassign expenses and delete category
  const reassignAndDelete = useCallback(
    async (fromCategoryId: string): Promise<void> => {
      if (!db) throw new Error('Database not initialized');

      try {
        // Find "Other" category as the default reassignment target
        const otherCategory = CATEGORIES.find((c) => c.name === 'Other');
        if (!otherCategory) {
          throw new Error('Other category not found');
        }

        // Reassign all expenses to "Other"
        await reassignExpensesToCategory(db, fromCategoryId, otherCategory);

        // Now delete the category
        await deleteCustomCategory(db, fromCategoryId);
        setCustomCategories((prev) => prev.filter((c) => c.id !== fromCategoryId));
        setError(null);
      } catch (err) {
        await loadCustomCategories(db);
        throw err;
      }
    },
    [db]
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

  return {
    allCategories,
    customCategories,
    loading,
    error,
    addCategory,
    updateCategory,
    deleteCategory,
    refreshCategories,
  };
}
