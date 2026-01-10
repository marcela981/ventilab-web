"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import { Box, Alert, Fade, Chip } from '@mui/material';
import { CloudOff } from '@mui/icons-material';
import {
  getSkills,
  getMilestones,
  getAchievements
} from '@/services/api/progressService';
import { useLearningProgress } from '@/contexts/LearningProgressContext';
import { selectCompletedLessonsCount } from '@/services/progress/selectors';
import { ProgressSkeleton } from './Skeletons';
import { EmptyState } from './EmptyState';
import { XpLevelCard } from './XpLevelCard';
import { StreakCard } from './StreakCard';
import { CalendarCard } from './CalendarCard';
import SkillTree from './SkillTreeRefactored';
import Milestones from './MilestonesRefactored';
import Achievements from './AchievementsRefactored';
import { trackEvent } from '../utils/analytics';
import { debug } from '@/utils/debug';

/**
 * ProgressTab - Componente principal del tab "Mi Progreso"
 * Orquesta fetch concurrente de datos y maneja estados
 * 
 * Solución anti-parpadeo:
 * - fetchedOnce guardia para evitar dobles montajes en React StrictMode
 * - AbortController para cancelar solicitudes al desmontar
 * - deps vacías en useEffect (no referencias a funciones externas)
 * - Estado de error estable (no toast/snackbar que cause parpadeo)
 */
