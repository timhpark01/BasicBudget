# Codebase Concerns

**Analysis Date:** 2026-01-21

## Tech Debt

**TypeScript Type Safety Compromises:**
- Issue: Extensive use of `any` type throughout codebase reduces type safety
- Files: `hooks/useNetWorth.ts:59,101`, `lib/db/models/expenses.ts:15`, `lib/db/models/categories.ts:16,68,92`, `app/(tabs)/index.tsx:81,95`, `components/shared/BudgetProgressBar.tsx:16`, `components/modals/budget/CategoryBudgetModal.tsx:27,58-59`, `components/networth/NetWorthEntryForm.tsx:44`, `lib/db/core/migrations.ts:83`
- Impact: Type errors can go undetected until runtime, making bugs harder to catch during development
- Fix approach: Replace `any` with proper union types or generic constraints; define explicit interfaces for all database result types

**Large Component Files:**
- Issue: Several components exceed 500 lines, indicating complexity concerns
- Files: `components/modals/analytics/InsightsModal.tsx` (882 lines), `components/modals/analytics/CategoryAnalyticsModal.tsx` (747 lines), `components/modals/budget/BudgetCalculatorModal.tsx` (613 lines), `components/shared/BudgetProgressBar.tsx` (576 lines), `app/(tabs)/index.tsx` (536 lines), `components/modals/categories/CategoriesModal.tsx` (501 lines), `components/networth/NetWorthEntryForm.tsx` (467 lines)
- Impact: Difficult to maintain, test, and reason about; high risk for introducing bugs during modifications
- Fix approach: Extract reusable sub-components; separate business logic into custom hooks; split analytics modals into smaller, focused components

**Error Handling Pattern Inconsistencies:**
- Issue: Mixed error handling approaches - some functions swallow errors with console.error, others throw
- Files: All files in `lib/db/models/` catch errors, log to console, then re-throw with generic messages
- Impact: Original error context is lost; debugging production issues is difficult; user sees generic error messages
- Fix approach: Implement centralized error handling with proper error types; preserve stack traces; provide context-specific error messages

**Singleton Database Pattern Race Conditions:**
- Issue: Database initialization uses singleton pattern with promise tracking, but could have race conditions
- Files: `lib/db/core/database.ts:157-178`
- Impact: Multiple simultaneous calls to getDatabase() during app startup could create race conditions despite promise caching
- Fragile: The promise nullification in finally block could allow re-initialization attempts if timing is off
- Fix approach: Use more robust singleton pattern; add explicit locking mechanism; comprehensive testing of concurrent initialization

**JSON Parsing Without Validation:**
- Issue: JSON.parse calls lack schema validation for database content
- Files: `lib/db/models/net-worth.ts:49-60` (assets/liabilities parsing)
- Impact: Corrupted or malformed JSON in database causes runtime errors; fallback values mask data corruption
- Fix approach: Add schema validation using Zod or similar; log validation failures for monitoring; implement database integrity checks

## Known Bugs

**Development Seed Data Running in Production:**
- Symptoms: `__DEV__` flag used to conditionally seed sample data
- Files: `hooks/useExpenses.ts:38-40`, `lib/utils/seed-data.ts`
- Trigger: Any production build with `__DEV__` incorrectly set to true
- Workaround: Ensure proper environment configuration during builds

**Migration Status Tracking Fragility:**
- Symptoms: Migration status tracked in AsyncStorage separately from schema version in database
- Files: `lib/db/core/migrations.ts`, `lib/db/core/health-check.ts:97-114`
- Trigger: AsyncStorage cleared while database persists; database reset while AsyncStorage persists
- Current mitigation: Health check utility detects mismatches
- Workaround: Run health check and clear both storage types together

