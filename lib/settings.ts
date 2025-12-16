import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = '@BasicBudget:settings';

export interface AppSettings {
  netWorthEnabled: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  netWorthEnabled: false,
};

/**
 * Get all app settings
 */
export async function getSettings(): Promise<AppSettings> {
  try {
    const settingsJson = await AsyncStorage.getItem(SETTINGS_KEY);
    if (settingsJson) {
      const settings = JSON.parse(settingsJson);
      // Merge with defaults to ensure all keys exist
      return { ...DEFAULT_SETTINGS, ...settings };
    }
    return DEFAULT_SETTINGS;
  } catch (error) {
    console.error('Failed to load settings:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Update app settings
 */
export async function updateSettings(settings: Partial<AppSettings>): Promise<void> {
  try {
    const currentSettings = await getSettings();
    const newSettings = { ...currentSettings, ...settings };
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
  } catch (error) {
    console.error('Failed to save settings:', error);
    throw new Error('Failed to save settings');
  }
}

/**
 * Get a specific setting value
 */
export async function getSetting<K extends keyof AppSettings>(
  key: K
): Promise<AppSettings[K]> {
  const settings = await getSettings();
  return settings[key];
}

/**
 * Set a specific setting value
 */
export async function setSetting<K extends keyof AppSettings>(
  key: K,
  value: AppSettings[K]
): Promise<void> {
  await updateSettings({ [key]: value } as Partial<AppSettings>);
}
