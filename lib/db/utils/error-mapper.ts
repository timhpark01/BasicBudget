/**
 * Maps SQLite error codes to actionable user messages.
 *
 * Translates technical database errors into user-friendly messages that
 * help users understand what went wrong and how to recover.
 *
 * @module lib/db/utils/error-mapper
 */

import { isSQLiteError, isError } from '@/types/errors';

/**
 * Maps a SQLite error to a user-friendly, actionable message.
 *
 * Handles both primary SQLite error codes (e.g., 5, 19) and extended codes (e.g., 261, 2067).
 * Unknown error codes are logged to the console for debugging and future mapping.
 *
 * @param error - The error object from SQLite (typically has a `code` property)
 * @returns A user-friendly error message explaining what happened and how to recover
 *
 * @example
 * ```typescript
 * try {
 *   await db.runAsync('INSERT INTO ...');
 * } catch (error) {
 *   const userMessage = mapSQLiteErrorToUserMessage(error);
 *   toast.error(userMessage); // Show to user
 * }
 * ```
 *
 * @see https://www.sqlite.org/rescode.html - SQLite result codes documentation
 */
export function mapSQLiteErrorToUserMessage(error: unknown): string {
  // Type guard for safety
  if (!isSQLiteError(error)) {
    if (isError(error)) {
      console.error('Non-SQLite error:', error.message);
      return 'An unexpected error occurred. Please try again.';
    }
    console.error('Unknown error type:', error);
    return 'An unexpected error occurred. Please try again.';
  }

  const code = error.code;

  // Map SQLite error codes to actionable user messages
  // Using both primary codes and extended codes for comprehensive coverage
  switch (code) {
    // SQLITE_BUSY (5) and SQLITE_BUSY_RECOVERY (261)
    // Database is locked by another process or transaction
    case 5:
    case 261:
      return 'Database is busy. Please wait a moment and try again.';

    // SQLITE_CONSTRAINT (19)
    // Generic constraint violation (when specific type not available)
    case 19:
      return 'This operation would create duplicate data. Please check your input.';

    // SQLITE_CONSTRAINT_UNIQUE (2067)
    // Unique constraint violation (duplicate key)
    case 2067:
      return 'An entry with this information already exists.';

    // SQLITE_FULL (13)
    // Database or disk is full
    case 13:
      return 'Device storage is full. Please free up space and try again.';

    // SQLITE_CORRUPT (11)
    // Database file is malformed
    case 11:
      return 'Database error detected. Please contact support.';

    // SQLITE_NOMEM (7)
    // Memory allocation failed
    case 7:
      return 'Not enough memory available. Please close other apps and try again.';

    // Unknown error code - log for debugging and future mapping
    default:
      // Log unmapped errors to help discover new error scenarios
      console.error('Unmapped SQLite error:', code, error?.message);
      return 'An unexpected error occurred. Please try again.';
  }
}
