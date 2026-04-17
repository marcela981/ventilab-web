import React, { useState, useEffect, lazy, Suspense, useMemo } from 'react';
import { useRouter } from 'next/router';
import {
  Skeleton,
  Alert,
  Fade,
  useTheme,
  useMediaQuery
} from '@mui/material';
// Contexto y hooks
import { useLearningProgress } from '@/features/progress/LearningProgressContext';
import useProgressTree from '@/features/ensenanza/shared/hooks/useProgressTree';
import useModuleProgress from '@/features/ensenanza/shared/hooks/useModuleProgress';

// Datos del curriculum
import { curriculumData } from '@/features/ensenanza/shared/data/curriculumData';
import { getModulesCount, getAllModules } from '@/features/ensenanza/shared/data/curriculum/selectors.js';

// Importar componentes gamificados
import {
  ProgressOverviewCard,
  SkillTree,
  ModuleMilestones,
  AchievementsGrid,
  StreakWidget,
  Challenges,
  BossFightCard,
  ComprehensionPanel,
  FeedbackStrip,
  LeaderboardCompact,
  StudyCalendar,
  NarrativeProgress
} from '@/features/progress/components';

/**
 * Formatea el tiempo invertido en un formato legible
 *
 * @param {number} minutes - Tiempo en minutos
 * @returns {string} Tiempo formateado (ej: "5h 30m")
 */
