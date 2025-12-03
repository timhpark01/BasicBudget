import { Expense } from '@/types/database';

// Sample data for demonstration/testing
export const SAMPLE_EXPENSES: Expense[] = [
  {
    id: '1',
    amount: '45.50',
    category: { id: '1', name: 'Food', icon: 'restaurant', color: '#FF6B6B' },
    date: new Date(2025, 11, 3),
    note: 'Dinner at restaurant',
  },
  {
    id: '2',
    amount: '12.00',
    category: { id: '2', name: 'Transport', icon: 'car', color: '#4ECDC4' },
    date: new Date(2025, 11, 3),
    note: 'Uber to work',
  },
  {
    id: '3',
    amount: '89.99',
    category: { id: '3', name: 'Shopping', icon: 'cart', color: '#45B7D1' },
    date: new Date(2025, 11, 2),
    note: 'New shoes',
  },
  {
    id: '4',
    amount: '25.00',
    category: { id: '4', name: 'Entertainment', icon: 'game-controller', color: '#F7B731' },
    date: new Date(2025, 11, 2),
    note: 'Movie tickets',
  },
  {
    id: '5',
    amount: '120.00',
    category: { id: '5', name: 'Bills', icon: 'receipt', color: '#5F27CD' },
    date: new Date(2025, 11, 1),
    note: 'Electric bill',
  },
];
