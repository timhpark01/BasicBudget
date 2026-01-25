import * as SQLite from 'expo-sqlite';
import { RecurringExpense, Expense } from '@/types/database';
import {
  getAllRecurringExpenses,
  updateLastGeneratedDate,
} from '@/lib/db/models/recurring-expenses';
import { createExpense } from '@/lib/db/models/expenses';

export interface GenerationResult {
  generated: number;
  errors: Array<{ recurringId: string; error: string }>;
}

/**
 * Check if a year is a leap year
 */
function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Get the last day of a month (handles Feb 28/29, and 30-day months)
 */
function getLastDayOfMonth(year: number, month: number): number {
  // month is 0-indexed (0=Jan, 1=Feb, etc.)
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Calculate the next occurrence date for a recurring expense
 * Returns null if no more occurrences (past end date or invalid)
 */
export function calculateNextOccurrence(
  recurring: RecurringExpense,
  fromDate: Date
): Date | null {
  const { frequency, dayOfWeek, dayOfMonth, monthOfYear, endDate } = recurring;

  let nextDate = new Date(fromDate);
  nextDate.setHours(0, 0, 0, 0); // Reset to midnight

  switch (frequency) {
    case 'daily':
      // Add 1 day
      nextDate.setDate(nextDate.getDate() + 1);
      break;

    case 'weekly':
      if (dayOfWeek === undefined) return null;

      // Calculate days until next occurrence of dayOfWeek
      const currentDay = nextDate.getDay();
      const daysUntilNext = (dayOfWeek - currentDay + 7) % 7;
      const daysToAdd = daysUntilNext === 0 ? 7 : daysUntilNext; // If today, schedule for next week
      nextDate.setDate(nextDate.getDate() + daysToAdd);
      break;

    case 'monthly':
      if (dayOfMonth === undefined) return null;

      // Move to next month
      nextDate.setMonth(nextDate.getMonth() + 1);

      // Handle edge case: day of month doesn't exist in target month
      const lastDay = getLastDayOfMonth(nextDate.getFullYear(), nextDate.getMonth());
      const targetDay = Math.min(dayOfMonth, lastDay);
      nextDate.setDate(targetDay);
      break;

    case 'yearly':
      if (dayOfMonth === undefined || monthOfYear === undefined) return null;

      // Move to next year
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      nextDate.setMonth(monthOfYear - 1); // monthOfYear is 1-12, setMonth expects 0-11

      // Special handling for Feb 29 (leap day)
      if (monthOfYear === 2 && dayOfMonth === 29) {
        // Only generate on leap years
        if (!isLeapYear(nextDate.getFullYear())) {
          return null; // Skip non-leap years
        }
        nextDate.setDate(29);
      } else {
        // Handle edge case: day doesn't exist in month (e.g., Feb 31)
        const lastDay = getLastDayOfMonth(nextDate.getFullYear(), nextDate.getMonth());
        const targetDay = Math.min(dayOfMonth, lastDay);
        nextDate.setDate(targetDay);
      }
      break;

    default:
      return null;
  }

  // Check if next occurrence is past end date
  if (endDate && nextDate > endDate) {
    return null;
  }

  return nextDate;
}

/**
 * Generate a single expense instance from a recurring pattern
 */
async function generateExpenseInstance(
  db: SQLite.SQLiteDatabase,
  recurring: RecurringExpense,
  occurrenceDate: Date
): Promise<Expense> {
  return createExpense(
    db,
    {
      amount: recurring.amount,
      category: recurring.category,
      date: occurrenceDate,
      note: recurring.note,
    },
    recurring.id // Pass recurring expense ID as parent link
  );
}

/**
 * Generate all due recurring expense instances
 * This function is called on app startup and periodically to generate expenses
 */
export async function generateDueRecurringExpenses(
  db: SQLite.SQLiteDatabase
): Promise<GenerationResult> {
  const result: GenerationResult = {
    generated: 0,
    errors: [],
  };

  try {
    // Get all active recurring expenses
    const recurringExpenses = await getAllRecurringExpenses(db, false);

    const now = new Date();
    now.setHours(0, 0, 0, 0); // Reset to midnight for comparison

    for (const recurring of recurringExpenses) {
      try {
        // Determine the last date we generated an expense for this pattern
        const lastGenerated = recurring.lastGeneratedDate || recurring.startDate;

        // If start date is in the future, skip
        if (recurring.startDate > now) {
          continue;
        }

        // Generate all missed occurrences between lastGenerated and now
        let currentDate = new Date(lastGenerated);
        currentDate.setHours(0, 0, 0, 0);

        // Safety limit: don't generate more than 365 instances at once
        let generationCount = 0;
        const MAX_GENERATIONS = 365;

        while (generationCount < MAX_GENERATIONS) {
          // Calculate next occurrence
          const nextOccurrence = calculateNextOccurrence(recurring, currentDate);

          // If no more occurrences or next is in the future, stop
          if (!nextOccurrence || nextOccurrence > now) {
            break;
          }

          // Generate the expense instance
          await generateExpenseInstance(db, recurring, nextOccurrence);

          // Update current date and last generated
          currentDate = nextOccurrence;
          await updateLastGeneratedDate(db, recurring.id, nextOccurrence);

          result.generated++;
          generationCount++;
        }

        if (generationCount >= MAX_GENERATIONS) {
          console.warn(`⚠️  Reached maximum generation limit for recurring expense ${recurring.id}`);
        }
      } catch (error) {
        // Log error but continue with other recurring expenses
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push({
          recurringId: recurring.id,
          error: errorMessage,
        });
        console.error(`❌ Failed to generate expenses for recurring ${recurring.id}:`, errorMessage);
      }
    }

    if (result.generated > 0) {
      console.log(`✅ Generated ${result.generated} recurring expense instances`);
    }

    if (result.errors.length > 0) {
      console.warn(`⚠️  ${result.errors.length} recurring expenses failed to generate`);
    }

    return result;
  } catch (error) {
    console.error('❌ Failed to generate recurring expenses:', error);
    throw error;
  }
}

/**
 * Get the next occurrence date for a recurring expense (for display purposes)
 */
export function getNextOccurrenceDate(recurring: RecurringExpense): Date | null {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // If start date is in the future, return start date
  if (recurring.startDate > now) {
    return recurring.startDate;
  }

  // Calculate from last generated or start date
  const fromDate = recurring.lastGeneratedDate || recurring.startDate;

  return calculateNextOccurrence(recurring, fromDate);
}