const formatTimeSpent = (minutes) => {
  if (!minutes || minutes === 0) {
    return '0m';
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) {
    return `${mins}m`;
  }

  if (mins === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${mins}m`;
};

/**
 * Calcula la racha de días basada en lecciones completadas
 * Nota: Esta es una implementación simulada. En producción debería
 * venir del backend o de un sistema de tracking de actividad diaria.
 *
 * @param {Set} completedLessons - Set de lecciones completadas
 * @returns {number} Días consecutivos de estudio
 */
const calculateStreak = (completedLessons) => {
  // Simulación: 1 día por cada 3 lecciones completadas
  const lessonsCount = completedLessons.size;
  return Math.min(Math.floor(lessonsCount / 3), 30);
};

/**
 * ProgressDashboard Component
 *
 * Componente principal para visualizar el progreso estructurado del usuario.
 * Rediseñado para que se parezca más al curriculum con niveles organizados
 * y tarjetas de módulos similares.
 *
 * @component
 * @returns {JSX.Element} Dashboard de progreso del usuario
 */
const ProgressDashboard = () => {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const {
    completedLessons,
    timeSpent,
    setCurrentModule,
    isLoadingProgress,
    progressByModule
  } = useLearningProgress();

  // Estados locales
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mounted, setMounted] = useState(false);

  // Navegación a lección
  const navigateToLesson = (moduleId, lessonId) => {
    router.push(`/teaching/module/${moduleId}/lesson/${lessonId}`);
  };

  // Hook: progreso de módulos (pasa progressByModule para cálculo por páginas)
  const {
    calculateModuleProgress
  } = useModuleProgress(completedLessons, timeSpent, progressByModule);

  // Usar el hook useProgressTree
  const {
    globalStats,
    nextRecommendedLesson,
    handleModuleClick,
    handleLessonClick,
    getModuleInfo,
  } = useProgressTree(
    curriculumData,
    completedLessons,
    timeSpent,
    setCurrentModule,
    navigateToLesson
  );

  // Calcular racha
  const streak = useMemo(() => calculateStreak(completedLessons), [completedLessons]);

  // Efecto para simular carga inicial
  useEffect(() => {
    setMounted(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  // Preparar datos para los componentes (ANTES de returns condicionales)
  const currentLevel = useMemo(() => 
    Math.floor(globalStats.completedLessonsCount / 5) + 1,
    [globalStats.completedLessonsCount]
  );
  const xpTotal = useMemo(() => 
    globalStats.completedLessonsCount * 100,
    [globalStats.completedLessonsCount]
  );
  
  // Datos para ModuleMilestones (useMemo debe estar antes de returns)
  const moduleMilestones = useMemo(() => {
    // Calcular hitos basados en progreso (data-driven)
    const modulesArray = getAllModules();
    const totalModules = getModulesCount();
    const completedModules = modulesArray.filter(
      module => {
        const progress = calculateModuleProgress(module, completedLessons);
        return progress >= 100;
      }
    ).length;
    
    return [
      {
        id: 'milestone-1',
        moduleId: 'module-1',
        title: 'Primer Módulo Completado',
        icon: '🎓',
        progress: completedModules >= 1 ? 100 : 0,
        completed: completedModules >= 1,
        unlockedAt: completedModules >= 1 ? new Date() : undefined
      },
      {
        id: 'milestone-2',
        moduleId: 'module-2',
        title: 'Tres Módulos Completados',
        icon: '⭐',
        progress: completedModules >= 3 ? 100 : Math.min((completedModules / 3) * 100, 100),
        completed: completedModules >= 3,
        unlockedAt: completedModules >= 3 ? new Date() : undefined
      },
      {
        id: 'milestone-3',
        moduleId: 'module-3',
        title: 'Cinco Módulos Completados',
        icon: '🏆',
        progress: completedModules >= 5 ? 100 : Math.min((completedModules / 5) * 100, 100),
        completed: completedModules >= 5,
        unlockedAt: completedModules >= 5 ? new Date() : undefined
      }
    ];
  }, [completedLessons, calculateModuleProgress]);

  // Datos para ProgressOverviewCard
  const todayOverview = useMemo(() => ({
    xpToday: globalStats.completedLessonsCount > 0 ? 100 : 0,
    level: currentLevel,
    roleSubtitle: `Nivel ${currentLevel} - Aprendiz`,
    nextStep: nextRecommendedLesson ? {
      moduleId: nextRecommendedLesson.moduleId,
      moduleTitle: nextRecommendedLesson.moduleTitle,
      lessonId: nextRecommendedLesson.lessonId,
      lessonTitle: nextRecommendedLesson.lessonTitle,
      type: 'lesson',
      duration: 15,
      xpReward: 10
    } : undefined
  }), [globalStats.completedLessonsCount, currentLevel, nextRecommendedLesson]);

  const streakInfo = useMemo(() => ({
    streak: streak,
    lastSessionDate: new Date(),
    isActive: streak > 0,
    longestStreak: streak,
    hasFreezeToken: Math.floor(streak / 7) > 0
  }), [streak]);

  // Datos para AchievementsGrid
  const achievements = useMemo(() => [
    {
      id: 'first-lesson',
      title: 'Primera Lección',
      description: 'Completa tu primera lección',
      icon: '🎓',
      category: 'lesson',
      unlocked: globalStats.completedLessonsCount > 0,
      rarity: 'common',
      unlockedAt: globalStats.completedLessonsCount > 0 ? new Date() : undefined
    },
    {
      id: 'streak-7',
      title: 'Racha de Fuego',
      description: 'Mantén una racha de 7 días',
      icon: '🔥',
      category: 'streak',
      unlocked: streak >= 7,
      rarity: 'rare',
      unlockedAt: streak >= 7 ? new Date() : undefined,
      progress: streak >= 7 ? undefined : {
        current: streak,
        target: 7,
        percentage: Math.min((streak / 7) * 100, 100)
      }
    }
  ], [globalStats.completedLessonsCount, streak]);

  // Datos para ComprehensionPanel
  const comprehensionTrends = useMemo(() => [], []);

  // Datos para BossFightCard
  const bossFight = useMemo(() => ({
    id: 'boss-1',
    title: 'Caso Clínico Final',
    description: 'Aplica todos tus conocimientos en un caso complejo',
    difficulty: 'hard',
    stars: 0,
    moduleId: 'module-final',
    locked: currentLevel < 5,
    lockHint: 'Completa el nivel 5 para desbloquear',
    attempts: 0,
    bestScore: 0
  }), [currentLevel]);

  // Renderizar skeleton de carga
  if (isLoading || isLoadingProgress) {
    return (
      <div className="container mx-auto max-w-screen-xl px-4 py-6 space-y-6">
        <Skeleton variant="text" width={300} height={60} className="mx-auto" />
        <Skeleton variant="text" width={500} height={30} className="mx-auto" sx={{ mb: 2 }} />
        <div className="grid grid-cols-12 gap-6 mt-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="col-span-12 xl:col-span-4">
              <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
            </div>
          ))}
        </div>
        <Skeleton variant="rectangular" height={400} sx={{ mt: 6, borderRadius: 2, maxWidth: '768px' }} className="mx-auto" />
      </div>
    );
  }

  // Renderizar error si existe
  if (error) {
    return (
      <div className="container mx-auto max-w-screen-xl px-4 py-6">
        <Alert severity="error" onClose={() => setError(null)}>
          Error al cargar el progreso: {error}
        </Alert>
      </div>
    );
  }

  return (
    <Fade in={mounted} timeout={600}>
      <div className="container mx-auto max-w-screen-xl px-4 py-6 space-y-6">
        {/* ========== SKILL TREE - ARRIBA CENTRADO CON ANCHO LIMITADO ========== */}
        <div className="mx-auto w-full max-w-6xl">
          <SkillTree
            skills={[]}
            onOpenSkill={(id) => {
            }}
          />
        </div>

        {/* ========== GRID DE 12 COLUMNAS - 3 RAILS ========== */}
        <div className="grid grid-cols-12 gap-6">
          {/* ========== RAIL IZQUIERDA (xl: col-span-4) - COMPONENTES GRANDES ========== */}
          <div className="col-span-12 xl:col-span-4 flex flex-col gap-6">
            <ModuleMilestones
              percent={moduleMilestones.reduce((acc, m) => acc + m.progress, 0) / moduleMilestones.length}
              milestones={moduleMilestones}
            />
            <div className="max-h-[80vh] overflow-auto">
              <AchievementsGrid
                achievements={achievements}
                onAchievementClick={(id) => {
                }}
              />
            </div>
          </div>

          {/* ========== RAIL CENTRO (xl: col-span-4) - COMPONENTES COMPACTOS ========== */}
          <div className="col-span-12 xl:col-span-4 flex flex-col gap-6">
            <div className="mx-auto max-w-md w-full">
              <ProgressOverviewCard
                today={todayOverview}
                streak={streakInfo}
                onStartNext={() => nextRecommendedLesson && handleLessonClick(
                  nextRecommendedLesson.moduleId,
                  nextRecommendedLesson.lessonId
                )}
                loading={isLoading || isLoadingProgress}
              />
            </div>
            <div className="mx-auto max-w-md w-full">
              <StreakWidget
                streak={streakInfo}
                onUseFreeze={() => {
                }}
              />
            </div>
            <div className="mx-auto max-w-md w-full">
              <FeedbackStrip
                feedback={undefined}
                onDismiss={() => {
                }}
                loading={false}
              />
            </div>
            <div className="mx-auto max-w-md w-full">
              <LeaderboardCompact
                personalBest={{
                  userId: 'current-user',
                  username: 'Tú',
                  xp: xpTotal,
                  level: currentLevel,
                  rank: 1
                }}
                percentile={85}
                cohortSize={100}
              />
            </div>
            <div className="mx-auto max-w-md w-full">
              <StudyCalendar
                sessions={[]}
                estimatedCompletion={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)}
              />
            </div>
            <div className="mx-auto max-w-md w-full">
              <NarrativeProgress
                currentNarrative={{
                  level: currentLevel,
                  title: 'Nuevo Aprendiz',
                  description: 'Estás comenzando tu viaje en la mecánica ventilatoria',
                  role: 'Aprendiz'
                }}
                recentEvents={[]}
                onEventClick={(level) => {
                }}
              />
            </div>
          </div>

          {/* ========== RAIL DERECHA (xl: col-span-4) - COMPONENTES GRANDES ========== */}
          <div className="col-span-12 xl:col-span-4 flex flex-col gap-6">
            <div className="max-h-[80vh] overflow-auto">
              <ComprehensionPanel
                trends={comprehensionTrends}
                onReinforce={(conceptId) => {
                }}
              />
            </div>
            <Challenges
              dailyChallenge={{
                id: 'daily-1',
                type: 'daily',
                title: 'Completa una lección',
                description: 'Estudia al menos 10 minutos hoy',
                duration: 10,
                xpReward: 50,
                completed: false,
                progress: 30
              }}
              weeklyChallenges={[
                {
                  id: 'weekly-1',
                  type: 'weekly',
                  title: 'Completa 5 lecciones',
                  description: 'Termina 5 lecciones esta semana',
                  duration: 60,
                  xpReward: 200,
                  completed: false,
                  progress: 60
                }
              ]}
              onChallengeClick={(id) => {
              }}
            />
            <BossFightCard
              boss={bossFight}
              onStart={(id) => {
              }}
            />
          </div>
        </div>
      </div>
    </Fade>
  );
};

export default ProgressDashboard;
