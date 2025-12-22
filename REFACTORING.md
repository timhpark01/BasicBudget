# Refactoring Roadmap

This document outlines the remaining refactoring tasks for improving codebase organization and maintainability.

## ✅ Completed (Priority 1 - Quick Wins)

- [x] Delete app-example/ directory (~1000+ lines of bloat)
- [x] Extract duplicate utilities (generateId, formatDate, parseDate)
- [x] Reorganize /lib directory into db/, storage/, and utils/ subdirectories
- [x] Reorganize /components directory into modals/, charts/, and shared/ subdirectories
- [x] Update all import paths throughout the codebase

## Priority 2: Critical Refactoring (High Impact, Medium Effort)

### 2.1 Break Up networth.tsx (1,601 lines → ~300 lines)
**File:** `/app/(tabs)/networth.tsx`
**Current Issues:**
- Calculator logic, chart rendering, modal management, state management all mixed
- Impossible to test individual pieces
- Difficult to make changes without breaking something

**Proposed structure:**
```
app/(tabs)/networth.tsx (300 lines - orchestration only)
components/networth/
├── NetWorthCalculator.tsx       # Calculator UI + logic
├── NetWorthChart.tsx            # Chart display
├── NetWorthEntryForm.tsx        # Add/edit entries
├── NetWorthEntryList.tsx        # List of entries
└── useNetWorthCalculator.ts     # Calculator state hook
```

**Steps:**
1. Create `/components/networth/` directory
2. Extract calculator logic → `NetWorthCalculator.tsx` component + `useNetWorthCalculator.ts` hook
3. Extract chart rendering → `NetWorthChart.tsx` component
4. Extract entry management → `NetWorthEntryForm.tsx` + `NetWorthEntryList.tsx`
5. Refactor main file to thin orchestration layer
6. Test thoroughly to ensure no regressions

**Estimated effort:** 3-4 hours

---

### 2.2 Break Up index.tsx (871 lines → ~400 lines)
**File:** `/app/(tabs)/index.tsx`
**Current Issues:**
- Main expense screen is too complex
- Mixing list display, filtering, stats calculation

**Proposed structure:**
```
app/(tabs)/index.tsx (400 lines - orchestration)
components/expenses/
├── ExpenseList.tsx              # Expense list display
├── ExpenseFilters.tsx           # Filter controls
├── ExpenseStats.tsx             # Monthly totals/stats
└── useExpenseFilters.ts         # Filter state hook
```

**Steps:**
1. Create `/components/expenses/` directory
2. Extract expense list rendering → `ExpenseList.tsx`
3. Extract filter UI → `ExpenseFilters.tsx`
4. Extract stats display → `ExpenseStats.tsx`
5. Extract filter state logic → `useExpenseFilters.ts`
6. Refactor main file to orchestration
7. Test thoroughly

**Estimated effort:** 2-3 hours

---

### 2.3 Refactor Database Layer (Reduce ~40% duplication)
**Files:** All files in `/lib/db/models/`
**Current Problem:** All 5 DB files share 80% similar code

**Solution: Create base repository pattern**

**Step 1:** Create `/lib/db/core/base-repository.ts`
```typescript
export abstract class BaseRepository<T> {
  protected db: SQLiteDatabase;
  protected tableName: string;

  constructor(db: SQLiteDatabase, tableName: string) {
    this.db = db;
    this.tableName = tableName;
  }

  async getAll(): Promise<T[]> {
    const rows = await this.db.getAllAsync(`SELECT * FROM ${this.tableName}`);
    return rows.map(row => this.rowToEntity(row));
  }

  async getById(id: string): Promise<T | null> {
    const row = await this.db.getFirstAsync(
      `SELECT * FROM ${this.tableName} WHERE id = ?`,
      [id]
    );
    return row ? this.rowToEntity(row) : null;
  }

  async delete(id: string): Promise<void> {
    await this.db.runAsync(
      `DELETE FROM ${this.tableName} WHERE id = ?`,
      [id]
    );
  }

  protected abstract rowToEntity(row: any): T;
}
```

**Step 2:** Refactor each model to extend BaseRepository
```typescript
// lib/db/models/expenses.ts
import { BaseRepository } from '../core/base-repository';

export class ExpenseRepository extends BaseRepository<Expense> {
  constructor(db: SQLiteDatabase) {
    super(db, 'expenses');
  }

  protected rowToEntity(row: any): Expense {
    // Transform DB row to Expense object
  }

  // Only add expense-specific methods here
  async getByDateRange(start: string, end: string): Promise<Expense[]> {
    // Custom query
  }
}
```

