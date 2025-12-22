import { getBudgetForMonth, setBudgetForMonth as setBudgetDb } from '@/lib/db/models/budgets';
import { getDatabase } from '@/lib/db/core/database';
import { Budget, BudgetInput } from '@/types/database';
import * as SQLite from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';

export interface UseBudgetReturn {
  budget: Budget | null;
  loading: boolean;
  error: Error | null;
  setBudget: (budgetAmount: string) => Promise<void>;
  refreshBudget: () => Promise<void>;
}

/**
 * Hook for managing budget for a specific month
 * @param month Month in "YYYY-MM" format
 * @returns Budget state and operations
 */
export function useBudget(month: string): UseBudgetReturn {
  const [budget, setBudgetState] = useState<Budget | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);

  // Initialize database and load budget on mount or when month changes
  useEffect(() => {
    setLoading(true); // Set loading true at the start of month change
    async function init() {
      try {
        const database = await getDatabase();
        setDb(database);
        await loadBudget(database, month);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [month]);

  // Load budget for the specified month
  async function loadBudget(database: SQLite.SQLiteDatabase, monthKey: string) {
    try {
      const loadedBudget = await getBudgetForMonth(database, monthKey);
      setBudgetState(loadedBudget);
      setError(null);
    } catch (err) {
      setError(err as Error);
    }
  }

  // Set (create or update) budget for the current month
  const setBudget = useCallback(async (budgetAmount: string): Promise<void> => {
    if (!db) throw new Error('Database not initialized');

    try {
      const budgetInput: BudgetInput = {
        month,
        budgetAmount,
      };

      // Optimistic update
      const updatedBudget = await setBudgetDb(db, budgetInput);
      setBudgetState(updatedBudget);
      setError(null);
    } catch (err) {
      // Rollback on error
      await loadBudget(db, month);
      throw err;
    }
  }, [db, month]);

  // Refresh budget from database
  const refreshBudget = useCallback(async (): Promise<void> => {
    if (!db) return; // Skip if database not yet initialized

    setLoading(true);
    try {
      await loadBudget(db, month);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [db, month]);

  return {
    budget,
    loading,
    error,
    setBudget,
    refreshBudget,
  };
}
