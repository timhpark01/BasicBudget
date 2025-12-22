import * as Crypto from 'expo-crypto';

/**
 * Generate a unique ID
 * Uses Crypto.randomUUID() with a fallback for older devices
 */
export function generateId(): string {
  try {
    return Crypto.randomUUID();
  } catch (err) {
    // Fallback for older devices
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}