**Step 3:** Refactor all 5 model files:
- expenses.ts
- budgets.ts
- categories.ts
- category-budgets.ts
- net-worth.ts

**Step 4:** Update all hooks to use repository classes instead of functions

**Estimated effort:** 5-6 hours total

---

### 2.4 Simplify migrations.ts (690 lines → ~200 lines)
**File:** `/lib/db/core/migrations.ts`
**Current bloat:** 10 nearly identical functions

**Current pattern:**
```typescript
checkMigrationCompleted(), markMigrationCompleted()
checkMigrationV2Completed(), markMigrationV2Completed()
checkMigrationV3Completed(), markMigrationV3Completed()
... (V4, V5)
```

**Solution: Generic migration tracking**
```typescript
async function checkMigration(key: string): Promise<boolean> {
  const result = await db.getFirstAsync(
    'SELECT completed FROM migrations WHERE migration_key = ?',
    [key]
  );
  return result?.completed === 1;
}

async function markMigration(key: string): Promise<void> {
  await db.runAsync(
    'INSERT OR REPLACE INTO migrations (migration_key, completed) VALUES (?, 1)',
    [key]
  );
}

// Usage:
await checkMigration('v1_initial')
await markMigration('v1_initial')
await checkMigration('v2_categories')
```

**Steps:**
1. Create generic `checkMigration(key)` and `markMigration(key)` functions
2. Replace all V1-V5 check/mark function calls with generic versions
3. Delete old functions
4. Test migration system thoroughly

**Estimated effort:** 1-2 hours

---

## Priority 3: Moderate Improvements (Medium Impact, Medium Effort)

### 3.1 Reduce Modal Count (15 modals → ~10)

**Consolidation opportunities:**

#### 3.1.1 Merge Help + About → InfoModal.tsx with tabs
- Current: `HelpModal.tsx` (270 lines) + `AboutModal.tsx` (189 lines)
- New: `InfoModal.tsx` (~450 lines with tabs)
- Save code by sharing modal wrapper
- Better UX with tabbed interface

#### 3.1.2 Convert some modals to screens
Some "modals" should be real screens with stack navigation:
- Profile → `app/profile.tsx`
- Categories → `app/categories.tsx`
- Notifications → `app/notifications.tsx`

Benefits:
- Better UX (back button support, deep linking)
- More intuitive navigation
- Follows platform conventions

**Estimated effort:** 3-4 hours total

---

### 3.2 Extract Common Modal Wrapper
**Impact:** DRY up modal boilerplate

All 15 modals currently duplicate:
- Modal wrapper with visibility prop
- Close button
- Header styling
- Backdrop styling

**Solution:** Create `/components/shared/BaseModal.tsx`
```typescript
interface BaseModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function BaseModal({ visible, onClose, title, children }: BaseModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} />
            </TouchableOpacity>
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
}
```

**Steps:**
1. Create BaseModal component
2. Refactor each modal to use BaseModal
3. Remove duplicated boilerplate

**Estimated effort:** 2-3 hours

---

### 3.3 Refactor BudgetProgressBar (576 lines → ~200 lines)
**File:** `/components/shared/BudgetProgressBar.tsx`
**Issues:** Component does too much - it's more of a feature module

**Proposed split:**
```
components/budget/
├── BudgetProgressBar.tsx        # Visual bar only (~100 lines)
├── BudgetSummaryCard.tsx        # Summary stats (~100 lines)
└── useBudgetProgress.ts         # Calculation logic (~100 lines)
```

**Steps:**
1. Create `/components/budget/` directory (if not exists)
2. Extract calculation logic → `useBudgetProgress.ts` hook
3. Extract summary display → `BudgetSummaryCard.tsx`
4. Keep visual bar → `BudgetProgressBar.tsx`
5. Update imports in consuming components

**Estimated effort:** 2 hours

---

### 3.4 Break Up Large Modals

#### InsightsModal.tsx (882 lines)
- Extract insight calculation functions to `/lib/analytics/insights.ts`
- Split into sub-components for each insight type
- Target: ~300 lines

