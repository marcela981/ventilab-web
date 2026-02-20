import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { mutate } from 'swr';
import { SWR_KEYS, extractModuleIdFromLessonId, getProgressInvalidationMatcher } from '@/lib/swrKeys';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
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

export function useProgress({ lessonId, totalSteps, onComplete }: UseProgressOptions) {
  const { data: session } = useSession();
  const [progress, setProgress] = useState<ProgressState>({
    currentStep: 0,
    totalSteps,
    completed: false,
    completionPercentage: 0,
    timeSpent: 0
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const startTimeRef = useRef<number>(Date.now());
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);

  const userId = session?.user?.id;

  // Cargar progreso inicial
  useEffect(() => {
    if (!userId || !lessonId) return;

    const fetchProgress = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/api/progress/lesson/${lessonId}`, {
          headers: {
            'x-user-id': userId,
            'Cache-Control': 'no-cache'
          }
        });
        
        if (res.ok) {
          const data = await res.json();
          setProgress({
            currentStep: data.currentStep || 0,
            totalSteps: data.totalSteps || totalSteps,
            completed: data.completed || false,
            completionPercentage: data.completionPercentage || 0,
            timeSpent: data.timeSpent || 0
          });
        }
      } catch (err) {
        console.error('Error fetching progress:', err);
        setError('Error al cargar progreso');
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, [userId, lessonId, totalSteps]);

  // Función de guardado
  const saveProgress = useCallback(async (stepToSave?: number) => {
    if (!userId || !lessonId || saving) return;

    const currentStep = stepToSave ?? progress.currentStep;
    const elapsedSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
    
    try {
      setSaving(true);
      const res = await fetch(`${API_URL}/api/progress/lesson/${lessonId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({
          currentStep,
          totalSteps,
          timeSpent: elapsedSeconds
        })
      });

      if (res.ok) {
        const data = await res.json();
        setProgress(prev => ({
          ...prev,
          ...data
        }));

        // Reset timer después de guardar
        startTimeRef.current = Date.now();

        // NUEVO: Invalidar cachés de SWR para que las cards se actualicen
        const moduleId = extractModuleIdFromLessonId(lessonId);

        // Invalidar progreso de esta lección
        mutate(SWR_KEYS.lessonProgress(lessonId));

        // Invalidar progreso del módulo (para que ModuleCard se actualice)
        mutate(SWR_KEYS.moduleProgress(moduleId));

        // Invalidar overview general
        mutate(SWR_KEYS.userOverview);

        // Invalidar progreso general
        mutate(SWR_KEYS.allProgress);

        // Invalidar todas las claves relacionadas con progreso
        mutate(getProgressInvalidationMatcher(), undefined, { revalidate: true });

        // NUEVO: Emitir evento para notificar a otros componentes (LearningProgressContext escucha esto)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('progress:updated', {
            detail: {
              lessonId,
              moduleId,
              currentStep,
              totalSteps,
              completed: data.completed,
              completionPercentage: data.completionPercentage
            }
          }));
        }

        // Si se completó, disparar callback
        if (data.completed && onComplete) {
          onComplete();
        }
      }
    } catch (err) {
      console.error('Error saving progress:', err);
      setError('Error al guardar progreso');
    } finally {
      setSaving(false);
    }
  }, [userId, lessonId, totalSteps, progress.currentStep, saving, onComplete]);

  // Auto-save cada 5 minutos
  useEffect(() => {
    if (!userId || !lessonId) return;

    autoSaveRef.current = setInterval(() => {
      saveProgress();
    }, AUTO_SAVE_INTERVAL);

    return () => {
      if (autoSaveRef.current) {
        clearInterval(autoSaveRef.current);
      }
    };
  }, [userId, lessonId, saveProgress]);

  // Guardar al salir de la página
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Usar sendBeacon para garantizar que se envíe
      if (userId && lessonId) {
        const elapsedSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const data = JSON.stringify({
          currentStep: progress.currentStep,
          totalSteps,
          timeSpent: elapsedSeconds
        });
        
        navigator.sendBeacon(
          `${API_URL}/api/progress/lesson/${lessonId}?userId=${userId}`,
          data
        );
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [userId, lessonId, progress.currentStep, totalSteps]);

  // Avanzar al siguiente paso
  const nextStep = useCallback(() => {
    const newStep = Math.min(progress.currentStep + 1, totalSteps);
    setProgress(prev => ({
      ...prev,
      currentStep: newStep,
      completionPercentage: Math.round((newStep / totalSteps) * 100),
      completed: newStep >= totalSteps
    }));
    saveProgress(newStep);
  }, [progress.currentStep, totalSteps, saveProgress]);

  // Retroceder al paso anterior
  const prevStep = useCallback(() => {
    const newStep = Math.max(progress.currentStep - 1, 0);
    setProgress(prev => ({
      ...prev,
      currentStep: newStep,
      completionPercentage: Math.round((newStep / totalSteps) * 100)
    }));
    // No guardar al retroceder (opcional, puedes cambiarlo)
  }, [progress.currentStep, totalSteps]);

  // Ir a un paso específico
  const goToStep = useCallback((step: number) => {
    const newStep = Math.max(0, Math.min(step, totalSteps));
    setProgress(prev => ({
      ...prev,
      currentStep: newStep,
      completionPercentage: Math.round((newStep / totalSteps) * 100),
      completed: newStep >= totalSteps
    }));
    saveProgress(newStep);
  }, [totalSteps, saveProgress]);

  return {
    // Estado
    currentStep: progress.currentStep,
    totalSteps: progress.totalSteps,
    completed: progress.completed,
    completionPercentage: progress.completionPercentage,
    timeSpent: progress.timeSpent,
    loading,
    saving,
    error,
    
    // Acciones
    nextStep,
    prevStep,
    goToStep,
    saveProgress
  };
}