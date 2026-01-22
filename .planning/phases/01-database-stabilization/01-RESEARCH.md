# Phase 1: Database Stabilization - Research

**Researched:** 2026-01-21
**Domain:** SQLite database operations with expo-sqlite 16.0.9 in React Native
**Confidence:** HIGH

## Summary

Database stabilization focuses on fixing four critical issues in the existing expo-sqlite implementation: singleton initialization race conditions, inconsistent error handling patterns, missing transaction boundaries, and generic error messages that don't help users recover.

The existing codebase uses expo-sqlite 16.0.9 (the modern async API) with a custom singleton pattern that has a race condition in the finally block. Error handling is inconsistent across all database models - each function catches errors, logs to console, then throws generic "Please try again" messages that mask the original error. Only one operation (category reordering) uses transactions, leaving multi-step operations like expense reassignment vulnerable to partial failures.

**Primary recommendation:** Implement exclusive transactions for multi-step operations, create typed error classes that preserve SQLite error codes, fix the singleton initialization race condition with proper locking, and provide actionable error messages based on SQLite error codes.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| expo-sqlite | 16.0.9 | Local database | Official Expo solution with JSI bridge, async/await API, current stable version for Expo 54 |
| TypeScript | 5.9.2 | Type safety | Enables custom error types, proper database interfaces, reduces runtime errors |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none required) | - | - | Error handling and transactions are built into expo-sqlite 16.x |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| expo-sqlite | op-sqlite | 6-8x faster (JSI-only) but requires custom native builds, not compatible with Expo Go; unnecessary for stabilization phase |
| expo-sqlite | Drizzle ORM + expo-sqlite | Type-safe queries but adds complexity; overkill for stabilization (consider for future refactor) |
| expo-sqlite | WatermelonDB | Reactive database with sync but completely different architecture; would require full rewrite |

**Installation:**
```bash
# Already installed - no new dependencies needed
# expo-sqlite@~16.0.9 already in package.json
```

## Architecture Patterns

### Recommended Project Structure
```
lib/db/
├── core/
│   ├── database.ts          # Singleton with proper locking
│   ├── errors.ts            # NEW: Custom error classes
│   ├── migrations.ts        # Existing
│   └── schema.ts            # Existing
├── models/
│   ├── expenses.ts          # Update error handling
│   ├── categories.ts        # Update error handling + transactions
│   ├── budgets.ts           # Update error handling
│   ├── category-budgets.ts  # Update error handling
│   └── net-worth.ts         # Update error handling + JSON validation
└── utils/
    └── error-mapper.ts      # NEW: Map SQLite codes to user messages
```

### Pattern 1: Singleton Database with Mutex Lock
**What:** Prevent race conditions during concurrent initialization
**When to use:** Database singleton pattern in React Native apps
**Example:**
```typescript
// Source: Expo SQLite docs + concurrency best practices
let databaseInstance: SQLite.SQLiteDatabase | null = null;
let initializationPromise: Promise<SQLite.SQLiteDatabase> | null = null;
let isInitializing = false; // NEW: Mutex flag

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (databaseInstance) {
    return databaseInstance;
  }

  // Wait for any in-progress initialization
  if (isInitializing && initializationPromise) {
    return initializationPromise;
  }

  // Set mutex before creating promise
  isInitializing = true;
  initializationPromise = initDatabase();

  try {
    databaseInstance = await initializationPromise;
    return databaseInstance;
  } catch (error) {
    // On failure, clear instance so retry is possible
    databaseInstance = null;
    throw error;
  } finally {
    // Clear promise AFTER setting instance/error
    // This prevents race where promise=null before instance is set
    initializationPromise = null;
    isInitializing = false;
  }
}
```

**Why this fixes the race condition:**
The existing code sets `initializationPromise = null` in the finally block, which can execute before `databaseInstance` is set, allowing a second call to start a new initialization. The mutex flag `isInitializing` prevents this.

