import { Ionicons } from '@expo/vector-icons';

// Recurrence frequency type
export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

// Category interface
export interface Category {
  id: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

// Expense interface (application-level)
export interface Expense {
  id: string;
  amount: string;
  category: Category;
  date: Date;
  note: string;
  recurringExpenseId?: string; // Link to parent recurring expense
}

// Database row interface (raw data from SQLite)
export interface ExpenseRow {
  id: string;
  amount: string;
  category_id: string;
  category_name: string;
  category_icon: string;
  category_color: string;
  date: number; // Unix timestamp in milliseconds
  note: string | null;
  recurring_expense_id: string | null; // Link to parent recurring expense
  created_at: number;
  updated_at: number;
}

// Input type for creating/updating expenses
export interface ExpenseInput {
  amount: string;
  category: Category | null;
  date: Date;
  note: string;
}

// Budget interface (application-level)
export interface Budget {
  id: string;
  month: string; // "YYYY-MM" format
  budgetAmount: string;
  createdAt: Date;
  updatedAt: Date;
}

// Database row interface (raw data from SQLite)
export interface BudgetRow {
  id: string;
  month: string;
  budget_amount: string;
  created_at: number; // Unix timestamp in milliseconds
  updated_at: number; // Unix timestamp in milliseconds
}

// Input type for creating/updating budgets
export interface BudgetInput {
  month: string; // "YYYY-MM" format
  budgetAmount: string;
}

// Custom Category interface (application-level)
export interface CustomCategory extends Category {
  position: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Database row interface for custom categories (raw data from SQLite)
export interface CustomCategoryRow {
  id: string;
  name: string;
  icon: string;
  color: string;
  position: number;
  is_active: number; // SQLite boolean (0 or 1)
  created_at: number; // Unix timestamp in milliseconds
  updated_at: number; // Unix timestamp in milliseconds
}

// Input type for creating/updating custom categories
export interface CustomCategoryInput {
  name: string;
  icon: string;
  color: string;
  position?: number;
}

// Category Budget interface (application-level)
export interface CategoryBudget {
  id: string;
  month: string; // "YYYY-MM" format
  categoryId: string;
  budgetAmount: string;
  createdAt: Date;
  updatedAt: Date;
}

// Database row interface for category budgets (raw data from SQLite)
export interface CategoryBudgetRow {
  id: string;
  month: string;
  category_id: string;
  budget_amount: string;
  created_at: number; // Unix timestamp in milliseconds
  updated_at: number; // Unix timestamp in milliseconds
}

// Input type for creating/updating category budgets
export interface CategoryBudgetInput {
  month: string; // "YYYY-MM" format
  categoryId: string;
  budgetAmount: string;
}

// Recurring Expense interface (application-level)
export interface RecurringExpense {
  id: string;
  amount: string;
  category: Category;
  note: string;
  frequency: RecurrenceFrequency;
  dayOfWeek?: number; // 0-6 for weekly (0=Sunday)
  dayOfMonth?: number; // 1-31 for monthly/yearly
  monthOfYear?: number; // 1-12 for yearly
  startDate: Date;
  endDate?: Date;
  lastGeneratedDate?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Database row interface for recurring expenses (raw data from SQLite)
export interface RecurringExpenseRow {
  id: string;
  amount: string;
  category_id: string;
  category_name: string;
  category_icon: string;
  category_color: string;
  note: string | null;
  frequency: string;
  day_of_week: number | null;
  day_of_month: number | null;
  month_of_year: number | null;
  start_date: number; // Unix timestamp in milliseconds
  end_date: number | null; // Unix timestamp in milliseconds
  last_generated_date: number | null; // Unix timestamp in milliseconds
  is_active: number; // SQLite boolean (0 or 1)
  created_at: number; // Unix timestamp in milliseconds
  updated_at: number; // Unix timestamp in milliseconds
}

// Input type for creating/updating recurring expenses
export interface RecurringExpenseInput {
  amount: string;
  category: Category | null;
  note: string;
  frequency: RecurrenceFrequency;
  dayOfWeek?: number;
  dayOfMonth?: number;
  monthOfYear?: number;
  startDate: Date;
  endDate?: Date;
}
