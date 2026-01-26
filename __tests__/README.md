# Database Testing Guide

This directory contains comprehensive tests for the database layer, including migrations, schema validation, and data integrity checks.

## Test Files

### `database-migration.test.ts`
Tests the migration system to ensure:
- New databases are created correctly
- Existing databases are migrated properly
- Data is preserved during migrations
- Migrations run in correct order
- Error handling works as expected
- Unlabeled category fix works correctly

**Run:** `npm test __tests__/database-migration.test.ts`

### `schema-validation.test.ts`
Validates schema consistency between two user paths:
- **Fresh install path:** New users get schema from `schema.ts`
- **Migration path:** Existing users get schema from `migrations.ts`

This test ensures both paths produce **identical** database structures.

**Run:** `npm run test:schema`

## Why Schema Validation Matters

Your app has two ways users get their database:

```
New User:       schema.ts → Fresh database
Existing User:  old database → migrations.ts → Updated database
```

If these paths diverge, you'll have **schema drift**:
- New users missing columns that migrations add
- Existing users with extra columns not in schema
- Production bugs that only affect one group

**Example of what we prevent:**
```typescript
// BAD: Schema drift
schema.ts:          expenses (missing recurring_expense_id)
migrations.ts:      expenses (has recurring_expense_id)
Result:             New users can't track recurring expenses!

// GOOD: Consistent schema
schema.ts:          expenses (has recurring_expense_id)
migrations.ts:      expenses (has recurring_expense_id)
Result:             All users have same database structure
```

## Running Tests

```bash
# Run all database tests
npm test

# Run only schema validation
npm run test:schema

# Run with coverage
npm run test:coverage

# Watch mode (useful during development)
npm run test:watch
```

## Adding New Tests

When adding new database features:

1. **Update schema.ts** with new tables/columns
2. **Create migration** in migrations.ts (if needed)
3. **Add test case** to verify:
   - Fresh install has new feature
   - Migration adds new feature
   - Data is preserved
4. **Run schema validation** to ensure consistency

## Test Structure

### Schema Validation Test Flow

```typescript
1. Create fresh database using schema.ts
2. Create old database (v0)
3. Run all migrations (v0 → current)
4. Compare both databases:
   - Table structures
   - Column names/types/constraints
   - Indexes
   - Column order
5. Report any differences
```

### Migration Test Flow

```typescript
1. Create old database with test data
2. Run migrations
3. Verify:
   - Tables/columns added correctly
   - Data preserved
   - Indexes created
   - Schema version updated
4. Run health check
```

## Common Issues and Fixes

### Issue: Schema validation fails after adding migration

**Symptom:**
```
❌ expenses: Column count mismatch (fresh: 10, migrated: 11)
❌ expenses: Missing column in fresh DB: new_column
```

**Fix:**
1. You added a migration that adds `new_column`
2. But forgot to update `schema.ts`
3. Add `new_column` to `schema.ts` table definition

### Issue: Index mismatch between fresh and migrated

**Symptom:**
```
❌ expenses: Index count mismatch (fresh: 2, migrated: 3)
```

**Fix:**
1. Migration creates index but `schema.ts` doesn't have it
2. Add index to `TABLE_INDEXES` in `schema.ts`

### Issue: Column order differs

**Symptom:**
```
❌ expenses: Column name mismatch at position 8
```

**Fix:**
1. Migrations recreate tables, changing column order
2. Update `schema.ts` to match migration output order
3. Order matters for some operations (SELECT *, etc.)

## Best Practices

1. **Always run schema validation** after schema changes
2. **Update both paths together:** schema.ts + migrations.ts
3. **Test with both fresh and old databases**
4. **Don't skip tests** - they catch real bugs
5. **Use CI/CD** to run tests automatically

## CI/CD Integration

Add to your GitHub Actions / CI pipeline:

```yaml
- name: Run Schema Validation
  run: npm run test:schema

- name: Run All Database Tests
  run: npm test
```

This ensures schema consistency is checked before merging code.

## Maintenance

### When to Update Tests

- Adding new tables/columns
- Modifying existing schema
- Creating new migrations
- Changing database structure
- Refactoring database layer

### When to Add New Test Files

- Testing new database features (net worth, budgets, etc.)
- Complex migration scenarios
- Performance testing
- Data validation
- Edge cases

## Questions?

See `/docs/DATABASE_MIGRATIONS.md` for more details on the migration system and best practices.
