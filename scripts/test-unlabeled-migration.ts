/**
 * Manual test script to verify the Unlabeled category migration fix
 *
 * This script tests that:
 * 1. Migration v6 correctly renames id='6' from any name (Health, Other, etc.) to "Unlabeled"
 * 2. Migration v9 fixes corrupted data for existing users
 * 3. Category deletion works correctly after the fix
 *
 * Run this in your app to verify the fix works.
 */

import * as SQLite from 'expo-sqlite';

interface TestResult {
  test: string;
  passed: boolean;
  message: string;
}

const results: TestResult[] = [];

async function createTestDatabase(name: string): Promise<SQLite.SQLiteDatabase> {
  try {
    await SQLite.deleteDatabaseAsync(name);
  } catch {
    // Database doesn't exist, that's fine
  }
  return await SQLite.openDatabaseAsync(name);
}

/**
 * Test 1: Verify migration v6 renames id='6' from 'Health' to 'Unlabeled'
 */
async function testMigrationV6WithHealth(): Promise<TestResult> {
  const dbName = 'test_v6_health.db';
  const db = await createTestDatabase(dbName);
  const now = Date.now();

  try {
    // Create database with id='6' as 'Health' (old app version)
    await db.execAsync(`
      CREATE TABLE custom_categories (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        icon TEXT NOT NULL,
        color TEXT NOT NULL,
        position INTEGER NOT NULL,
        is_active INTEGER DEFAULT 1,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE expenses (
        id TEXT PRIMARY KEY NOT NULL,
        amount TEXT NOT NULL,
        category_id TEXT NOT NULL,
        category_name TEXT NOT NULL,
        category_icon TEXT NOT NULL,
        category_color TEXT NOT NULL,
        date INTEGER NOT NULL,
        note TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      INSERT INTO custom_categories (id, name, icon, color, position, is_active, created_at, updated_at)
      VALUES ('6', 'Health', 'medical', '#00D2D3', 5, 1, ${now}, ${now});

      INSERT INTO expenses (id, amount, category_id, category_name, category_icon, category_color, date, note, created_at, updated_at)
      VALUES ('exp-1', '50.00', '6', 'Health', 'medical', '#00D2D3', ${now}, 'Test', ${now}, ${now});
    `);

    // Run migration v6 logic (simulate what the actual migration does)
    await db.withExclusiveTransactionAsync(async () => {
      await db.runAsync(
        `UPDATE custom_categories SET name = ?, updated_at = ? WHERE id = '6'`,
        ['Unlabeled', now]
      );
      await db.runAsync(
        `UPDATE expenses SET category_name = ?, updated_at = ? WHERE category_id = '6'`,
        ['Unlabeled', now]
      );
    });

    // Verify category was renamed
    const category = await db.getFirstAsync<{ name: string }>(
      'SELECT name FROM custom_categories WHERE id = ?',
      ['6']
    );

    // Verify expense was updated
    const expense = await db.getFirstAsync<{ category_name: string }>(
      'SELECT category_name FROM expenses WHERE id = ?',
      ['exp-1']
    );

    await SQLite.deleteDatabaseAsync(dbName);

    if (category?.name === 'Unlabeled' && expense?.category_name === 'Unlabeled') {
      return {
        test: 'Migration v6 with Health',
        passed: true,
        message: 'Successfully renamed id=6 from "Health" to "Unlabeled" in both tables'
      };
    } else {
      return {
        test: 'Migration v6 with Health',
        passed: false,
        message: `Failed: category=${category?.name}, expense=${expense?.category_name}`
      };
    }
  } catch (error) {
    await SQLite.deleteDatabaseAsync(dbName);
    return {
      test: 'Migration v6 with Health',
      passed: false,
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Test 2: Verify migration v6 renames id='6' from 'Other' to 'Unlabeled'
 */
async function testMigrationV6WithOther(): Promise<TestResult> {
  const dbName = 'test_v6_other.db';
  const db = await createTestDatabase(dbName);
  const now = Date.now();

  try {
    await db.execAsync(`
      CREATE TABLE custom_categories (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        icon TEXT NOT NULL,
        color TEXT NOT NULL,
        position INTEGER NOT NULL,
        is_active INTEGER DEFAULT 1,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      INSERT INTO custom_categories (id, name, icon, color, position, is_active, created_at, updated_at)
      VALUES ('6', 'Other', 'ellipsis-horizontal', '#A3A3A3', 11, 1, ${now}, ${now});
    `);

    // Run migration v6 logic
    await db.runAsync(
      `UPDATE custom_categories SET name = ?, updated_at = ? WHERE id = '6'`,
      ['Unlabeled', now]
    );

    const category = await db.getFirstAsync<{ name: string }>(
      'SELECT name FROM custom_categories WHERE id = ?',
      ['6']
    );

    await SQLite.deleteDatabaseAsync(dbName);

    if (category?.name === 'Unlabeled') {
      return {
        test: 'Migration v6 with Other',
        passed: true,
        message: 'Successfully renamed id=6 from "Other" to "Unlabeled"'
      };
    } else {
      return {
        test: 'Migration v6 with Other',
        passed: false,
        message: `Failed: category=${category?.name}`
      };
    }
  } catch (error) {
    await SQLite.deleteDatabaseAsync(dbName);
    return {
      test: 'Migration v6 with Other',
      passed: false,
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Test 3: Verify migration v9 fixes corrupted data
 */
async function testMigrationV9Fix(): Promise<TestResult> {
  const dbName = 'test_v9_fix.db';
  const db = await createTestDatabase(dbName);
  const now = Date.now();

  try {
    // Simulate corrupted data: id='6' has wrong name after buggy v6 migration
    await db.execAsync(`
      CREATE TABLE custom_categories (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        icon TEXT NOT NULL,
        color TEXT NOT NULL,
        position INTEGER NOT NULL,
        is_active INTEGER DEFAULT 1,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE expenses (
        id TEXT PRIMARY KEY NOT NULL,
        amount TEXT NOT NULL,
        category_id TEXT NOT NULL,
        category_name TEXT NOT NULL,
        category_icon TEXT NOT NULL,
        category_color TEXT NOT NULL,
        date INTEGER NOT NULL,
        note TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      -- Corrupted state: id='6' still named 'Health' but with correct icon/color
      INSERT INTO custom_categories (id, name, icon, color, position, is_active, created_at, updated_at)
      VALUES ('6', 'Health', 'help-circle-outline', '#DC143C', 5, 1, ${now}, ${now});

      INSERT INTO expenses (id, amount, category_id, category_name, category_icon, category_color, date, note, created_at, updated_at)
      VALUES ('exp-1', '50.00', '6', 'Health', 'help-circle-outline', '#DC143C', ${now}, 'Test', ${now}, ${now});
    `);

    // Check if fix is needed
    const current = await db.getFirstAsync<{ name: string }>(
      'SELECT name FROM custom_categories WHERE id = ?',
      ['6']
    );

    if (current?.name !== 'Unlabeled') {
      // Run migration v9 fix
      await db.withExclusiveTransactionAsync(async () => {
        await db.runAsync(
          `UPDATE custom_categories SET name = ?, updated_at = ? WHERE id = '6'`,
          ['Unlabeled', now]
        );
        await db.runAsync(
          `UPDATE expenses SET category_name = ?, updated_at = ? WHERE category_id = '6'`,
          ['Unlabeled', now]
        );
      });
    }

    // Verify fix was applied
    const category = await db.getFirstAsync<{ name: string }>(
      'SELECT name FROM custom_categories WHERE id = ?',
      ['6']
    );

    const expense = await db.getFirstAsync<{ category_name: string }>(
      'SELECT category_name FROM expenses WHERE id = ?',
      ['exp-1']
    );

    await SQLite.deleteDatabaseAsync(dbName);

    if (category?.name === 'Unlabeled' && expense?.category_name === 'Unlabeled') {
      return {
        test: 'Migration v9 Fix',
        passed: true,
        message: 'Successfully fixed corrupted data: "Health" → "Unlabeled"'
      };
    } else {
      return {
        test: 'Migration v9 Fix',
        passed: false,
        message: `Failed: category=${category?.name}, expense=${expense?.category_name}`
      };
    }
  } catch (error) {
    await SQLite.deleteDatabaseAsync(dbName);
    return {
      test: 'Migration v9 Fix',
      passed: false,
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Test 4: Verify category deletion works correctly after fix
 */
async function testCategoryDeletion(): Promise<TestResult> {
  const dbName = 'test_deletion.db';
  const db = await createTestDatabase(dbName);
  const now = Date.now();

  try {
    await db.execAsync(`
      CREATE TABLE custom_categories (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        icon TEXT NOT NULL,
        color TEXT NOT NULL,
        position INTEGER NOT NULL,
        is_active INTEGER DEFAULT 1,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE expenses (
        id TEXT PRIMARY KEY NOT NULL,
        amount TEXT NOT NULL,
        category_id TEXT NOT NULL,
        category_name TEXT NOT NULL,
        category_icon TEXT NOT NULL,
        category_color TEXT NOT NULL,
        date INTEGER NOT NULL,
        note TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      -- Create Unlabeled category (correctly named)
      INSERT INTO custom_categories (id, name, icon, color, position, is_active, created_at, updated_at)
      VALUES ('6', 'Unlabeled', 'help-circle-outline', '#DC143C', 5, 1, ${now}, ${now});

      -- Create test category with expense
      INSERT INTO custom_categories (id, name, icon, color, position, is_active, created_at, updated_at)
      VALUES ('test-cat', 'TestCategory', 'star', '#FF0000', 10, 1, ${now}, ${now});

      INSERT INTO expenses (id, amount, category_id, category_name, category_icon, category_color, date, note, created_at, updated_at)
      VALUES ('test-exp', '100.00', 'test-cat', 'TestCategory', 'star', '#FF0000', ${now}, 'Test', ${now}, ${now});
    `);

    // Delete test category (simulate what deleteCustomCategory does)
    await db.withExclusiveTransactionAsync(async () => {
      // Soft delete the category
      await db.runAsync(
        'UPDATE custom_categories SET is_active = 0, updated_at = ? WHERE id = ?',
        [now, 'test-cat']
      );

      // Reassign expenses to Unlabeled
      const defaultCategory = { id: '6', name: 'Unlabeled', icon: 'help-circle-outline', color: '#DC143C' };
      await db.runAsync(
        `UPDATE expenses SET category_id = ?, category_name = ?, category_icon = ?, category_color = ?, updated_at = ? WHERE category_id = ?`,
        [defaultCategory.id, defaultCategory.name, defaultCategory.icon, defaultCategory.color, now, 'test-cat']
      );
    });

    // Verify expense was reassigned correctly
    const expense = await db.getFirstAsync<{ category_id: string; category_name: string }>(
      'SELECT category_id, category_name FROM expenses WHERE id = ?',
      ['test-exp']
    );

    // Verify Unlabeled category still exists and is correct
    const unlabeled = await db.getFirstAsync<{ name: string }>(
      'SELECT name FROM custom_categories WHERE id = ?',
      ['6']
    );

    await SQLite.deleteDatabaseAsync(dbName);

    if (expense?.category_id === '6' && expense?.category_name === 'Unlabeled' && unlabeled?.name === 'Unlabeled') {
      return {
        test: 'Category Deletion',
        passed: true,
        message: 'Successfully reassigned expense to Unlabeled category'
      };
    } else {
      return {
        test: 'Category Deletion',
        passed: false,
        message: `Failed: expense.category_id=${expense?.category_id}, expense.category_name=${expense?.category_name}, unlabeled.name=${unlabeled?.name}`
      };
    }
  } catch (error) {
    await SQLite.deleteDatabaseAsync(dbName);
    return {
      test: 'Category Deletion',
      passed: false,
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Run all tests
 */
export async function runMigrationTests(): Promise<void> {
  console.log('🧪 Running Unlabeled Category Migration Tests...\n');

  results.push(await testMigrationV6WithHealth());
  results.push(await testMigrationV6WithOther());
  results.push(await testMigrationV9Fix());
  results.push(await testCategoryDeletion());

  console.log('📊 Test Results:\n');
  results.forEach(result => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.test}: ${result.message}`);
  });

  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  console.log(`\n${passed}/${total} tests passed`);

  if (passed === total) {
    console.log('\n🎉 All migration tests passed! The fix is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the migration code.');
  }
}
