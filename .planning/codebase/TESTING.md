# Testing Patterns

**Analysis Date:** 2026-01-21

## Test Framework

**Runner:**
- Jest 29.7.0
- Config: `jest.config.js`

**Assertion Library:**
- Jest built-in matchers

**Additional Libraries:**
- `@testing-library/react-native` 12.9.0 - React Native component testing
- `react-test-renderer` 19.1.0 - React component rendering
- `jest-expo` 54.0.16 - Expo-specific Jest preset

**Run Commands:**
```bash
npm test                # Run all tests
npm run test:watch      # Watch mode
npm run test:coverage   # Generate coverage report
npm run test:coverage-html  # Generate HTML coverage report
```

## Test File Organization

**Location:**
- Tests located in `__tests__/` directory at project root
- Separate from source code (not co-located)
- Mocks in `__mocks__/` directory

**Naming:**
- Pattern: `*.test.ts` or `*.spec.ts`
- Examples: `smoke.test.ts`, `database-migration.test.ts`

**Structure:**
```
BasicBudget/
├── __tests__/
│   ├── smoke.test.ts
│   ├── database-migration.test.ts
│   └── utils/
│       └── mock-data.ts
└── __mocks__/
    ├── expo-sqlite.js
    └── @react-native-async-storage/
        └── async-storage.js
```

**Excluded from Test Runs:**
- Component tests: `__tests__/components/` (excluded in jest.config.js)
- Integration tests: `__tests__/integration/` (excluded in jest.config.js)
- Utility files: `__tests__/utils/` (excluded in jest.config.js)

## Test Structure

**Suite Organization:**
```typescript
describe('Database Migration System', () => {
  beforeEach(async () => {
    // Setup: Clear AsyncStorage and delete test database
    await AsyncStorage.clear();
    try {
      await SQLite.deleteDatabaseAsync(TEST_DB_NAME);
    } catch {
      // Database might not exist
    }
  });

  afterEach(async () => {
    // Cleanup: Delete test database
    try {
      await SQLite.deleteDatabaseAsync(TEST_DB_NAME);
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('New Database Creation', () => {
    it('should create a fresh database with current schema version', async () => {
      // Test implementation
    });
  });
});
```

**Patterns:**
- Top-level `describe` for feature/module
- Nested `describe` blocks for specific scenarios
- `beforeEach` and `afterEach` for setup/teardown
- Async test functions for database operations
- Descriptive test names starting with "should"

## Mocking

**Framework:** Jest built-in mocking

**Mock Implementations:**

**expo-sqlite Mock (`__mocks__/expo-sqlite.js`):**
```javascript
class MockSQLiteDatabase {
  constructor(databaseName) {
    this.databaseName = databaseName;
    this.tables = {};
    this.isOpen = true;
  }

  async execAsync(queries) { /* ... */ }
  async runAsync(sql, args = []) { /* ... */ }
  async getFirstAsync(sql, args = []) { /* ... */ }
  async getAllAsync(sql, args = []) { /* ... */ }
}

const SQLiteMock = {
  openDatabaseAsync: jest.fn(async (databaseName, options) => {
    // Return in-memory database
  }),
  deleteDatabaseAsync: jest.fn(async (databaseName) => {
    // Clean up in-memory database
  })
};
```

**AsyncStorage Mock (`__mocks__/@react-native-async-storage/async-storage.js`):**
```javascript
let store = {};

const AsyncStorageMock = {
  getItem: jest.fn((key) => Promise.resolve(store[key] || null)),
  setItem: jest.fn((key, value) => {
    store[key] = value.toString();
    return Promise.resolve();
  }),
  clear: jest.fn(() => {
    store = {};
    return Promise.resolve();
  })
};
```

**Global Setup Mocks (`jest.setup.js`):**
```javascript
// Mock expo-crypto for UUID generation
jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => `mock-uuid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)
}));

// Suppress console output during tests
console.warn = jest.fn();
console.log = jest.fn();
```

**What to Mock:**
- External dependencies: expo-sqlite, AsyncStorage, expo-crypto
- Console methods: Suppressed during tests except for critical errors
- Native modules: React Native and Expo modules

**What NOT to Mock:**
- Internal business logic functions
- TypeScript types and interfaces
- Pure utility functions

## Fixtures and Factories

**Test Data:**
Located in `__tests__/utils/mock-data.ts`

```typescript
// Static fixtures
export const MOCK_EXPENSE_1: Expense = {
  id: 'expense_1',
  amount: '25.50',
  category: MOCK_FOOD_CATEGORY,
  date: new Date('2024-12-01T12:00:00.000Z'),
  note: 'Lunch at restaurant'
};

// Factory functions
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