### Pattern 2: Custom Error Classes with SQLite Context
**What:** TypeScript error hierarchy that preserves original error information
**When to use:** All database operations that can fail
**Example:**
```typescript
// Source: TypeScript error handling best practices 2025-2026
export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly code?: string | number,
    public readonly operation?: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'DatabaseError';
    // Fix prototype chain for instanceof checks
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}

export class DatabaseConstraintError extends DatabaseError {
  constructor(
    message: string,
    public readonly constraintType: 'unique' | 'foreign_key' | 'not_null' | 'check',
    cause?: Error
  ) {
    super(message, undefined, 'constraint_violation', cause);
    this.name = 'DatabaseConstraintError';
    Object.setPrototypeOf(this, DatabaseConstraintError.prototype);
  }
}

export class DatabaseLockError extends DatabaseError {
  constructor(message: string, cause?: Error) {
    super(message, undefined, 'database_locked', cause);
    this.name = 'DatabaseLockError';
    Object.setPrototypeOf(this, DatabaseLockError.prototype);
  }
}

// Usage in model functions
try {
  await db.runAsync(/* ... */);
} catch (error) {
  // Preserve original error as 'cause'
  const sqliteError = error as { code?: number; message?: string };

  if (sqliteError.code === 19) { // SQLITE_CONSTRAINT
    throw new DatabaseConstraintError(
      'This expense category already exists',
      'unique',
      error as Error
    );
  }

  throw new DatabaseError(
    'Failed to save expense',
    sqliteError.code,
    'create_expense',
    error as Error
  );
}
```

### Pattern 3: Exclusive Transactions for Multi-Step Operations
**What:** Use `withExclusiveTransactionAsync` to ensure atomic multi-step operations
**When to use:** When operation involves multiple database writes that must all succeed or all fail
**Example:**
```typescript
// Source: Expo SQLite documentation
// BAD: Category deletion without transaction (current code)
export async function deleteCustomCategory(db: SQLite.SQLiteDatabase, id: string) {
  await db.runAsync('UPDATE custom_categories SET is_active = 0 WHERE id = ?', [id]);
  // If app crashes here, category is soft-deleted but expenses still reference it
  await reassignExpensesToCategory(db, id, defaultCategory);
}

// GOOD: Atomic transaction
export async function deleteCustomCategory(db: SQLite.SQLiteDatabase, id: string) {
  await db.withExclusiveTransactionAsync(async () => {
    await db.runAsync('UPDATE custom_categories SET is_active = 0 WHERE id = ?', [id]);
    await reassignExpensesToCategory(db, id, defaultCategory);
    // Both succeed or both rollback automatically
  });
}
```

**Critical caveat:** Only use `withExclusiveTransactionAsync`, NOT `withTransactionAsync`. The non-exclusive version can include async operations from outside the transaction scope due to JavaScript's async/await timing, leading to unexpected behavior.

### Pattern 4: Actionable Error Messages
**What:** Map SQLite error codes to user-friendly, actionable messages
**When to use:** All user-facing error handling
**Example:**
```typescript
// Source: SQLite error codes documentation
export function mapSQLiteErrorToUserMessage(error: any): string {
  const code = error?.code;

  // Use extended error codes if available, fall back to primary
  switch (code) {
    case 5: // SQLITE_BUSY
    case 261: // SQLITE_BUSY_RECOVERY
      return 'Database is busy. Please wait a moment and try again.';

    case 19: // SQLITE_CONSTRAINT
      return 'This operation would create duplicate data. Please check your input.';

    case 2067: // SQLITE_CONSTRAINT_UNIQUE
      return 'An entry with this information already exists.';

    case 13: // SQLITE_FULL
      return 'Device storage is full. Please free up space and try again.';

    case 11: // SQLITE_CORRUPT
      return 'Database error detected. Please contact support.';

    case 7: // SQLITE_NOMEM
      return 'Not enough memory available. Please close other apps and try again.';

    default:
      // Log original error for debugging
      console.error('Unmapped SQLite error:', code, error.message);
      return 'An unexpected error occurred. Please try again.';
  }
}
```

