# Architecture

**Analysis Date:** 2026-01-21

## Pattern Overview

**Overall:** React Native + Expo with File-Based Routing (Expo Router)

**Key Characteristics:**
- Mobile-first architecture using React Native for iOS/Android/Web
- File-based routing via Expo Router (similar to Next.js App Router)
- Local-first data persistence with expo-sqlite
- Custom hooks for data access layer abstraction
- React Context for global state management
- Component composition with modals for complex workflows

## Layers

**Presentation Layer (Screens):**
- Purpose: Top-level screen components that orchestrate UI and data
- Location: `app/(tabs)/`
- Contains: Tab screens (index.tsx, charts.tsx, networth.tsx, more.tsx)
- Depends on: Hooks, components, modals, contexts
- Used by: Expo Router navigation

**Component Layer:**
- Purpose: Reusable UI components organized by feature domain
- Location: `components/`
- Contains: Feature-specific components (expenses/, charts/, networth/, modals/, shared/)
- Depends on: Hooks, types, utils
- Used by: Screens and other components

**Data Access Layer (Hooks):**
- Purpose: Encapsulate database operations and provide reactive state
- Location: `hooks/`
- Contains: Custom hooks (useExpenses, useCategories, useBudget, useNetWorth, etc.)
- Depends on: Database models, types
- Used by: Screens and components

**Database Layer (Models):**
- Purpose: Direct database CRUD operations with SQL
- Location: `lib/db/models/`
- Contains: Model functions (expenses.ts, budgets.ts, categories.ts, net-worth.ts, category-budgets.ts)
- Depends on: Database core, types, utils
- Used by: Hooks

**Database Core:**
- Purpose: Database initialization, migrations, schema management
- Location: `lib/db/core/`
- Contains: database.ts (singleton), migrations.ts, schema.ts, health-check.ts
- Depends on: expo-sqlite
- Used by: Database models

**Storage Layer:**
- Purpose: AsyncStorage operations for non-relational data
- Location: `lib/storage/`
- Contains: first-launch.ts, notifications.ts, profile.ts, settings.ts
- Depends on: @react-native-async-storage/async-storage
- Used by: Hooks and contexts

**Context Layer:**
- Purpose: Global state management for app-wide settings
- Location: `contexts/`
- Contains: SettingsContext.tsx
- Depends on: Storage layer
- Used by: Root layout and components

**Utilities Layer:**
- Purpose: Pure functions for common operations
- Location: `lib/utils/`, `constants/`
- Contains: date-formatter.ts, id-generator.ts, responsive.ts, seed-data.ts, colors.ts, categories.ts
- Depends on: Nothing (pure functions)
- Used by: All layers

## Data Flow

**Expense Creation Flow:**

1. User taps FAB button → Opens `AddExpenseModal` (components/modals/expenses/)
2. User fills form → Modal validates input locally
3. User saves → Calls `addExpense()` from `useExpenses` hook (hooks/)
4. Hook performs optimistic update → Immediately updates React state
5. Hook calls `createExpense()` from model (lib/db/models/expenses.ts)
6. Model executes SQL INSERT → Generates ID via `generateId()` (lib/utils/)
7. On error → Hook rolls back optimistic update by reloading from database
8. On success → UI updates with new expense

**Database Read Flow:**

1. Component mounts → Hook's useEffect fires
2. Hook calls `getDatabase()` singleton (lib/db/core/database.ts)
3. Database checks if initialized → Runs migrations if needed
4. Hook calls model function (e.g., `getAllExpenses()`)
5. Model executes SQL SELECT → Transforms rows via `rowToExpense()`
6. Hook updates React state → Component re-renders

**State Management:**
- Local component state for UI (modals, toggles, forms)
- Hook state for data (expenses, budgets, categories)
- Context state for app settings (SettingsContext)
- Optimistic updates for perceived performance

## Key Abstractions

**Hook Pattern:**
- Purpose: Encapsulates data fetching, caching, and mutations
- Examples: `hooks/useExpenses.ts`, `hooks/useBudget.ts`, `hooks/useCategories.ts`
- Pattern: Returns `{ data, loading, error, ...mutations }` interface

