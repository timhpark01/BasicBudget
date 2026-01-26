import * as SQLite from 'expo-sqlite';
import { ParsedTransaction } from './csv-parser';
import { Category } from '@/types/database';
import { getAllExpenses } from '@/lib/db/models/expenses';

/**
 * Creates a consistent hash for expense duplicate detection
 * Format: YYYY-MM-DD|categoryId|amount
 */
export function createExpenseHash(date: Date, categoryId: string, amount: string): string {
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
  const amountFixed = parseFloat(amount).toFixed(2); // Normalize amount
  return `${dateStr}|${categoryId}|${amountFixed}`;
}

/**
 * Detects duplicate transactions based on date, category, and amount
 * @param transactions - List of parsed transactions to check
 * @param categoryMappings - Map of category names to Category objects
 * @param db - Database instance
 * @returns Object with duplicates and unique transactions
 */
export async function detectDuplicates(
  transactions: ParsedTransaction[],
  categoryMappings: Map<string, Category>,
  db: SQLite.SQLiteDatabase
): Promise<{
  duplicates: ParsedTransaction[];
  unique: ParsedTransaction[];
}> {
  // Step 1: Get all existing expenses from database
  const existingExpenses = await getAllExpenses(db);

  // Step 2: Create hash set of existing expenses
  const existingHashes = new Set<string>();
  existingExpenses.forEach((expense) => {
    const hash = createExpenseHash(expense.date, expense.category.id, expense.amount);
    existingHashes.add(hash);
  });

  // Step 3: Check each transaction against existing hashes
  const duplicates: ParsedTransaction[] = [];
  const unique: ParsedTransaction[] = [];

  transactions.forEach((transaction) => {
    const mapping = categoryMappings.get(transaction.categoryName);
    if (!mapping) {
      // If no mapping found, skip this transaction (shouldn't happen if mappings are complete)
      return;
    }

    const hash = createExpenseHash(transaction.date, mapping.id, transaction.amount);

    if (existingHashes.has(hash)) {
      // Duplicate found
      duplicates.push(transaction);
    } else {
      // Unique transaction
      unique.push(transaction);
      // Add to hash set to prevent duplicates within the import batch
      existingHashes.add(hash);
    }
  });

  return { duplicates, unique };
}
