# Roadmap: BasicBudget Stabilization

## Overview

This roadmap guides stabilization of the BasicBudget app from feature-complete to production-ready. The focus is fixing database reliability issues, stabilizing the category management system, improving UX rough edges, and completing manual testing before the v1 ship. No new features - just making what exists bulletproof.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Database Stabilization** - Eliminate race conditions and improve error handling
- [ ] **Phase 2: Category Reliability** - Fix category operations data integrity
- [ ] **Phase 3: Category UX Improvements** - Polish category management interface
- [ ] **Phase 4: Navigation Polish** - Rename index tab for clarity
- [ ] **Phase 5: Testing & Verification** - Complete manual testing coverage

## Phase Details

### Phase 1: Database Stabilization
**Goal**: Database operations are reliable and errors provide actionable feedback
**Depends on**: Nothing (first phase)
**Requirements**: DB-01, DB-02, DB-03, DB-04
**Success Criteria** (what must be TRUE):
  1. Database initialization completes successfully under concurrent access patterns
  2. Database errors display actionable messages to users (not generic failures)
  3. Transaction boundaries protect multi-step operations from partial failures
  4. Error handling is consistent across all database models (expenses, budgets, categories, net worth)
**Plans**: 4 plans

Plans:
- [x] 01-01-PLAN.md — Database error infrastructure (error classes + mapper)
- [x] 01-02-PLAN.md — Fix database singleton race condition
- [x] 01-03-PLAN.md — Update expenses, budgets, category-budgets error handling
- [x] 01-04-PLAN.md — Add transactions to categories, improve net-worth validation

### Phase 2: Category Reliability
**Goal**: Category operations maintain data consistency without corruption or orphaned expenses
**Depends on**: Phase 1
**Requirements**: CAT-01, CAT-02, CAT-03, CAT-04
**Success Criteria** (what must be TRUE):
  1. User can rename a category and all associated expenses show the new name immediately
  2. User can change a category icon and it persists correctly across app restarts
  3. User can reorder categories and the new order persists reliably
  4. Category operations never orphan expenses or corrupt data
**Plans**: 2 plans

Plans:
- [ ] 02-01-PLAN.md — Cascading category updates with cache invalidation
- [ ] 02-02-PLAN.md — Category position integrity validation and repair

### Phase 3: Category UX Improvements
**Goal**: Category management interface is intuitive and provides clear feedback
**Depends on**: Phase 2
**Requirements**: UX-01, UX-02, UX-03, UX-04
**Success Criteria** (what must be TRUE):
  1. User understands how to rename a category without confusion
  2. User can easily browse and select category icons
  3. User understands how to reorder categories (drag mechanism is clear)
  4. User receives clear visual confirmation when category changes succeed
**Plans**: TBD

Plans:
- [ ] TBD during planning

### Phase 4: Navigation Polish
**Goal**: Navigation labels accurately reflect screen content
**Depends on**: Nothing (independent)
**Requirements**: NAV-01
**Success Criteria** (what must be TRUE):
  1. Bottom tab navigation shows "Budget" instead of "Index"
  2. Tab label matches the primary content of the screen
**Plans**: TBD

Plans:
- [ ] TBD during planning

### Phase 5: Testing & Verification
**Goal**: All critical workflows verified through manual testing
**Depends on**: Phase 2, Phase 3, Phase 4
**Requirements**: TEST-01, TEST-02, TEST-03, TEST-04, TEST-05
**Success Criteria** (what must be TRUE):
  1. New user can complete first-time setup and create their first expense without errors
  2. Existing user upgrading from previous version experiences no data loss
  3. All category operations (rename, icon change, reorder) work reliably in test scenarios
  4. Category-expense relationships remain intact through all operations
  5. Database error scenarios are handled gracefully with helpful messages
**Plans**: TBD

Plans:
- [ ] TBD during planning

## Progress

**Execution Order:**
Phases execute in numeric order with dependencies respected.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Database Stabilization | 4/4 | Complete | 2026-01-22 |
| 2. Category Reliability | 0/2 | Not started | - |
| 3. Category UX Improvements | 0/TBD | Not started | - |
| 4. Navigation Polish | 0/TBD | Not started | - |
| 5. Testing & Verification | 0/TBD | Not started | - |

---
*Roadmap created: 2026-01-21*
