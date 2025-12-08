import { useState, useEffect, useCallback } from 'react';
import { Profile, getProfile, saveProfile } from '@/lib/profile-storage';

export interface UseProfileReturn {
  profile: Profile;
  loading: boolean;
  error: Error | null;
  updateProfile: (profile: Profile) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export function useProfile(): UseProfileReturn {
  const [profile, setProfile] = useState<Profile>({ name: '', email: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Load profile on mount
  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      setLoading(true);
      const loadedProfile = await getProfile();
      setProfile(loadedProfile);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }

  // Update profile
  const updateProfile = useCallback(async (newProfile: Profile): Promise<void> => {
    try {
      // Optimistic update
      setProfile(newProfile);
      await saveProfile(newProfile);
      setError(null);
    } catch (err) {
      // Rollback on error
      await loadProfile();
      throw err;
    }
  }, []);

  // Refresh profile from storage
  const refreshProfile = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      await loadProfile();
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    profile,
    loading,
    error,
    updateProfile,
    refreshProfile,
  };
}
