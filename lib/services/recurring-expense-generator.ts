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

  // Normalize fromDate to midnight for consistent date comparisons
  const normalizedFromDate = new Date(fromDate);
  normalizedFromDate.setHours(0, 0, 0, 0);

  let nextDate = new Date(normalizedFromDate);
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

      // Try the target day in the current month first
      const currentMonth = nextDate.getMonth();
      const currentYear = nextDate.getFullYear();
      const lastDayThisMonth = getLastDayOfMonth(currentYear, currentMonth);
      const targetDayThisMonth = Math.min(dayOfMonth, lastDayThisMonth);

      const candidateThisMonth = new Date(currentYear, currentMonth, targetDayThisMonth);
      candidateThisMonth.setHours(0, 0, 0, 0);

      // If target day this month is after normalizedFromDate, use it
      if (candidateThisMonth > normalizedFromDate) {
        nextDate = candidateThisMonth;
      } else {
        // Otherwise, move to next month
        nextDate.setMonth(nextDate.getMonth() + 1);
        const lastDayNextMonth = getLastDayOfMonth(nextDate.getFullYear(), nextDate.getMonth());
        const targetDayNextMonth = Math.min(dayOfMonth, lastDayNextMonth);
        nextDate.setDate(targetDayNextMonth);
      }
      break;

    case 'yearly':
      if (dayOfMonth === undefined || monthOfYear === undefined) return null;

      // Try the target date in the current year first
      const currentYearForYearly = nextDate.getFullYear();
      const targetMonth = monthOfYear - 1; // monthOfYear is 1-12, setMonth expects 0-11

      // Handle Feb 29 (leap day) for current year
      let candidateThisYear: Date;
      if (monthOfYear === 2 && dayOfMonth === 29) {
        if (isLeapYear(currentYearForYearly)) {
          candidateThisYear = new Date(currentYearForYearly, targetMonth, 29);
        } else {
          // Feb 29 doesn't exist this year, skip to next year
          candidateThisYear = new Date(normalizedFromDate);
          candidateThisYear.setTime(normalizedFromDate.getTime() - 1); // Make it earlier than normalizedFromDate
        }
      } else {
        const lastDayThisYear = getLastDayOfMonth(currentYearForYearly, targetMonth);
        const targetDayThisYear = Math.min(dayOfMonth, lastDayThisYear);
        candidateThisYear = new Date(currentYearForYearly, targetMonth, targetDayThisYear);
      }
      candidateThisYear.setHours(0, 0, 0, 0);

      // If target date this year is after normalizedFromDate, use it
      if (candidateThisYear > normalizedFromDate) {
        nextDate = candidateThisYear;
      } else {
        // Otherwise, move to next year
        const nextYear = currentYearForYearly + 1;

        // Handle Feb 29 (leap day) for next year
        if (monthOfYear === 2 && dayOfMonth === 29) {
          if (isLeapYear(nextYear)) {
            nextDate = new Date(nextYear, targetMonth, 29);
          } else {
            // Skip non-leap years for Feb 29
            return null;
          }
        } else {
          const lastDayNextYear = getLastDayOfMonth(nextYear, targetMonth);
          const targetDayNextYear = Math.min(dayOfMonth, lastDayNextYear);
          nextDate = new Date(nextYear, targetMonth, targetDayNextYear);
        }
        nextDate.setHours(0, 0, 0, 0);
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

  // Normalize start date to midnight for comparison
  const startDateMidnight = new Date(recurring.startDate);
  startDateMidnight.setHours(0, 0, 0, 0);

  // If start date is in the future, return start date (normalized to midnight)
  if (startDateMidnight > now) {
    return startDateMidnight;
  }

  // Calculate from last generated or start date
  let fromDate = recurring.lastGeneratedDate || recurring.startDate;

  // Keep calculating next occurrences until we find one that's today or in the future
  // This handles cases where recurring expenses were created with past start dates
  let nextOccurrence = calculateNextOccurrence(recurring, fromDate);

  // Safety limit to prevent infinite loops
  let iterations = 0;
  const MAX_ITERATIONS = 1000;

  while (nextOccurrence && nextOccurrence < now && iterations < MAX_ITERATIONS) {
    fromDate = nextOccurrence;
    nextOccurrence = calculateNextOccurrence(recurring, fromDate);
    iterations++;
  }

  return nextOccurrence;
}
