# Technology Stack

**Analysis Date:** 2026-01-21

## Languages

**Primary:**
- TypeScript 5.9.2 - All application code (components, hooks, lib, types)
- JavaScript - Configuration files (babel, jest, eslint)

**Secondary:**
- TSX - React Native components and screens

## Runtime

**Environment:**
- Node.js v20.19.6 (development)
- React Native 0.81.5
- React 19.1.0

**Package Manager:**
- npm 10.8.2
- Lockfile: present (`package-lock.json`, lockfileVersion 3)

## Frameworks

**Core:**
- Expo 54.0.29 - React Native framework and development platform
- Expo Router 6.0.19 - File-based routing
- React Native 0.81.5 - Mobile app framework
- React 19.1.0 - UI library

**Navigation:**
- @react-navigation/native 7.1.8 - Navigation core
- @react-navigation/bottom-tabs 7.4.0 - Tab navigation
- @react-navigation/elements 2.6.3 - Navigation primitives

**Testing:**
- Jest 29.7.0 - Test runner
- jest-expo 54.0.16 - Expo-specific Jest preset
- @testing-library/react-native 12.9.0 - Component testing
- react-test-renderer 19.1.0 - React renderer for tests

**Build/Dev:**
- @expo/metro-runtime 6.1.2 - Metro bundler runtime
- babel-preset-expo - Babel configuration for Expo
- @babel/preset-flow 7.27.1 - Flow type annotations support

## Key Dependencies

**Critical:**
- expo-sqlite 16.0.9 - Local SQLite database for expense/budget storage
- @react-native-async-storage/async-storage 2.2.0 - AsyncStorage for settings/profile
- expo-router 6.0.19 - File-based routing system

**UI/UX:**
- @expo/vector-icons 15.0.2 - Icon library (Ionicons)
- react-native-gesture-handler 2.28.0 - Gesture system
- react-native-reanimated 4.1.1 - Animation library
- react-native-safe-area-context 5.6.0 - Safe area handling
- expo-haptics 15.0.7 - Haptic feedback
- @react-native-community/datetimepicker 8.4.4 - Date/time picker
- react-native-chart-kit 6.12.0 - Chart visualization
- react-native-svg 15.12.1 - SVG rendering for charts
- react-native-draggable-flatlist 4.0.3 - Drag-and-drop lists

**Infrastructure:**
- expo-crypto 15.0.7 - ID generation utilities
- expo-constants 18.0.12 - App constants and configuration
- expo-updates 29.0.13 - Over-the-air updates
- expo-splash-screen 31.0.10 - Splash screen management
- expo-status-bar 3.0.8 - Status bar control
- expo-system-ui 6.0.7 - System UI theming
- expo-web-browser 15.0.7 - In-app browser
- expo-linking 8.0.8 - Deep linking
- expo-font 14.0.8 - Custom font loading
- expo-image 3.0.8 - Optimized image component
- expo-symbols 1.0.7 - SF Symbols support

## Configuration

**Environment:**
- No `.env` files detected (no external API keys required)
- Settings stored in AsyncStorage via `@/lib/storage/settings`
- Profile data stored in AsyncStorage via `@/lib/storage/profile`

**Build:**
- `babel.config.js` - Babel transpilation (expo preset + Flow)
- `tsconfig.json` - TypeScript configuration (strict mode, path aliases `@/*`)
- `jest.config.js` - Test configuration (80%+ coverage thresholds)
- `eslint.config.js` - Linting rules (expo config)
- `app.json` - Expo app configuration
- `eas.json` - Expo Application Services build profiles

**TypeScript:**
- Strict mode enabled
- Path alias: `@/*` maps to project root
- Extends `expo/tsconfig.base`

## Platform Requirements

**Development:**
- Node.js 20.19.6 or compatible
- npm 10.8.2 or compatible
- Expo CLI (via npx commands)
- iOS Simulator (for iOS development)
- Android Emulator or device (for Android development)

**Production:**
- Expo Application Services (EAS)
- Project ID: `2c595be3-1b07-4e70-83b4-d170e58b202b`
- Owner: `tman9000p`
- Bundle Identifiers:
  - iOS: `com.tman9000p.appBasicBudget`
  - Android: `com.tman9000p.appBasicBudget`
- Update URL: `https://u.expo.dev/2c595be3-1b07-4e70-83b4-d170e58b202b`
- Runtime version policy: `appVersion`

**EAS Build Profiles:**
- `development` - Development builds with dev client
- `development-simulator` - iOS simulator builds
- `preview` - Internal distribution preview builds (main channel)
- `production` - Production builds (production channel, auto-increment)

---

*Stack analysis: 2026-01-21*
