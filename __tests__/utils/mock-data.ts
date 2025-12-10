/**
 * Mock data for testing
 * Provides sample expenses, budgets, categories, and other test data
 */

import { Expense, Budget, Category, CustomCategory } from '@/types/database';
import { CATEGORIES } from '@/constants/categories';

// ============================================================================
// Categories
// ============================================================================

export const MOCK_CATEGORIES = CATEGORIES;

export const MOCK_FOOD_CATEGORY: Category = CATEGORIES[0]; // Food
export const MOCK_TRANSPORT_CATEGORY: Category = CATEGORIES[1]; // Transport
export const MOCK_SHOPPING_CATEGORY: Category = CATEGORIES[2]; // Shopping
export const MOCK_OTHER_CATEGORY: Category = CATEGORIES[11]; // Other

export const MOCK_CUSTOM_CATEGORY: CustomCategory = {
  id: 'custom_1234567890_abc123',
  name: 'Coffee',
  icon: 'cafe',
  color: '#8B4513',
  position: 12,
  isActive: true,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z')
};

export const MOCK_CUSTOM_CATEGORY_2: CustomCategory = {
  id: 'custom_1234567890_def456',
  name: 'Subscriptions',
  icon: 'card',
  color: '#9B59B6',
  position: 13,
  isActive: true,
  createdAt: new Date('2024-01-02T00:00:00.000Z'),
  updatedAt: new Date('2024-01-02T00:00:00.000Z')
};

export const MOCK_INACTIVE_CUSTOM_CATEGORY: CustomCategory = {
  id: 'custom_1234567890_ghi789',
  name: 'Deleted Category',
  icon: 'trash',
  color: '#999999',
  position: 14,
  isActive: false,
  createdAt: new Date('2024-01-03T00:00:00.000Z'),
  updatedAt: new Date('2024-01-03T00:00:00.000Z')
};

// ============================================================================
// Expenses
// ============================================================================

export const MOCK_EXPENSE_1: Expense = {
  id: 'expense_1',
  amount: '25.50',
  category: MOCK_FOOD_CATEGORY,
  date: new Date('2024-12-01T12:00:00.000Z'),
  note: 'Lunch at restaurant'
};

export const MOCK_EXPENSE_2: Expense = {
  id: 'expense_2',
  amount: '50.00',
  category: MOCK_TRANSPORT_CATEGORY,
  date: new Date('2024-12-02T09:00:00.000Z'),
  note: 'Gas for car'
};

export const MOCK_EXPENSE_3: Expense = {
  id: 'expense_3',
  amount: '120.00',
  category: MOCK_SHOPPING_CATEGORY,
  date: new Date('2024-12-03T15:30:00.000Z'),
  note: 'New shoes'
};

export const MOCK_EXPENSE_4: Expense = {
  id: 'expense_4',
  amount: '15.99',
  category: MOCK_FOOD_CATEGORY,
  date: new Date('2024-12-04T18:00:00.000Z'),
  note: 'Groceries'
};

export const MOCK_EXPENSE_5: Expense = {
  id: 'expense_5',
  amount: '200.00',
  category: CATEGORIES[4], // Bills
  date: new Date('2024-11-15T00:00:00.000Z'),
  note: 'Electricity bill'
};

export const MOCK_EXPENSE_WITH_CUSTOM_CATEGORY: Expense = {
  id: 'expense_6',
  amount: '5.50',
  category: MOCK_CUSTOM_CATEGORY,
  date: new Date('2024-12-05T08:00:00.000Z'),
  note: 'Morning coffee'
};

export const MOCK_EXPENSES: Expense[] = [
  MOCK_EXPENSE_1,
  MOCK_EXPENSE_2,
  MOCK_EXPENSE_3,
  MOCK_EXPENSE_4,
  MOCK_EXPENSE_5,
  MOCK_EXPENSE_WITH_CUSTOM_CATEGORY
];

// ============================================================================
// Budgets
// ============================================================================

export const MOCK_BUDGET_CURRENT_MONTH: Budget = {
  id: 'budget_1',
  month: '2024-12',
  amount: '1000.00',
  createdAt: new Date('2024-12-01T00:00:00.000Z'),
  updatedAt: new Date('2024-12-01T00:00:00.000Z')
};

export const MOCK_BUDGET_PREVIOUS_MONTH: Budget = {
  id: 'budget_2',
  month: '2024-11',
  amount: '950.00',
  createdAt: new Date('2024-11-01T00:00:00.000Z'),
  updatedAt: new Date('2024-11-01T00:00:00.000Z')
};

