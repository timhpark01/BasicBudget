# Database Migrations Guide

## Overview

This document explains the database migration system in BasicBudget and how to handle upgrades safely.

## Migration System Architecture

### Schema Version Tracking

The app now tracks the database schema version in a dedicated `schema_version` table. This ensures migrations are applied correctly and prevents data loss.

**Current Schema Version:** 5

### Migration Flow

```
1. App starts
2. Database opens
3. Check if database exists with data
4. Get current schema version
5. If version < 5:
   a. Run pending migrations FIRST
   b. Create/update schema
   c. Update schema version to 5
6. If new database:
   a. Create fresh schema
   b. Mark all migrations as complete
   c. Set schema version to 5
```

## Migration History

### v1: Categories with Position Column
- **What:** Added `position` column to `custom_categories` table
- **Why:** Enable custom ordering of categories
- **Impact:** Existing categories get auto-assigned positions (0-11 for defaults, 12+ for custom)

### v2: Category Budgets
- **What:** Created `category_budgets` table
- **Why:** Support per-category budget limits
- **Impact:** New table, no data migration needed

### v3: Additional Categories
- **What:** Added 20 new default categories (13-32)
- **Why:** Expanded default category options
- **Impact:** Existing users get new categories added

### v4: Net Worth Dynamic Items
- **What:** Converted `net_worth_entries` from fixed columns to JSON arrays
- **Why:** Allow users to add custom asset/liability types
- **Impact:** Existing net worth entries converted to new format
- **Status:** Non-critical, failures won't block app startup

### v5: Net Worth Full Dates
- **What:** Changed `month` (YYYY-MM) to `date` (YYYY-MM-DD)
- **Why:** Support multiple net worth snapshots per month
- **Impact:** Existing entries converted (YYYY-MM → YYYY-MM-01)
- **Status:** Non-critical, failures won't block app startup

## What Went Wrong (Build 3 → Build 8)

### The Problem

When users upgraded from build 3 to build 8, the migration system had a critical flaw:

1. **Old flow (BROKEN):**
   ```
   1. Open database
   2. Create schema with NEW structure (CREATE IF NOT EXISTS)
   3. Run migrations
   ```

2. **Why it failed:**
   - Existing tables already existed with OLD structure
   - `CREATE TABLE IF NOT EXISTS` doesn't modify existing tables
   - Migrations expected to transform old → new, but tables were already partially "new"
   - Some migrations failed due to inconsistent state
   - Old versions had a "recovery" mechanism that **deleted the entire database** on error

3. **Result:**
   - Migration failed
   - Recovery deleted database
   - All user data lost

### The Fix

**New flow (FIXED):**
```
1. Open database
2. Check if database exists and get version
3. If existing database with old version:
   a. Run migrations FIRST (transform old structure)
   b. Create/update schema (ensure all tables exist)
   c. Update version to 5
4. If new database:
   a. Create fresh schema
   b. Mark migrations complete
   c. Set version to 5
```

**Key improvements:**
- ✅ Schema version tracking in database (not just AsyncStorage)
- ✅ Migrations run BEFORE schema creation for existing databases
- ✅ Better error handling with descriptive messages
- ✅ No automatic database deletion on failure
- ✅ Health check utility to diagnose issues
- ✅ Non-critical migrations (v4, v5) won't block app startup

## Health Check Utility

### Running a Health Check

```typescript
import { getDatabase } from '@/lib/database';
import { performHealthCheck, printHealthCheckResults } from '@/lib/db-health-check';

// Get database instance
const db = await getDatabase();

// Run health check
const result = await performHealthCheck(db);

// Print results
printHealthCheckResults(result);
```

### Health Check Output

```
=== DATABASE HEALTH CHECK RESULTS ===

Overall Status: ✅ HEALTHY
Schema Version: 5

--- Migration Status ---
v1 (Categories with position): ✅
v2 (Category budgets): ✅
v3 (Additional categories): ✅
v4 (Net worth dynamic items): ✅
v5 (Net worth full dates): ✅

--- Table Information ---
Expenses: ✅ (127 rows)
Budgets: ✅ (3 rows)
Custom Categories: ✅ (32 rows)
  - Has position column: ✅
Net Worth: ✅ (6 rows)
  - Has date column: ✅
Category Budgets: ✅ (0 rows)

=====================================
```

