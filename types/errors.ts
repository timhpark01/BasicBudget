/**
 * Type definitions for error handling across the app.
 *
 * This module provides type-safe error handling utilities including
 * type guards and error interfaces for SQLite and database operations.
 *
 * @module types/errors
 */

/**
 * SQLite error from expo-sqlite with error code.
 *
 * SQLite errors include a numeric or string error code that
 * corresponds to SQLite result codes (e.g., 5 = BUSY, 19 = CONSTRAINT).
 *
 * @see https://www.sqlite.org/rescode.html - SQLite result codes
 */
export interface SQLiteError extends Error {
  /** SQLite error code (e.g., 5, 19, 2067) */
  code?: number | string;
  /** Error message from SQLite */
  message: string;
}

/**
 * Generic database operation error.
 *
 * Used for wrapping database errors with additional context
 * about which operation failed.
 */
export interface DatabaseOperationError extends Error {
  /** The database operation that failed (e.g., 'create_expense') */
  operation?: string;
  /** The underlying error that caused this error */
  cause?: Error;
}

/**
 * Type guard to check if an error is a SQLite error.
 *
 * @param error - Unknown error to check
 * @returns True if error is a SQLite error with a code property
 *
 * @example
 * ```typescript
 * try {
 *   await db.runAsync('INSERT ...');
 * } catch (error: unknown) {
 *   if (isSQLiteError(error)) {
 *     console.log('SQLite error code:', error.code);
 *   }
 * }
 * ```
 */
export function isSQLiteError(error: unknown): error is SQLiteError {
  return (
    error instanceof Error &&
    'code' in error &&
    (typeof error.code === 'number' || typeof error.code === 'string')
  );
}

/**
 * Type guard to check if an error is a standard Error object.
 *
 * @param error - Unknown error to check
 * @returns True if error is an Error instance
 *
 * @example
 * ```typescript
 * try {
 *   // some operation
 * } catch (error: unknown) {
 *   if (isError(error)) {
 *     console.error('Error message:', error.message);
 *   } else {
 *     console.error('Unknown error:', error);
 *   }
 * }
 * ```
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}
