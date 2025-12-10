/**
 * Test utilities and custom render functions
 */

import React from 'react';
import { render, RenderOptions } from '@testing-library/react-native';

/**
 * Custom render function that wraps components with necessary providers
 * Add any global providers here (e.g., Theme, Navigation, etc.)
 */
export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  // For now, we don't have any global providers
  // But this is the place to add them if needed in the future
  return render(ui, options);
}

/**
 * Helper to wait for a condition with timeout
 */
export async function waitForCondition(
  condition: () => boolean,
  timeout: number = 5000
): Promise<void> {
  const startTime = Date.now();

  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Timeout waiting for condition');
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

/**
 * Helper to create a mock date that can be used consistently in tests
 */
export function createMockDate(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day); // month is 0-indexed
}

/**
 * Helper to format date as YYYY-MM (for budget month format)
 */
export function formatMonthKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Helper to create a date from month key (YYYY-MM)
 */
export function parseMonthKey(monthKey: string): Date {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year, month - 1, 1);
}

/**
 * Re-export everything from @testing-library/react-native
 */
export * from '@testing-library/react-native';

/**
 * Custom matchers and utilities can be added here
 */
