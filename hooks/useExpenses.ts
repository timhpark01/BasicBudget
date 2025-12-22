import { useState, useEffect, useCallback } from 'react';
import * as SQLite from 'expo-sqlite';
import { Expense, ExpenseInput } from '@/types/database';
import { getDatabase } from '@/lib/db/core/database';
import {
  createExpense,
  getAllExpenses,
  updateExpense as updateExpenseDb,
  deleteExpense as deleteExpenseDb,
} from '@/lib/db/models/expenses';
import { seedSampleData } from '@/lib/utils/seed-data';

export interface UseExpensesReturn {
  expenses: Expense[];
  loading: boolean;
  error: Error | null;
  addExpense: (expense: ExpenseInput) => Promise<void>;
  updateExpense: (id: string, expense: Partial<ExpenseInput>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  duplicateExpense: (expense: Expense) => Promise<void>;
  refreshExpenses: () => Promise<void>;
}

export function useExpenses(): UseExpensesReturn {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);

  // Initialize database and load expenses on mount
  useEffect(() => {
    async function init() {
      try {
        const database = await getDatabase();
        setDb(database);

        // Seed sample data in development mode
        if (__DEV__) {
          await seedSampleData(database);
        }

        await loadExpenses(database);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // Load all expenses from database
  async function loadExpenses(database: SQLite.SQLiteDatabase) {
    try {
      const loadedExpenses = await getAllExpenses(database);
      setExpenses(loadedExpenses);
      setError(null);
    } catch (err) {
      setError(err as Error);
    }
  }

  // Add a new expense
  const addExpense = useCallback(async (expense: ExpenseInput): Promise<void> => {
    if (!db) throw new Error('Database not initialized');

    try {
      // Optimistic update: add to UI immediately
      const newExpense = await createExpense(db, expense);
      setExpenses((prev) => [newExpense, ...prev]);
      setError(null);
    } catch (err) {
      // Rollback on error
      await loadExpenses(db);
      throw err;
    }
  }, [db]);

  // Update an existing expense
  const updateExpense = useCallback(async (
    id: string,
    expense: Partial<ExpenseInput>
  ): Promise<void> => {
    if (!db) throw new Error('Database not initialized');

    try {
      // Optimistic update
      const updated = await updateExpenseDb(db, id, expense);
      setExpenses((prev) =>
        prev.map((e) => (e.id === id ? updated : e))
      );
      setError(null);
    } catch (err) {
      // Rollback on error
      await loadExpenses(db);
      throw err;
    }
  }, [db]);

  // Delete an expense
  const deleteExpense = useCallback(async (id: string): Promise<void> => {
    if (!db) throw new Error('Database not initialized');

    try {
      // Optimistic update: remove from UI immediately
      setExpenses((prev) => prev.filter((e) => e.id !== id));
      await deleteExpenseDb(db, id);
      setError(null);
    } catch (err) {
      // Rollback on error
      await loadExpenses(db);
      throw err;
    }
  }, [db]);

  // Duplicate an existing expense
  const duplicateExpense = useCallback(async (expense: Expense): Promise<void> => {
    if (!db) throw new Error('Database not initialized');

    try {
      // Create new expense with same data but new ID and current timestamp
      const duplicated: ExpenseInput = {
        amount: expense.amount,
        category: expense.category,
        date: new Date(), // Use current date/time
        note: expense.note ? `${expense.note} (copy)` : '',
      };

      await addExpense(duplicated);
      setError(null);
    } catch (err) {
      // Error already handled by addExpense
      throw err;
    }
  }, [db, addExpense]);

  // Refresh expenses from database
  const refreshExpenses = useCallback(async (): Promise<void> => {
    if (!db) return; // Skip if database not yet initialized

    setLoading(true);
    try {
      await loadExpenses(db);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [db]);

  return {
    expenses,
    loading,
    error,
    addExpense,
    updateExpense,
    deleteExpense,
    duplicateExpense,
    refreshExpenses,
  };
}
