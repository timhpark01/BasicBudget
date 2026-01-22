# Phase 2: Category Reliability - Research

**Researched:** 2026-01-22
**Domain:** SQLite denormalized data consistency, category operations, React Native state synchronization
**Confidence:** HIGH

## Summary

Category reliability focuses on maintaining data consistency across denormalized category data stored in the expenses table. The codebase uses a hybrid category system with denormalized category fields (category_id, category_name, category_icon, category_color) in the expenses table for query performance. When a category is renamed, its icon changed, or position reordered, these changes must propagate to all related expenses and persist reliably across app restarts.

The existing implementation partially addresses this: category deletion uses `withExclusiveTransactionAsync` to atomically soft-delete and reassign expenses (added in Phase 1), but category rename and icon updates currently only modify the custom_categories table without updating denormalized expense data. Position-based ordering uses integer positions without unique constraints, risking gaps or duplicate positions during concurrent reorders.

**Primary recommendation:** Add transactional category update operations that cascade changes to denormalized expense data, implement cache invalidation hooks to refresh dependent data (expenses, category budgets) after category changes, strengthen position integrity with gap-free reordering logic, and add comprehensive validation to prevent orphaned or corrupted category references.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| expo-sqlite | 16.0.9 | Database with transactions | Official Expo solution with `withExclusiveTransactionAsync` for atomic multi-table updates |
| React hooks | 18.3.1 | State management | useState/useCallback pattern for optimistic updates with rollback on error |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| TypeScript | 5.9.2 | Type safety | Ensure category update operations maintain type contracts across denormalized data |
| (none additional) | - | - | Built-in React Native and expo-sqlite features sufficient for category reliability |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual cascade updates | SQLite triggers | Triggers auto-update denormalized data but add complexity, harder to debug, React Native devs less familiar |
| Optimistic updates + rollback | React Query / TanStack Query | Better cache invalidation but adds 50KB+ dependency, overkill for single-database app |
| Position-based ordering | Fractional/lexicographic ordering | Avoids renumbering but uses floats (precision issues) or strings (complex comparison logic) |
| Denormalized storage | Foreign keys with JOINs | Normalized design cleaner but requires query refactor, breaks existing expense structure |

**Installation:**
```bash
# Already installed - no new dependencies needed
# expo-sqlite@~16.0.9 already in package.json
```

## Architecture Patterns

### Recommended Project Structure
```
lib/db/
├── models/
│   ├── categories.ts        # Add cascading update functions
│   └── expenses.ts          # May need helper for bulk updates
hooks/
├── useCategories.ts          # Add cache invalidation logic
└── useExpenses.ts           # Add refresh trigger on category changes
```

### Pattern 1: Cascading Category Updates with Transactions
**What:** When category metadata changes, propagate to all denormalized expense records atomically
**When to use:** Category rename, icon change, color change operations
**Example:**
```typescript
// Source: SQLite denormalized data patterns + expo-sqlite transactions
export async function updateCustomCategoryWithCascade(
  db: SQLite.SQLiteDatabase,
  id: string,
  category: Partial<CustomCategoryInput>
): Promise<CustomCategory> {
  // Use exclusive transaction for atomic multi-table update
  await db.withExclusiveTransactionAsync(async () => {
    const now = Date.now();
    const updates: string[] = [];
    const values: any[] = [];

    // Build category table updates
    if (category.name !== undefined) {
      updates.push('name = ?');
      values.push(category.name);
    }
    if (category.icon !== undefined) {
      updates.push('icon = ?');
      values.push(category.icon);
    }
    if (category.color !== undefined) {
      updates.push('color = ?');
      values.push(category.color);
    }

    updates.push('updated_at = ?');
    values.push(now);
    values.push(id);

    // Step 1: Update category metadata
    await db.runAsync(
      `UPDATE custom_categories SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    // Step 2: Cascade changes to denormalized expense data
    const expenseUpdates: string[] = [];
    const expenseValues: any[] = [];

    if (category.name !== undefined) {
      expenseUpdates.push('category_name = ?');
      expenseValues.push(category.name);
    }
    if (category.icon !== undefined) {
      expenseUpdates.push('category_icon = ?');
      expenseValues.push(category.icon);
    }
    if (category.color !== undefined) {
      expenseUpdates.push('category_color = ?');
      expenseValues.push(category.color);
    }

    if (expenseUpdates.length > 0) {
      expenseUpdates.push('updated_at = ?');
      expenseValues.push(now);
      expenseValues.push(id);

      await db.runAsync(
        `UPDATE expenses SET ${expenseUpdates.join(', ')} WHERE category_id = ?`,
        expenseValues
      );
    }

    // Both updates commit together or rollback together
  });

  // Fetch and return updated category
  const result = await db.getFirstAsync<CustomCategoryRow>(
    'SELECT * FROM custom_categories WHERE id = ?',
    [id]
  );

  if (!result) {
    throw new DatabaseError('Category not found after update', undefined, 'not_found');
  }

  return rowToCustomCategory(result);
}
```

### Pattern 2: Hook-Based Cache Invalidation
**What:** Refresh dependent data (expenses, category budgets) when category changes
**When to use:** After category update, delete, or reorder operations
**Example:**
```typescript
// Source: React hooks state management patterns 2026
// In useCategories.ts
const updateCategory = useCallback(
  async (id: string, category: Partial<CustomCategoryInput>): Promise<void> => {
    if (!db) throw new Error('Database not initialized');

    try {
      // Update with cascading transaction
      const updated = await updateCustomCategoryWithCascade(db, id, category);

      // Optimistically update local state
      setCustomCategories((prev) =>
        prev.map((c) => (c.id === id ? updated : c))
      );

      // Trigger dependent data refresh
      // This ensures expenses and category budgets reflect new category metadata
      if (onCategoryChanged) {
        onCategoryChanged(id);
      }

      setError(null);
    } catch (err) {
      // Rollback optimistic update on error
      await loadCustomCategories(db);
      throw err;
    }
  },
  [db, onCategoryChanged]
);

