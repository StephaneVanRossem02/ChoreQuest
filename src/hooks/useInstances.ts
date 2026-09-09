import { useCallback, useEffect, useMemo, useState } from 'react';
import type { TodayTask } from '@/types';
import { getTodayTasks } from '@/services/instances';
import { useAuthContext } from '@/contexts/AuthContext';
import { errorMessage } from '@/lib/utils';

export function useTodayTasks() {
  const { user } = useAuthContext();
  const [tasks, setTasks] = useState<TodayTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // The React Native version listed no dependencies here while reading `user`
  // from the closure, so `refresh` kept pointing at the first render's user and
  // silently loaded nothing after a re-login.
  const refresh = useCallback(async () => {
    if (!user) {
      setTasks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setTasks(await getTodayTasks(user.id));
    } catch (e) {
      setError(errorMessage(e, 'Queestes van vandaag laden mislukt'));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const counts = useMemo(
    () => ({
      pendingCount: tasks.filter((t) => t.status === 'pending').length,
      completedCount: tasks.filter((t) => t.status === 'completed').length,
    }),
    [tasks]
  );

  return { tasks, loading, error, refresh, ...counts };
}
