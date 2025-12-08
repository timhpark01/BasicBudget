import { useState, useEffect, useCallback } from 'react';
import {
  NotificationPreferences,
  getNotificationPreferences,
  saveNotificationPreferences,
} from '@/lib/notifications-storage';

export interface UseNotificationPreferencesReturn {
  preferences: NotificationPreferences;
  loading: boolean;
  error: Error | null;
  updatePreferences: (preferences: NotificationPreferences) => Promise<void>;
  togglePreference: (key: keyof NotificationPreferences) => Promise<void>;
}

export function useNotificationPreferences(): UseNotificationPreferencesReturn {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    budgetWarnings: false,
    dailyReminder: false,
    weeklyReport: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Load preferences on mount
  useEffect(() => {
    loadPreferences();
  }, []);

  async function loadPreferences() {
    try {
      setLoading(true);
      const loadedPreferences = await getNotificationPreferences();
      setPreferences(loadedPreferences);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }

  // Update all preferences
  const updatePreferences = useCallback(
    async (newPreferences: NotificationPreferences): Promise<void> => {
      try {
        // Optimistic update
        setPreferences(newPreferences);
        await saveNotificationPreferences(newPreferences);
        setError(null);
      } catch (err) {
        // Rollback on error
        await loadPreferences();
        throw err;
      }
    },
    []
  );

  // Toggle a single preference
  const togglePreference = useCallback(
    async (key: keyof NotificationPreferences): Promise<void> => {
      try {
        const newPreferences = {
          ...preferences,
          [key]: !preferences[key],
        };
        // Optimistic update
        setPreferences(newPreferences);
        await saveNotificationPreferences(newPreferences);
        setError(null);
      } catch (err) {
        // Rollback on error
        await loadPreferences();
        throw err;
      }
    },
    [preferences]
  );

  return {
    preferences,
    loading,
    error,
    updatePreferences,
    togglePreference,
  };
}