#### CategoryAnalyticsModal.tsx (747 lines)
- Extract analytics calculation to `/lib/analytics/category-analytics.ts`
- Split chart displays into separate components
- Target: ~300 lines

#### BudgetCalculatorModal.tsx (613 lines)
- Extract calculator logic to `useBudgetCalculator.ts` hook
- Split UI into smaller components
- Target: ~300 lines

**Estimated effort:** 4-5 hours total

---

## Priority 4: Long-term Improvements (High Impact, High Effort)

### 4.1 Feature-based Organization (Optional)
**Trade-off:** Major refactor, but better feature isolation

**Current:** Organized by type (components/, hooks/, lib/)
**Alternative:** Organize by feature

```
features/
├── expenses/
│   ├── components/
│   │   ├── AddExpenseModal.tsx
│   │   ├── ExpenseList.tsx
│   │   └── ExpenseFilters.tsx
│   ├── hooks/
│   │   └── useExpenses.ts
│   ├── screens/
│   │   └── index.tsx
│   └── types/
├── budget/
│   ├── components/
│   ├── hooks/
│   └── screens/
├── net-worth/
│   ├── components/
│   ├── hooks/
│   └── screens/
└── categories/
    ├── components/
    ├── hooks/
    └── screens/
```

**Benefits:**
- Colocate related code
- Easier to find all code for a feature
- Better encapsulation

**When to do this:** If codebase continues to grow significantly

**Estimated effort:** 8-12 hours

---

### 4.2 Shared Theme/Styling System
**Current:** 28 separate StyleSheet.create() calls with duplicated patterns

**Solution:** Create design system
```
constants/
├── theme.ts              # Colors, spacing, typography
├── commonStyles.ts       # Shared style patterns
└── components/           # Styled primitives
    ├── Button.tsx
    ├── Card.tsx
    └── Text.tsx
```

**Benefits:**
- Consistent styling across app
- Easy to update theme globally
- Smaller bundle size (shared styles)

**Estimated effort:** 6-8 hours

---

### 4.3 State Management Review

**Current issues:**
- `/app/(tabs)/more.tsx` manages 8 modal visibility states
- Inconsistent patterns across screens

**Options:**

#### Option 1: Zustand (Recommended)
Lightweight, minimal boilerplate
```typescript
import create from 'zustand';

const useModalStore = create((set) => ({
  activeModal: null,
  openModal: (modal) => set({ activeModal: modal }),
  closeModal: () => set({ activeModal: null }),
}));
```

#### Option 2: Context API consolidation
Expand SettingsContext pattern to other domains

#### Option 3: XState
For complex state machines (like multi-step forms)

**Estimated effort:** 4-6 hours

---

## Metrics

### Current State (After Priority 1)
- Total lines of code: ~11,000
- Largest file: 1,601 lines (networth.tsx)
- Files >500 lines: 7 files
- Duplicate utilities: 0 instances ✓
- Unused code: 0 lines ✓

### After Priority 2
- Total lines of code: ~9,000 (18% reduction)
- Largest file: ~400 lines
- Files >500 lines: 0 files
- Database code duplication: Eliminated

### After Priority 3
- Total lines of code: ~8,500 (23% reduction from start)
- Modal count: ~10 (from 15)
- Reusable components: +5

### After Priority 4
- Total lines of code: ~8,000 (25% reduction)
- Design system in place
- State management unified

---

## Implementation Strategy

### Recommended Order

**Phase 1 (Week 1-2):** Priority 2 Critical Refactoring
1. Break up networth.tsx
2. Break up index.tsx
3. Refactor database layer
4. Simplify migrations.ts

**Phase 2 (Week 3):** Priority 3 Moderate Improvements
5. Extract BaseModal wrapper
6. Refactor BudgetProgressBar
7. Break up large modals

**Phase 3 (Optional):** Priority 4 Long-term
8. Feature-based organization (if needed)
9. Design system/theming
10. State management consolidation

---

## Testing Strategy

After each refactoring task:
1. Run the app and manually test affected features
2. Check for TypeScript errors: `npx tsc --noEmit`
3. Verify no broken imports
4. Test on both iOS and Android if possible
5. Check performance (app shouldn't be slower)

---

## Notes

- Commit after each completed task
- Use feature branches for large refactors
- Keep PRs focused on single tasks
- Update documentation as you go
- Don't optimize prematurely - focus on readability first
