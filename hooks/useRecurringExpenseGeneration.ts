import { useEffect, useCallback } from 'react';
import * as SQLite from 'expo-sqlite';
import { getDatabase } from '@/lib/db/core/database';
import { generateDueRecurringExpenses } from '@/lib/services/recurring-expense-generator';

export interface UseRecurringExpenseGenerationOptions {
  onGenerationComplete?: (generated: number) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook to automatically generate due recurring expense instances
 * Triggers on mount and when dependencies change
 */
export function useRecurringExpenseGeneration(
  refreshExpenses: () => Promise<void>,
  options: UseRecurringExpenseGenerationOptions = {}
): {
  generateNow: () => Promise<void>;
} {
  const { onGenerationComplete, onError } = options;

  // Generate recurring expenses
  const generateNow = useCallback(async () => {
    try {
      const db = await getDatabase();
      const result = await generateDueRecurringExpenses(db);

      // Refresh expenses list if any were generated
      if (result.generated > 0) {
        await refreshExpenses();
      }

      // Notify callback if provided
      if (onGenerationComplete) {
        onGenerationComplete(result.generated);
      }
    } catch (error) {
      console.error('Failed to generate recurring expenses:', error);
      if (onError) {
        onError(error as Error);
      }
    }
  }, [refreshExpenses, onGenerationComplete, onError]);

  // Auto-generate on mount (app startup)
  useEffect(() => {
    generateNow();
  }, [generateNow]);

  return {
    generateNow,
  };
}