// In parent component or App.tsx
function App() {
  const { updateCategory, ...categories } = useCategories();
  const { refreshExpenses } = useExpenses();
  const { refreshCategoryBudgets } = useCategoryBudgets();

  const handleCategoryChange = useCallback(async (categoryId: string) => {
    // Refresh all data that includes denormalized category info
    await Promise.all([
      refreshExpenses(),
      refreshCategoryBudgets()
    ]);
  }, [refreshExpenses, refreshCategoryBudgets]);

  // Wire up invalidation callback
  const updateCategoryWithRefresh = useCallback(
    async (id: string, category: Partial<CustomCategoryInput>) => {
      await updateCategory(id, category);
      await handleCategoryChange(id);
    },
    [updateCategory, handleCategoryChange]
  );

  // ...
}
```

### Pattern 3: Gap-Free Position Reordering
**What:** Maintain continuous position sequence (0, 1, 2, ...) without gaps or duplicates
**When to use:** Category drag-and-drop reordering
**Example:**
```typescript
// Source: Position-based ordering best practices
export async function reorderCategories(
  db: SQLite.SQLiteDatabase,
  categoryIds: string[]
): Promise<void> {
  // Validate input: ensure no duplicates, all IDs exist
  const uniqueIds = new Set(categoryIds);
  if (uniqueIds.size !== categoryIds.length) {
    throw new DatabaseError('Duplicate category IDs in reorder list', undefined, 'validation');
  }

  const now = Date.now();

  // Use exclusive transaction for atomic position updates
  await db.withExclusiveTransactionAsync(async () => {
    // Assign positions sequentially from 0
    for (let i = 0; i < categoryIds.length; i++) {
      await db.runAsync(
        'UPDATE custom_categories SET position = ?, updated_at = ? WHERE id = ?',
        [i, now, categoryIds[i]]
      );
    }
  });
}
```

**Why gap-free integer positions:**
- Simple to implement and maintain
- Predictable ordering in queries (`ORDER BY position ASC`)
- No precision issues (vs. floats) or comparison complexity (vs. strings)
- Reordering entire list is acceptable for small category counts (<20)

### Pattern 4: Denormalized Data Integrity Validation
**What:** Verify denormalized expense data matches category source of truth
**When to use:** Development/testing, data integrity checks, after migrations
**Example:**
```typescript
// Source: Database integrity validation patterns
export async function validateCategoryConsistency(
  db: SQLite.SQLiteDatabase
): Promise<{ valid: boolean; issues: string[] }> {
  const issues: string[] = [];

  // Check 1: Expenses reference active categories
  const orphanedExpenses = await db.getAllAsync<{ id: string; category_id: string }>(
    `SELECT e.id, e.category_id
     FROM expenses e
     LEFT JOIN custom_categories c ON e.category_id = c.id
     WHERE c.id IS NULL OR c.is_active = 0`
  );

  if (orphanedExpenses.length > 0) {
    issues.push(`Found ${orphanedExpenses.length} expenses with inactive/missing categories`);
  }

  // Check 2: Denormalized category data matches source
  const mismatchedExpenses = await db.getAllAsync<{
    id: string;
    category_id: string;
    expense_name: string;
    category_name: string;
  }>(
    `SELECT
       e.id, e.category_id,
       e.category_name as expense_name,
       c.name as category_name
     FROM expenses e
     JOIN custom_categories c ON e.category_id = c.id
     WHERE e.category_name != c.name
        OR e.category_icon != c.icon
        OR e.category_color != c.color`
  );

  if (mismatchedExpenses.length > 0) {
    issues.push(
      `Found ${mismatchedExpenses.length} expenses with outdated category metadata`
    );
  }

  // Check 3: Position uniqueness and gaps
  const positions = await db.getAllAsync<{ position: number }>(
    'SELECT position FROM custom_categories WHERE is_active = 1 ORDER BY position ASC'
  );

  const positionValues = positions.map(p => p.position);
  const expectedPositions = positionValues.map((_, i) => i);

  if (JSON.stringify(positionValues) !== JSON.stringify(expectedPositions)) {
    issues.push('Category positions have gaps or duplicates');
  }

  return {
    valid: issues.length === 0,
    issues
  };
}
```

### Anti-Patterns to Avoid
- **Updating category without cascading to expenses:** Leads to UI showing old category names/icons on existing expenses
- **Using non-exclusive transactions:** Can include unrelated async operations in the transaction scope
- **Allowing position gaps/duplicates:** Makes ordering unpredictable, requires defensive coding in UI
- **Forgetting to refresh dependent data:** Expenses hook won't see updated category metadata until manual refresh
- **No validation of category references:** Can orphan expenses if category soft-delete skips reassignment

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cascading updates to denormalized data | Manual UPDATE statements per field | Transactional batch update with dynamic SQL | Prevents partial updates on error, handles multiple field changes atomically |
| Cache invalidation after mutations | Custom event emitters or global state | Callback pattern in hooks (onCategoryChanged) | Simpler, type-safe, no new dependencies |
| Position reordering with gaps | Complex gap-fill logic or fractional positions | Full renumbering in transaction | Categories list is small (<20), performance not a concern |
| Detecting orphaned expenses | Manual queries in UI layer | Database integrity validation helper | Centralized, reusable, can run in tests or health checks |
| Rollback on error | Try/catch with manual state revert | Optimistic update + reload on error | Already established pattern in useExpenses, consistent UX |

**Key insight:** Denormalized data is a performance optimization (avoids JOINs) with a maintenance cost. The cost is acceptable if cascading updates are transactional, validated, and tested. Don't try to avoid the cascade - embrace it with clear patterns.

## Common Pitfalls

### Pitfall 1: Category Rename Without Cascading to Expenses
**What goes wrong:** `updateCustomCategory()` currently only updates the custom_categories table. Existing expenses continue showing the old category name until the expense is edited and re-saved.
**Why it happens:** Denormalized architecture requires manual cascade. Developer assumed category_id foreign key would handle it, but data is duplicated for performance.
**How to avoid:** Always cascade category metadata changes (name, icon, color) to the expenses table in the same transaction. Test by renaming a category and verifying all existing expenses immediately show the new name.
**Warning signs:**
- Expenses show old category names after category rename
- Category icon changes don't appear on historical expenses
- User reports "category name is wrong" on old expenses

### Pitfall 2: Position Duplicates During Reorder
**What goes wrong:** If reordering sets position=0 on category A, then position=1 on category B, but position=1 was already assigned, you get duplicates momentarily (even in a transaction).
**Why it happens:** Sequential updates can create temporary constraint violations. SQLite allows duplicates unless you add a UNIQUE constraint on position.
**How to avoid:** Reorder pattern used in existing code is correct: accept full list of categoryIds, renumber all in transaction. Don't try to swap positions or do incremental updates.
**Warning signs:**
- Categories appear in wrong order after drag-and-drop
- Position validation fails intermittently
- Reorder operation sometimes throws "constraint violation"

### Pitfall 3: Forgetting to Refresh Expenses After Category Update
**What goes wrong:** Category name updates successfully in database (with cascade), but UI still shows old name on expenses until next app restart or manual refresh.
**Why it happens:** React state in useExpenses hook is stale. Category update doesn't trigger expense data reload.
**How to avoid:** Implement cache invalidation callback pattern. After category update, call `refreshExpenses()` to reload with updated denormalized data.
**Warning signs:**
- User renames category but expenses don't update immediately
- Category changes appear after closing/reopening modal or navigating away
- Users report "I changed it but it didn't save"

### Pitfall 4: Icon Change Not Persisting Across Restart
**What goes wrong:** User changes category icon, it updates in UI immediately, but after app restart it reverts to old icon.
**Why it happens:** Icon update saves to custom_categories table but doesn't cascade to expenses. On restart, some code path loads icon from expense data instead of category data.
**How to avoid:**
1. Cascade icon changes to expenses table (same as name/color)
2. Always load category icon from custom_categories table, not from expense data
3. Test icon changes with app restart to verify persistence
**Warning signs:**
- Icon changes revert after app restart
- Different expenses show different icons for same category
- Icon appears correct in category list but wrong in expense list

### Pitfall 5: Orphaned Expenses After Failed Category Deletion
**What goes wrong:** Category deletion transaction fails halfway (app crash, low memory), leaving expenses with category_id pointing to a soft-deleted (is_active=0) category.
**Why it happens:** Even with transactions, if the transaction commits but state update fails, UI can desync. Or if reassignment logic has bugs.
**How to avoid:**
1. Existing code uses `withExclusiveTransactionAsync` - maintain this
2. Add validation check: "no active expenses reference inactive categories"
3. Implement repair function to reassign orphaned expenses to "Other"
**Warning signs:**
- Expenses show with no category information
- Category count queries return unexpected results
- Users report "my expenses disappeared" (actually orphaned)

### Pitfall 6: Concurrent Category Updates (Race Condition)
**What goes wrong:** User rapidly clicks rename + change icon. First update starts transaction, second update starts before first commits. Second transaction reads stale data, overwrites first transaction's changes.
**Why it happens:** UI doesn't disable update button during pending operation. Multiple async operations in flight.
**How to avoid:**
1. Disable UI controls during pending category updates
2. Use optimistic update pattern: update local state immediately, send to DB async
3. On error, reload from database (already implemented in existing code)
**Warning signs:**
- Category changes sometimes "disappear"
- Icon changes but name reverts
- Updated_at timestamp doesn't match expected sequence

## Code Examples

Verified patterns from official sources:

### Cascading Category Update with Transaction
```typescript
// Source: expo-sqlite withExclusiveTransactionAsync + denormalization patterns
export async function updateCustomCategoryWithCascade(
  db: SQLite.SQLiteDatabase,
  id: string,
  category: Partial<CustomCategoryInput>
): Promise<CustomCategory> {
  try {
    // Input validation
    if (category.name !== undefined && category.name.trim().length === 0) {
      throw new DatabaseError('Category name cannot be empty', undefined, 'validation');
    }

    let updatedCategory: CustomCategory | null = null;

    await db.withExclusiveTransactionAsync(async () => {
      const now = Date.now();

      // Step 1: Update custom_categories table
      const categoryUpdates: string[] = [];
      const categoryValues: any[] = [];

      if (category.name !== undefined) {
        categoryUpdates.push('name = ?');
        categoryValues.push(category.name);
      }
      if (category.icon !== undefined) {
        categoryUpdates.push('icon = ?');
        categoryValues.push(category.icon);
      }
      if (category.color !== undefined) {
        categoryUpdates.push('color = ?');
        categoryValues.push(category.color);
      }

      categoryUpdates.push('updated_at = ?');
      categoryValues.push(now);
      categoryValues.push(id);

      await db.runAsync(
        `UPDATE custom_categories SET ${categoryUpdates.join(', ')} WHERE id = ?`,
        categoryValues
      );

      // Step 2: Cascade to denormalized expense data
      const expenseUpdates: string[] = [];
      const expenseValues: any[] = [];

      if (category.name !== undefined) {
        expenseUpdates.push('category_name = ?');
        expenseValues.push(category.name);
      }
      if (category.icon !== undefined) {
        expenseUpdates.push('category_icon = ?');
        expenseValues.push(category.icon);
      }
      if (category.color !== undefined) {
        expenseUpdates.push('category_color = ?');
        expenseValues.push(category.color);
      }

      if (expenseUpdates.length > 0) {
        expenseUpdates.push('updated_at = ?');
        expenseValues.push(now);
        expenseValues.push(id);

        await db.runAsync(
          `UPDATE expenses SET ${expenseUpdates.join(', ')} WHERE category_id = ?`,
          expenseValues
        );
      }
    });

    // Fetch updated category after transaction commits
    const result = await db.getFirstAsync<CustomCategoryRow>(
      'SELECT * FROM custom_categories WHERE id = ?',
      [id]
    );

    if (!result) {
      throw new DatabaseError('Category not found after update', undefined, 'not_found');
    }

    return rowToCustomCategory(result);
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }

    const sqliteError = error as { code?: number; message?: string };

    // Handle constraint violations (duplicate category name)
    if (sqliteError.code === 19 || sqliteError.code === 2067) {
      throw new DatabaseConstraintError(
        'A category with this name already exists',
        'unique',
        error as Error
      );
    }

    const userMessage = mapSQLiteErrorToUserMessage(sqliteError);

    throw new DatabaseError(
      userMessage,
      sqliteError.code,
      'update_category_cascade',
      error as Error
    );
  }
}
```

### Hook with Cache Invalidation
```typescript
// Source: React hooks state management patterns
// Modified useCategories.ts
export interface UseCategoriesReturn {
  allCategories: Category[];
  customCategories: CustomCategory[];
  loading: boolean;
  error: Error | null;
  addCategory: (category: CustomCategoryInput) => Promise<void>;
  updateCategory: (id: string, category: Partial<CustomCategoryInput>) => Promise<void>;
  deleteCategory: (id: string) => Promise<boolean>;
  reorderCategories: (categoryIds: string[]) => Promise<void>;
  refreshCategories: () => Promise<void>;
  // NEW: Callback to trigger when category changes
  onCategoryChanged?: (categoryId: string) => Promise<void>;
}

