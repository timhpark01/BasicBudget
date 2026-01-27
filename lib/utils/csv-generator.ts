import { Expense } from '@/types/database';
import { NetWorthEntry } from '@/lib/db/models/net-worth';
import {
  calculateNetWorth,
  calculateTotalAssets,
  calculateTotalLiabilities,
  calculateLiquidAssets,
  calculateIlliquidAssets,
  calculateRetirementAssets,
} from '@/lib/db/models/net-worth';

/**
 * Escapes a CSV field value according to RFC 4180
 * - Wraps field in quotes if it contains comma, newline, or quote
 * - Escapes quotes by doubling them
 */
function escapeCSVField(field: string): string {
  if (field.includes(',') || field.includes('\n') || field.includes('"')) {
    const escaped = field.replace(/"/g, '""');
    return `"${escaped}"`;
  }
  return field;
}

/**
 * Generates a CSV string from an array of expenses
 * CSV Format: Date,Category,Description,Amount
 * - Date: YYYY-MM-DD format
 * - Category: Category name
 * - Description: Note field (empty string if null)
 * - Amount: Numeric value with 2 decimal places (no $ symbol)
 */
export function generateExpenseCSV(expenses: Expense[]): string {
  // Header row
  const header = 'Date,Category,Description,Amount';

  // Return header only if no expenses
  if (expenses.length === 0) {
    return header;
  }

  // Data rows
  const rows = expenses.map((expense) => {
    const date = expense.date.toISOString().split('T')[0]; // YYYY-MM-DD
    const category = escapeCSVField(expense.category.name);
    const description = escapeCSVField(expense.note || '');
    const amount = parseFloat(expense.amount).toFixed(2);

    return `${date},${category},${description},${amount}`;
  });

  return [header, ...rows].join('\n');
}

/**
 * Generates a CSV string from an array of net worth entries
 * CSV Format: Date, Net Worth, Total Assets, [Asset columns...], Total Liabilities, [Liability columns...]
 *
 * - Date: YYYY-MM-DD format
 * - All amounts: Numeric values with 2 decimal places (no $ symbol)
 * - Each unique asset/liability gets its own column
 * - Empty cells for items not present in a given entry
 */
export function generateNetWorthCSV(entries: NetWorthEntry[]): string {
  // Return header only if no entries
  if (entries.length === 0) {
    return 'Date,Net Worth,Total Assets,Total Liabilities';
  }

  // Collect all unique asset and liability names across all entries
  const allAssetNames = new Set<string>();
  const allLiabilityNames = new Set<string>();

  entries.forEach((entry) => {
    entry.assets.forEach((asset) => allAssetNames.add(asset.name));
    entry.liabilities.forEach((liability) => allLiabilityNames.add(liability.name));
  });

  // Convert to sorted arrays for consistent column ordering
  const assetColumns = Array.from(allAssetNames).sort();
  const liabilityColumns = Array.from(allLiabilityNames).sort();

  // Build header row
  const headerParts = [
    'Date',
    'Net Worth',
    'Total Assets',
    ...assetColumns,
    'Total Liabilities',
    ...liabilityColumns
  ];
  const header = headerParts.join(',');

  // Build data rows
  const rows = entries.map((entry) => {
    const date = entry.date; // Already in YYYY-MM-DD format
    const netWorth = calculateNetWorth(entry).toFixed(2);
    const totalAssets = calculateTotalAssets(entry).toFixed(2);
    const totalLiabilities = calculateTotalLiabilities(entry).toFixed(2);

    // Create maps for quick lookup
    const assetMap = new Map(entry.assets.map(a => [a.name, parseFloat(a.amount).toFixed(2)]));
    const liabilityMap = new Map(entry.liabilities.map(l => [l.name, parseFloat(l.amount).toFixed(2)]));

    // Build row with values for each column
    const rowParts = [
      date,
      netWorth,
      totalAssets,
      ...assetColumns.map(name => assetMap.get(name) || ''),
      totalLiabilities,
      ...liabilityColumns.map(name => liabilityMap.get(name) || '')
    ];

    return rowParts.join(',');
  });

  return [header, ...rows].join('\n');
}
