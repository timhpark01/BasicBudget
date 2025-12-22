import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  BUDGET_WARNINGS: '@BasicBudget:notifications:budgetWarnings',
  DAILY_REMINDER: '@BasicBudget:notifications:dailyReminder',
  WEEKLY_REPORT: '@BasicBudget:notifications:weeklyReport',
};

export interface NotificationPreferences {
  budgetWarnings: boolean;
  dailyReminder: boolean;
  weeklyReport: boolean;
}

/**
 * Get notification preferences from AsyncStorage
 */
export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  try {
    const [budgetWarnings, dailyReminder, weeklyReport] = await Promise.all([
      AsyncStorage.getItem(KEYS.BUDGET_WARNINGS),
      AsyncStorage.getItem(KEYS.DAILY_REMINDER),
      AsyncStorage.getItem(KEYS.WEEKLY_REPORT),
    ]);

    return {
      budgetWarnings: budgetWarnings === 'true', // Default: false
      dailyReminder: dailyReminder === 'true', // Default: false
      weeklyReport: weeklyReport === 'true', // Default: false
    };
  } catch (error) {
    console.error('Failed to load notification preferences:', error);
    return {
      budgetWarnings: false,
      dailyReminder: false,
      weeklyReport: false,
    };
  }
}

/**
 * Save notification preferences to AsyncStorage
 */
export async function saveNotificationPreferences(
  preferences: NotificationPreferences
): Promise<void> {
  try {
    await Promise.all([
      AsyncStorage.setItem(KEYS.BUDGET_WARNINGS, String(preferences.budgetWarnings)),
      AsyncStorage.setItem(KEYS.DAILY_REMINDER, String(preferences.dailyReminder)),
      AsyncStorage.setItem(KEYS.WEEKLY_REPORT, String(preferences.weeklyReport)),
    ]);
  } catch (error) {
    console.error('Failed to save notification preferences:', error);
    throw error;
  }
}

/**
 * Clear notification preferences from AsyncStorage
 */
export async function clearNotificationPreferences(): Promise<void> {
  try {
    await Promise.all([
      AsyncStorage.removeItem(KEYS.BUDGET_WARNINGS),
      AsyncStorage.removeItem(KEYS.DAILY_REMINDER),
      AsyncStorage.removeItem(KEYS.WEEKLY_REPORT),
    ]);
  } catch (error) {
    console.error('Failed to clear notification preferences:', error);
    throw error;
  }
}
