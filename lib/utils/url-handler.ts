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
    // Manual URL parsing for custom scheme
    // Expected format: basicbudget://add-expense?amount=X&note=Y

    // Validate scheme
    if (!urlString.startsWith('basicbudget://')) {
      return null;
    }

    // Extract path and query string
    const urlWithoutScheme = urlString.replace('basicbudget://', '');
    const [path, queryString] = urlWithoutScheme.split('?');

    // Validate path (handle both /add-expense and add-expense)
    const cleanPath = path.replace(/^\//, '');
    if (cleanPath !== 'add-expense') {
      return null;
    }

    // Parse query parameters manually
    if (!queryString) {
      return null;
    }

    const params = new URLSearchParams(queryString);

    // Extract amount (required)
    const amount = params.get('amount');
    if (!amount) {
      return null;
    }

    // Validate amount format
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return null;
    }

    // Extract note (optional) - already decoded by URLSearchParams
    const note = params.get('note') || '';

    return {
      amount: amount,
      note: note
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
