/**
 * Schema Consistency Verification Script
 *
 * Quick check to ensure schema.ts and migrations.ts are in sync.
 * Run this manually during development before committing schema changes.
 *
 * Usage:
 *   npx ts-node scripts/verify-schema-consistency.ts
 */

import * as SQLite from 'expo-sqlite';
import { runMigrations, initializeNewDatabase } from '../lib/db/core/migrations';
import { generateCompleteSchema } from '../lib/db/core/schema';

const TEST_DB_FRESH = 'schema_verify_fresh.db';
const TEST_DB_MIGRATED = 'schema_verify_migrated.db';

interface ColumnInfo {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
}

interface IndexInfo {
  name: string;
  sql: string | null;
}

async function getTableSchema(db: SQLite.SQLiteDatabase, tableName: string) {
  const columns = await db.getAllAsync<ColumnInfo>(`PRAGMA table_info(${tableName})`);
  const indexes = await db.getAllAsync<IndexInfo>(
    `SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name=? AND sql IS NOT NULL`,
    [tableName]
  );
  return { columns, indexes };
}

function compareSchemas(fresh: any, migrated: any, tableName: string): string[] {
  const differences: string[] = [];

  // Compare columns
  if (fresh.columns.length !== migrated.columns.length) {
    differences.push(
      `❌ ${tableName}: Column count mismatch (fresh: ${fresh.columns.length}, migrated: ${migrated.columns.length})`
    );
  }

  for (let i = 0; i < Math.max(fresh.columns.length, migrated.columns.length); i++) {
    const freshCol = fresh.columns[i];
    const migratedCol = migrated.columns[i];

    if (!freshCol || !migratedCol) continue;

    if (freshCol.name !== migratedCol.name) {
      differences.push(
        `❌ ${tableName}: Column name mismatch at position ${i} (fresh: ${freshCol.name}, migrated: ${migratedCol.name})`
      );
    }

    if (freshCol.type !== migratedCol.type) {
      differences.push(
        `❌ ${tableName}.${freshCol.name}: Type mismatch (fresh: ${freshCol.type}, migrated: ${migratedCol.type})`
      );
    }
  }

  // Compare indexes
  const normalizeSQL = (sql: string | null) =>
    sql?.replace(/IF NOT EXISTS\s+/gi, '').replace(/\s+/g, ' ').trim().toLowerCase() || '';

  const freshIndexes = fresh.indexes.map((idx: IndexInfo) => normalizeSQL(idx.sql)).sort();
  const migratedIndexes = migrated.indexes.map((idx: IndexInfo) => normalizeSQL(idx.sql)).sort();

  if (freshIndexes.length !== migratedIndexes.length) {
    differences.push(
      `❌ ${tableName}: Index count mismatch (fresh: ${freshIndexes.length}, migrated: ${migratedIndexes.length})`
    );
  }

  return differences;
}

async function verifySchemaConsistency() {
  console.log('🔍 Starting schema consistency verification...\n');

  try {
    // Clean up old test databases
    try {
      await SQLite.deleteDatabaseAsync(TEST_DB_FRESH);
    } catch {}
    try {
      await SQLite.deleteDatabaseAsync(TEST_DB_MIGRATED);
    } catch {}

    // Create fresh database (new user path)
    console.log('📦 Creating fresh database from schema.ts...');
    const freshDb = await SQLite.openDatabaseAsync(TEST_DB_FRESH);
    const schema = generateCompleteSchema();
    await freshDb.execAsync(schema);
    await initializeNewDatabase(freshDb);
    console.log('✅ Fresh database created\n');

    // Create migrated database (existing user path)
    console.log('🔄 Creating old database and running all migrations...');
    const migratedDb = await SQLite.openDatabaseAsync(TEST_DB_MIGRATED);

    // Create minimal v0 schema
    await migratedDb.execAsync(`
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

      CREATE TABLE budgets (
        id TEXT PRIMARY KEY NOT NULL,
        month TEXT NOT NULL UNIQUE,
        budget_amount TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE custom_categories (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        icon TEXT NOT NULL,
        color TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE schema_version (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        version INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      INSERT INTO schema_version (id, version, updated_at) VALUES (1, 0, ${Date.now()});
    `);

    // Run all migrations
    await runMigrations(migratedDb, 0);
    await migratedDb.execAsync(generateCompleteSchema());
    console.log('✅ Migrations completed\n');

    // Compare all tables
    console.log('🔍 Comparing schemas...\n');
    const tables = [
      'expenses',
      'budgets',
      'custom_categories',
      'net_worth_entries',
      'category_budgets',
      'recurring_expenses',
      'schema_version',
    ];

    let hasErrors = false;
    const allDifferences: string[] = [];

    for (const tableName of tables) {
      const freshSchema = await getTableSchema(freshDb, tableName);
      const migratedSchema = await getTableSchema(migratedDb, tableName);

      const differences = compareSchemas(freshSchema, migratedSchema, tableName);

      if (differences.length > 0) {
        hasErrors = true;
        allDifferences.push(...differences);
        console.log(`❌ ${tableName}: ${differences.length} difference(s) found`);
        differences.forEach(diff => console.log(`   ${diff}`));
      } else {
        console.log(`✅ ${tableName}: Schemas match`);
      }
    }

    // Clean up test databases
    try {
      await SQLite.deleteDatabaseAsync(TEST_DB_FRESH);
      await SQLite.deleteDatabaseAsync(TEST_DB_MIGRATED);
    } catch {}

    // Summary
    console.log('\n' + '='.repeat(60));
    if (hasErrors) {
      console.log('❌ SCHEMA VALIDATION FAILED');
      console.log(`   Found ${allDifferences.length} difference(s) between fresh and migrated schemas`);
      console.log('\n📝 Action Required:');
      console.log('   1. Review the differences above');
      console.log('   2. Update either schema.ts or migrations.ts to match');
      console.log('   3. Run this script again to verify the fix');
      console.log('='.repeat(60));
      process.exit(1);
    } else {
      console.log('✅ SCHEMA VALIDATION PASSED');
      console.log('   Fresh install and migrated databases produce identical schemas');
      console.log('='.repeat(60));
      process.exit(0);
    }
  } catch (error) {
    console.error('\n❌ Error during schema validation:', error);

    // Clean up test databases on error
    try {
      await SQLite.deleteDatabaseAsync(TEST_DB_FRESH);
    } catch {}
    try {
      await SQLite.deleteDatabaseAsync(TEST_DB_MIGRATED);
    } catch {}

    process.exit(1);
  }
}

// Run verification
verifySchemaConsistency();
