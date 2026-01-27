import * as FileSystem from 'expo-file-system';
import * as SQLite from 'expo-sqlite';
import { parseCSVContent, ParsedTransaction } from '@/lib/utils/csv-parser';
import { Category, ExpenseInput } from '@/types/database';
import { createExpense } from '@/lib/db/models/expenses';
import { createCustomCategory } from '@/lib/db/models/categories';

export interface ImportResult {
  total: number;
  imported: number;
  failed: number;
  errors: Array<{ row: number; message: string }>;
}

export interface CategoryMapping {
  csvName: string;
  action: 'map' | 'create';
  targetCategory?: Category; // if action = 'map'
  newCategory?: {
    // if action = 'create'
    name: string;
    icon: string;
    color: string;
  };
}

/**
 * Reads and parses a CSV file
 * @param fileUri - The file URI from document picker
 * @returns Parse result with valid, invalid, and unmapped categories
 */
export async function readAndParseCSV(fileUri: string) {
  // Read file content
  const csvContent = await FileSystem.readAsStringAsync(fileUri);

  // Check file size (limit to 10MB as string)
  if (csvContent.length > 10 * 1024 * 1024) {
    throw new Error('File too large (max 10MB)');
  }

  // Parse CSV
  const parseResult = parseCSVContent(csvContent);

  // Check for too many rows
  const totalRows = parseResult.valid.length + parseResult.invalid.length;
  if (totalRows > 10000) {
    throw new Error(`Too many rows (${totalRows}). Maximum is 10,000.`);
  }

  return parseResult;
}

/**
 * Resolves category mappings and creates new categories if needed
 * @param mappings - Array of category mappings from user
 * @param db - Database instance
 * @returns Map of CSV category names to resolved Category objects
 */
export async function resolveCategoryMappings(
  mappings: CategoryMapping[],
  db: SQLite.SQLiteDatabase
): Promise<Map<string, Category>> {
  const resolvedMappings = new Map<string, Category>();

  for (const mapping of mappings) {
    if (mapping.action === 'map' && mapping.targetCategory) {
      // Direct mapping to existing category
      resolvedMappings.set(mapping.csvName, mapping.targetCategory);
    } else if (mapping.action === 'create' && mapping.newCategory) {
      // Create new custom category
      try {
        const newCategory = await createCustomCategory(db, {
          name: mapping.newCategory.name,
          icon: mapping.newCategory.icon,
          color: mapping.newCategory.color,
        });
        resolvedMappings.set(mapping.csvName, newCategory);
      } catch (error) {
        throw new Error(
          `Failed to create category "${mapping.newCategory.name}": ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        );
      }
    }
  }

  return resolvedMappings;
}

/**
 * Imports transactions into the database
 * @param transactions - List of parsed transactions to import
 * @param categoryMappings - Map of category names to Category objects
 * @param db - Database instance
 * @param onProgress - Optional progress callback
 * @returns Import result with counts and errors
 */
export async function importTransactions(
  transactions: ParsedTransaction[],
  categoryMappings: Map<string, Category>,
  db: SQLite.SQLiteDatabase,
  onProgress?: (current: number, total: number) => void
): Promise<ImportResult> {
  const results: ImportResult = {
    total: transactions.length,
    imported: 0,
    failed: 0,
    errors: [],
  };

  // Import each transaction individually
  for (let i = 0; i < transactions.length; i++) {
    const transaction = transactions[i];

    try {
      // Get mapped category
      const category = categoryMappings.get(transaction.categoryName);
      if (!category) {
        throw new Error(`No category mapping for: ${transaction.categoryName}`);
      }

      // Create expense input
      const expenseInput: ExpenseInput = {
        amount: transaction.amount,
        category: category,
        date: transaction.date,
        note: transaction.description,
      };

      // Import expense
      await createExpense(db, expenseInput);
      results.imported++;
    } catch (error) {
      results.failed++;
      results.errors.push({
        row: transaction.rawRow,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Report progress
    if (onProgress) {
      onProgress(i + 1, transactions.length);
    }
  }

  return results;
}
