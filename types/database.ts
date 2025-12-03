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
