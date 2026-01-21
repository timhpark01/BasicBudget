# External Integrations

**Analysis Date:** 2026-01-21

## APIs & External Services

**None:**
- No external API integrations detected
- No third-party service SDKs found
- Fully offline-capable application

## Data Storage

**Databases:**
- SQLite (local)
  - Connection: `expo-sqlite` 16.0.9
  - Client: Native SQLite via Expo
  - Database name: `budget.db`
  - Location: `lib/db/core/database.ts`
  - Schema version: 5 (tracked in `schema_version` table)

**File Storage:**
- Local filesystem only
- AsyncStorage for key-value data

**Caching:**
- None (no external cache service)
- React state management for in-memory caching

## Authentication & Identity

**Auth Provider:**
- None (no authentication system)
  - Implementation: Local-only app with optional profile (name/email)
  - Profile stored in AsyncStorage: `@BasicBudget:userName`, `@BasicBudget:userEmail`
  - Location: `lib/storage/profile.ts`

## Monitoring & Observability

**Error Tracking:**
- None (console.error only)

**Logs:**
- Console logging throughout application
- Migration logs in `lib/db/core/migrations.ts`
- Database initialization logs in `lib/db/core/database.ts`

## CI/CD & Deployment

**Hosting:**
- Expo Application Services (EAS)
- Project ID: `2c595be3-1b07-4e70-83b4-d170e58b202b`
- Owner: `tman9000p`

**CI Pipeline:**
- EAS workflows (YAML-based):
  - `create-draft.yml` - Draft builds
  - `create-development-builds.yml` - Development builds
  - `deploy-to-production.yml` - Production deployment
- Invoked via npm scripts: `npm run draft`, `npm run development-builds`, `npm run deploy`

**Update Delivery:**
- Expo Updates (OTA updates)
- Update URL: `https://u.expo.dev/2c595be3-1b07-4e70-83b4-d170e58b202b`
- Runtime version policy: `appVersion`

## Environment Configuration

**Required env vars:**
- None (no external services)

**Secrets location:**
- No secrets required
- EAS project configuration managed via `eas.json`

**Settings Storage:**
- AsyncStorage via `@react-native-async-storage/async-storage` 2.2.0
- Keys managed in `lib/storage/settings.ts` and `lib/storage/profile.ts`
- Settings schema: `AppSettings` interface with `netWorthEnabled` flag
- Context provider: `contexts/SettingsContext.tsx`

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

## Deep Linking

**URL Scheme:**
- Custom scheme: `basicbudget://`
- Configured in `app.json` (scheme property)
- Handled by expo-linking 8.0.8

## Local Storage Keys

**Profile Keys:**
- `@BasicBudget:userName` - User's display name
- `@BasicBudget:userEmail` - User's email address

**Settings Keys:**
- Managed by `lib/storage/settings.ts` (specific keys not exposed in imports)

## Platform-Specific Features

**iOS:**
- Supports iPad
- Uses SF Symbols (expo-symbols 1.0.7)
- Non-exempt encryption: false (ITSAppUsesNonExemptEncryption)

**Android:**
- Adaptive icon with foreground/background/monochrome variants
- Edge-to-edge display enabled
- Predictive back gesture: disabled

**Web:**
- Static output mode
- Favicon: `./assets/images/favicon.png`

---

*Integration audit: 2026-01-21*
