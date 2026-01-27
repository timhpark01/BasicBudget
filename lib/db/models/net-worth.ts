import * as SQLite from 'expo-sqlite';
import { generateId } from '../../utils/id-generator';
import { formatDate, parseDate } from '../../utils/date-formatter';
import { DatabaseError } from '@/lib/db/core/errors';
import { mapSQLiteErrorToUserMessage } from '@/lib/db/utils/error-mapper';

// Re-export date utilities for backward compatibility
export { formatDate, parseDate };

export type NetWorthItemCategory = 'liquid' | 'illiquid' | 'retirement';

export interface NetWorthItem {
  id: string;
  name: string;
  amount: string;
  category?: NetWorthItemCategory;
}

// Hardcoded name lists for backward compatibility with pre-v10 data
const LIQUID_ASSET_NAMES = ['Savings', 'Checking', 'Investments'];
const ILLIQUID_ASSET_NAMES = ['Real Estate', 'Vehicles', 'Other Assets'];
const RETIREMENT_ASSET_NAMES = ['Retirement', '401k', 'IRA'];
const LIQUID_LIABILITY_NAMES = ['Credit Card Debt', 'Other Debt'];
const ILLIQUID_LIABILITY_NAMES = ['Mortgage', 'Car Loans'];
const RETIREMENT_LIABILITY_NAMES = ['Student Loans'];

/**
 * Check if an asset item belongs to a category, using explicit category
 * field with name-based fallback for unmigrated data
 */
function isAssetCategory(item: NetWorthItem, category: NetWorthItemCategory): boolean {
  if (item.category !== undefined) {
    return item.category === category;
  }
  switch (category) {
    case 'liquid': return LIQUID_ASSET_NAMES.includes(item.name);
    case 'illiquid': return ILLIQUID_ASSET_NAMES.includes(item.name);
    case 'retirement': return RETIREMENT_ASSET_NAMES.includes(item.name);
  }
}

/**
 * Check if a liability item belongs to a category, using explicit category
 * field with name-based fallback for unmigrated data
 */
function isLiabilityCategory(item: NetWorthItem, category: NetWorthItemCategory): boolean {
  if (item.category !== undefined) {
    return item.category === category;
  }
  switch (category) {
    case 'liquid': return LIQUID_LIABILITY_NAMES.includes(item.name);
    case 'illiquid': return ILLIQUID_LIABILITY_NAMES.includes(item.name);
    case 'retirement': return RETIREMENT_LIABILITY_NAMES.includes(item.name);
  }
}

