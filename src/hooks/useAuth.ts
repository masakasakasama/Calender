import { useEffect, useState, useCallback } from 'react';
import type { User, UserRole } from '@/types';
import { services } from '@/services/container';

export function useAuth() {
  const [user, setUser] = useState<User | null>(() => services.auth.getCurrentUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = services.auth.onAuthStateChanged((u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  const signInWithGoogle = useCallback(() => services.auth.signInWithGoogle(), []);
  const signInAsRole = useCallback(
    (role: UserRole) => services.auth.signInAsRole?.(role) ?? services.auth.signInWithGoogle(),
    [],
  );
  const signOut = useCallback(() => services.auth.signOut(), []);

  return { user, loading, signInWithGoogle, signInAsRole, signOut };
}
