import Papa from 'papaparse';

export interface ParsedTransaction {
  date: Date;
  categoryName: string;
  description: string;
  amount: string; // Keep as string (DB format)
  rawRow: number; // For error reporting
}

export interface InvalidRow {
  row: number;
  data: CSVRow;
  errors: string[];
}

export interface ParseResult {
  valid: ParsedTransaction[];
  invalid: InvalidRow[];
  unmappedCategories: string[]; // Unique category names not found in DB
}

export interface CSVRow {
  date?: string;
  category?: string;
  description?: string;
  amount?: string;
}

/**
 * Attempts to parse a date string in multiple common formats
 */
function parseDateString(dateStr: string): Date | null {
  const trimmed = dateStr.trim();

  // Try YYYY-MM-DD format (ISO standard)
  const isoRegex = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
  const isoMatch = trimmed.match(isoRegex);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1; // JS months are 0-indexed
    const day = parseInt(isoMatch[3], 10);
    const date = new Date(year, month, day);
    if (!isNaN(date.getTime()) && date.getMonth() === month && date.getDate() === day) {
      return date;
    }
  }

  // Try MM/DD/YYYY format (US format)
  const usRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  const usMatch = trimmed.match(usRegex);
  if (usMatch) {
    const month = parseInt(usMatch[1], 10) - 1; // JS months are 0-indexed
    const day = parseInt(usMatch[2], 10);
    const year = parseInt(usMatch[3], 10);
    const date = new Date(year, month, day);
    if (!isNaN(date.getTime()) && date.getMonth() === month && date.getDate() === day) {
      return date;
    }
  }

  // Try DD/MM/YYYY format (European format)
  const euRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  const euMatch = trimmed.match(euRegex);
  if (euMatch) {
    const day = parseInt(euMatch[1], 10);
    const month = parseInt(euMatch[2], 10) - 1; // JS months are 0-indexed
    const year = parseInt(euMatch[3], 10);
    // Check if day > 12 to distinguish from US format
    if (day > 12 || month > 11) {
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime()) && date.getMonth() === month && date.getDate() === day) {
        return date;
      }
    }
  }

  // Try DD-MM-YYYY format (dash variant)
  const euDashRegex = /^(\d{1,2})-(\d{1,2})-(\d{4})$/;
  const euDashMatch = trimmed.match(euDashRegex);
  if (euDashMatch) {
    const day = parseInt(euDashMatch[1], 10);
    const month = parseInt(euDashMatch[2], 10) - 1; // JS months are 0-indexed
    const year = parseInt(euDashMatch[3], 10);
    const date = new Date(year, month, day);
    if (!isNaN(date.getTime()) && date.getMonth() === month && date.getDate() === day) {
      return date;
    }
  }

  // Try YYYY/MM/DD format (slash variant)
  const isoSlashRegex = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/;
  const isoSlashMatch = trimmed.match(isoSlashRegex);
  if (isoSlashMatch) {
    const year = parseInt(isoSlashMatch[1], 10);
    const month = parseInt(isoSlashMatch[2], 10) - 1; // JS months are 0-indexed
    const day = parseInt(isoSlashMatch[3], 10);
    const date = new Date(year, month, day);
    if (!isNaN(date.getTime()) && date.getMonth() === month && date.getDate() === day) {
      return date;
    }
  }

  return null;
}

/**
 * Validates a date string in multiple common formats
 * Accepts: YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY, DD-MM-YYYY, YYYY/MM/DD
 */
function validateDateField(dateStr: string | undefined): { valid: boolean; value?: Date; error?: string } {
  if (!dateStr || dateStr.trim().length === 0) {
    return { valid: false, error: 'Date is required' };
  }

  // Try parsing the date in multiple formats
  const date = parseDateString(dateStr);

  if (!date) {
    return { valid: false, error: 'Invalid date format. Accepted formats: YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY' };
  }

  // Allow dates up to 1 year in the future
  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
  if (date > oneYearFromNow) {
    return { valid: false, error: 'Date too far in future' };
  }

  return { valid: true, value: date };
}

/**
 * Validates a category string
 */
function validateCategoryField(categoryStr: string | undefined): { valid: boolean; value?: string; error?: string } {
  if (!categoryStr || categoryStr.trim().length === 0) {
    return { valid: false, error: 'Category is required' };
  }

  const trimmed = categoryStr.trim();

  if (trimmed.length > 50) {
    return { valid: false, error: 'Category name too long (max 50 characters)' };
  }

  return { valid: true, value: trimmed };
}

