# Unlabeled Category Migration Fix - Verification Guide

## What Was Fixed

**Bug:** When deleting a category with transactions and selecting to move them to "Unlabeled", the Unlabeled category name was changed to the deleted category's name (e.g., "Health").

**Root Cause:** Migration v6 assumed category id='6' was always named "Other", but in earlier app versions it was "Health". The migration's WHERE clause (`WHERE id='6' AND name='Other'`) didn't match, causing it to silently fail.

## Changes Made

### 1. Fixed Migration v6 (`lib/db/core/migrations.ts:326`)
**Before:**
```typescript
UPDATE custom_categories SET name = ? WHERE id = '6' AND name = 'Other'
UPDATE expenses SET category_name = ? WHERE category_id = '6' AND category_name = 'Other'
```

**After:**
```typescript
UPDATE custom_categories SET name = ? WHERE id = '6'
UPDATE expenses SET category_name = ? WHERE category_id = '6'
```

Now renames id='6' to "Unlabeled" **regardless of current name**.

### 2. Added Migration v9 (`lib/db/core/migrations.ts:520`)
New migration that repairs corrupted data for users who already ran the buggy v6 migration:
- Detects if id='6' has the wrong name
- Fixes both `custom_categories` and `expenses` tables
- Skips gracefully if already correct

### 3. Updated Schema Version
- Changed `CURRENT_SCHEMA_VERSION` from 8 to 9
- Added v9 to `CRITICAL_MIGRATIONS` list

## How to Verify the Fix

### Method 1: Automatic Verification (Recommended)

1. **Build and run the app:**
   ```bash
   npm start
   # or
   npx expo start
   ```

2. **Check console logs** during app startup. Look for migration v9 output:

   **If you had the bug (id='6' was corrupted):**
   ```
   🔄 Running v9 database migrations (fix Unlabeled category name)...
   📊 Current state: id='6', name='Health'
   📝 Fixed 1 category record(s)
   📝 Fixed X expense record(s)
   ✅ Successfully fixed category name: 'Health' → 'Unlabeled'
   ✅ v9 migrations completed successfully
   ```

   **If you didn't have the bug:**
   ```
   🔄 Running v9 database migrations (fix Unlabeled category name)...
   📊 Current state: id='6', name='Unlabeled'
   ✅ Already correct, no fix needed
   ✅ v9 migrations completed successfully
   ```

3. **Test category deletion:**
   - Create a new category (e.g., "Test")
   - Add some expenses to it
   - Delete the category
   - Select "Reassign & Delete" when prompted
   - Verify expenses are moved to "Unlabeled" (not "Test")

### Method 2: Manual Test Script

Run the test script from the app console:

```typescript
import { runMigrationTests } from './scripts/test-unlabeled-migration';

// Run in app console or create a temporary button
runMigrationTests();
```

Expected output:
```
🧪 Running Unlabeled Category Migration Tests...

📊 Test Results:

✅ Migration v6 with Health: Successfully renamed id=6 from "Health" to "Unlabeled" in both tables
✅ Migration v6 with Other: Successfully renamed id=6 from "Other" to "Unlabeled"
✅ Migration v9 Fix: Successfully fixed corrupted data: "Health" → "Unlabeled"
✅ Category Deletion: Successfully reassigned expense to Unlabeled category

4/4 tests passed

🎉 All migration tests passed! The fix is working correctly.
```

### Method 3: Database Inspection

If you want to verify the database directly:

1. **Find your database file** (location varies by platform):
   - iOS Simulator: `~/Library/Developer/CoreSimulator/Devices/[DEVICE_ID]/data/Containers/Data/Application/[APP_ID]/Library/LocalDatabase/budget.db`
   - Android Emulator: `/data/data/[PACKAGE_NAME]/databases/budget.db`

2. **Open with SQLite:**
   ```bash
   sqlite3 budget.db
   ```

3. **Check category id='6':**
   ```sql
   SELECT id, name, icon, color FROM custom_categories WHERE id = '6';
   ```

   Should output:
   ```
   6|Unlabeled|help-circle-outline|#DC143C
   ```

4. **Check expenses with category_id='6':**
   ```sql
   SELECT id, category_id, category_name FROM expenses WHERE category_id = '6' LIMIT 5;
   ```

   All should show `category_name = 'Unlabeled'`

5. **Check schema version:**
   ```sql
   SELECT version FROM schema_version WHERE id = 1;
   ```

   Should output: `9`

## What to Look For

### ✅ Success Indicators
- Migration v9 runs successfully on app startup
- Category id='6' is named "Unlabeled" in database
- All expenses with category_id='6' have category_name='Unlabeled'
- Deleting a category correctly reassigns expenses to "Unlabeled"
- Schema version is 9

### ❌ Failure Indicators
- Migration v9 throws an error
- Category id='6' still has wrong name (Health, Other, etc.)
- Expenses show different category_name than "Unlabeled"
- Deleting a category changes Unlabeled's name

## For New vs. Existing Users

### New Users (Fresh Install)
- Migration v6 will run during first launch
- Will correctly set id='6' to "Unlabeled" regardless of what it was in code history
- Migration v9 will detect it's already correct and skip

### Existing Users (Upgrading)
**Had the Bug:**
- Migration v9 will detect corrupted name
- Will fix both category and expenses
- Console will show: `Fixed category name: 'Health' → 'Unlabeled'`

**Didn't Have the Bug:**
- Migration v9 will detect name is correct
- Will skip gracefully
- Console will show: `Already correct, no fix needed`

## Rollback (If Needed)

If for any reason you need to rollback:

1. Revert the schema version:
   ```typescript
   // lib/db/core/database.ts
   export const CURRENT_SCHEMA_VERSION = 8;
   ```

2. Comment out migration v9 in migrations.ts

3. The app will continue to work, but the bug will return

## Additional Notes

- This fix is **backwards compatible** - works for all previous app versions
- Migrations are **idempotent** - safe to run multiple times
- Both migrations use **atomic transactions** - all-or-nothing updates
- Migration v9 is marked as **CRITICAL** - app won't start if it fails (ensures data integrity)

## Files Modified

1. `/lib/db/core/migrations.ts`
   - Fixed `renameOtherToUnlabeled()` function (line 326)
   - Added `fixUnlabeledCategoryName()` function (line 520)
   - Added v9 migration runner logic (line 845)
   - Updated CRITICAL_MIGRATIONS array (line 25)

2. `/lib/db/core/database.ts`
   - Updated `CURRENT_SCHEMA_VERSION` to 9 (line 6)

3. `/scripts/test-unlabeled-migration.ts` (new)
   - Comprehensive test suite for manual verification

4. `/__tests__/database-migration.test.ts`
   - Added test suite for Unlabeled category migrations

## Questions?

If the migration fails or you encounter issues:
1. Check the console logs for error messages
2. Verify schema version in database
3. Check category id='6' in custom_categories table
4. Report any errors with full console output
