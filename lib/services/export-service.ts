import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Expense } from '@/types/database';
import { NetWorthEntry } from '@/lib/db/models/net-worth';
import { generateExpenseCSV, generateNetWorthCSV } from '@/lib/utils/csv-generator';

/**
 * Exports expenses to a CSV file and opens the native share dialog
 * @param expenses Array of expenses to export
 * @throws Error if sharing is not available or file operations fail
 */
export async function exportExpensesToCSV(expenses: Expense[]): Promise<void> {
  // Generate CSV string
  const csvContent = generateExpenseCSV(expenses);

  // Create filename with current date
  const today = new Date();
  const dateString = today.toISOString().split('T')[0]; // YYYY-MM-DD
  const filename = `expenses_${dateString}.csv`;

  // Write to cache directory (temporary storage) using legacy API
  const fileUri = FileSystem.cacheDirectory + filename;
  await FileSystem.writeAsStringAsync(fileUri, csvContent, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  // Check if sharing is available
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('Sharing is not available on this device');
  }

  // Share the file (native share dialog)
  await Sharing.shareAsync(fileUri, {
    mimeType: 'text/csv',
    dialogTitle: 'Export Expenses',
    UTI: 'public.comma-separated-values-text',
  });
}

/**
 * Exports net worth entries to a CSV file and opens the native share dialog
 * @param entries Array of net worth entries to export
 * @throws Error if sharing is not available or file operations fail
 */
export async function exportNetWorthToCSV(entries: NetWorthEntry[]): Promise<void> {
  // Generate CSV string
  const csvContent = generateNetWorthCSV(entries);

  // Create filename with current date
  const today = new Date();
  const dateString = today.toISOString().split('T')[0]; // YYYY-MM-DD
  const filename = `net_worth_${dateString}.csv`;

  // Write to cache directory (temporary storage) using legacy API
  const fileUri = FileSystem.cacheDirectory + filename;
  await FileSystem.writeAsStringAsync(fileUri, csvContent, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  // Check if sharing is available
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('Sharing is not available on this device');
  }

  // Share the file (native share dialog)
  await Sharing.shareAsync(fileUri, {
    mimeType: 'text/csv',
    dialogTitle: 'Export Net Worth',
    UTI: 'public.comma-separated-values-text',
  });
}
