# BasicBudget - Stabilization for v1 Release

## What This Is

A mobile budgeting app (React Native + Expo) that makes expense tracking seamless while providing spending insights. Users set monthly budgets, track expenses by category, visualize spending patterns with charts, and manage their net worth (assets/liabilities). Local-first architecture with no server dependencies.

## Core Value

Seamless expense tracking that helps users understand their spending habits without friction.

## Requirements

### Validated

<!-- Features already implemented and working in the existing codebase -->

- ✓ Budget tracking with monthly budgets — existing
- ✓ Expense management (add, edit, delete expenses) — existing
- ✓ Category system with default categories (12 built-in) — existing
- ✓ Custom category creation — existing
- ✓ Spending visualization with charts — existing
- ✓ Net worth tracking (assets and liabilities balance sheet) — existing
- ✓ Settings and preferences management — existing
- ✓ Local-first data persistence with SQLite — existing

### Active

<!-- Stabilization work needed before v1 ship -->

- [ ] Fix new user budget saving bug (believed fixed, needs verification)
- [ ] Ensure category rename cascades to all expenses automatically
- [ ] Ensure category icon changes persist correctly
- [ ] Ensure category reorder works reliably
- [ ] Improve category management UX (currently rough and confusing)
- [ ] Rename "index" tab to "budget" for clarity
- [ ] Complete manual testing coverage for new users
- [ ] Complete manual testing coverage for existing users

### Out of Scope

- Automated test suite — manual testing sufficient for v1
- Cloud sync or backup — local-first for v1
- Multi-user or authentication — single-user app
- New features beyond stabilization — ship stable v1 first

## Context

**Current State:**
The app has all core features implemented but needs stabilization before shipping to new users. The category management system is particularly fragile - users can rename categories, change icons, and reorder them, but the UX is rough and reliability needs verification.

**Known Issues from Codebase Analysis:**
- Database singleton pattern has potential race conditions during initialization
- Extensive use of `any` types reduces type safety
- Error handling inconsistent across database models
- Optimistic updates cause UI flicker on errors
- Category system is fragile (hybrid default/custom, position-based ordering)
- Budget progress bar component is complex (576 lines, many edge cases)

**User Experience Priorities:**
- New users should be able to set their first budget without errors
- Category management should be intuitive and reliable
- Expense data must never be lost or corrupted during category changes

## Constraints

- **Tech stack**: React Native 0.81.5, Expo 54, expo-sqlite 16.0.9 — existing architecture
- **Platform**: iOS/Android via Expo — maintain compatibility
- **Timeline**: Ship stable v1 after manual testing passes — no automated test requirement
- **Data**: Local-first, no server/auth — maintain existing architecture
- **Approach**: Stabilization only, no new features — focused scope

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Manual testing over automated tests | Faster path to stable v1; automated tests can come in v2 | — Pending |
| Fix bugs before improving UX | Reliability first, polish second | — Pending |
| Focus on category management | Most complex and fragile area identified | — Pending |

---
*Last updated: 2026-01-21 after initialization*
