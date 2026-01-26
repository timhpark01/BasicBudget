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
  data: any;
  errors: string[];
}

export interface ParseResult {
  valid: ParsedTransaction[];
  invalid: InvalidRow[];
  unmappedCategories: string[]; // Unique category names not found in DB
}

interface CSVRow {
  date?: string;
  category?: string;
  description?: string;
  amount?: string;
}

/**
 * Validates a date string in YYYY-MM-DD format
 */
function validateDateField(dateStr: string | undefined): { valid: boolean; value?: Date; error?: string } {
  if (!dateStr || dateStr.trim().length === 0) {
    return { valid: false, error: 'Date is required' };
  }

  // Check format: YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateStr.trim())) {
    return { valid: false, error: 'Date must be in YYYY-MM-DD format' };
  }

  // Parse and validate
  const date = new Date(dateStr.trim() + 'T00:00:00');
  if (isNaN(date.getTime())) {
    return { valid: false, error: 'Invalid date' };
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