### Anti-Patterns to Avoid
- **Swallowing errors with generic messages:** Don't catch errors just to throw new Error('Please try again') - this loses the original error context and makes debugging impossible
- **Using console.error for error handling:** Logging is for diagnostics, not error handling. Always throw or return errors properly
- **Nullifying initialization promise in finally block:** This creates a race condition where a second call can start while the first is still completing
- **Using withTransactionAsync for critical operations:** Non-exclusive transactions can accidentally include operations from outside the transaction scope
- **Not validating JSON before parsing:** Database corruption can cause JSON.parse to throw - always validate or catch parsing errors

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Database locking/retry logic | Custom setTimeout retry loops | expo-sqlite's built-in busy handler | SQLite has built-in busy timeout via PRAGMA, manual retry can cause race conditions |
| Transaction management | Manual BEGIN/COMMIT/ROLLBACK | `withExclusiveTransactionAsync()` | Auto-rollback on errors, prevents forgetting to commit, handles async/await correctly |
| Error code parsing | String matching on error.message | Check error.code property | Error messages vary by platform/version, codes are stable |
| JSON schema validation | Manual field checking | Consider Zod for complex validation | Type-safe validation, better error messages, handles edge cases |
| Database connection pooling | Multiple database instances | Single instance (SQLite limitation) | SQLite only supports one writer at a time, multiple instances cause SQLITE_BUSY errors |

**Key insight:** expo-sqlite 16.x handles most low-level complexity (connection management, parameter escaping, async/await). Focus on business logic and error handling, not reimplementing database primitives.

## Common Pitfalls

### Pitfall 1: Finally Block Race Condition in Singleton Pattern
**What goes wrong:** The existing code sets `initializationPromise = null` in the finally block. If initialization is slow, a second call to `getDatabase()` can see `initializationPromise === null` before `databaseInstance` is set, causing it to start a second initialization.
**Why it happens:** JavaScript's async/await allows the finally block to execute before the try block completes setting `databaseInstance`. The finally block runs immediately after the await, but before the assignment.
**How to avoid:** Add a mutex flag `isInitializing` that's checked before creating a new promise. Only set it to false AFTER both the instance and promise are in their final state.
**Warning signs:**
- Multiple "Initializing database..." log messages on app startup
- Intermittent migration errors
- "Table already exists" errors during initialization

### Pitfall 2: Losing Error Context with Generic Re-throws
**What goes wrong:** Current code catches all errors, logs them with `console.error`, then throws `new Error('Failed to X. Please try again.')`. The original SQLite error code and stack trace are lost.
**Why it happens:** Developer intention was to provide user-friendly messages, but throwing a new Error discards the original error's `cause`.
**How to avoid:** Use custom error classes with a `cause` property to preserve the original error. Or use TypeScript's Error with `{ cause }` option (requires ES2022).
**Warning signs:**
- Error logs show generic messages but not SQLite error codes
- Unable to distinguish between constraint violations, disk full, and corruption
- Support requests where you can't diagnose the root cause

### Pitfall 3: Non-Exclusive Transactions Including External Operations
**What goes wrong:** Using `withTransactionAsync()` instead of `withExclusiveTransactionAsync()` can include async operations from outside the transaction scope if timing aligns.
**Why it happens:** Expo's docs warn: "Any query that runs while the transaction is active will be included in the transaction, including query statements outside of the scope function." JavaScript's async/await doesn't guarantee execution order.
**How to avoid:** Always use `withExclusiveTransactionAsync()` for critical operations. Only use the non-exclusive version for read-only transactions or when you explicitly want to allow concurrent operations.
**Warning signs:**
- Partial data updates that shouldn't happen
- Transactions rolling back operations you didn't intend to include
- Race conditions in multi-step operations

### Pitfall 4: JSON.parse Without Validation in Database Rows
**What goes wrong:** The net-worth model calls `JSON.parse(row.assets)` and catches errors by returning default values `[{ id: '1', name: 'Savings', amount: '0' }]`. This masks data corruption.
**Why it happens:** Database corruption or manual edits can create invalid JSON. The catch block silently "fixes" it without alerting the user or logging details.
**How to avoid:**
1. Log the corruption with enough detail to diagnose (which entry, what was the bad JSON)
2. Consider validation with Zod to detect schema mismatches
3. Provide a user-facing warning about data recovery
**Warning signs:**
- Users report "missing" net worth entries that mysteriously reset
- Logs show JSON parse errors but no follow-up action
- Data silently changes without user action

### Pitfall 5: No Transaction Boundaries for Category Deletion
**What goes wrong:** `deleteCustomCategory()` soft-deletes the category, then calls `reassignExpensesToCategory()` as separate operations. If the app crashes between them, the category is deleted but expenses still reference it.
**Why it happens:** The operations look atomic in the code, but they're two separate database writes without a transaction wrapper.
**How to avoid:** Wrap in `withExclusiveTransactionAsync()` so both operations commit together or roll back together.
**Warning signs:**
- Orphaned expenses with deleted category IDs
- UI shows expenses with no category information
- Category counts don't match after deletion

