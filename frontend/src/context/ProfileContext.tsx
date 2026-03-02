import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '../lib/api';
import { useAuth } from './AuthContext';
import type { UserProfile } from '../types';

interface ProfileContextValue {
  profile: UserProfile | null;
  refreshProfile: () => Promise<void>;
  updateProfile: (updated: UserProfile) => void;
}

const ProfileContext = createContext<ProfileContextValue>({
  profile: null,
  refreshProfile: async () => {},
  updateProfile: () => {},
});

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const refreshProfile = useCallback(async () => {
    if (!session) return;
    try {
      const p = await api.get<UserProfile>('/profile/me');
      setProfile(p);
    } catch {
      // ignore
    }
  }, [session]);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const updateProfile = useCallback((updated: UserProfile) => {
    setProfile(updated);
  }, []);

  return (
    <ProfileContext.Provider value={{ profile, refreshProfile, updateProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export const useProfile = () => useContext(ProfileContext);
