import AsyncStorage from '@react-native-async-storage/async-storage';

const FIRST_LAUNCH_KEY = '@BasicBudget:hasLaunched';

/**
 * Check if this is the first time the app has been launched
 * @returns true if first launch, false otherwise
 */
export async function isFirstLaunch(): Promise<boolean> {
  try {
    const hasLaunched = await AsyncStorage.getItem(FIRST_LAUNCH_KEY);
    return hasLaunched === null;
  } catch (error) {
    console.error('Failed to check first launch status:', error);
    // If we can't read from storage, assume it's not the first launch
    // to avoid repeatedly showing the budget prompt
    return false;
  }
}

/**
 * Mark that the app has been launched (call after first launch setup is complete)
 */
export async function markFirstLaunchComplete(): Promise<void> {
  try {
    await AsyncStorage.setItem(FIRST_LAUNCH_KEY, 'true');
  } catch (error) {
    console.error('Failed to mark first launch complete:', error);
    throw error;
  }
}

/**
 * Reset first launch status (for testing purposes only)
 */
export async function resetFirstLaunchStatus(): Promise<void> {
  try {
    await AsyncStorage.removeItem(FIRST_LAUNCH_KEY);
  } catch (error) {
    console.error('Failed to reset first launch status:', error);
    throw error;
  }
}
