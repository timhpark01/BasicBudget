import { useState, useEffect, useCallback } from 'react';
import * as SQLite from 'expo-sqlite';
import { getDatabase } from '@/lib/db/core/database';
import {
  NetWorthEntry,
  NetWorthEntryInput,
  NetWorthItem,
  getAllNetWorthEntries,
  getNetWorthEntryByDate,
  saveNetWorthEntry as saveNetWorthEntryDb,
  deleteNetWorthEntry as deleteNetWorthEntryDb,
} from '@/lib/db/models/net-worth';

// Extended entry type with backward compatibility properties
export interface NetWorthEntryCompat extends NetWorthEntry {
  savings: string;
  checking: string;
  investments: string;
  retirement: string;
  realEstate: string;
  vehicles: string;
  otherAssets: string;
  creditCardDebt: string;
  studentLoans: string;
  carLoans: string;
  mortgage: string;
  otherDebt: string;
}

// Helper to find item value by name
function getItemValue(items: NetWorthItem[], name: string): string {
  const item = items.find(i => i.name === name);
  return item ? item.amount : '0';
}

// Convert new format to old format for backward compatibility
function addLegacyFields(entry: NetWorthEntry): NetWorthEntryCompat {
  return {
    ...entry,
    savings: getItemValue(entry.assets, 'Savings'),
    checking: getItemValue(entry.assets, 'Checking'),
    investments: getItemValue(entry.assets, 'Investments'),
    retirement: getItemValue(entry.assets, 'Retirement'),
    realEstate: getItemValue(entry.assets, 'Real Estate'),
    vehicles: getItemValue(entry.assets, 'Vehicles'),
    otherAssets: getItemValue(entry.assets, 'Other Assets'),
    creditCardDebt: getItemValue(entry.liabilities, 'Credit Card Debt'),
    studentLoans: getItemValue(entry.liabilities, 'Student Loans'),
    carLoans: getItemValue(entry.liabilities, 'Car Loans'),
    mortgage: getItemValue(entry.liabilities, 'Mortgage'),
    otherDebt: getItemValue(entry.liabilities, 'Other Debt'),
  };
}

export interface UseNetWorthReturn {
  entries: NetWorthEntryCompat[];
  loading: boolean;
  error: Error | null;
  saveEntry: (entry: NetWorthEntryInput) => Promise<void>;
  deleteEntry: (date: string) => Promise<void>;
  getEntryByDate: (date: string) => Promise<NetWorthEntryCompat | null>;
  refreshEntries: () => Promise<void>;
}

export function useNetWorth(): UseNetWorthReturn {
  const [entries, setEntries] = useState<NetWorthEntryCompat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);

  // Initialize database and load entries on mount
  useEffect(() => {
    async function init() {
      try {
        const database = await getDatabase();
        setDb(database);
        await loadEntries(database);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // Load all net worth entries from database
  async function loadEntries(database: SQLite.SQLiteDatabase) {
    try {
      const loadedEntries = await getAllNetWorthEntries(database);
      // Add legacy fields for backward compatibility
      setEntries(loadedEntries.map(addLegacyFields));
      setError(null);
    } catch (err) {
      setError(err as Error);
    }
  }

  // Save a net worth entry
  const saveEntry = useCallback(
    async (entry: NetWorthEntryInput): Promise<void> => {
      if (!db) throw new Error('Database not initialized');

      try {
        // Check if entry is in old format (has individual fields) or new format (has arrays)
        let entryToSave: NetWorthEntryInput;

        if ('assets' in entry && 'liabilities' in entry) {
          // New format - use as is
          entryToSave = entry;
        } else {
          // Old format - convert to new format
          const assets = [
            { id: '1', name: 'Savings', amount: entry.savings || '0' },
            { id: '2', name: 'Checking', amount: entry.checking || '0' },
            { id: '3', name: 'Investments', amount: entry.investments || '0' },
            { id: '4', name: 'Retirement', amount: entry.retirement || '0' },
            { id: '5', name: 'Real Estate', amount: entry.realEstate || '0' },
            { id: '6', name: 'Vehicles', amount: entry.vehicles || '0' },
            { id: '7', name: 'Other Assets', amount: entry.otherAssets || '0' },
          ].filter(item => parseFloat(item.amount) > 0);

          const liabilities = [
            { id: '1', name: 'Credit Card Debt', amount: entry.creditCardDebt || '0' },
            { id: '2', name: 'Student Loans', amount: entry.studentLoans || '0' },
            { id: '3', name: 'Car Loans', amount: entry.carLoans || '0' },
            { id: '4', name: 'Mortgage', amount: entry.mortgage || '0' },
            { id: '5', name: 'Other Debt', amount: entry.otherDebt || '0' },
          ].filter(item => parseFloat(item.amount) > 0);

          // Ensure at least one item in each category
          if (assets.length === 0) {
            assets.push({ id: '1', name: 'Savings', amount: '0' });
          }
          if (liabilities.length === 0) {
            liabilities.push({ id: '1', name: 'Credit Card Debt', amount: '0' });
          }

          entryToSave = {
            date: entry.date,
            assets,
            liabilities,
            notes: entry.notes || '',
          };
        }

        const savedEntry = await saveNetWorthEntryDb(db, entryToSave);
        const compatEntry = addLegacyFields(savedEntry);

        // Update local state
        setEntries((prev) => {
          const existingIndex = prev.findIndex((e) => e.date === entry.date);
          if (existingIndex >= 0) {
            // Replace existing entry
            const updated = [...prev];
            updated[existingIndex] = compatEntry;
            return updated;
          } else {
            // Add new entry and sort by date (newest first)
            return [compatEntry, ...prev].sort((a, b) => b.date.localeCompare(a.date));
          }
        });
        setError(null);
      } catch (err) {
        await loadEntries(db);
        throw err;
      }
    },
    [db]
  );

  // Delete a net worth entry
  const deleteEntry = useCallback(
    async (date: string): Promise<void> => {
      if (!db) throw new Error('Database not initialized');

      try {
        // Optimistic update
        setEntries((prev) => prev.filter((e) => e.date !== date));
        await deleteNetWorthEntryDb(db, date);
        setError(null);
      } catch (err) {
        await loadEntries(db);
        throw err;
      }
    },
    [db]
  );

  // Get a single entry by date
  const getEntryByDate = useCallback(
    async (date: string): Promise<NetWorthEntryCompat | null> => {
      if (!db) return null;

      try {
        const entry = await getNetWorthEntryByDate(db, date);
        return entry ? addLegacyFields(entry) : null;
      } catch (err) {
        console.error('Failed to get entry by date:', err);
        return null;
      }
    },
    [db]
  );

  // Refresh entries from database
  const refreshEntries = useCallback(async (): Promise<void> => {
    if (!db) return;

    setLoading(true);
    try {
      await loadEntries(db);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [db]);

  return {
    entries,
    loading,
    error,
    saveEntry,
    deleteEntry,
    getEntryByDate,
    refreshEntries,
  };
}
