import { useState, useEffect } from 'react';
import * as SQLite from 'expo-sqlite';
import { Expense, ExpenseInput } from '@/types/database';
import { getDatabase } from '@/lib/database';
import {
  createExpense,
  getAllExpenses,
  updateExpense as updateExpenseDb,
  deleteExpense as deleteExpenseDb,
} from '@/lib/expenses-db';
import { seedSampleData } from '@/lib/seed-data';

export interface UseExpensesReturn {
  expenses: Expense[];
  loading: boolean;
  error: Error | null;
  addExpense: (expense: ExpenseInput) => Promise<void>;
  updateExpense: (id: string, expense: Partial<ExpenseInput>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
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
  async function addExpense(expense: ExpenseInput): Promise<void> {
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
  }

  // Update an existing expense
  async function updateExpense(
    id: string,
    expense: Partial<ExpenseInput>
  ): Promise<void> {
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
  }

  // Delete an expense
  async function deleteExpense(id: string): Promise<void> {
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
  }

  // Refresh expenses from database
  async function refreshExpenses(): Promise<void> {
    if (!db) throw new Error('Database not initialized');

    setLoading(true);
    try {
      await loadExpenses(db);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }

  return {
    expenses,
    loading,
    error,
    addExpense,
    updateExpense,
    deleteExpense,
    refreshExpenses,
  };
}
