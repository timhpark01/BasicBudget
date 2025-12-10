/**
 * AsyncStorage test utilities
 * Provides helpers for setting up and testing AsyncStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Clears all AsyncStorage data
 * Should be called in beforeEach or afterEach to ensure clean state
 */
export async function clearAsyncStorage(): Promise<void> {
  await AsyncStorage.clear();
}

/**
 * Sets up profile data in AsyncStorage for testing
 */
export async function setupTestProfile(name: string, email: string): Promise<void> {
  await AsyncStorage.multiSet([
    ['@BasicBudget:userName', name],
    ['@BasicBudget:userEmail', email]
  ]);
}

/**
 * Sets up notification preferences in AsyncStorage for testing
 */
export async function setupTestNotificationPreferences(
  budgetWarnings: boolean,
  dailyReminder: boolean,
  weeklyReport: boolean
): Promise<void> {
  await AsyncStorage.multiSet([
    ['@BasicBudget:notifications:budgetWarnings', budgetWarnings.toString()],
    ['@BasicBudget:notifications:dailyReminder', dailyReminder.toString()],
    ['@BasicBudget:notifications:weeklyReport', weeklyReport.toString()]
  ]);
}

/**
 * Gets all keys stored in AsyncStorage
 * Useful for debugging tests
 */
export async function getAllStorageKeys(): Promise<string[]> {
  return await AsyncStorage.getAllKeys();
}

/**
 * Gets all data from AsyncStorage as an object
 * Useful for debugging tests
 */
export async function getAllStorageData(): Promise<Record<string, string | null>> {
  const keys = await AsyncStorage.getAllKeys();
  const items = await AsyncStorage.multiGet(keys);

  const data: Record<string, string | null> = {};
  items.forEach(([key, value]) => {
    data[key] = value;
  });

  return data;
}

/**
 * Verifies that AsyncStorage contains expected key-value pairs
 */
export async function verifyStorageContains(
  expectedData: Record<string, string>
): Promise<boolean> {
  const keys = Object.keys(expectedData);
  const items = await AsyncStorage.multiGet(keys);

  for (const [key, value] of items) {
    if (expectedData[key] !== value) {
      console.error(`Expected ${key} to be "${expectedData[key]}", but got "${value}"`);
      return false;
    }
  }

  return true;
}

/**
 * Counts how many keys are stored in AsyncStorage
 */
export async function getStorageKeyCount(): Promise<number> {
  const keys = await AsyncStorage.getAllKeys();
  return keys.length;
}