export function useCategories(
  options?: { onCategoryChanged?: (categoryId: string) => Promise<void> }
): UseCategoriesReturn {
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);

  const updateCategory = useCallback(
    async (id: string, category: Partial<CustomCategoryInput>): Promise<void> => {
      if (!db) throw new Error('Database not initialized');

      try {
        // Use cascading update function
        const updated = await updateCustomCategoryWithCascade(db, id, category);

        // Optimistically update local state
        setCustomCategories((prev) =>
          prev.map((c) => (c.id === id ? updated : c))
        );

        // Trigger invalidation callback if provided
        if (options?.onCategoryChanged) {
          await options.onCategoryChanged(id);
        }

        setError(null);
      } catch (err) {
        // Rollback on error
        await loadCustomCategories(db);
        throw err;
      }
    },
    [db, options?.onCategoryChanged]
  );

  // ... rest of hook implementation
}

// Usage in App.tsx or parent component
function BudgetApp() {
  const { refreshExpenses } = useExpenses();
  const { refreshCategoryBudgets } = useCategoryBudgets();

  const handleCategoryChanged = useCallback(
    async (categoryId: string) => {
      // Refresh all data that contains denormalized category info
      await Promise.all([
        refreshExpenses(),
        refreshCategoryBudgets()
      ]);
    },
    [refreshExpenses, refreshCategoryBudgets]
  );

  const categories = useCategories({
    onCategoryChanged: handleCategoryChanged
  });

  // ...
}
```

### Position Integrity Validation and Repair
```typescript
// Source: Database integrity patterns + position ordering best practices
export async function validateAndRepairPositions(
  db: SQLite.SQLiteDatabase
): Promise<{ repaired: boolean; message: string }> {
  // Get all active categories ordered by position
  const categories = await db.getAllAsync<{ id: string; position: number }>(
    'SELECT id, position FROM custom_categories WHERE is_active = 1 ORDER BY position ASC'
  );

  // Check if positions are sequential starting from 0
  const hasGapsOrDuplicates = categories.some((cat, index) => cat.position !== index);

  if (!hasGapsOrDuplicates) {
    return { repaired: false, message: 'Positions are valid' };
  }

  // Repair: renumber all positions sequentially
  await db.withExclusiveTransactionAsync(async () => {
    const now = Date.now();
    for (let i = 0; i < categories.length; i++) {
      await db.runAsync(
        'UPDATE custom_categories SET position = ?, updated_at = ? WHERE id = ?',
        [i, now, categories[i].id]
      );
    }
  });

  return {
    repaired: true,
    message: `Repaired ${categories.length} category positions`
  };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Normalized categories with JOINs | Denormalized category data in expenses | Existing design | Faster queries, but requires cascade updates |
| Single-table updates | Transaction-protected cascading updates | Phase 2 (this phase) | Prevents inconsistent denormalized data |
| Manual state refresh | Hook-based cache invalidation callbacks | Phase 2 (this phase) | Automatic UI updates after category changes |
| Optimistic UI without rollback | Optimistic + rollback pattern | Already exists in useExpenses | Consistent UX, already established |
| Position gaps allowed | Gap-free sequential positions | Phase 2 (this phase) | Predictable ordering, simpler queries |

**Deprecated/outdated:**
- **Separate expense updates for category changes:** Current code doesn't cascade category updates to expenses - this needs to be deprecated in favor of transactional cascade
- **Category update without expense refresh:** Must invalidate expense cache after category changes

## Open Questions

Things that couldn't be fully resolved:

1. **Should position have a UNIQUE constraint in schema?**
   - What we know: Current schema doesn't have UNIQUE constraint on position column
   - What's unclear: Would adding UNIQUE(position) cause issues with reordering transaction (temporary duplicates)?
   - Recommendation: Don't add UNIQUE constraint. Gap-free renumbering in transaction works without it. Constraint would complicate reorder logic by requiring temporary negative positions or deferred constraint checking.

2. **Should category budgets also cascade updates?**
   - What we know: category_budgets table has category_id but no denormalized name/icon
   - What's unclear: If user renames category, should category budgets update? Or is category_id sufficient?
   - Recommendation: category_id is sufficient. Category budgets JOIN with categories when displayed. No denormalized data to cascade.

3. **Performance of cascading updates for users with many expenses?**
   - What we know: Each category update touches all expenses with that category_id
   - What's unclear: With 1000+ expenses in one category, will update lag noticeably?
   - Recommendation: Test with 1000+ expenses. If slow, add loading indicator during category update. SQLite UPDATE with indexed category_id should be fast (<100ms). Premature optimization to avoid.

4. **Should we validate category references on app startup?**
   - What we know: `validateCategoryConsistency()` helper can detect orphaned/mismatched expenses
   - What's unclear: Should this run automatically on startup, or only in dev/tests?
   - Recommendation: Run in development mode only (if \_\_DEV\_\_). Log warnings but don't block app. Add manual "Check Data Integrity" option in settings for users who suspect corruption.

5. **Icon persistence across restarts - where is the loading bug?**
   - What we know: Requirement states "Category icon changes persist correctly across app restarts"
   - What's unclear: Is there a known bug where icons don't persist, or is this preventive?
   - Recommendation: Test current implementation. If bug exists, verify that icon updates cascade to expenses and that expense list loads icons from category data (not cached icon). Add test case: change icon, restart app, verify icon persisted.

## Sources

### Primary (HIGH confidence)
- [Expo SQLite Documentation](https://docs.expo.dev/versions/latest/sdk/sqlite/) - withExclusiveTransactionAsync, transaction patterns
- [SQLite Isolation Levels](https://sqlite.org/isolation.html) - SERIALIZABLE isolation guarantees, transaction behavior
- [Denormalization Patterns](https://airbyte.com/data-engineering-resources/data-denormalization) - Maintaining denormalized data, cascade updates

### Secondary (MEDIUM confidence)
- [Position-Based Ordering](https://www.basedash.com/blog/implementing-re-ordering-at-the-database-level-our-experience) - Gap handling, reordering strategies
- [React Query Cache Invalidation](https://tkdodo.eu/blog/automatic-query-invalidation-after-mutations) - Cache invalidation patterns (adapted to hooks without library)
- [SQLite Triggers for Denormalization](https://sqldocs.org/sqlite-database/sqlite-triggers/) - Alternative cascade approach (not recommended for this project)

### Tertiary (LOW confidence)
- WebSearch results on "denormalized data update patterns" - General patterns, not SQLite-specific
- Community discussions on position-based ordering - Multiple approaches, no consensus

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - expo-sqlite 16.0.9 already in use, transactions verified in Phase 1
- Cascading updates: HIGH - Pattern verified with expo-sqlite docs and SQLite transaction guarantees
- Cache invalidation: MEDIUM - Callback pattern is standard React, but specific integration with hooks needs implementation testing
- Position integrity: HIGH - Gap-free renumbering pattern is straightforward, used in existing reorderCategories
- Icon persistence: LOW - Unclear if current bug exists or this is preventive. Needs testing to verify actual behavior.

**Research date:** 2026-01-22
**Valid until:** 2026-03-22 (60 days - stable patterns, unlikely to change)