export const MOCK_BUDGET_NEXT_MONTH: Budget = {
  id: 'budget_3',
  month: '2025-01',
  amount: '1100.00',
  createdAt: new Date('2024-12-15T00:00:00.000Z'),
  updatedAt: new Date('2024-12-15T00:00:00.000Z')
};

export const MOCK_BUDGETS: Budget[] = [
  MOCK_BUDGET_CURRENT_MONTH,
  MOCK_BUDGET_PREVIOUS_MONTH,
  MOCK_BUDGET_NEXT_MONTH
];

// ============================================================================
// Profile
// ============================================================================

export const MOCK_PROFILE: Profile = {
  name: 'John Doe',
  email: 'john.doe@example.com'
};

export const MOCK_PROFILE_NO_EMAIL: Profile = {
  name: 'Jane Smith',
  email: ''
};

export const MOCK_PROFILE_EMPTY: Profile = {
  name: '',
  email: ''
};

// ============================================================================
// Notification Preferences
// ============================================================================

export const MOCK_NOTIFICATION_PREFERENCES_ALL_ENABLED: NotificationPreferences = {
  budgetWarnings: true,
  dailyReminder: true,
  weeklyReport: true
};

export const MOCK_NOTIFICATION_PREFERENCES_ALL_DISABLED: NotificationPreferences = {
  budgetWarnings: false,
  dailyReminder: false,
  weeklyReport: false
};

export const MOCK_NOTIFICATION_PREFERENCES_PARTIAL: NotificationPreferences = {
  budgetWarnings: true,
  dailyReminder: false,
  weeklyReport: true
};

// ============================================================================
// Database Row Formats (for testing database layer)
// ============================================================================

export const MOCK_EXPENSE_ROW_1 = {
  id: 'expense_1',
  amount: '25.50',
  category_id: '1',
  category_name: 'Food',
  category_icon: 'restaurant',
  category_color: '#FF6B6B',
  date: new Date('2024-12-01T12:00:00.000Z').getTime(),
  note: 'Lunch at restaurant'
};

export const MOCK_BUDGET_ROW_1 = {
  id: 'budget_1',
  month: '2024-12',
  amount: '1000.00',
  created_at: new Date('2024-12-01T00:00:00.000Z').getTime(),
  updated_at: new Date('2024-12-01T00:00:00.000Z').getTime()
};

export const MOCK_CUSTOM_CATEGORY_ROW_1 = {
  id: 'custom_1234567890_abc123',
  name: 'Coffee',
  icon: 'cafe',
  color: '#8B4513',
  is_active: 1,
  created_at: new Date('2024-01-01T00:00:00.000Z').getTime(),
  updated_at: new Date('2024-01-01T00:00:00.000Z').getTime()
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Creates a mock expense with custom properties
 */
export function createMockExpense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: `expense_${Date.now()}`,
    amount: '100.00',
    category: MOCK_FOOD_CATEGORY,
    date: new Date(),
    note: 'Test expense',
    ...overrides
  };
}

/**
 * Creates a mock budget with custom properties
 */
export function createMockBudget(overrides: Partial<Budget> = {}): Budget {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  return {
    id: `budget_${Date.now()}`,
    month,
    amount: '1000.00',
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

/**
 * Creates a mock custom category with custom properties
 */
export function createMockCustomCategory(
  overrides: Partial<CustomCategory> = {}
): CustomCategory {
  const now = new Date();

  return {
    id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: 'Test Category',
    icon: 'wallet',
    color: '#355e3b',
    position: 12,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

/**
 * Creates an array of mock expenses for a given month
 */
export function createMockExpensesForMonth(
  year: number,
  month: number,
  count: number = 5
): Expense[] {
  const expenses: Expense[] = [];

  for (let i = 0; i < count; i++) {
    const day = Math.floor(Math.random() * 28) + 1;
    const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
    const amount = (Math.random() * 100 + 10).toFixed(2);

    expenses.push({
      id: `expense_${year}${month}${day}_${i}`,
      amount,
      category,
      date: new Date(year, month - 1, day),
      note: `Test expense ${i + 1}`
    });
  }

  return expenses;
}

/**
 * Calculates total amount from an array of expenses
 */
export function calculateExpensesTotal(expenses: Expense[]): number {
  return expenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
}

/**
 * Filters expenses by month
 */
export function filterExpensesByMonth(expenses: Expense[], month: string): Expense[] {
  return expenses.filter((expense) => {
    const expenseMonth = `${expense.date.getFullYear()}-${String(
      expense.date.getMonth() + 1
    ).padStart(2, '0')}`;
    return expenseMonth === month;
  });
}
