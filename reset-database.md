# Database Reset Instructions

The app database needs to be reset due to a schema issue. Choose one of these methods:

## Method 1: Uninstall and Reinstall (Recommended)
1. Uninstall the app completely from your device/simulator
2. Rebuild and install with: `npx eas-cli build --profile development --platform ios`
3. The database will be recreated with the correct schema

## Method 2: Clear App Data (iOS Simulator)
1. In the simulator, long-press the app icon
2. Tap "Delete App"
3. Rebuild and reinstall

## Method 3: Clear App Data (Physical iOS Device)
1. Go to Settings > General > iPhone Storage
2. Find your app and tap it
3. Tap "Delete App"
4. Rebuild and reinstall

## What was fixed:
- Added missing `position` column to custom_categories table
- This column is required for categories to load and display properly