## Code Examples

Verified patterns from official sources:

### Database Initialization with Error Recovery
```typescript
// Source: Expo SQLite documentation - initialization pattern
export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  try {
    console.log('🔄 Initializing database...');
    const db = await SQLite.openDatabaseAsync(DATABASE_NAME);

    const hasExistingData = await isExistingDatabase(db);
    const currentVersion = await getSchemaVersion(db);

    if (hasExistingData && currentVersion < CURRENT_SCHEMA_VERSION) {
      try {
        await runMigrations(db, currentVersion);
        await setupDatabase(db);
        await setSchemaVersion(db, CURRENT_SCHEMA_VERSION);
      } catch (migrationError) {
        // Don't mask the error - throw with context
        throw new DatabaseError(
          'Database migration failed. Your data is safe but the app cannot start.',
          undefined,
          'migration',
          migrationError as Error
        );
      }
    } else if (!hasExistingData) {
      await setupDatabase(db);
      await initializeNewDatabase(db);
      await setSchemaVersion(db, CURRENT_SCHEMA_VERSION);
    }

    return db;
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    // Re-throw with context, don't swallow
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError(
      'Failed to initialize database',
      undefined,
      'init',
      error as Error
    );
  }
}
```

### Transaction-Protected Multi-Step Operation
```typescript
// Source: Expo SQLite documentation - withExclusiveTransactionAsync
export async function reassignAndDeleteCategory(
  db: SQLite.SQLiteDatabase,
  fromCategoryId: string,
  toCategory: { id: string; name: string; icon: string; color: string }
): Promise<void> {
  await db.withExclusiveTransactionAsync(async () => {
    const now = Date.now();

    // Step 1: Reassign all expenses
    await db.runAsync(
      `UPDATE expenses
       SET category_id = ?, category_name = ?, category_icon = ?, category_color = ?, updated_at = ?
       WHERE category_id = ?`,
      [toCategory.id, toCategory.name, toCategory.icon, toCategory.color, now, fromCategoryId]
    );

    // Step 2: Soft delete category
    await db.runAsync(
      'UPDATE custom_categories SET is_active = 0, updated_at = ? WHERE id = ?',
      [now, fromCategoryId]
    );

    // If either step fails, both automatically roll back
  });
}
```

