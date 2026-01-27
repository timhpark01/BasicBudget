/**
 * Custom error classes for database operations.
 *
 * Provides type-safe error handling that preserves SQLite error context
 * and enables specific error recovery strategies.
 *
 * @module lib/db/core/errors
 */

/**
 * Base error class for all database operations.
 *
 * Preserves original SQLite error information via the `cause` property
 * instead of losing it with console.error + throw new Error.
 *
 * @example
 * ```typescript
 * import { isSQLiteError } from '@/types/errors';
 *
 * try {
 *   await db.runAsync('INSERT INTO ...');
 * } catch (error: unknown) {
 *   throw new DatabaseError(
 *     'Failed to create expense',
 *     isSQLiteError(error) ? error.code : undefined,
 *     'create_expense',
 *     error instanceof Error ? error : undefined
 *   );
 * }
 * ```
 */
export class DatabaseError extends Error {
  /**
   * SQLite error code (e.g., 5 for SQLITE_BUSY, 19 for SQLITE_CONSTRAINT)
   */
  public readonly code?: string | number;

  /**
   * Database operation that failed (e.g., 'create_expense', 'migration')
   */
  public readonly operation?: string;

  /**
   * Original error that caused this error (preserves stack trace)
   */
  public readonly cause?: Error;

  constructor(
    message: string,
    code?: string | number,
    operation?: string,
    cause?: Error
  ) {
    super(message);
    this.name = 'DatabaseError';
    this.code = code;
    this.operation = operation;
    this.cause = cause;

    // Fix prototype chain for instanceof checks to work correctly with TypeScript
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}

/**
 * Error thrown when a database constraint is violated.
 *
 * Common constraint types:
 * - unique: Duplicate key violation
 * - foreign_key: Reference to non-existent row
 * - not_null: Required field is null
 * - check: Custom constraint validation failed
 *
 * @example
 * ```typescript
 * if (sqliteError.code === 2067) { // SQLITE_CONSTRAINT_UNIQUE
 *   throw new DatabaseConstraintError(
 *     'An expense category with this name already exists',
 *     'unique',
 *     error as Error
 *   );
 * }
 * ```
 */
export class DatabaseConstraintError extends DatabaseError {
  /**
   * Type of constraint that was violated
   */
  public readonly constraintType: 'unique' | 'foreign_key' | 'not_null' | 'check';

  constructor(
    message: string,
    constraintType: 'unique' | 'foreign_key' | 'not_null' | 'check',
    cause?: Error
  ) {
    super(message, undefined, 'constraint_violation', cause);
    this.name = 'DatabaseConstraintError';
    this.constraintType = constraintType;

    // Fix prototype chain for instanceof checks
    Object.setPrototypeOf(this, DatabaseConstraintError.prototype);
  }
}

/**
 * Error thrown when the database is locked and cannot be accessed.
 *
 * This typically happens when:
 * - Multiple processes try to write simultaneously
 * - A long-running transaction is holding a lock
 * - The database is being backed up
 *
 * Recovery strategy: Retry after a short delay (SQLite's busy_timeout handles this automatically)
 *
 * @example
 * ```typescript
 * if (sqliteError.code === 5 || sqliteError.code === 261) { // SQLITE_BUSY
 *   throw new DatabaseLockError(
 *     'Database is temporarily locked',
 *     error as Error
 *   );
 * }
 * ```
 */
export class DatabaseLockError extends DatabaseError {
  constructor(message: string, cause?: Error) {
    super(message, undefined, 'database_locked', cause);
    this.name = 'DatabaseLockError';

    // Fix prototype chain for instanceof checks
    Object.setPrototypeOf(this, DatabaseLockError.prototype);
  }
}
