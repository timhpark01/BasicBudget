/**
 * Format a number or string with commas as thousands separators
 * @param value - Number or string to format
 * @returns Formatted string with commas (e.g., "1,000" or "1,000.50")
 */
export function formatNumberWithCommas(value: string | number): string {
  // Convert to string if number
  const stringValue = typeof value === 'number' ? value.toString() : value;

  // Split into integer and decimal parts
  const parts = stringValue.split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1];

  // Add commas to integer part
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  // Rejoin with decimal if present
  return decimalPart !== undefined ? `${formattedInteger}.${decimalPart}` : formattedInteger;
}

/**
 * Format a currency amount with dollar sign and commas
 * @param value - Number or string to format
 * @param decimals - Number of decimal places to show (default: 2)
 * @returns Formatted currency string (e.g., "$1,000.00")
 */
export function formatCurrency(value: string | number, decimals: number = 2): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(numValue)) {
    return '$0.00';
  }

  const formatted = numValue.toFixed(decimals);
  return `$${formatNumberWithCommas(formatted)}`;
}

/**
 * Check if adding a digit to the current amount would exceed the maximum decimal places
 * @param currentAmount - Current amount string
 * @param maxDecimals - Maximum decimal places allowed (default: 2)
 * @returns True if the digit can be added, false otherwise
 */
export function canAddDecimalDigit(currentAmount: string, maxDecimals: number = 2): boolean {
  const decimalIndex = currentAmount.indexOf('.');

  // If no decimal point, can always add digits
  if (decimalIndex === -1) {
    return true;
  }

  // Count digits after decimal point
  const digitsAfterDecimal = currentAmount.length - decimalIndex - 1;

  // Can add if we haven't reached the max decimal places
  return digitsAfterDecimal < maxDecimals;
}

/**
 * Sanitize text input to ensure it has no more than the maximum decimal places
 * Used for TextInput components with decimal-pad keyboard
 * @param value - Input value to sanitize
 * @param maxDecimals - Maximum decimal places allowed (default: 2)
 * @returns Sanitized value with at most maxDecimals decimal places
 */
export function sanitizeDecimalInput(value: string, maxDecimals: number = 2): string {
  // Remove all characters except digits and decimal point
  let sanitized = value.replace(/[^\d.]/g, '');

  // Split by decimal point
  const parts = sanitized.split('.');

  // If no decimal point, return as is
  if (parts.length === 1) {
    return parts[0];
  }

  // If multiple decimal points, keep only the first one
  const integerPart = parts[0];
  const decimalPart = parts.slice(1).join('');

  // Limit decimal places
  const limitedDecimal = decimalPart.slice(0, maxDecimals);

  return limitedDecimal ? `${integerPart}.${limitedDecimal}` : integerPart;
}
