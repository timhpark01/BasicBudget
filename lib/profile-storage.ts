import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  USER_NAME: '@BasicBudget:userName',
  USER_EMAIL: '@BasicBudget:userEmail',
};

export interface Profile {
  name: string;
  email: string;
}

/**
 * Get user profile from AsyncStorage
 */
export async function getProfile(): Promise<Profile> {
  try {
    const [name, email] = await Promise.all([
      AsyncStorage.getItem(KEYS.USER_NAME),
      AsyncStorage.getItem(KEYS.USER_EMAIL),
    ]);

    return {
      name: name || '',
      email: email || '',
    };
  } catch (error) {
    console.error('Failed to load profile:', error);
    return {
      name: '',
      email: '',
    };
  }
}

/**
 * Save user profile to AsyncStorage
 */
export async function saveProfile(profile: Profile): Promise<void> {
  try {
    await Promise.all([
      AsyncStorage.setItem(KEYS.USER_NAME, profile.name),
      AsyncStorage.setItem(KEYS.USER_EMAIL, profile.email),
    ]);
  } catch (error) {
    console.error('Failed to save profile:', error);
    throw error;
  }
}

/**
 * Clear user profile from AsyncStorage
 */
export async function clearProfile(): Promise<void> {
  try {
    await Promise.all([
      AsyncStorage.removeItem(KEYS.USER_NAME),
      AsyncStorage.removeItem(KEYS.USER_EMAIL),
    ]);
  } catch (error) {
    console.error('Failed to clear profile:', error);
    throw error;
  }
}
