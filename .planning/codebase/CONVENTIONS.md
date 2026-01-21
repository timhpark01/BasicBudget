# Coding Conventions

**Analysis Date:** 2026-01-21

## Naming Patterns

**Files:**
- Components: PascalCase with `.tsx` extension (`ExpenseList.tsx`, `BudgetModal.tsx`)
- Hooks: camelCase prefixed with `use` (`useExpenses.ts`, `useBudget.ts`)
- Database models: kebab-case (`expenses.ts`, `category-budgets.ts`)
- Utilities: kebab-case (`date-formatter.ts`, `id-generator.ts`)
- Test files: `.test.ts` or `.spec.ts` suffix in `__tests__/` directory
- Mock files: Located in `__mocks__/` directory, matching the module path structure

**Functions:**
- Functions: camelCase (`handleExpenseTap`, `createExpense`, `getAllExpenses`)
- React components: PascalCase (`ExpenseList`, `AddExpenseModal`)
- Database CRUD: Prefixed with operation verb (`createExpense`, `getAllExpenses`, `updateExpense`, `deleteExpense`)
- Event handlers: Prefixed with `handle` (`handleSaveBudget`, `handleDeleteExpense`)

**Variables:**
- Variables: camelCase (`totalAmount`, `filteredExpenses`, `budgetModalVisible`)
- Constants: UPPER_SNAKE_CASE (`CATEGORIES`, `CURRENT_SCHEMA_VERSION`, `MOCK_EXPENSES`)
- State variables: Descriptive camelCase with setter prefixed with `set` (`modalVisible`, `setModalVisible`)

**Types:**
- Interfaces: PascalCase (`Expense`, `Budget`, `Category`)
- Database row interfaces: PascalCase with `Row` suffix (`ExpenseRow`, `BudgetRow`)
- Input interfaces: PascalCase with `Input` suffix (`ExpenseInput`, `BudgetInput`)
- Hook return types: PascalCase with `Return` suffix (`UseExpensesReturn`)

## Code Style

**Formatting:**
- Tool: Expo's built-in linting (`expo lint`)
- Indentation: 2 spaces
- Semicolons: Required at end of statements
- String quotes: Single quotes preferred ('string')
- Trailing commas: Required in multiline arrays and objects
- Line length: Generally kept under 100 characters

**Linting:**
- Tool: ESLint with expo config (`eslint-config-expo`)
- Config: Package.json scripts include `"lint": "expo lint"`
- No explicit `.eslintrc` file found - relies on Expo defaults

## Import Organization

**Order:**
1. React Native component imports (`StyleSheet`, `View`, `Text`)
2. Third-party library imports (`@expo/vector-icons`, `expo-haptics`, `react-native-gesture-handler`)
3. Internal type imports (`@/types/database`)
4. Internal component imports (`@/components/...`)
5. Internal hook imports (`@/hooks/...`)
6. Internal utility/database imports (`@/lib/...`)

**Path Aliases:**
- `@/*` maps to project root directory
- Configured in `tsconfig.json` and `jest.config.js`
- Example: `import { Expense } from '@/types/database'`
- Example: `import { useExpenses } from '@/hooks/useExpenses'`

## Error Handling

**Patterns:**
- Try-catch blocks wrap all async database operations
- Errors logged to console with descriptive messages: `console.error('Failed to create expense:', error)`
- User-facing errors thrown with sanitized messages: `throw new Error('Failed to save expense. Please try again.')`
- React Native Alerts shown for user-facing errors: `Alert.alert('Error', 'Failed to save expense. Please try again.')`
- Hooks implement optimistic updates with rollback on error
- Database validation performed before database operations

**Example from `lib/db/models/expenses.ts`:**
```typescript
try {
  // Validation
  if (!expense.category) {
    throw new Error('Category is required');
  }
  // Database operation
  await db.runAsync(/* ... */);
} catch (error) {
  console.error('Failed to create expense:', error);
  throw new Error('Failed to save expense. Please try again.');
}
```

**Example from `hooks/useExpenses.ts`:**
```typescript
try {
  // Optimistic update: add to UI immediately
  const newExpense = await createExpense(db, expense);
  setExpenses((prev) => [newExpense, ...prev]);
  setError(null);
} catch (err) {
  // Rollback on error
  await loadExpenses(db);
  throw err;
}
```

## Logging

**Framework:** console (standard JavaScript)

**Patterns:**
- Development logging: Errors logged with `console.error()`
- Test environment: Console output suppressed in `jest.setup.js`
- Format: Descriptive message followed by error object
- Example: `console.error('Failed to load expenses:', error)`
- Database operations always log errors before throwing

## Comments

**When to Comment:**
- File-level purpose documentation (JSDoc style)
- Section headers for grouping related code
- Complex logic explanations
- Public API documentation for functions

**JSDoc/TSDoc:**
- Used for exported functions in database models and utilities
- Format:
```typescript
/**
 * CREATE: Insert a new expense into the database
 */
export async function createExpense(/* ... */) { }
```
- Inline comments used sparingly for complex transformations
- Section headers used with multi-line comments for organization

## Function Design

**Size:** Functions generally kept focused and under 50 lines. Larger functions (like React components) decomposed into smaller handler functions.

**Parameters:**
- Database functions: Accept `db: SQLite.SQLiteDatabase` as first parameter
- Input objects: Use typed interfaces (`ExpenseInput`, `BudgetInput`)
- Optional parameters: Use TypeScript optional syntax (`expense?: Expense`)
- Partial updates: Use `Partial<T>` type (`Partial<ExpenseInput>`)

**Return Values:**
- Async functions: Return Promises with typed results (`Promise<Expense>`, `Promise<void>`)
- Hooks: Return objects with destructured values and functions
- Database reads: Return typed domain objects, not raw rows
- Transformations: Raw database rows transformed to domain objects via helper functions (`rowToExpense`)

## Module Design

**Exports:**
- Named exports preferred over default exports for utilities and models
- Default exports used for React components
- Example: `export async function createExpense()`
- Example: `export default function ExpenseList()`

**Barrel Files:**
- Not used - direct imports from specific files
- Each file exports its own functions/components
- No `index.ts` re-export patterns observed

## TypeScript Configuration

**Compiler Options:**
- Strict mode enabled (`"strict": true`)
- Extends Expo's base TypeScript config
- Path aliases configured for `@/*` imports
- Type definitions in dedicated `types/` directory

## Database Conventions

**Naming:**
- Database columns: snake_case (`category_id`, `budget_amount`, `created_at`)
- TypeScript properties: camelCase (`categoryId`, `budgetAmount`, `createdAt`)
- Transformation functions convert between conventions

**ID Generation:**
- Use UUID via `expo-crypto` (`generateId()` utility)
- IDs prefixed with entity type in mocks (`expense_1`, `budget_1`, `custom_1234567890_abc123`)

**Timestamps:**
- Stored as Unix timestamps in milliseconds (`Date.now()`)
- Converted to Date objects in application layer
- Both `created_at` and `updated_at` fields on all tables

---

*Convention analysis: 2026-01-21*