## Recovery Guide for Affected Users

### If Data Was Lost

Unfortunately, if the database was deleted during the failed migration, **the data cannot be recovered** unless you have a backup.

**Prevention for future:**
- The new migration system (build 9+) will NOT delete your database
- Migrations are now safer and more robust
- You can run health checks to verify database state

### If Migration is Stuck

If the app won't start due to migration errors:

1. **Check logs** to identify which migration failed
2. **Report the issue** with logs to the developer
3. **DO NOT** manually delete the database - the data may be recoverable

### Manual Migration Reset (Advanced)

If you need to force migrations to re-run (use with caution):

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

// Clear all migration markers
await AsyncStorage.multiRemove([
  'migration_v1_categories_to_db',
  'migration_v2_category_budgets',
  'migration_v3_additional_categories',
  'migration_v4_networth_dynamic_items',
  'migration_v5_networth_full_dates',
]);

// Restart app - migrations will run again
```

**⚠️ WARNING:** Only do this if instructed by the developer or if you understand the consequences.

## Testing Migrations

### For Developers

When adding new migrations:

1. **Test with fresh database:**
   ```bash
   # Delete database
   # Start app
   # Verify schema created correctly
   ```

2. **Test with old database:**
   ```bash
   # Use database from previous version
   # Start app
   # Verify migrations run correctly
   # Run health check
   ```

3. **Test migration failure:**
   ```bash
   # Introduce intentional error in migration
   # Verify app handles error gracefully
   # Verify data is NOT deleted
   ```

### Migration Checklist

When creating a new migration:

- [ ] Increment `CURRENT_SCHEMA_VERSION` in `lib/database.ts`
- [ ] Add new migration to `lib/migrations.ts`
- [ ] Add migration key constants
- [ ] Implement check/mark functions
- [ ] Add to `runMigrations()` with try/catch
- [ ] Test with existing database
- [ ] Test with fresh database
- [ ] Update this documentation

## Best Practices

1. **Always check table structure before modifying:**
   ```typescript
   const tableInfo = await db.getAllAsync('PRAGMA table_info(table_name)');
   const hasColumn = tableInfo.some(col => col.name === 'column_name');
   if (!hasColumn) {
     // Add column
   }
   ```

2. **Use transactions for related changes:**
   ```typescript
   await db.withTransactionAsync(async () => {
     await migration1(db);
     await migration2(db);
   });
   ```

3. **Mark critical vs non-critical:**
   - Critical migrations (expenses, budgets, categories): MUST succeed
   - Non-critical migrations (net worth, advanced features): Can fail gracefully

4. **Add helpful logging:**
   ```typescript
   console.log('🔄 Running migration X...');
   console.log('✅ Migration X completed');
   console.error('❌ Migration X failed:', error);
   ```

5. **Never delete user data automatically:**
   - No `deleteDatabaseAsync()` in production code
   - Let users decide if they want to reset
   - Provide recovery options

## Future Improvements

Potential enhancements to the migration system:

1. **Database backups before migrations:**
   - Create automatic backup before running migrations
   - Restore on failure

2. **Migration rollback support:**
   - Each migration has a rollback function
   - Automatic rollback on failure

3. **Progressive migration:**
   - Apply migrations in background
   - Don't block app startup

4. **Cloud backup integration:**
   - Sync database to cloud before major updates
   - Restore from cloud on failure

## Summary

The migration system has been completely overhauled to prevent data loss:

✅ Schema version tracking in database
✅ Migrations run before schema creation for existing databases
✅ Better error handling and logging
✅ No automatic database deletion
✅ Health check utility
✅ Comprehensive documentation

**For users upgrading from build 8 onwards:** Your data is safe. The migration system will correctly upgrade your database without data loss.

**For users affected by the build 3→8 upgrade:** We sincerely apologize for the data loss. This was a critical bug that has been fixed. Future upgrades will be safe.