**Model Functions:**
- Purpose: Database CRUD operations with type safety
- Examples: `lib/db/models/expenses.ts`, `lib/db/models/budgets.ts`
- Pattern: Accepts `(db: SQLiteDatabase, ...params)` → Returns typed domain objects

**Row Transformers:**
- Purpose: Convert database rows to application domain types
- Examples: `rowToExpense()` in expenses.ts, `rowToCategory()` in categories.ts
- Pattern: Transforms snake_case DB columns to camelCase domain objects with Date/type conversions

**Domain Types:**
- Purpose: Type safety across layers
- Examples: `types/database.ts` defines Expense, ExpenseRow, ExpenseInput
- Pattern: Separate types for domain objects, database rows, and input DTOs

**Modal Components:**
- Purpose: Complex workflows in contained units
- Examples: `components/modals/expenses/AddExpenseModal.tsx`, `components/modals/budget/BudgetModal.tsx`
- Pattern: Controlled by parent via visible/onClose props, callbacks for save actions

## Entry Points

**Application Root:**
- Location: `app/_layout.tsx`
- Triggers: Expo app launch
- Responsibilities: Wraps app in GestureHandlerRootView, provides SettingsContext, initializes Stack navigator

**Tab Navigator:**
- Location: `app/(tabs)/_layout.tsx`
- Triggers: After root layout renders
- Responsibilities: Defines bottom tab navigation, configures tab bar styling, conditionally shows Net Worth tab

**Main Screen (Budgets):**
- Location: `app/(tabs)/index.tsx`
- Triggers: Default tab on app launch
- Responsibilities: Initializes database via hooks, manages expense list UI, handles first-launch welcome flow

**Database Initialization:**
- Location: `lib/db/core/database.ts` → `getDatabase()`
- Triggers: First hook usage (typically useExpenses on mount)
- Responsibilities: Opens database, runs migrations, seeds dev data, returns singleton instance

## Error Handling

**Strategy:** Try-catch with optimistic updates and rollback

**Patterns:**
- Database operations: Wrap in try-catch, log errors, throw user-friendly messages
- Hook mutations: Optimistic update → try operation → catch and rollback on error
- UI layer: Alert.alert() for user-facing errors with actionable messages
- Migration failures: Log verbosely, throw to prevent app start with corrupted DB

**Examples:**
```typescript
// Optimistic update pattern (hooks/useExpenses.ts)
const addExpense = async (expense) => {
  const newExpense = await createExpense(db, expense);
  setExpenses(prev => [newExpense, ...prev]); // Optimistic
  try {
    // Already saved above
  } catch (err) {
    await loadExpenses(db); // Rollback
    throw err;
  }
};

// User-facing error (app/(tabs)/index.tsx)
try {
  await addExpense(expense);
} catch (err) {
  Alert.alert('Error', 'Failed to save expense. Please try again.');
}
```

## Cross-Cutting Concerns

**Logging:**
- Console.log/error for debugging
- Verbose logging in database migrations and health checks
- Error context included in catch blocks

**Validation:**
- Input validation in model layer (e.g., amount > 0, category required)
- Form validation in modal components
- Type safety via TypeScript throughout

**Authentication:**
- Not implemented (local-only app)
- No user accounts or server communication

**Data Persistence:**
- Primary: expo-sqlite for relational data (expenses, budgets, categories)
- Secondary: AsyncStorage for key-value settings (first-launch flags, preferences)

**Responsive Design:**
- Utility functions in `lib/utils/responsive.ts` (moderateScale, scaleFontSize, scaleWidth)
- Dynamic sizing based on useWindowDimensions() hook
- useSafeAreaInsets() for notch/status bar handling

**Haptic Feedback:**
- expo-haptics for tactile feedback on user interactions
- Used on button presses, swipe actions, deletions

**Theming:**
- Centralized color constants in `constants/colors.ts`
- Hardcoded primary color (#355e3b hunter green) throughout
- Support for light/dark mode via "automatic" userInterfaceStyle

---

*Architecture analysis: 2026-01-21*
