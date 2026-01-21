# Codebase Structure

**Analysis Date:** 2026-01-21

## Directory Layout

```
BasicBudget/
├── app/                    # Expo Router screens (file-based routing)
│   ├── (tabs)/            # Tab navigator group
│   └── _layout.tsx        # Root layout with providers
├── components/            # Reusable UI components (organized by feature)
│   ├── charts/           # Chart components (pie, line, calendar)
│   ├── expenses/         # Expense list and stats components
│   ├── modals/           # Modal dialogs (organized by domain)
│   ├── networth/         # Net worth tracking components
│   └── shared/           # Shared/common components
├── hooks/                # Custom React hooks for data access
├── lib/                  # Core libraries and utilities
│   ├── db/              # Database layer
│   ├── storage/         # AsyncStorage operations
│   └── utils/           # Pure utility functions
├── contexts/            # React Context providers
├── constants/           # Static data and configurations
├── types/               # TypeScript type definitions
├── __tests__/           # Test files
├── __mocks__/           # Jest mock implementations
├── assets/              # Images, fonts, static assets
├── docs/                # Technical documentation
├── ios/                 # Native iOS build artifacts
└── .planning/           # GSD planning documents
    └── codebase/        # Codebase analysis documents
```

## Directory Purposes

**app/**
- Purpose: Screen components using Expo Router file-based routing
- Contains: Tab screens, layouts, navigation configuration
- Key files:
  - `_layout.tsx`: Root layout with SettingsProvider and GestureHandler
  - `(tabs)/_layout.tsx`: Bottom tab navigator configuration
  - `(tabs)/index.tsx`: Main budgets/expenses screen
  - `(tabs)/charts.tsx`: Charts and analytics screen
  - `(tabs)/networth.tsx`: Net worth tracking screen
  - `(tabs)/more.tsx`: Settings and more options screen

**components/**
- Purpose: Reusable UI components organized by feature domain
- Contains: Feature-specific and shared components
- Subdirectories:
  - `charts/`: CategoryPieChart.tsx, SpendingCalendar.tsx, SpendingLineChart.tsx
  - `expenses/`: ExpenseList.tsx, ExpenseStats.tsx, ExpenseMonthHeader.tsx, useExpenseMonth.ts
  - `modals/`: Complex workflow components
    - `expenses/`: AddExpenseModal.tsx, ExpenseDetailModal.tsx
    - `budget/`: BudgetModal.tsx, CategoryBudgetModal.tsx, BudgetCalculatorModal.tsx
    - `categories/`: CategoriesModal.tsx, CategoryEditModal.tsx
    - `analytics/`: InsightsModal.tsx, CategoryAnalyticsModal.tsx
    - `settings/`: ProfileModal.tsx, NotificationsModal.tsx, AboutModal.tsx, AdvancedSettingsModal.tsx
  - `networth/`: NetWorthChart.tsx, NetWorthSummaryCard.tsx, AssetCategorySection.tsx, ItemInputRow.tsx, etc.
  - `shared/`: BudgetProgressBar.tsx, UndoToast.tsx, CalendarPicker.tsx, ColorPicker.tsx, etc.

**hooks/**
- Purpose: Custom hooks encapsulating data access and business logic
- Contains:
  - `useExpenses.ts`: Expense CRUD operations with optimistic updates
  - `useCategories.ts`: Category management (default + custom)
  - `useBudget.ts`: Monthly budget operations
  - `useCategoryBudgets.ts`: Category-specific budget management
  - `useNetWorth.ts`: Net worth entry CRUD
  - `useProfile.ts`: User profile data
  - `useNotificationPreferences.ts`: Notification settings

**lib/db/**
- Purpose: Database layer with SQLite operations
- Subdirectories:
  - `core/`: Database initialization and management
    - `database.ts`: Singleton database instance with migration orchestration
    - `migrations.ts`: Schema migration logic (v0 → v5)
    - `schema.ts`: Centralized table definitions and indexes
    - `health-check.ts`: Database integrity verification
  - `models/`: Data access functions for each entity
    - `expenses.ts`: Expense CRUD operations
    - `budgets.ts`: Budget CRUD operations
    - `categories.ts`: Category management
    - `category-budgets.ts`: Category budget CRUD
    - `net-worth.ts`: Net worth entry operations

**lib/storage/**
- Purpose: AsyncStorage wrapper functions for simple key-value data
- Contains:
  - `first-launch.ts`: Track first app launch
  - `notifications.ts`: Notification preferences
  - `profile.ts`: User profile settings
  - `settings.ts`: App settings (e.g., netWorthEnabled)

**lib/utils/**
- Purpose: Pure utility functions
- Contains:
  - `date-formatter.ts`: Date formatting utilities
  - `id-generator.ts`: UUID generation for database IDs
  - `responsive.ts`: Screen size responsive scaling functions
  - `seed-data.ts`: Development sample data seeding

**contexts/**
- Purpose: React Context for global state
- Contains:
  - `SettingsContext.tsx`: App-wide settings provider (wraps entire app)

**constants/**
- Purpose: Static configuration and reference data
- Contains:
  - `colors.ts`: Color palette definitions
  - `categories.ts`: Default expense categories with icons/colors
  - `sample-data.ts`: Sample data for testing
  - `help-content.ts`: Help text and documentation strings

**types/**
- Purpose: TypeScript type definitions
- Contains:
  - `database.ts`: All domain types (Expense, Budget, Category, etc.) plus Row and Input variants

**__tests__/**
- Purpose: Jest test files
- Contains:
  - `smoke.test.ts`: Basic sanity tests
  - `database-migration.test.ts`: Migration testing
  - `utils/`: Test helpers (mock-data.ts, db-helpers.ts, test-helpers.tsx, async-storage-helpers.ts)

**docs/**
- Purpose: Developer documentation
- Contains:
  - `01-architecture-overview.mdx`
  - `02-database-guide.mdx`
  - `03-hooks-guide.mdx`
  - `04-component-development.mdx`
  - `05-getting-started.mdx`
  - `06-dependency-management.mdx`
  - `DATABASE_MIGRATIONS.md`

## Key File Locations

**Entry Points:**
- `app/_layout.tsx`: Application root with providers
- `app/(tabs)/_layout.tsx`: Tab navigation configuration
- `app/(tabs)/index.tsx`: Main expense tracking screen
- `package.json`: Entry point specified as "expo-router/entry"

**Configuration:**
- `package.json`: Dependencies, scripts, project metadata
- `app.json`: Expo configuration (bundle ID, icons, plugins)
- `tsconfig.json`: TypeScript configuration with `@/*` path alias
- `babel.config.js`: Babel configuration for React Native
- `jest.config.js`: Jest test configuration
- `eslint.config.js`: ESLint configuration

**Core Logic:**
- `lib/db/core/database.ts`: Database singleton and initialization
- `lib/db/core/migrations.ts`: Schema migration logic (CURRENT_SCHEMA_VERSION = 5)
- `lib/db/core/schema.ts`: Single source of truth for table schemas
- `hooks/useExpenses.ts`: Primary data hook for expense management

**Testing:**
- `jest.config.js`: Test runner configuration
- `jest.setup.js`: Test environment setup
- `jest.presetup.js`: Pre-setup configuration
- `__tests__/`: Test files
- `__mocks__/@react-native-async-storage/`: AsyncStorage mock

## Naming Conventions

**Files:**
- Screens: kebab-case or lowercase (index.tsx, networth.tsx, charts.tsx)
- Components: PascalCase (ExpenseList.tsx, BudgetModal.tsx)
- Hooks: camelCase with 'use' prefix (useExpenses.ts, useBudget.ts)
- Utils/Models: kebab-case (date-formatter.ts, id-generator.ts, expenses.ts)
- Types: kebab-case (database.ts)
- Constants: kebab-case (colors.ts, categories.ts)

**Directories:**
- Lowercase with hyphens (kebab-case): lib, db, net-worth
- Lowercase singular/plural: components, hooks, contexts, types
- Special: (tabs) for route groups in Expo Router

**Variables/Functions:**
- Components: PascalCase (ExpenseList, BudgetModal)
- Hooks: camelCase with 'use' prefix (useExpenses, useBudget)
- Functions: camelCase (createExpense, getAllExpenses, getDatabase)
- Constants: UPPER_SNAKE_CASE (CURRENT_SCHEMA_VERSION, DATABASE_NAME)
- Types/Interfaces: PascalCase (Expense, ExpenseRow, ExpenseInput)

**Database:**
- Tables: snake_case plural (expenses, budgets, custom_categories)
- Columns: snake_case (category_id, created_at, budget_amount)
- Indexes: idx_table_column (idx_expenses_date, idx_budgets_month)

## Where to Add New Code

**New Screen:**
- Primary code: `app/(tabs)/screen-name.tsx`
- Add to tab navigator: `app/(tabs)/_layout.tsx`
- Tests: `__tests__/screen-name.test.ts`

**New Feature:**
- Screen: `app/(tabs)/feature-name.tsx`
- Components: `components/feature-name/`
- Hook: `hooks/useFeatureName.ts`
- Database model: `lib/db/models/feature-name.ts`
- Types: Add to `types/database.ts`
- Constants: `constants/feature-name.ts` if needed

**New Component/Module:**
- Implementation:
  - Feature-specific: `components/feature-name/ComponentName.tsx`
  - Shared/reusable: `components/shared/ComponentName.tsx`
  - Modal workflow: `components/modals/domain/ModalName.tsx`
- Tests: `__tests__/components/ComponentName.test.tsx`

**Utilities:**
- Shared helpers: `lib/utils/util-name.ts`
- Database utilities: `lib/db/core/` or `lib/db/models/`
- Storage utilities: `lib/storage/storage-name.ts`

**New Database Table:**
1. Add schema to `lib/db/core/schema.ts` in TABLE_SCHEMAS and TABLE_INDEXES
2. Increment CURRENT_SCHEMA_VERSION in `lib/db/core/database.ts`
3. Add migration in `lib/db/core/migrations.ts`
4. Create model file: `lib/db/models/table-name.ts`
5. Add types: `types/database.ts` (Domain, Row, Input interfaces)
6. Create hook: `hooks/useTableName.ts`

**New Modal:**
- Implementation: `components/modals/domain/ModalName.tsx`
- Usage: Import in screen, control with visible/onClose state
- Pattern: Accept visible, onClose, onSave props

## Special Directories

**ios/**
- Purpose: Native iOS build artifacts
- Generated: By expo prebuild
- Committed: Yes (for EAS builds)

**node_modules/**
- Purpose: NPM dependencies
- Generated: By npm install
- Committed: No (.gitignored)

**.expo/**
- Purpose: Expo build cache and type definitions
- Generated: By expo start
- Committed: No (.gitignored)

**coverage/**
- Purpose: Jest test coverage reports
- Generated: By jest --coverage
- Committed: No (.gitignored)

**.planning/**
- Purpose: GSD planning and analysis documents
- Generated: By /gsd commands
- Committed: Yes (contains planning artifacts)

**.claude/**
- Purpose: Claude Code workspace data
- Generated: By Claude Code
- Committed: No (.gitignored)

**assets/**
- Purpose: Images, fonts, splash screens, icons
- Generated: Manually or by design tools
- Committed: Yes

**docs/**
- Purpose: Technical documentation for developers
- Generated: Manually
- Committed: Yes

## Import Path Aliases

**TypeScript Configuration:**
- Alias: `@/*` maps to project root
- Configuration: `tsconfig.json`

**Usage Examples:**
```typescript
// Instead of relative paths
import { useExpenses } from '../../../../hooks/useExpenses';

// Use path alias
import { useExpenses } from '@/hooks/useExpenses';

// Other examples
import { Expense } from '@/types/database';
import { getDatabase } from '@/lib/db/core/database';
import ExpenseList from '@/components/expenses/ExpenseList';
import { COLORS } from '@/constants/colors';
```

**Import Order Convention:**
- Third-party imports (react, react-native, expo)
- Component imports from @/components
- Hook imports from @/hooks
- Database/lib imports from @/lib
- Type imports from @/types
- Constant imports from @/constants

---

*Structure analysis: 2026-01-21*