**Optimistic Updates Rollback Issues:**
- Symptoms: Optimistic UI updates followed by full reload on error
- Files: `hooks/useExpenses.ts:68-76,86-96,104-113`
- Trigger: Database write fails after UI already updated
- Impact: Brief UI flicker showing temporary state before reload; user confusion
- Workaround: Currently reloads all expenses from database on any error

## Security Considerations

**SQL Injection Protection:**
- Risk: Uses parameterized queries consistently - GOOD PRACTICE
- Files: All files in `lib/db/models/`
- Current mitigation: All database queries use `?` placeholders with parameter arrays
- Recommendations: Maintain this practice; add code review checks to prevent raw string interpolation in queries

**Sensitive Data Logging:**
- Risk: Console.error logs throughout codebase may expose sensitive data
- Files: 50+ console.error calls across all model and component files
- Current mitigation: None - logs contain full error objects and user data
- Recommendations: Implement sanitized logging utility; remove console.log calls in production; use proper logging service

**AsyncStorage for Sensitive Settings:**
- Risk: AsyncStorage is not encrypted on device
- Files: `lib/storage/settings.ts`, `lib/storage/profile.ts`, `lib/storage/notifications.ts`
- Current mitigation: No sensitive data currently stored (only preferences)
- Recommendations: Document what should NOT go in AsyncStorage; implement SecureStore for any future sensitive data

## Performance Bottlenecks

**Unoptimized Expense Filtering:**
- Problem: Full expense array filtered/mapped on every render
- Files: `components/modals/analytics/InsightsModal.tsx:68-91`, `components/shared/BudgetProgressBar.tsx:61-82`, `app/(tabs)/index.tsx:89-106`
- Cause: UseMemo dependencies trigger recalculation frequently; large expense datasets cause slowdown
- Improvement path: Implement pagination; add database-level filtering; cache computed values in component state

**Multiple Database Queries for Same Data:**
- Problem: Category budgets loaded multiple times for analytics
- Files: `app/(tabs)/index.tsx:84-106` - loads all category budgets for every month with expenses
- Cause: Not using centralized data management; each component loads its own data
- Improvement path: Implement caching layer; use context or state management library; denormalize frequently-accessed data

**Array Operations on Large Datasets:**
- Problem: 134 occurrences of .filter/.map/.reduce across 35 files operating on potentially large arrays
- Files: Widespread in components, particularly analytics and chart components
- Cause: Client-side processing of all historical data
- Improvement path: Move aggregations to database queries; implement virtual scrolling for lists; limit data range by default

**Excessive Re-renders:**
- Problem: 118 occurrences of useMemo/useCallback/useEffect suggest optimization attempts, but many dependencies
- Files: Throughout component tree, particularly `components/shared/BudgetProgressBar.tsx`, `components/modals/analytics/InsightsModal.tsx`
- Cause: Complex dependency chains; prop drilling; shared state updates
- Improvement path: React.memo strategic usage; reduce prop drilling with composition; split large components

## Fragile Areas

**Database Migration System:**
- Files: `lib/db/core/migrations.ts`, `lib/db/core/database.ts`
- Why fragile: Complex migration logic with critical/optional migration split; AsyncStorage tracking separate from database schema; table recreation strategy for schema changes
- Safe modification: Always test migrations with real user data; maintain rollback scripts; never skip critical migrations (v1-v3)
- Test coverage: Has dedicated test file `__tests__/database-migration.test.ts`, but needs more edge case coverage

**Budget Progress Bar Component:**
- Files: `components/shared/BudgetProgressBar.tsx` (576 lines, currently has uncommitted changes)
- Why fragile: Complex calculation logic for days elapsed, budget scaling, and category aggregations; many edge cases for past/current/future months
- Safe modification: Write comprehensive unit tests before changes; test edge cases (month boundaries, timezone changes, overspending scenarios)
- Test coverage: No dedicated test file found