const ProgressTab: React.FC = () => {
  const router = useRouter();
  const fetchedOnce = useRef(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [skills, setSkills] = useState<any>(null);
  const [milestones, setMilestones] = useState<any>(null);
  const [achievements, setAchievements] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  // Use unified progress context
  const {
    snapshot,
    isLoadingSnapshot,
    snapshotError,
    refetchSnapshot
  } = useLearningProgress();

  // Load additional data (skills, milestones, achievements) on mount
  useEffect(() => {
    if (fetchedOnce.current) return; // evita dobles montajes en React StrictMode
    fetchedOnce.current = true;

    const ac = new AbortController();
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const [skillsData, milestonesData, achievementsData] = await Promise.all([
          getSkills(ac.signal).catch(err => {
            // Silently handle network errors for non-critical data
            if (err.isNetworkError || err.name === 'NetworkError' || err.name === 'ApiUnavailableError') {
              debug.warn('Network error fetching skills (backend may be offline):', err.message);
            } else {
              debug.warn('Failed to fetch skills:', err);
            }
            return null;
          }),
          getMilestones().catch(err => {
            // Silently handle network errors for non-critical data
            if (err.isNetworkError || err.name === 'NetworkError') {
              debug.warn('Network error fetching milestones (backend may be offline):', err.message);
            } else {
              debug.warn('Failed to fetch milestones:', err);
            }
            return null;
          }),
          getAchievements().catch(err => {
            // Silently handle network errors for non-critical data
            if (err.isNetworkError || err.name === 'NetworkError') {
              debug.warn('Network error fetching achievements (backend may be offline):', err.message);
            } else {
              debug.warn('Failed to fetch achievements:', err);
            }
            return null;
          })
        ]);

        setSkills(skillsData);
        setMilestones(milestonesData);
        setAchievements(achievementsData);
      } catch (e: any) {
        setError(e?.message || 'Error cargando progreso');
      } finally {
        setLoading(false);
      }
    })();

    return () => ac.abort();
  }, []); // deps vacías: no referencias a funciones externas

  // Refetch snapshot when tab becomes visible (solo una vez)
  useEffect(() => {
    if (!mounted) {
      setMounted(true);
      debug.info('ProgressTab mounted, refetching snapshot...');
      // Llamar directamente sin depender de refetchSnapshot
      if (refetchSnapshot) {
        refetchSnapshot();
      }
    }
  }, []); // deps vacías: no referenciar refetchSnapshot

  // Track view loaded event
  useEffect(() => {
    if (snapshot && mounted) {
      trackEvent('progress_view_loaded', {
        hasSnapshot: !!snapshot,
        completedLessons: snapshot.overview?.completedLessons || 0,
        source: snapshot.source
      });
    }
  }, [snapshot, mounted]);

  // Handle skill click
  const handleSkillClick = useCallback((skillId: string) => {
    trackEvent('skill_clicked', { skillId });
    // TODO: Open drawer/modal with skill details
    console.log('Skill clicked:', skillId);
  }, []);

  // Handle milestone CTA
  const handleMilestoneCTA = useCallback((milestoneId: string) => {
    trackEvent('milestone_cta_clicked', { milestoneId });
    // TODO: Navigate to relevant lesson/module
    console.log('Milestone CTA clicked:', milestoneId);
  }, []);

  // Handle achievement filter change
  const handleAchievementFilterChange = useCallback((filter: string) => {
    trackEvent('achievement_filter_changed', { filter });
  }, []);

  // Navigate to lesson
  const navigateToLesson = useCallback((moduleId: string, lessonId: string) => {
    router.push(`/teaching/module/${moduleId}/lesson/${lessonId}`);
  }, [router]);

  // Handle retry - resetea fetchedOnce para forzar remount
  const handleRetry = useCallback(() => {
    fetchedOnce.current = false;
    window.location.reload(); // Fuerza recarga completa para evitar estados inconsistentes
  }, []);

  // Check if user is authenticated (from snapshot)
  const isAuthenticated = snapshot?.userId !== null;
  const isLocalSource = snapshot?.source === 'local';

  // Loading state
  if (isLoadingSnapshot || !mounted || loading) {
    return <ProgressSkeleton />;
  }

  // Error state estable (no toast/snackbar que cause parpadeo)
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

  // Empty state (no progress yet)
  const completedLessons = selectCompletedLessonsCount(snapshot);
  const hasAnyProgress = snapshot && (
    completedLessons > 0 ||
    snapshot.overview?.modulesCompleted > 0 ||
    snapshot.overview?.streakDays > 0
  );

  if (!snapshot) {
    debug.logEmptyStateReason('No snapshot available');
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

  if (!hasAnyProgress && !isLocalSource) {
    debug.logEmptyStateReason('No progress found', {
      completedLessons,
      modulesCompleted: snapshot.overview?.modulesCompleted,
      streakDays: snapshot.overview?.streakDays
    });
    return (
      <Box sx={{ p: 4 }}>
        <EmptyState
          title="Aún no tienes progreso"
          description="Comienza tu viaje de aprendizaje completando tu primera lección."
          suggestions={[
            {
              label: 'Fundamentos fisiológicos',
              onClick: () => navigateToLesson('module-01-fundamentals', 'lesson-01-respiratory-mechanics')
            }
          ]}
        />
      </Box>
    );
  }

  // Main content
  const overview = snapshot.overview;

  return (
    <Fade in={mounted} timeout={600}>
      <Box
        sx={{
          p: { xs: 2, md: 3 },
          maxWidth: '1400px',
          mx: 'auto'
        }}
      >
        {/* Local source banner */}
        {isLocalSource && (
          <Alert
            severity="info"
            icon={<CloudOff />}
            sx={{ mb: 3 }}
            action={
              <Chip
                label="Sincronizar"
                size="small"
                onClick={handleRetry}
                sx={{ cursor: 'pointer' }}
              />
            }
          >
            Mostrando progreso local. {isAuthenticated ? 'Sincroniza para guardar en la nube.' : 'Inicia sesión para guardar en la nube.'}
          </Alert>
        )}

        {/* Responsive Grid Layout */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              md: '8fr 4fr'
            },
            gap: 3
          }}
        >
          {/* Left Column: Skill Tree & Milestones */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Skill Tree */}
            <Box
              sx={{
                maxHeight: 'clamp(280px, 40vh, 520px)',
                overflow: 'auto'
              }}
            >
              <SkillTree
                skills={skills?.skills || []}
                unlockedSkillIds={skills?.unlockedSkillIds || []}
                onSkillClick={handleSkillClick}
                onNavigateToLesson={navigateToLesson}
              />
            </Box>

            {/* Milestones */}
            <Milestones
              milestones={milestones?.milestones || []}
              onCTA={handleMilestoneCTA}
            />
          </Box>

          {/* Right Column: XP, Streak, Calendar, Achievements */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* XP/Level Card */}
            {overview && (
              <XpLevelCard
                xpTotal={overview.xpTotal}
                level={overview.level}
                nextLevelXp={overview.nextLevelXp}
                completedLessons={overview.completedLessons}
                totalLessons={overview.totalLessons}
              />
            )}

            {/* Streak Card */}
            {overview && (
              <StreakCard
                streakDays={overview.streakDays}
                isActive={overview.streakDays > 0}
                lastSessionDate={snapshot.lastSyncAt}
              />
            )}

            {/* Calendar Card */}
            {overview && overview.calendar && (
              <CalendarCard calendar={overview.calendar} />
            )}

            {/* Achievements & Medals */}
            <Box
              sx={{
                maxHeight: 'clamp(300px, 50vh, 600px)',
                overflow: 'auto'
              }}
            >
              <Achievements
                achievements={achievements?.achievements || []}
                medals={achievements?.medals || []}
                onFilterChange={handleAchievementFilterChange}
              />
            </Box>
          </Box>
        </Box>

      </Box>
    </Fade>
  );
};

export default ProgressTab;

