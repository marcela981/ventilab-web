import { useCallback, useEffect, useState } from 'react';
import type { Activity } from '../evaluation.types';
import { activityApi } from '../api/activity.api';

export function useActivities() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const items = await activityApi.list();
      setActivities(items);
    } catch (e: any) {
      setError(e?.message ?? 'Error cargando actividades');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { activities, isLoading, error, refresh, setActivities };
}

