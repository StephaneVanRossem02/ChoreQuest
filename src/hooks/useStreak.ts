import { useCallback, useEffect, useState } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { EMPTY_STREAK, getStreak, type Streak } from '@/services/streak';

export function useStreak() {
  const { user } = useAuthContext();
  const [streak, setStreak] = useState<Streak>(EMPTY_STREAK);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setStreak(EMPTY_STREAK);
      setLoading(false);
      return;
    }
    try {
      setStreak(await getStreak(user.id));
    } catch (err) {
      // A broken streak query must never block the day's quests, so this
      // degrades to "no flame" rather than surfacing an error.
      console.error('Streak laden mislukt', err);
      setStreak(EMPTY_STREAK);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { streak, loading, refresh };
}