export interface NetWorthEntry {
  id: string;
  date: string; // YYYY-MM-DD format
  assets: NetWorthItem[];
  liabilities: NetWorthItem[];
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NetWorthEntryInput {
  date: string; // YYYY-MM-DD format
  assets: NetWorthItem[];
  liabilities: NetWorthItem[];
  notes?: string;
}

interface NetWorthRow {
  id: string;
  date: string; // YYYY-MM-DD format
  assets: string; // JSON string
  liabilities: string; // JSON string
  notes: string | null;
  created_at: number;
  updated_at: number;
}

/**
 * Transform database row to NetWorthEntry object
 * Validates JSON parsing and logs detailed corruption information
 */
function rowToNetWorthEntry(row: NetWorthRow): NetWorthEntry {
  let assets: NetWorthItem[] = [];
  let liabilities: NetWorthItem[] = [];

  // Parse and validate assets JSON
  try {
    assets = JSON.parse(row.assets || '[]');

    // Runtime validation: ensure result is an array
    if (!Array.isArray(assets)) {
      console.error('⚠️  Net worth data corruption detected:', {
        entryId: row.id,
        date: row.date,
        issue: 'Assets JSON parsed but not an array',
        assetsType: typeof assets,
        rawAssets: row.assets,
      });
      console.warn('User should be notified: Net worth entry may be corrupted, showing default values');
      assets = [{ id: '1', name: 'Savings', amount: '0' }];
    }
  } catch (error) {
    // Log detailed corruption information
    console.error('⚠️  Net worth assets JSON corruption detected:', {
      entryId: row.id,
      date: row.date,
      rawAssets: row.assets,
      error: (error as Error).message,
    });
    console.warn('User should be notified: Net worth entry may be corrupted, showing default values');
    assets = [{ id: '1', name: 'Savings', amount: '0' }];
  }

  // Parse and validate liabilities JSON
  try {
    liabilities = JSON.parse(row.liabilities || '[]');

    // Runtime validation: ensure result is an array
    if (!Array.isArray(liabilities)) {
      console.error('⚠️  Net worth data corruption detected:', {
        entryId: row.id,
        date: row.date,
        issue: 'Liabilities JSON parsed but not an array',
        liabilitiesType: typeof liabilities,
        rawLiabilities: row.liabilities,
      });
      console.warn('User should be notified: Net worth entry may be corrupted, showing default values');
      liabilities = [{ id: '1', name: 'Credit Card Debt', amount: '0' }];
    }
  } catch (error) {
    // Log detailed corruption information
    console.error('⚠️  Net worth liabilities JSON corruption detected:', {
      entryId: row.id,
      date: row.date,
      rawLiabilities: row.liabilities,
      error: (error as Error).message,
    });
    console.warn('User should be notified: Net worth entry may be corrupted, showing default values');
    liabilities = [{ id: '1', name: 'Credit Card Debt', amount: '0' }];
  }

  return {
    id: row.id,
    date: row.date,
    assets,
    liabilities,
    notes: row.notes || '',
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * CREATE: Insert or update a net worth entry for a specific date
 */
export async function saveNetWorthEntry(
  db: SQLite.SQLiteDatabase,
  entry: NetWorthEntryInput
): Promise<NetWorthEntry> {
  try {
    // Input validation
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(entry.date)) {
      throw new DatabaseError('Invalid date format. Expected YYYY-MM-DD', undefined, 'validation');
    }

    if (!Array.isArray(entry.assets) || !Array.isArray(entry.liabilities)) {
      throw new DatabaseError('Assets and liabilities must be arrays', undefined, 'validation');
    }

    const timestamp = Date.now();

    // Check if entry exists for this date
    const existing = await db.getFirstAsync<NetWorthRow>(
      'SELECT * FROM net_worth_entries WHERE date = ?',
      [entry.date]
    );

    const assetsJson = JSON.stringify(entry.assets);
    const liabilitiesJson = JSON.stringify(entry.liabilities);

    if (existing) {
      // Update existing entry
      await db.runAsync(
        `UPDATE net_worth_entries SET
          assets = ?, liabilities = ?, notes = ?, updated_at = ?
        WHERE date = ?`,
        [
          assetsJson,
          liabilitiesJson,
          entry.notes || null,
          timestamp,
          entry.date,
        ]
      );

      const updated = await db.getFirstAsync<NetWorthRow>(
        'SELECT * FROM net_worth_entries WHERE date = ?',
        [entry.date]
      );

      return rowToNetWorthEntry(updated!);
    } else {
      // Insert new entry
      const id = generateId();

      await db.runAsync(
        `INSERT INTO net_worth_entries (
          id, date, assets, liabilities, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          entry.date,
          assetsJson,
          liabilitiesJson,
          entry.notes || null,
          timestamp,
          timestamp,
        ]
      );

      return {
        id,
        date: entry.date,
        assets: entry.assets,
        liabilities: entry.liabilities,
        notes: entry.notes || '',
        createdAt: new Date(timestamp),
        updatedAt: new Date(timestamp),
      };
    }
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }

    const sqliteError = error as { code?: number; message?: string };
    const userMessage = mapSQLiteErrorToUserMessage(sqliteError);

    throw new DatabaseError(
      userMessage,
      sqliteError.code,
      'save_net_worth_entry',
      error as Error
    );
  }
}

/**
 * READ: Get all net worth entries, sorted by date (newest first)
 */
export async function getAllNetWorthEntries(
  db: SQLite.SQLiteDatabase
): Promise<NetWorthEntry[]> {
  try {
    const rows = await db.getAllAsync<NetWorthRow>(
      'SELECT * FROM net_worth_entries ORDER BY date DESC'
    );

    return rows.map(rowToNetWorthEntry);
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }

    const sqliteError = error as { code?: number; message?: string };
    const userMessage = mapSQLiteErrorToUserMessage(sqliteError);

    throw new DatabaseError(
      userMessage,
      sqliteError.code,
      'get_all_net_worth_entries',
      error as Error
    );
  }
}

/**
 * READ: Get a single net worth entry by date
 */
export async function getNetWorthEntryByDate(
  db: SQLite.SQLiteDatabase,
  date: string
): Promise<NetWorthEntry | null> {
  try {
    // Input validation
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      throw new DatabaseError('Invalid date format. Expected YYYY-MM-DD', undefined, 'validation');
    }

    const row = await db.getFirstAsync<NetWorthRow>(
      'SELECT * FROM net_worth_entries WHERE date = ?',
      [date]
    );

    return row ? rowToNetWorthEntry(row) : null;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }

    const sqliteError = error as { code?: number; message?: string };
    const userMessage = mapSQLiteErrorToUserMessage(sqliteError);

    throw new DatabaseError(
      userMessage,
      sqliteError.code,
      'get_net_worth_entry_by_date',
      error as Error
    );
  }
}

/**
 * DELETE: Delete a net worth entry by date
 */
export async function deleteNetWorthEntry(
  db: SQLite.SQLiteDatabase,
  date: string
): Promise<void> {
  try {
    // Input validation
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      throw new DatabaseError('Invalid date format. Expected YYYY-MM-DD', undefined, 'validation');
    }

    await db.runAsync('DELETE FROM net_worth_entries WHERE date = ?', [date]);
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }

    const sqliteError = error as { code?: number; message?: string };
    const userMessage = mapSQLiteErrorToUserMessage(sqliteError);

    throw new DatabaseError(
      userMessage,
      sqliteError.code,
      'delete_net_worth_entry',
      error as Error
    );
  }
}

/**
 * Calculate total assets from a net worth entry
 */
export function calculateTotalAssets(entry: NetWorthEntry): number {
  return entry.assets.reduce((sum, item) => {
    return sum + (parseFloat(item.amount) || 0);
  }, 0);
}

/**
 * Calculate total liabilities from a net worth entry
 */
export function calculateTotalLiabilities(entry: NetWorthEntry): number {
  return entry.liabilities.reduce((sum, item) => {
    return sum + (parseFloat(item.amount) || 0);
  }, 0);
}

/**
 * Calculate net worth from a net worth entry
 */
export function calculateNetWorth(entry: NetWorthEntry): number {
  return calculateTotalAssets(entry) - calculateTotalLiabilities(entry);
}

/**
 * Calculate Retirement assets
 */
export function calculateRetirementAssets(entry: NetWorthEntry): number {
  return entry.assets
    .filter(item => isAssetCategory(item, 'retirement'))
    .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
}

/**
 * Calculate Retirement liabilities
 */
export function calculateRetirementLiabilities(entry: NetWorthEntry): number {
  return entry.liabilities
    .filter(item => isLiabilityCategory(item, 'retirement'))
    .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
}

/**
 * Calculate Retirement net worth
 */
export function calculateRetirementNetWorth(entry: NetWorthEntry): number {
  return calculateRetirementAssets(entry) - calculateRetirementLiabilities(entry);
}

/**
 * Calculate Liquid assets
 */
export function calculateLiquidAssets(entry: NetWorthEntry): number {
  return entry.assets
    .filter(item => isAssetCategory(item, 'liquid'))
    .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
}

/**
 * Calculate Liquid liabilities
 */
export function calculateLiquidLiabilities(entry: NetWorthEntry): number {
  return entry.liabilities
    .filter(item => isLiabilityCategory(item, 'liquid'))
    .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
}

/**
 * Calculate Liquid net worth
 */
export function calculateLiquidNetWorth(entry: NetWorthEntry): number {
  return calculateLiquidAssets(entry) - calculateLiquidLiabilities(entry);
}

/**
 * Calculate Illiquid assets
 */
export function calculateIlliquidAssets(entry: NetWorthEntry): number {
  return entry.assets
    .filter(item => isAssetCategory(item, 'illiquid'))
    .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
}

/**
 * Calculate Illiquid liabilities
 */
export function calculateIlliquidLiabilities(entry: NetWorthEntry): number {
  return entry.liabilities
    .filter(item => isLiabilityCategory(item, 'illiquid'))
    .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
}

/**
 * Calculate Illiquid net worth
 */
export function calculateIlliquidNetWorth(entry: NetWorthEntry): number {
  return calculateIlliquidAssets(entry) - calculateIlliquidLiabilities(entry);
}
