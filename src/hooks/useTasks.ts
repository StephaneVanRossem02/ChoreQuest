import { useCallback, useEffect, useState } from 'react';
import type { TaskTemplate } from '@/types';
import { getTaskTemplates } from '@/services/tasks';
import { errorMessage } from '@/lib/utils';

export function useTasks(includeInactive = false, userId?: string) {
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTemplates(await getTaskTemplates(includeInactive, userId));
    } catch (e) {
      setError(errorMessage(e, 'Taken laden mislukt'));
    } finally {
      setLoading(false);
    }
  }, [includeInactive, userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { templates, loading, error, refresh };
}
