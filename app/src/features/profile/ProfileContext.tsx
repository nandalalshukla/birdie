import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { getJSON, setJSON } from '@/lib/storage';

export type Profile = {
  /** Shown next to shared sightings in the community feed. */
  displayName: string | null;
  shareByDefault: boolean;
};

const KEY = 'birdear.profile';
const DEFAULT_PROFILE: Profile = { displayName: null, shareByDefault: true };

type Ctx = { profile: Profile; ready: boolean; update: (patch: Partial<Profile>) => Promise<void> };

const ProfileContext = createContext<Ctx>({ profile: DEFAULT_PROFILE, ready: false, update: async () => undefined });

export function ProfileProvider({ children }: PropsWithChildren) {
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void getJSON<Profile>(KEY, DEFAULT_PROFILE).then((p) => {
      setProfile({ ...DEFAULT_PROFILE, ...p });
      setReady(true);
    });
  }, []);

  const update = useCallback(async (patch: Partial<Profile>) => {
    let next: Profile = DEFAULT_PROFILE;
    setProfile((prev) => (next = { ...prev, ...patch }));
    await setJSON(KEY, next);
  }, []);

  const value = useMemo(() => ({ profile, ready, update }), [profile, ready, update]);
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  return useContext(ProfileContext);
}
