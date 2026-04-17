import { useCallback, useState } from 'react';
import type { Activity, CreateActivityPayload, UpdateActivityPayload } from '../evaluation.types';
import { activityApi } from '../api/activity.api';

export function useActivityBuilder() {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = useCallback(async (payload: CreateActivityPayload): Promise<Activity> => {
    setIsSaving(true);
    setError(null);
    try {
      return await activityApi.create(payload);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error creando actividad');
      throw e;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const update = useCallback(async (id: string, payload: UpdateActivityPayload): Promise<Activity> => {
    setIsSaving(true);
    setError(null);
    try {
      return await activityApi.update(id, payload);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error actualizando actividad');
      throw e;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const publish = useCallback(async (id: string): Promise<Activity> => {
    setIsSaving(true);
    setError(null);
    try {
      return await activityApi.publish(id);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error publicando actividad');
      throw e;
    } finally {
      setIsSaving(false);
    }
  }, []);

  return { isSaving, error, create, update, publish };
}