### Error Handling with Actionable Messages
```typescript
// Source: SQLite error codes documentation + React Native best practices
export async function createExpense(
  db: SQLite.SQLiteDatabase,
  expense: ExpenseInput
): Promise<Expense> {
  try {
    // Input validation (fail fast)
    if (!expense.category) {
      throw new DatabaseError('Category is required', undefined, 'validation');
    }

    const amountNum = parseFloat(expense.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      throw new DatabaseError('Amount must be a positive number', undefined, 'validation');
    }

    const id = generateId();
    const timestamp = Date.now();
    const dateTimestamp = expense.date.getTime();

    await db.runAsync(
      `INSERT INTO expenses (id, amount, category_id, category_name, category_icon,
       category_color, date, note, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, expense.amount, expense.category.id, expense.category.name,
       expense.category.icon, expense.category.color, dateTimestamp,
       expense.note || null, timestamp, timestamp]
    );

    return {
      id,
      amount: expense.amount,
      category: expense.category,
      date: expense.date,
      note: expense.note,
    };
  } catch (error) {
    // Preserve original error but provide actionable message
    const sqliteError = error as { code?: number; message?: string };

    // Already a DatabaseError (validation), re-throw as-is
    if (error instanceof DatabaseError) {
      throw error;
    }

    // Map SQLite codes to user-friendly messages
    const userMessage = mapSQLiteErrorToUserMessage(sqliteError);

    throw new DatabaseError(
      userMessage,
      sqliteError.code,
      'create_expense',
      error as Error
    );
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| expo-sqlite legacy API (callbacks) | expo-sqlite 16.x async/await API | Expo SDK 50+ (2024) | Cleaner code, better error handling, TypeScript support |
| Single-level Error class | Error with `cause` property | ES2022 / TypeScript 4.8 | Preserve error chains, better debugging |
| `withTransactionAsync` everywhere | `withExclusiveTransactionAsync` for critical ops | Expo SQLite 16.x | Prevents accidental inclusion of external operations |
| Manual parameter escaping | Parameterized queries (always been standard) | N/A | Prevent SQL injection, required practice |
| AsyncStorage for migration tracking | Database schema_version table | Current codebase (good) | Single source of truth, no sync issues |

**Deprecated/outdated:**
- **expo-sqlite legacy API:** Callback-based API deprecated in favor of async/await (SDK 50+)
- **Separate migration tracking in AsyncStorage:** The codebase already migrated away from this - migrations are now tracked in the database itself via the schema_version table (current best practice)

## Open Questions

Things that couldn't be fully resolved:

1. **SQLite error codes in expo-sqlite**
   - What we know: SQLite returns standard error codes (SQLITE_BUSY=5, SQLITE_CONSTRAINT=19, etc.)
   - What's unclear: Does expo-sqlite 16.x expose these codes in the error object, or do we need to parse error.message?
   - Recommendation: Test by triggering known errors (unique constraint, locked database) and inspect error object structure. If codes aren't exposed, fall back to message parsing with careful regex.

2. **Busy timeout configuration**
   - What we know: SQLite supports `PRAGMA busy_timeout = milliseconds` to auto-retry on SQLITE_BUSY
   - What's unclear: Does expo-sqlite 16.x allow setting this pragma, and what's the default timeout?
   - Recommendation: Test with `db.execAsync('PRAGMA busy_timeout = 5000')` during initialization. If it works, set to 5000ms (5 seconds) to handle concurrent access gracefully.

3. **Transaction isolation level**
   - What we know: SQLite defaults to SERIALIZABLE isolation
   - What's unclear: Can expo-sqlite change isolation levels, and is it ever necessary for this app?
   - Recommendation: Default SERIALIZABLE is correct for this app (financial data requires strict consistency). Don't change unless specific performance issues emerge.

4. **WAL mode performance**
   - What we know: Expo docs recommend enabling WAL (Write-Ahead Logging) for better performance
   - What's unclear: Is WAL already enabled in the existing database, and would enabling it require migration?
   - Recommendation: Check with `db.getFirstAsync('PRAGMA journal_mode')`. If not WAL, enable it during initialization with `db.execAsync('PRAGMA journal_mode = WAL')` (non-breaking change).

## Sources

### Primary (HIGH confidence)
- [Expo SQLite Documentation](https://docs.expo.dev/versions/latest/sdk/sqlite/) - Official API reference, transaction patterns, initialization handlers
- [SQLite Result Codes](https://www.sqlite.org/rescode.html) - Official error code documentation, primary and extended codes
- [TypeScript Error Handling Best Practices 2025-2026](https://www.convex.dev/typescript/best-practices/error-handling-debugging/typescript-catch-error-type) - Custom error classes, cause property
- [Database Transactions Guide](https://blog.bytebytego.com/p/a-guide-to-database-transactions) - Transaction boundaries, ACID properties

### Secondary (MEDIUM confidence)
- [Expo SQLite Transaction Patterns](https://medium.com/@aargon007/expo-sqlite-a-complete-guide-for-offline-first-react-native-apps-984fd50e3adb) - Verified with official docs, transaction best practices
- [React Native SQLite Best Practices 2026](https://vibe.forem.com/eira-wexford/best-sqlite-solutions-for-react-native-app-development-in-2026-3b5l) - Industry recommendations, cross-referenced with official docs
- [Transaction Boundaries Best Practices](https://www.linkedin.com/advice/1/what-some-best-practices-designing-implementing-transactions) - Multi-step operation patterns

### Tertiary (LOW confidence - flagged for validation)
- GitHub issues on expo-sqlite transactions (#15498, #3726) - Community-reported issues, some from older versions
- Race condition discussions (#33754) - AsyncStorage-specific, may not apply to current implementation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - expo-sqlite 16.0.9 is verified from package.json, official Expo documentation confirms it's current
- Architecture: HIGH - Patterns from official Expo docs and SQLite documentation
- Pitfalls: HIGH - Verified in existing codebase (database.ts lines 157-178, all lib/db/models/* files)
- Error codes: MEDIUM - SQLite codes are standard, but expo-sqlite's exposure of them needs testing
- Transaction behavior: HIGH - Documented in official Expo SQLite reference

**Research date:** 2026-01-21
**Valid until:** 2026-03-21 (60 days - stable technology, official APIs unlikely to change significantly)
