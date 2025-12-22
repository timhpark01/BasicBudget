import * as SQLite from 'expo-sqlite';
import { SAMPLE_EXPENSES } from '@/constants/sample-data';
import { createExpense } from '../db/models/expenses';

/**
 * Seed the database with sample expense data
 * Only runs if database is empty and in development mode
 */
export async function seedSampleData(db: SQLite.SQLiteDatabase): Promise<void> {
  try {
    // Check if database already has data
    const result = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM expenses'
    );

    if (result && result.count > 0) {
      console.log('Database already contains data, skipping seed');
      return;
    }

    console.log('Seeding database with sample data...');

    for (const expense of SAMPLE_EXPENSES) {
      await createExpense(db, {
        amount: expense.amount,
        category: expense.category,
        date: expense.date,
        note: expense.note,
      });
    }

    console.log(`Sample data seeded successfully: ${SAMPLE_EXPENSES.length} expenses added`);
  } catch (error) {
    console.error('Failed to seed sample data:', error);
    // Don't throw - seeding failure shouldn't break the app
  }
}