**Expense Category System:**
- Files: `lib/db/models/categories.ts`, `constants/categories.ts`, hooks/useCategories.ts`
- Why fragile: Hybrid system with default categories (IDs 1-12) and custom categories (ID 12+); position-based ordering; expense reassignment on category deletion
- Safe modification: Never change default category IDs; test expense reassignment thoroughly; maintain position uniqueness
- Test coverage: Limited

**Net Worth JSON Storage:**
- Files: `lib/db/models/net-worth.ts`, `components/networth/NetWorthEntryForm.tsx`
- Why fragile: Complex nested data stored as JSON in SQLite; multiple asset categories; parsing errors handled with silent fallbacks
- Safe modification: Validate JSON schema before saving; test with malformed data; ensure backward compatibility with existing entries
- Test coverage: Mock data exists in `__tests__/utils/mock-data.ts` but limited integration tests

## Scaling Limits

**SQLite Performance:**
- Current capacity: Suitable for personal budget app with thousands of expenses
- Limit: May slow down with 10,000+ expenses due to client-side filtering and aggregations
- Scaling path: Implement pagination; add database indexes on date and category_id columns; archive old data

**AsyncStorage Size:**
- Current capacity: Small amounts of settings and preferences
- Limit: AsyncStorage has 6MB limit on some platforms
- Scaling path: Currently not a concern; monitor usage; move large data to SQLite if needed

**Client-Side Computations:**
- Current capacity: All analytics calculated in-memory on device
- Limit: Complex analytics across years of data will cause UI lag
- Scaling path: Move aggregations to database queries; implement web workers for heavy computations; add loading states

## Dependencies at Risk

**expo-sqlite:**
- Risk: Expo 54 with expo-sqlite ~16.0.9 - relatively new async API
- Impact: Core database functionality; migration to new API required for recent versions
- Migration plan: Currently on latest; monitor for breaking changes in future Expo updates

**React Native Gesture Handler:**
- Risk: Version 2.28.0 used for swipe-to-delete and drag-to-reorder
- Impact: Core UX features; breaking changes would require significant refactoring
- Migration plan: Pin version; test thoroughly before major updates

**React Native Reanimated:**
- Risk: Version 4.1.1 used for animations
- Impact: Visual polish; can degrade gracefully if needed
- Migration plan: Consider lighter animation alternatives if issues arise

## Missing Critical Features

**Data Export/Backup:**
- Problem: No way to export budget data or create backups
- Blocks: User migration to new device; data recovery after app deletion
- Priority: High - users expect data portability for financial apps

**Offline Error Recovery:**
- Problem: No retry mechanism for failed database operations
- Blocks: Data loss if operation fails at wrong time
- Priority: Medium - current error handling just shows alert

**Data Validation Layer:**
- Problem: No centralized validation for user inputs
- Blocks: Invalid data can reach database (negative amounts, future dates, etc.)
- Priority: Medium - currently validated inconsistently at component level

## Test Coverage Gaps

**Database Models:**
- What's not tested: Category reassignment logic, budget deletion cascades, net worth entry updates
- Files: `lib/db/models/categories.ts:190-204`, `lib/db/models/budgets.ts`, `lib/db/models/net-worth.ts`
- Risk: Data corruption during complex operations
- Priority: High

**Component Integration:**
- What's not tested: Modal workflows, calculator keypad logic, expense list interactions
- Files: `components/modals/`, `components/shared/CalculatorKeypad.tsx`, `components/expenses/ExpenseList.tsx`
- Risk: User workflows break after refactoring
- Priority: Medium

**Migration Scenarios:**
- What's not tested: Migration from v0 to current, partial migration failures, data corruption recovery
- Files: `lib/db/core/migrations.ts`
- Risk: User data loss during app updates
- Priority: High

**Error Boundaries:**
- What's not tested: No React error boundaries detected in codebase
- Files: Should exist in `app/_layout.tsx` or root components
- Risk: Unhandled errors crash entire app instead of graceful degradation
- Priority: Medium

---

*Concerns audit: 2026-01-21*