// Batch generators
export function createMockExpensesForMonth(
  year: number,
  month: number,
  count: number = 5
): Expense[] {
  // Generate multiple test expenses
}
```

**Location:**
- `__tests__/utils/mock-data.ts` - Centralized test data
- Database row formats provided for testing database layer
- Helper functions for calculating totals and filtering

## Coverage

**Requirements:**
- Branches: 80%
- Functions: 85%
- Lines: 85%
- Statements: 85%

**Configured in `jest.config.js`:**
```javascript
coverageThreshold: {
  global: {
    branches: 80,
    functions: 85,
    lines: 85,
    statements: 85
  }
}
```

**Coverage Collection:**
- Includes: `lib/**/*.{ts,tsx}`, `hooks/**/*.{ts,tsx}`, `constants/**/*.{ts,tsx}`
- Excludes: Type definitions (*.d.ts), node_modules, __tests__

**View Coverage:**
```bash
npm run test:coverage       # Text output
npm run test:coverage-html  # HTML report
```

## Test Types

**Unit Tests:**
- Scope: Database models, utilities, business logic
- Approach: Test individual functions in isolation with mocked dependencies
- Example: `smoke.test.ts` tests basic Jest functionality and mock imports

**Integration Tests:**
- Scope: Database migrations, data persistence
- Approach: Test full database operations with mocked SQLite
- Example: `database-migration.test.ts` tests schema migrations and data preservation
- Tests both fresh database creation and existing database upgrades

**E2E Tests:**
- Framework: Not currently implemented
- Note: Component tests are excluded from the current test suite

## Common Patterns

**Async Testing:**
```typescript
it('should create a fresh database with current schema version', async () => {
  const db = await initDatabase();

  const version = await db.getFirstAsync<{ version: number }>(
    'SELECT version FROM schema_version WHERE id = 1'
  );

  expect(version?.version).toBe(CURRENT_SCHEMA_VERSION);
});
```

**Error Testing:**
```typescript
it('should not delete database on migration failure', async () => {
  const db = await initDatabase();

  // Verify database still exists after potential errors
  const tables = await db.getAllAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table'"
  );

  expect(tables.length).toBeGreaterThan(0);
});
```

**Database Setup/Teardown:**
```typescript
beforeEach(async () => {
  await AsyncStorage.clear();
  try {
    await SQLite.deleteDatabaseAsync(TEST_DB_NAME);
  } catch {
    // Database might not exist
  }
});

afterEach(async () => {
  try {
    await SQLite.deleteDatabaseAsync(TEST_DB_NAME);
  } catch {
    // Ignore cleanup errors
  }
});
```

**Testing Database State:**
```typescript
it('should preserve existing data during migration', async () => {
  // Create old database with test data
  await createOldStyleDatabase();

  // Run migration
  const db = await initDatabase();

  // Verify data preserved
  const expense = await db.getFirstAsync<{ id: string; amount: string }>(
    'SELECT id, amount FROM expenses WHERE id = ?',
    ['test-1']
  );

  expect(expense?.id).toBe('test-1');
  expect(expense?.amount).toBe('50.00');
});
```

**Health Check Testing:**
```typescript
it('should detect missing position column', async () => {
  // Create database with old schema (missing column)
  const db = await SQLite.openDatabaseAsync(TEST_DB_NAME);
  await db.execAsync(`CREATE TABLE custom_categories (...)`);

  const healthCheck = await performHealthCheck(db);

  expect(healthCheck.tableInfo.custom_categories.hasPositionColumn).toBe(false);
  expect(healthCheck.issues.length).toBeGreaterThan(0);
  expect(healthCheck.healthy).toBe(false);
});
```

## Test Configuration Details

**Module Name Mapper:**
```javascript
moduleNameMapper: {
  '^@/(.*)$': '<rootDir>/$1'
}
```

**Transform Configuration:**
```javascript
transform: {
  '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
}
```

**Transform Ignore Patterns:**
```javascript
transformIgnorePatterns: [
  'node_modules/(?!(expo|@expo|expo-sqlite|expo-crypto|@react-native-async-storage)/)'
]
```

## Assertion Examples

**Basic Assertions:**
```typescript
expect(true).toBe(true);
expect(version?.version).toBe(CURRENT_SCHEMA_VERSION);
expect(healthCheck.healthy).toBe(true);
```

**Array Assertions:**
```typescript
expect(numbers).toHaveLength(5);
expect(numbers).toContain(3);
expect(Array.isArray(MOCK_EXPENSES)).toBe(true);
```

**Object Assertions:**
```typescript
expect(person).toHaveProperty('name');
expect(person.name).toBe('John');
expect(MOCK_PROFILE).toHaveProperty('email');
```

**Async Assertions:**
```typescript
await expect(promise).resolves.toBe(42);
```

**Comparison Assertions:**
```typescript
expect(tables.length).toBeGreaterThan(0);
expect(networthExists?.count).toBe(1);
```

---

*Testing analysis: 2026-01-21*
