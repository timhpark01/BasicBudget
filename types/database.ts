import { Ionicons } from '@expo/vector-icons';

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
