import { getDatabase } from '@/lib/db/core/database';
import { createExpense } from '@/lib/db/models/expenses';
import { CATEGORIES } from '@/constants/categories';
import { ExpenseInput } from '@/types/database';

interface ParsedExpenseData {
  amount: string;
  note: string;
}

/**
 * Parse and validate an add-expense URL
 * @param urlString - The URL to parse (e.g., "basicbudget://add-expense?amount=25.50&note=Coffee")
 * @returns Parsed data object or null if invalid
 */
export function parseAddExpenseURL(urlString: string): ParsedExpenseData | null {
  try {
    const url = new URL(urlString);

    // Validate scheme
    if (url.protocol !== 'basicbudget:') {
      return null;
    }

    // Validate path (handle both /add-expense and add-expense)
    const path = url.pathname.replace(/^\//, '');
    if (path !== 'add-expense') {
      return null;
    }

    // Extract amount (required)
    const amount = url.searchParams.get('amount');
    if (!amount) {
      return null;
    }

    // Validate amount format
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return null;
    }

    // Extract note (optional)
    const note = url.searchParams.get('note') || '';

    return {
      amount: amount,
      note: decodeURIComponent(note)
    };
  } catch (error) {
    // Invalid URL format
    return null;
  }
}

/**
 * Add an expense from a URL
 * @param urlString - The URL to process
 * @throws Error if URL is invalid, amount is invalid, or database operation fails
 */
export async function addExpenseFromURL(urlString: string): Promise<void> {
  // Parse URL
  const data = parseAddExpenseURL(urlString);
  if (!data) {
    throw new Error('Invalid URL format');
  }

  // Get database
  const db = await getDatabase();

  // Find Unlabeled category (ID: '6')
  const unlabeledCategory = CATEGORIES.find(c => c.id === '6');
  if (!unlabeledCategory) {
    throw new Error('Unlabeled category not found');
  }

  // Create expense input
  const expenseInput: ExpenseInput = {
    amount: data.amount,
    category: unlabeledCategory,
    date: new Date(),
    note: data.note
  };

  // Save to database
  await createExpense(db, expenseInput);
}
