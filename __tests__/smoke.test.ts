/**
 * Smoke test to verify Jest is working correctly
 */

describe('Test Infrastructure', () => {
  it('should run tests successfully', () => {
    expect(true).toBe(true);
  });

  it('should perform basic arithmetic', () => {
    expect(1 + 1).toBe(2);
    expect(10 - 5).toBe(5);
    expect(2 * 3).toBe(6);
    expect(10 / 2).toBe(5);
  });

  it('should handle strings', () => {
    const message = 'Hello, World!';
    expect(message).toBe('Hello, World!');
    expect(message.length).toBe(13);
    expect(message.toLowerCase()).toBe('hello, world!');
  });

  it('should handle arrays', () => {
    const numbers = [1, 2, 3, 4, 5];
    expect(numbers).toHaveLength(5);
    expect(numbers[0]).toBe(1);
    expect(numbers).toContain(3);
  });

  it('should handle objects', () => {
    const person = { name: 'John', age: 30 };
    expect(person.name).toBe('John');
    expect(person.age).toBe(30);
    expect(person).toHaveProperty('name');
  });

  it('should handle async operations', async () => {
    const promise = Promise.resolve(42);
    await expect(promise).resolves.toBe(42);
  });
});

describe('Mock Data', () => {
  it('should import mock data successfully', () => {
    const { MOCK_EXPENSES, MOCK_BUDGETS, MOCK_PROFILE } = require('./utils/mock-data');

    expect(MOCK_EXPENSES).toBeDefined();
    expect(Array.isArray(MOCK_EXPENSES)).toBe(true);
    expect(MOCK_EXPENSES.length).toBeGreaterThan(0);

    expect(MOCK_BUDGETS).toBeDefined();
    expect(Array.isArray(MOCK_BUDGETS)).toBe(true);
    expect(MOCK_BUDGETS.length).toBeGreaterThan(0);

    expect(MOCK_PROFILE).toBeDefined();
    expect(MOCK_PROFILE).toHaveProperty('name');
    expect(MOCK_PROFILE).toHaveProperty('email');
  });

  it('should have valid expense structure', () => {
    const { MOCK_EXPENSE_1 } = require('./utils/mock-data');

    expect(MOCK_EXPENSE_1).toHaveProperty('id');
    expect(MOCK_EXPENSE_1).toHaveProperty('amount');
    expect(MOCK_EXPENSE_1).toHaveProperty('category');
    expect(MOCK_EXPENSE_1).toHaveProperty('date');
    expect(MOCK_EXPENSE_1).toHaveProperty('note');
    expect(MOCK_EXPENSE_1.category).toHaveProperty('name');
  });
});

describe('Database Mocks', () => {
  it('should have AsyncStorage mock', () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;

    expect(AsyncStorage).toBeDefined();
    expect(AsyncStorage.getItem).toBeDefined();
    expect(AsyncStorage.setItem).toBeDefined();
    expect(AsyncStorage.clear).toBeDefined();
  });

  it('should have SQLite mock', () => {
    const SQLite = require('expo-sqlite').default;

    expect(SQLite).toBeDefined();
    expect(SQLite.openDatabaseAsync).toBeDefined();
  });
});
