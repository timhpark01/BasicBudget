import { useState, useEffect, useCallback } from 'react';
import * as SQLite from 'expo-sqlite';
import { CategoryBudget, CategoryBudgetInput } from '@/types/database';
import { getDatabase } from '@/lib/db/core/database';
import {
  getCategoryBudgetsForMonth,
  setCategoryBudget as setCategoryBudgetDb,
  deleteCategoryBudget as deleteCategoryBudgetDb,
} from '@/lib/db/models/category-budgets';

export interface UseCategoryBudgetsReturn {
  categoryBudgets: CategoryBudget[];
  loading: boolean;
  error: Error | null;
  setCategoryBudget: (categoryId: string, budgetAmount: string) => Promise<void>;
  deleteCategoryBudget: (categoryId: string) => Promise<void>;
  refreshCategoryBudgets: () => Promise<void>;
  getCategoryBudgetAmount: (categoryId: string) => string | null;
}

/**
 * Hook for managing category budgets for a specific month
 * @param month Month in "YYYY-MM" format
 * @returns Category budgets state and operations
 */
export function useCategoryBudgets(month: string): UseCategoryBudgetsReturn {
  const [categoryBudgets, setCategoryBudgetsState] = useState<CategoryBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);

  // Initialize database and load category budgets on mount or when month changes
  useEffect(() => {
    setLoading(true); // Set loading true at the start of month change
    async function init() {
      try {
        const database = await getDatabase();
        setDb(database);
        await loadCategoryBudgets(database, month);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [month]);

  // Load category budgets for the specified month
  async function loadCategoryBudgets(database: SQLite.SQLiteDatabase, monthKey: string) {
    try {
      const budgets = await getCategoryBudgetsForMonth(database, monthKey);
      setCategoryBudgetsState(budgets);
      setError(null);
    } catch (err) {
      setError(err as Error);
    }
  }

  // Set (create or update) category budget for the current month
  const setCategoryBudget = useCallback(
    async (categoryId: string, budgetAmount: string): Promise<void> => {
      if (!db) throw new Error('Database not initialized');

      try {
        const budgetInput: CategoryBudgetInput = {
          month,
          categoryId,
          budgetAmount,
        };

        // Optimistic update
        const updatedBudget = await setCategoryBudgetDb(db, budgetInput);

        // Update state
        setCategoryBudgetsState((prev) => {
          const existingIndex = prev.findIndex(
            (b) => b.categoryId === categoryId && b.month === month
          );
          if (existingIndex >= 0) {
            // Update existing
            const newBudgets = [...prev];
            newBudgets[existingIndex] = updatedBudget;
            return newBudgets;
          } else {
            // Add new
            return [...prev, updatedBudget];
          }
        });

        setError(null);
      } catch (err) {
        // Rollback on error
        await loadCategoryBudgets(db, month);
        throw err;
      }
    },
    [db, month]
  );

  // Delete category budget
  const deleteCategoryBudget = useCallback(
    async (categoryId: string): Promise<void> => {
      if (!db) throw new Error('Database not initialized');

      try {
        await deleteCategoryBudgetDb(db, month, categoryId);

        // Update state
        setCategoryBudgetsState((prev) =>
          prev.filter((b) => !(b.categoryId === categoryId && b.month === month))
        );

        setError(null);
      } catch (err) {
        // Rollback on error
        await loadCategoryBudgets(db, month);
        throw err;
      }
    },
    [db, month]
  );

  // Refresh category budgets from database
  const refreshCategoryBudgets = useCallback(async (): Promise<void> => {
    if (!db) return; // Skip if database not yet initialized

    setLoading(true);
    try {
      await loadCategoryBudgets(db, month);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [db, month]);

  // Helper to get budget amount for a specific category
  const getCategoryBudgetAmount = useCallback(
    (categoryId: string): string | null => {
      const budget = categoryBudgets.find(
        (b) => b.categoryId === categoryId && b.month === month
      );
      return budget ? budget.budgetAmount : null;
    },
    [categoryBudgets, month]
  );

  return {
    categoryBudgets,
    loading,
    error,
    setCategoryBudget,
    deleteCategoryBudget,
    refreshCategoryBudgets,
    getCategoryBudgetAmount,
  };
}
