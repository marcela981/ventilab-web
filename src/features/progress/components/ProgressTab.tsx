import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box } from '@mui/material';
import {
  getSkills,
  getMilestones,
  getAchievements,
} from '@/features/progress/services/progressService.js';
import { useLearningProgress } from '@/features/progress/LearningProgressContext';
import {
  selectCompletedLessonsCount,
  selectHasAnyProgress,
} from '@/features/progress/services/selectors';
import { ProgressSkeleton } from './Skeletons';
import { EmptyState } from './EmptyState';
import ProgressContent from './ProgressContent';
import { trackEvent } from '../utils/analytics';
import { debug } from '@/shared/utils/debug';

/**
 * ProgressTab - Orquesta la carga de datos y estados del tab "Mi Progreso".
 * Delegación: ProgressContent se ocupa del layout visual.
 */
const ProgressTab: React.FC = () => {
  const fetchedOnce = useRef(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [skills, setSkills] = useState<Record<string, unknown> | null>(null);
  const [milestones, setMilestones] = useState<Record<string, unknown> | null>(null);
  const [achievements, setAchievements] = useState<Record<string, unknown> | null>(null);
  const [mounted, setMounted] = useState(false);

  const { snapshot, isLoadingSnapshot, snapshotError, refetchSnapshot } = useLearningProgress();

  // Carga paralela de datos secundarios (skills, milestones, achievements)
  useEffect(() => {
    if (fetchedOnce.current) return;
    fetchedOnce.current = true;

    const ac = new AbortController();
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const silentCatch = (fn: Promise<unknown>) =>
          fn.catch(err => {
            debug.warn('Non-critical fetch failed:', err?.message);
            return null;
          });

        const [skillsData, milestonesData, achievementsData] = await Promise.all([
          silentCatch(getSkills(ac.signal)),
          silentCatch(getMilestones()),
          silentCatch(getAchievements()),
        ]);

        setSkills(skillsData);
        setMilestones(milestonesData);
        setAchievements(achievementsData);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Error cargando progreso');
      } finally {
        setLoading(false);
      }
    })();

    return () => ac.abort();
  }, []);

  // Refetch snapshot una sola vez al montar (no depende de refetchSnapshot para evitar loops)
  useEffect(() => {
    if (!mounted) {
      setMounted(true);
      if (refetchSnapshot) refetchSnapshot();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Telemetría cuando el snapshot esté disponible
  useEffect(() => {
    if (snapshot && mounted) {
      trackEvent('progress_view_loaded', {
        hasSnapshot: true,
        completedLessons: snapshot.overview?.completedLessons || 0,
        source: snapshot.source,
      });
    }
  }, [snapshot, mounted]);

  const handleRetry = useCallback(() => {
    fetchedOnce.current = false;
    window.location.reload();
  }, []);

  // ── Estados de carga / error ─────────────────────────────────────────────
  if (isLoadingSnapshot || !mounted || loading) {
    return <ProgressSkeleton />;
  }

  if (error || snapshotError) {
    return (
      <Box sx={{ p: 4 }}>
        <EmptyState
          title="No se pudo conectar"
          description={error || snapshotError || 'Error cargando progreso'}
          actionLabel="Reintentar"
          onAction={handleRetry}
        />
      </Box>
    );
  }

  if (!snapshot) {
    return (
      <Box sx={{ p: 4 }}>
        <EmptyState
          title="No se pudo cargar el progreso"
          description="Intenta recargar la página o verifica tu conexión."
          actionLabel="Reintentar"
          onAction={handleRetry}
        />
      </Box>
    );
  }

  const completedLessons = selectCompletedLessonsCount(snapshot);
  const hasAnyProgress = selectHasAnyProgress(snapshot);
  const isLocalSource = snapshot?.source === 'local';

  if (!hasAnyProgress && !isLocalSource) {
    return (
      <Box sx={{ p: 4 }}>
        <EmptyState
          title="Aún no tienes progreso"
          description="Comienza tu viaje de aprendizaje completando tu primera lección."
          suggestions={[
            {
              label: 'Fundamentos fisiológicos',
              onClick: () => {},
            },
          ]}
        />
      </Box>
    );
  }

  // ── Renderizado principal ────────────────────────────────────────────────
  return (
    <ProgressContent
      snapshot={snapshot}
      overview={snapshot.overview}
      skills={skills}
      milestones={milestones}
      achievements={achievements}
      mounted={mounted}
      isLocalSource={isLocalSource}
      isAuthenticated={snapshot?.userId !== null}
      onRetry={handleRetry}
    />
  );
};

export default ProgressTab;
