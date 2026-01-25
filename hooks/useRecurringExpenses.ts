import { useState, useEffect, useCallback } from 'react';
import * as SQLite from 'expo-sqlite';
import { RecurringExpense, RecurringExpenseInput } from '@/types/database';
import { getDatabase } from '@/lib/db/core/database';
import {
  createRecurringExpense,
  getAllRecurringExpenses,
  updateRecurringExpense as updateRecurringExpenseDb,
  deleteRecurringExpense as deleteRecurringExpenseDb,
  deleteGeneratedExpenses,
  toggleRecurringExpenseActive as toggleRecurringExpenseActiveDb,
} from '@/lib/db/models/recurring-expenses';

export interface UseRecurringExpensesReturn {
  recurringExpenses: RecurringExpense[];
  loading: boolean;
  error: Error | null;
  addRecurringExpense: (expense: RecurringExpenseInput) => Promise<void>;
  updateRecurringExpense: (id: string, expense: Partial<RecurringExpenseInput>) => Promise<void>;
  deleteRecurringExpense: (id: string, deleteGenerated?: boolean) => Promise<void>;
  toggleActive: (id: string, isActive: boolean) => Promise<void>;
  refreshRecurringExpenses: () => Promise<void>;
}

export function useRecurringExpenses(): UseRecurringExpensesReturn {
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);

  // Initialize database and load recurring expenses on mount
  useEffect(() => {
    async function init() {
      try {
        const database = await getDatabase();
        setDb(database);

        await loadRecurringExpenses(database);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // Load all recurring expenses from database
  async function loadRecurringExpenses(database: SQLite.SQLiteDatabase) {
    try {
      const loaded = await getAllRecurringExpenses(database);
      setRecurringExpenses(loaded);
      setError(null);
    } catch (err) {
      setError(err as Error);
    }
  }

  // Add a new recurring expense
  const addRecurringExpense = useCallback(
    async (expense: RecurringExpenseInput): Promise<void> => {
      if (!db) throw new Error('Database not initialized');

      try {
        // Optimistic update: add to UI immediately
        const newRecurring = await createRecurringExpense(db, expense);
        setRecurringExpenses((prev) => [newRecurring, ...prev]);
        setError(null);
      } catch (err) {
        // Rollback on error
        await loadRecurringExpenses(db);
        throw err;
      }
    },
    [db]
  );

  // Update an existing recurring expense
  const updateRecurringExpense = useCallback(
    async (id: string, expense: Partial<RecurringExpenseInput>): Promise<void> => {
      if (!db) throw new Error('Database not initialized');

      try {
        // Optimistic update
        const updated = await updateRecurringExpenseDb(db, id, expense);
        setRecurringExpenses((prev) => prev.map((e) => (e.id === id ? updated : e)));
        setError(null);
      } catch (err) {
        // Rollback on error
        await loadRecurringExpenses(db);
        throw err;
      }
    },
    [db]
  );

  // Delete a recurring expense
  const deleteRecurringExpense = useCallback(
    async (id: string, deleteGenerated: boolean = false): Promise<void> => {
      if (!db) throw new Error('Database not initialized');

      try {
        // Optimistic update: remove from UI immediately
        setRecurringExpenses((prev) => prev.filter((e) => e.id !== id));

        // Delete generated expenses if requested
        if (deleteGenerated) {
          await deleteGeneratedExpenses(db, id);
        }

        // Delete the recurring expense pattern
        await deleteRecurringExpenseDb(db, id);
        setError(null);
      } catch (err) {
        // Rollback on error
        await loadRecurringExpenses(db);
        throw err;
      }
    },
    [db]
  );

  // Toggle active status
  const toggleActive = useCallback(
    async (id: string, isActive: boolean): Promise<void> => {
      if (!db) throw new Error('Database not initialized');

      try {
        // Optimistic update
        setRecurringExpenses((prev) =>
          prev.map((e) => (e.id === id ? { ...e, isActive } : e))
        );

        await toggleRecurringExpenseActiveDb(db, id, isActive);
        setError(null);
      } catch (err) {
        // Rollback on error
        await loadRecurringExpenses(db);
        throw err;
      }
    },
    [db]
  );

  // Refresh recurring expenses from database
  const refreshRecurringExpenses = useCallback(async (): Promise<void> => {
    if (!db) return; // Skip if database not yet initialized

    setLoading(true);
    try {
      await loadRecurringExpenses(db);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [db]);

  return {
    recurringExpenses,
    loading,
    error,
    addRecurringExpense,
    updateRecurringExpense,
    deleteRecurringExpense,
    toggleActive,
    refreshRecurringExpenses,
  };
}
