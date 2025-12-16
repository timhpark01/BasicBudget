import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';

/**
 * Format Date to YYYY-MM-DD string
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse YYYY-MM-DD string to Date
 */
export function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export interface NetWorthItem {
  id: string;
  name: string;
  amount: string;
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
 * Generate a unique ID
 */
function generateId(): string {
  try {
    return Crypto.randomUUID();
  } catch (err) {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

/**
 * Transform database row to NetWorthEntry object
 */
function rowToNetWorthEntry(row: NetWorthRow): NetWorthEntry {
  let assets: NetWorthItem[] = [];
  let liabilities: NetWorthItem[] = [];

  try {
    assets = JSON.parse(row.assets || '[]');
  } catch (e) {
    console.error('Failed to parse assets JSON:', e);
    assets = [{ id: '1', name: 'Savings', amount: '0' }];
  }

  try {
    liabilities = JSON.parse(row.liabilities || '[]');
  } catch (e) {
    console.error('Failed to parse liabilities JSON:', e);
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
    console.error('Failed to save net worth entry:', error);
    throw new Error('Failed to save net worth entry. Please try again.');
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
    console.error('Failed to get net worth entries:', error);
    throw new Error('Failed to load net worth entries. Please try again.');
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
    const row = await db.getFirstAsync<NetWorthRow>(
      'SELECT * FROM net_worth_entries WHERE date = ?',
      [date]
    );

    return row ? rowToNetWorthEntry(row) : null;
  } catch (error) {
    console.error('Failed to get net worth entry:', error);
    return null;
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
    await db.runAsync('DELETE FROM net_worth_entries WHERE date = ?', [date]);
  } catch (error) {
    console.error('Failed to delete net worth entry:', error);
    throw new Error('Failed to delete net worth entry. Please try again.');
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
    .filter(item => item.name === 'Retirement')
    .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
}

/**
 * Calculate Retirement liabilities
 */
export function calculateRetirementLiabilities(entry: NetWorthEntry): number {
  return entry.liabilities
    .filter(item => item.name === 'Student Loans')
    .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
}

/**
 * Calculate Retirement net worth (Retirement assets - Student Loans)
 */
export function calculateRetirementNetWorth(entry: NetWorthEntry): number {
  return calculateRetirementAssets(entry) - calculateRetirementLiabilities(entry);
}

/**
 * Calculate Liquid assets
 */
export function calculateLiquidAssets(entry: NetWorthEntry): number {
  const liquidAssetNames = ['Savings', 'Checking', 'Investments'];
  return entry.assets
    .filter(item => liquidAssetNames.includes(item.name))
    .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
}

/**
 * Calculate Liquid liabilities
 */
export function calculateLiquidLiabilities(entry: NetWorthEntry): number {
  const liquidLiabilityNames = ['Credit Card Debt', 'Other Debt'];
  return entry.liabilities
    .filter(item => liquidLiabilityNames.includes(item.name))
    .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
}

/**
 * Calculate Liquid net worth (Savings + Checking + Investments - Credit Card - Other Debt)
 */
export function calculateLiquidNetWorth(entry: NetWorthEntry): number {
  return calculateLiquidAssets(entry) - calculateLiquidLiabilities(entry);
}

/**
 * Calculate Illiquid assets
 */
export function calculateIlliquidAssets(entry: NetWorthEntry): number {
  const illiquidAssetNames = ['Real Estate', 'Vehicles', 'Other Assets'];
  return entry.assets
    .filter(item => illiquidAssetNames.includes(item.name))
    .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
}

/**
 * Calculate Illiquid liabilities
 */
export function calculateIlliquidLiabilities(entry: NetWorthEntry): number {
  const illiquidLiabilityNames = ['Mortgage', 'Car Loans'];
  return entry.liabilities
    .filter(item => illiquidLiabilityNames.includes(item.name))
    .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
}

/**
 * Calculate Illiquid net worth (Real Estate + Vehicles + Other Assets - Mortgage - Car Loans)
 */
export function calculateIlliquidNetWorth(entry: NetWorthEntry): number {
  return calculateIlliquidAssets(entry) - calculateIlliquidLiabilities(entry);
}