/**
 * Validates an amount string
 */
function validateAmountField(amountStr: string | undefined): { valid: boolean; value?: string; error?: string } {
  if (!amountStr || amountStr.trim().length === 0) {
    return { valid: false, error: 'Amount is required' };
  }

  // Remove common currency symbols and whitespace
  const cleaned = amountStr.trim().replace(/[$,\s]/g, '');

  // Parse to number
  const num = parseFloat(cleaned);

  if (isNaN(num)) {
    return { valid: false, error: 'Amount must be a number' };
  }

  if (num <= 0) {
    return { valid: false, error: 'Amount must be positive' };
  }

  if (num > 9999999999999.99) {
    return { valid: false, error: 'Amount too large' };
  }

  // Return as string with 2 decimal places (matching DB format)
  return { valid: true, value: num.toFixed(2) };
}

/**
 * Validates a description string (optional field)
 */
function validateDescriptionField(descStr: string | undefined): { valid: boolean; value?: string; error?: string } {
  const trimmed = (descStr || '').trim();

  // Description is optional
  if (trimmed.length === 0) {
    return { valid: true, value: '' };
  }

  if (trimmed.length > 500) {
    return { valid: false, error: 'Description too long (max 500 characters)' };
  }

  return { valid: true, value: trimmed };
}

/**
 * Validates a single CSV row
 */
function validateCSVRow(row: CSVRow, rowIndex: number): {
  valid: boolean;
  transaction?: ParsedTransaction;
  errors?: string[];
} {
  const errors: string[] = [];

  // Validate each field
  const dateValidation = validateDateField(row.date);
  const categoryValidation = validateCategoryField(row.category);
  const amountValidation = validateAmountField(row.amount);
  const descriptionValidation = validateDescriptionField(row.description);

  // Collect errors
  if (!dateValidation.valid) errors.push(dateValidation.error!);
  if (!categoryValidation.valid) errors.push(categoryValidation.error!);
  if (!amountValidation.valid) errors.push(amountValidation.error!);
  if (!descriptionValidation.valid) errors.push(descriptionValidation.error!);

  // If any errors, return invalid
  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // All valid, create transaction
  return {
    valid: true,
    transaction: {
      date: dateValidation.value!,
      categoryName: categoryValidation.value!,
      description: descriptionValidation.value!,
      amount: amountValidation.value!,
      rawRow: rowIndex,
    },
  };
}

/**
 * Parses CSV content and validates each row
 * @param csvContent - The raw CSV string content
 * @returns ParseResult with valid transactions, invalid rows, and unmapped categories
 */
export function parseCSVContent(csvContent: string): ParseResult {
  const result: ParseResult = {
    valid: [],
    invalid: [],
    unmappedCategories: [],
  };

  // Parse CSV using papaparse
  const parseResult = Papa.parse<CSVRow>(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => {
      // Normalize headers: trim and lowercase for case-insensitive matching
      return header.trim().toLowerCase();
    },
    transform: (value) => {
      // Trim all cell values
      return value.trim();
    },
  });

  // Check for parsing errors
  if (parseResult.errors && parseResult.errors.length > 0) {
    // If there are critical parse errors, throw
    const criticalErrors = parseResult.errors.filter(
      (err) => err.type === 'Delimiter' || err.type === 'FieldMismatch'
    );
    if (criticalErrors.length > 0) {
      throw new Error(`CSV parsing error: ${criticalErrors[0].message}`);
    }
  }

  // Check for required columns
  const requiredColumns = ['date', 'category', 'description', 'amount'];
  const headers = parseResult.meta.fields || [];
  const missingColumns = requiredColumns.filter((col) => !headers.includes(col));

  if (missingColumns.length > 0) {
    throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
  }

  // Validate each row
  const uniqueCategories = new Set<string>();

  parseResult.data.forEach((row, index) => {
    // Skip completely empty rows
    if (!row.date && !row.category && !row.description && !row.amount) {
      return;
    }

    const validation = validateCSVRow(row, index + 2); // +2 because: +1 for 1-based, +1 for header

    if (validation.valid && validation.transaction) {
      result.valid.push(validation.transaction);
      uniqueCategories.add(validation.transaction.categoryName);
    } else {
      result.invalid.push({
        row: index + 2,
        data: row,
        errors: validation.errors || ['Unknown validation error'],
      });
    }
  });

  // Collect unique category names for mapping step
  result.unmappedCategories = Array.from(uniqueCategories).sort();

  return result;
}
