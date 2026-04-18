import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { mutate } from 'swr';
import { getAuthToken } from '@/shared/services/authService';
import { SWR_KEYS, extractModuleIdFromLessonId, getProgressInvalidationMatcher } from '@/lib/swrKeys';

import { BACKEND_API_URL as API_URL } from '@/config/env';
const AUTO_SAVE_INTERVAL = 5 * 60 * 1000; // 5 minutos en ms

interface ProgressState {
  currentStep: number;
  totalSteps: number;
  completed: boolean;
  completionPercentage: number;
  timeSpent: number;
}

interface UseProgressOptions {
  lessonId: string;
  totalSteps: number;
  onComplete?: () => void;
}

export interface UseProgressReturn {
  progress: ProgressState;
  loading: boolean;
  saving: boolean;
  error: string | null;
  updateProgress: (stepToSave?: number) => Promise<boolean>;
  nextStep: () => Promise<void>;
  prevStep: () => Promise<void>;
  goToStep: (step: number) => Promise<void>;
}

/** Returns headers with Authorization Bearer token for backend requests. */
function getHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = getAuthToken();
  return {
    'Authorization': token ? `Bearer ${token}` : '',
    ...extra,
  };
}

export function useProgress({ lessonId, totalSteps, onComplete }: UseProgressOptions): UseProgressReturn {
  const { data: session } = useSession();
  const [progress, setProgress] = useState<ProgressState>({
    currentStep: 0,
    totalSteps,
    completed: false,
    completionPercentage: 0,
    timeSpent: 0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startTimeRef = useRef<number>(Date.now());
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);

  // Cargar progreso inicial desde el backend
  // Prefer the bridge token already stored in localStorage; fall back to the
  // NextAuth session's accessToken so the fetch works even when the bridge
  // hasn't copied the token yet (race condition on first page load / F5).
  useEffect(() => {
    if (!lessonId) return;

    const token =
      getAuthToken() ||
      (session as any)?.accessToken ||
      (session as any)?.user?.accessToken;

    if (!token) return; // still no token — effect re-runs when session changes

    const fetchProgress = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/api/progress/lesson/${lessonId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Cache-Control': 'no-cache',
          },
        });

        if (res.ok) {
          const data = await res.json();
          // Overwrite local React state with the authoritative DB values.
          setProgress({
            currentStep: data.currentStep ?? 0,
            totalSteps: data.totalSteps || totalSteps,
            completed: data.completed ?? false,
            completionPercentage: data.completionPercentage ?? 0,
            timeSpent: data.timeSpent ?? 0,
          });
        }
      } catch (err) {
        console.error('[useProgress] Error fetching progress:', err);
        setError('Error al cargar progreso');
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, [lessonId, totalSteps, session]);

  // Guardar progreso — espera confirmación del servidor antes de actualizar UI
  const updateProgress = useCallback(async (stepToSave?: number): Promise<boolean> => {
    if (!lessonId || saving || !getAuthToken()) return false;

    const currentStep = stepToSave ?? progress.currentStep;
    const elapsedSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);

    try {
      setSaving(true);
      const res = await fetch(`${API_URL}/api/progress/lesson/${lessonId}`, {
        method: 'PUT',
        headers: getHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ currentStep, totalSteps, timeSpent: elapsedSeconds }),
      });

      if (res.ok) {
        const data = await res.json();

        // Estado local actualizado sólo con datos confirmados por el servidor
        setProgress(prev => ({ ...prev, ...data }));
        startTimeRef.current = Date.now();

        // Invalidar cachés SWR para que las cards se actualicen
        const moduleId = extractModuleIdFromLessonId(lessonId);
        mutate(SWR_KEYS.lessonProgress(lessonId));
        mutate(SWR_KEYS.moduleProgress(moduleId));
        mutate(SWR_KEYS.userOverview);
        mutate(SWR_KEYS.allProgress);
        mutate(getProgressInvalidationMatcher(), undefined, { revalidate: true });

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('progress:updated', {
            detail: { lessonId, moduleId, currentStep, totalSteps, completed: data.completed, completionPercentage: data.completionPercentage },
          }));
        }

        if (data.completed && onComplete) {
          onComplete();
        }

        return true;
      }
      return false;
    } catch (err) {
      console.error('[useProgress] Error saving progress:', err);
      setError('Error al guardar progreso');
      return false;
    } finally {
      setSaving(false);
    }
  }, [lessonId, totalSteps, progress.currentStep, saving, onComplete]);

  // Auto-save cada 5 minutos
  useEffect(() => {
    if (!lessonId) return;
    autoSaveRef.current = setInterval(() => { updateProgress(); }, AUTO_SAVE_INTERVAL);
    return () => { if (autoSaveRef.current) clearInterval(autoSaveRef.current); };
  }, [lessonId, updateProgress]);

  const nextStep = useCallback(async () => {
    await updateProgress(Math.min(progress.currentStep + 1, totalSteps));
  }, [progress.currentStep, totalSteps, updateProgress]);

  const prevStep = useCallback(async () => {
    await updateProgress(Math.max(progress.currentStep - 1, 0));
  }, [progress.currentStep, updateProgress]);

  const goToStep = useCallback(async (step: number) => {
    await updateProgress(Math.max(0, Math.min(step, totalSteps)));
  }, [totalSteps, updateProgress]);

  return { progress, loading, saving, error, updateProgress, nextStep, prevStep, goToStep };
}
