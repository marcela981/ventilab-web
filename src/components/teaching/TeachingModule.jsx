"use client";

import React, { useState, useEffect, useCallback, lazy, Suspense, useMemo } from 'react';
import { useRouter } from 'next/router';
import {
  Container,
  Paper,
  Typography,
  Box,
  Alert,
  Snackbar,
  Skeleton,
  Fade,
  Divider,
  CircularProgress
} from '@mui/material';

// Hooks personalizados
import { useLearningProgress } from '../../contexts/LearningProgressContext';
import useModuleProgress from './hooks/useModuleProgress';
import useModuleAvailability from './hooks/useModuleAvailability';
import useTeachingModule from '../../hooks/useTeachingModule';
import useUserProgress from '../../hooks/useUserProgress';
import { curriculumData } from '../../data/curriculumData';
import debug from '../../utils/debug';
import { getModuleResumePoint } from '../../services/progressService';

// Module 03 content and navigation
import { CurriculumPanel } from '../../view-components/teaching/components/curriculum';

// Componentes hijos
import {
  DashboardHeader
} from '../../view-components/teaching/components/dashboard';
import FlashcardSystem from './FlashcardSystem';

// Extracted components
import TeachingLessonView from './components/TeachingLessonView';
import TeachingTabs from './components/TeachingTabs';
import ProgressTabSkeleton from './components/ProgressTabSkeleton';

// Lazy load ProgressDashboard for better performance
const ProgressTab = lazy(() => import('../../features/progress/components/ProgressTab'));
const Module3ProgressDashboard = lazy(() => import('../../view-components/teaching/components/dashboard/Module3ProgressDashboard'));
const ReadinessIndicator = lazy(() => import('../../view-components/teaching/components/dashboard/ReadinessIndicator'));

// Importar DashboardTab
import DashboardTab from '../../features/dashboard/DashboardTab';

/**
 * TeachingModule - Componente orquestador del módulo de enseñanza
 *
 * Este componente actúa como "controller" del módulo de enseñanza:
 * - Consume hooks del context y hooks personalizados
 * - Mantiene estado global mínimo
 * - Compone todos los sub-componentes pasándoles props claras
 *
 * Responsabilidad única: coordina, no implementa
 */
const TeachingModule = () => {
  // Router de Next.js
  const router = useRouter();

  // Estado para responsive
  const [isMobile, setIsMobile] = useState(false);

  // Estado para tabs (0: Dashboard, 1: Curriculum, 2: Mi Progreso)
  const [activeTab, setActiveTab] = useState(0);

  // Estado para lección seleccionada (derivado de router.query para sincronización con URL)
  // Ya no usamos estado local, sino que leemos directamente de router.query
  const lessonIdFromQuery = router.query.lessonId;
  const moduleIdFromQuery = router.query.moduleId;
  
  // Determinar si estamos viendo una lección específica
  const isViewingLesson = Boolean(lessonIdFromQuery && moduleIdFromQuery);
  
  // Estado para errores de lección
  const [lessonError, setLessonError] = useState(null);

  // Context: progreso de aprendizaje
  const {
    completedLessons,
    timeSpent,
    markLessonComplete,
    updateTimeSpent,
    setCurrentModule,
    isLoadingProgress,
    streak,
    progressByModule,
    snapshot,
    refetchSnapshot,
    upsertLessonProgressUnified
  } = useLearningProgress();

  // Teaching module context (for category navigation) - Only use if available
  let teachingModuleContext = null;
  try {
    teachingModuleContext = useTeachingModule();
  } catch (e) {
    // Context not available yet, will be provided by TeachingModuleProvider
  }

  const {
    activeModuleId,
    activeCategoryId,
    activeLessonId,
    setModule,
    setCategory,
    setLesson,
  } = teachingModuleContext || {
    activeModuleId: null,
    activeCategoryId: null,
    activeLessonId: null,
    setModule: () => {},
    setCategory: () => {},
    setLesson: () => {},
  };

  // User progress tracking (especialmente para módulo 3)
  const { initializeModuleThree, markCategoryLessonComplete } = useUserProgress();

  // Hook: progreso de módulos (pasa progressByModule para cálculo por páginas)
  const {
    calculateModuleProgress,
    calculateGlobalStats,
    levelProgress,
    levelProgressAggregated
  } = useModuleProgress(completedLessons, timeSpent, progressByModule);

  // Hook: disponibilidad de módulos
  const {
    isModuleAvailable,
    getNextAvailableModule: nextModule,
    getTooltipMessage,
    getModuleStatus
  } = useModuleAvailability(calculateModuleProgress);

  // Estados locales mínimos
  const [favoriteModules, setFavoriteModules] = useState(new Set());

  // Estado para mostrar/ocultar el panel del módulo 3
  const [showModule3Dashboard, setShowModule3Dashboard] = useState(false);

  // FlashcardSystem modal - Mantenido para uso futuro
  // Nota: Actualmente sin trigger en dashboard principal (removido en HU-001)
  // Puede ser activado desde otras secciones o reintegrado en el futuro
  const [flashcardSystemOpen, setFlashcardSystemOpen] = useState(false);

  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  
  // Estado para el progreso de la lección (para la barra de progreso)
  const [lessonProgress, setLessonProgress] = useState({ currentPage: 0, totalPages: 0 });
  
  // Resetear progreso cuando cambia la lección
  useEffect(() => {
    if (lessonIdFromQuery) {
      setLessonProgress({ currentPage: 0, totalPages: 0 });
    }
  }, [lessonIdFromQuery]);

  // Estado del dashboard
  const [dashboardData] = useState({
    streak: 7,
    badges: ['first-lesson', 'week-streak', 'module-complete'],
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000),
    weeklyProgress: [
      { week: 'Sem 1', lessons: 3 },
      { week: 'Sem 2', lessons: 7 },
      { week: 'Sem 3', lessons: 5 },
      { week: 'Sem 4', lessons: 12 }
    ]
  });

  /**
   * Verifica si una lección cumple con los prerequisitos
   * @param {string} moduleId - ID del módulo
   * @param {string} lessonId - ID de la lección
   * @returns {Object} { canAccess: boolean, missingPrerequisites: Array }
   */
  const checkLessonPrerequisites = useCallback((moduleId, lessonId) => {
    const module = curriculumData.modules[moduleId];
    if (!module) {
      return { canAccess: false, missingPrerequisites: [], error: 'Módulo no encontrado' };
    }

    // Verificar prerequisitos del módulo
    const modulePrerequisites = module.prerequisites || [];
    const missingModulePrereqs = modulePrerequisites.filter(prereqId => {
      const prereqModule = curriculumData.modules[prereqId];
      if (!prereqModule) return true;
      
      // Verificar si todas las lecciones del módulo prerequisito están completadas
      const prereqLessons = prereqModule.lessons || [];
      return prereqLessons.some(lesson => {
        const lessonKey = `${prereqId}.${lesson.id}`;
        return !completedLessons.has(lessonKey);
      });
    });

    if (missingModulePrereqs.length > 0) {
      return {
        canAccess: false,
        missingPrerequisites: missingModulePrereqs.map(id => {
          const prereqModule = curriculumData.modules[id];
          return prereqModule?.title || id;
        }),
        error: 'Prerequisitos del módulo no completados'
      };
    }

    return { canAccess: true, missingPrerequisites: [] };
  }, [completedLessons]);

  /**
   * Navegación centralizada de lecciones
   * Este es el único punto donde se hace router.push para navegación de lecciones
   * @param {string} moduleId - ID del módulo
   * @param {string|null} lessonId - ID de la lección (opcional)
   * @param {string|null} category - ID de la categoría (opcional, para M03)
   */
  const handleSectionClick = useCallback(async (moduleId, lessonId = null, category = null) => {
    // Para módulos con categorías (como module-03-configuration),
    // no validamos prerequisitos de la misma manera ya que la estructura es diferente
    const isCategoryBasedModule = moduleId === 'module-03-configuration';

    if (!isCategoryBasedModule) {
      const module = curriculumData.modules[moduleId];
      if (!module) {
        setAlertMessage(`Módulo "${moduleId}" no encontrado.`);
        setAlertOpen(true);
        return;
      }

      if (module?.lessons?.length > 0) {
        // Determine target lesson: use provided lessonId, or fetch resume point, or fall back to first lesson
        let targetLessonId = lessonId;

        if (!targetLessonId) {
          // Try to get resume point from backend
          try {
            const resumePoint = await getModuleResumePoint(moduleId);
            if (resumePoint?.lessonId) {
              targetLessonId = resumePoint.lessonId;
              console.log('[TeachingModule] Resuming from:', targetLessonId);
            }
          } catch (error) {
            console.warn('[TeachingModule] Could not fetch resume point:', error);
          }
        }

        // Fall back to first lesson if no resume point
        if (!targetLessonId) {
          targetLessonId = module.lessons[0].id;
        }
        
        // Encontrar la lección en el módulo
        const targetLesson = module.lessons.find(l => l.id === targetLessonId);
        
        // Verificar si la lección tiene secciones
        if (targetLesson) {
          // Obtener secciones de la lección (puede estar en lessonData.sections, sections, o metadata)
          const lessonSections = targetLesson.lessonData?.sections || 
                                targetLesson.sections || 
                                [];
          const metadata = targetLesson.lessonData?.metadata || targetLesson.metadata || {};
          const allowEmpty = metadata.allowEmpty === true;
          
          // Si no hay secciones y allowEmpty !== true, no navegar
          if (lessonSections.length === 0 && allowEmpty !== true) {
            // La lección no tiene secciones y no está marcada como allowEmpty
            // El CTA debería estar deshabilitado, pero por seguridad también verificamos aquí
            setAlertMessage(`La lección "${targetLesson.title || targetLessonId}" no tiene contenido disponible todavía.`);
            setAlertOpen(true);
            return;
          }
        }
        
        // Verificar prerequisitos antes de navegar
        const prerequisiteCheck = checkLessonPrerequisites(moduleId, targetLessonId);
        
        if (!prerequisiteCheck.canAccess) {
          const missingPrereqs = prerequisiteCheck.missingPrerequisites.join(', ');
          setAlertMessage(
            `No puedes acceder a esta lección aún. Debes completar primero: ${missingPrereqs}`
          );
          setAlertOpen(true);
          return;
        }

        // Navegación para módulos estándar
        const { category: _category, ...restQuery } = router.query;
        router.push(
          {
            pathname: router.pathname,
            query: {
              ...restQuery,
              moduleId,
              lessonId: targetLessonId,
              // Mantener el tab si estaba activo
              tab: router.query.tab || 'curriculum'
            }
          },
          undefined,
          { shallow: true }
        );

        // Scroll suave al inicio
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        // Track analytics event
        if (typeof window !== 'undefined' && window.gtag) {
          window.gtag('event', 'lesson_access', {
            module_id: moduleId,
            lesson_id: targetLessonId,
            module_title: module.title
          });
        }
      } else {
        // Mostrar alerta al usuario cuando el módulo no tiene lecciones
        const moduleName = module?.title || moduleId;
        setAlertMessage(`El módulo "${moduleName}" no tiene lecciones configuradas todavía.`);
        setAlertOpen(true);
        console.warn(`Módulo ${moduleId} no tiene lecciones disponibles`);
      }
    } else {
      // Navegación para módulos basados en categorías (M03)
      // Preservar moduleId y lessonId si existen, agregar/actualizar category
      const { category: _oldCategory, ...restQuery } = router.query;
      const newQuery = {
        ...restQuery,
        moduleId,
        // Mantener el tab si estaba activo
        tab: router.query.tab || 'curriculum'
      };
      
      // Solo agregar lessonId si se proporciona
      if (lessonId) {
        newQuery.lessonId = lessonId;
      }
      
      // Solo agregar category si se proporciona
      if (category) {
        newQuery.category = category;
      }
      
      router.push(
        {
          pathname: router.pathname,
          query: newQuery
        },
        undefined,
        { shallow: true }
      );

      // Scroll suave al inicio
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      // Track analytics event
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'lesson_access', {
          module_id: moduleId,
          lesson_id: lessonId || 'none',
          category: category || 'none'
        });
      }
    }
  }, [router, checkLessonPrerequisites]);

  const handleContinueLearning = useCallback(() => {
    if (nextModule) {
      handleSectionClick(nextModule.id);
    }
  }, [nextModule, handleSectionClick]);

  /**
   * Handler para volver al dashboard desde LessonViewer
   * Limpia todas las keys huérfanas relacionadas con navegación de lecciones
   */
  const handleBackToDashboard = useCallback(() => {
    // Limpiar lessonId, moduleId y category de la URL
    const { lessonId, moduleId, category, ...restQuery } = router.query;
    router.push(
      {
        pathname: router.pathname,
        query: restQuery
      },
      undefined,
      { shallow: true }
    );
    
    // Limpiar error de lección
    setLessonError(null);
    
    // Scroll suave al inicio
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [router]);

  /**
   * Handler cuando se completa una lección
   */
  const handleLessonComplete = useCallback((lessonData) => {
    // Marcar lección como completada en el contexto
    if (lessonIdFromQuery && moduleIdFromQuery) {
      const lessonFullId = `${moduleIdFromQuery}.${lessonIdFromQuery}`;
      
      // Calcular tiempo de estudio (estimado basado en duration del módulo)
      const module = curriculumData.modules[moduleIdFromQuery];
      const estimatedTime = module?.duration || 30;
      
      // Use unified progress update
      if (upsertLessonProgressUnified) {
        upsertLessonProgressUnified(lessonIdFromQuery, 1.0);
      } else {
        // Fallback to legacy method
        markLessonComplete(lessonFullId, moduleIdFromQuery, estimatedTime);
      }
      
      // Track analytics event
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'lesson_completed', {
          module_id: moduleIdFromQuery,
          lesson_id: lessonIdFromQuery,
          lesson_title: lessonData?.title || lessonIdFromQuery,
          time_spent: estimatedTime
        });
      }
      
      // Mostrar mensaje de éxito
      setAlertMessage('¡Felicitaciones! Has completado la lección.');
      setAlertOpen(true);
      
      // Opcional: navegar a la siguiente lección si existe
      if (lessonData?.navigation?.nextLesson) {
        setTimeout(() => {
          handleSectionClick(moduleIdFromQuery, lessonData.navigation.nextLesson.id);
        }, 2000);
      } else {
        // Si no hay siguiente lección, volver al dashboard después de un delay
        setTimeout(() => {
          handleBackToDashboard();
        }, 3000);
      }
    }
  }, [lessonIdFromQuery, moduleIdFromQuery, markLessonComplete, handleBackToDashboard, handleSectionClick]);
  
  /**
   * Handler para navegar entre lecciones
   */
  const handleNavigateLesson = useCallback((targetLessonId, targetModuleId) => {
    if (targetLessonId && targetModuleId) {
      handleSectionClick(targetModuleId, targetLessonId);
    }
  }, [handleSectionClick]);
  
  /**
   * Handler para errores de carga de lección
   */
  const handleLessonError = useCallback((error) => {
    setLessonError(error);
    console.error('Error loading lesson:', error);
  }, []);
  
  /**
   * Callback para actualizar el progreso de la lección
   */
  const handleLessonProgressUpdate = useCallback((currentPage, totalPages) => {
    setLessonProgress({ currentPage, totalPages });
  }, []);

  const handleCloseAlert = useCallback((event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setAlertOpen(false);
  }, []);

  const toggleFavorite = useCallback((moduleId) => {
    setFavoriteModules(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(moduleId)) {
        newFavorites.delete(moduleId);
      } else {
        newFavorites.add(moduleId);
      }
      return newFavorites;
    });
  }, []);

  // Handler: cambio de tab con actualización de URL
  const handleTabChange = useCallback((event, newValue) => {
    setActiveTab(newValue);

    // Update URL query parameter with shallow routing
    const tabParam = newValue === 0 ? 'dashboard' : newValue === 1 ? 'curriculum' : 'progress';
    router.push(
      {
        pathname: router.pathname,
        query: { ...router.query, tab: tabParam }
      },
      undefined,
      { shallow: true }
    );

    // Revalidate progress when switching to Curriculum or Mi Progreso tabs
    if (newValue === 1 || newValue === 2) {
      debug.info(`Tab changed to ${tabParam}, revalidating progress...`);
      if (refetchSnapshot) {
        refetchSnapshot();
      }
    }

    // Scroll to top on tab change
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [router, refetchSnapshot]);

  // Calcular estadísticas globales
  const globalStats = calculateGlobalStats;

  // Preparar array de todos los módulos para QuickAccessLessons
  // Memoizar allModules para evitar recreaciones innecesarias
  const allModules = useMemo(() => Object.values(curriculumData.modules), []);

  // Calcular XP y nivel para el dashboard (usar snapshot unificado si disponible)
  const completedLessonsCount = snapshot?.overview?.completedLessons || completedLessons.size;
  const xpTotal = snapshot?.overview?.xpTotal || (completedLessonsCount * 100); // 100 XP por lección
  const currentLevel = snapshot?.overview?.level || Math.floor(completedLessonsCount / 5) + 1; // Nivel cada 5 lecciones
  const xpForCurrentLevel = (completedLessonsCount % 5) * 100;
  const xpForNextLevel = snapshot?.overview?.nextLevelXp || 500; // 5 lecciones * 100 XP
  const levelProgressPercentage = (xpForCurrentLevel / xpForNextLevel) * 100;
  const xpToday = 0; // Esto debería calcularse desde el backend o tracking diario

  // Estado para datos del dashboard (evita problemas de hidratación con fechas)
  const [dashboardDataForTab, setDashboardDataForTab] = useState(null);

  // Preparar datos para DashboardTab
  const prepareDashboardData = useCallback(() => {
    const dashboardStreak = dashboardData.streak || 0;
    const contextStreak = streak || 0;
    const finalStreak = contextStreak > 0 ? contextStreak : dashboardStreak;

    // Calcular dominio del módulo (% de lecciones completadas)
    const totalLessons = allModules.reduce((acc, module) => 
      acc + (module.lessons?.length || 0), 0
    , 0);
    const moduleMastery = totalLessons > 0 
      ? (completedLessons.size / totalLessons) * 100 
      : 0;

    // Usar una fecha base consistente para SSR
    const now = typeof window !== 'undefined' ? new Date() : new Date('2024-01-01');

    return {
      overview: {
        xpToday: xpToday,
        level: currentLevel,
        levelProgress: levelProgressPercentage,
        role: 'Estudiante',
        streak: finalStreak
      },
      kpis: [
        {
          label: 'XP Total',
          value: xpTotal,
          icon: 'trending',
          trend: 'up'
        },
        {
          label: 'Nivel',
          value: currentLevel,
          icon: 'trophy'
        },
        {
          label: 'Racha',
          value: `${finalStreak} días`,
          icon: 'fire'
        },
        {
          label: 'Dominio',
          value: `${moduleMastery.toFixed(0)}%`,
          icon: 'check',
          trend: 'up'
        }
      ],
      quickActions: [
        {
          id: 'resume',
          label: 'Continuar',
          icon: 'play',
          onClick: handleContinueLearning
        },
        {
          id: 'simulator',
          label: 'Simulador',
          icon: 'science',
          onClick: () => {
            router.push('/simulator');
          }
        },
        {
          id: 'review',
          label: 'Reforzar',
          icon: 'refresh',
          onClick: () => {
            setActiveTab(1); // Ir a Curriculum
          }
        },
        {
          id: 'challenge',
          label: 'Reto del Día',
          icon: 'trophy',
          onClick: () => {
            // Aquí se puede implementar lógica para el reto del día
            setAlertMessage('¡Próximamente: Reto del Día!');
            setAlertOpen(true);
          },
          badge: 'Nuevo'
        }
      ],
      weeklyObjectives: [
        {
          id: 'lessons',
          title: 'Completar Lecciones',
          progress: Math.min((completedLessons.size / 10) * 100, 100),
          target: 10,
          current: completedLessons.size,
          unit: ' lecciones'
        },
        {
          id: 'time',
          title: 'Tiempo de Estudio',
          progress: Math.min((timeSpent / 300) * 100, 100), // 300 minutos objetivo
          target: 300,
          current: timeSpent,
          unit: ' min'
        },
        {
          id: 'modules',
          title: 'Completar Módulos',
          // Use data-driven count via selectors
          progress: (() => {
            const modulesArray = Object.values(curriculumData.modules || {});
            const totalModules = modulesArray.length;
            const completedModules = modulesArray.filter(module => 
              calculateModuleProgress(module.id) === 100
            ).length;
            return totalModules > 0 ? Math.min((completedModules / totalModules) * 100, 100) : 0;
          })(),
          target: (() => {
            return Object.keys(curriculumData.modules || {}).length;
          })(),
          current: (() => {
            return Object.values(curriculumData.modules || {}).filter(module => 
              calculateModuleProgress(module.id) === 100
            ).length;
          })(),
          unit: ' módulos'
        }
      ],
      caseSpotlight: nextModule ? {
        id: nextModule.id,
        title: nextModule.title,
        description: nextModule.learningObjectives?.[0] || nextModule.description || 'Continúa tu aprendizaje',
        difficulty: nextModule.difficulty?.toLowerCase() || 'básico',
        reward: {
          xp: 100,
          badge: 'Explorador'
        },
        estimatedTime: nextModule.duration || 30,
        onClick: () => handleSectionClick(nextModule.id)
      } : undefined,
      recommendations: allModules
        .filter(module => {
          const progress = calculateModuleProgress(module.id);
          return progress > 0 && progress < 100;
        })
        .slice(0, 5)
        .map(module => ({
          id: module.id,
          type: 'module',
          title: module.title,
          description: module.learningObjectives?.[0] || module.description || '',
          progress: calculateModuleProgress(module.id),
          estimatedTime: module.duration,
          onClick: () => handleSectionClick(module.id)
        })),
      notifications: [
        {
          id: 'streak',
          type: 'success',
          title: '¡Racha activa!',
          message: `Has mantenido tu racha por ${finalStreak} día${finalStreak > 1 ? 's' : ''}`,
          timestamp: now,
          read: false
        },
        ...(completedLessons.size > 0 ? [{
          id: 'progress',
          type: 'info',
          title: 'Progreso actualizado',
          message: `Has completado ${completedLessons.size} lección${completedLessons.size > 1 ? 'es' : ''}`,
          timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000),
          read: false
        }] : [])
      ],
      schedule: [],
      activities: Array.from(completedLessons)
        .slice(-5)
        .map((lessonId, index) => {
          const [moduleId, lesson] = lessonId.split('.');
          const module = curriculumData.modules[moduleId];
          return {
            id: `activity-${index}`,
            type: 'lesson_completed',
            title: `Completaste una lección`,
            description: module ? `Módulo: ${module.title}` : 'Lección completada',
            timestamp: new Date(now.getTime() - (index + 1) * 24 * 60 * 60 * 1000)
          };
        })
        .reverse(),
      todos: [],
      cohortStats: undefined
    };
  }, [
    xpToday,
    currentLevel,
    levelProgressPercentage,
    xpTotal,
    completedLessons,
    allModules,
    streak,
    dashboardData.streak,
    timeSpent,
    calculateModuleProgress,
    nextModule,
    handleContinueLearning,
    handleSectionClick,
    router
  ]);

  // Actualizar datos del dashboard solo en el cliente para evitar problemas de hidratación
  // Usar useMemo en lugar de useEffect para evitar loops infinitos
  const dashboardDataForTabMemo = useMemo(() => {
    if (typeof window !== 'undefined') {
      return prepareDashboardData();
    }
    return null;
  }, [
    xpToday,
    currentLevel,
    levelProgressPercentage,
    xpTotal,
    completedLessons,
    allModules,
    streak,
    dashboardData.streak,
    timeSpent,
    calculateModuleProgress,
    nextModule,
    handleContinueLearning,
    handleSectionClick,
    router
  ]);

  // Sincronizar el estado con el valor memoizado
  useEffect(() => {
    setDashboardDataForTab(dashboardDataForTabMemo);
  }, [dashboardDataForTabMemo]);

  // Detectar si estamos en el módulo 3 e inicializarlo
  useEffect(() => {
    if (moduleIdFromQuery === 'module-03-configuration' || activeModuleId === 'module-03-configuration') {
      setShowModule3Dashboard(true);
      initializeModuleThree();
    } else {
      setShowModule3Dashboard(false);
    }
  }, [moduleIdFromQuery, activeModuleId, initializeModuleThree]);

  // Effect: inicialización y responsive
  useEffect(() => {
    setCurrentModule('teaching', { loadProgress: false });

    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 960);
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);

    return () => window.removeEventListener('resize', checkIsMobile);
  }, [setCurrentModule]);

  // Effect: leer query parameter para tab inicial y verificar prerequisitos
  useEffect(() => {
    const tabParam = router.query.tab;

    if (tabParam === 'dashboard') {
      setActiveTab(0);
    } else if (tabParam === 'curriculum') {
      setActiveTab(1);
    } else if (tabParam === 'progress') {
      setActiveTab(2);
    }
    
    // Verificar prerequisitos si estamos viendo una lección
    if (isViewingLesson && moduleIdFromQuery && lessonIdFromQuery) {
      const prerequisiteCheck = checkLessonPrerequisites(moduleIdFromQuery, lessonIdFromQuery);
      if (!prerequisiteCheck.canAccess) {
        setLessonError({
          message: 'Lección no disponible',
          details: `Debes completar primero: ${prerequisiteCheck.missingPrerequisites.join(', ')}`,
          missingPrerequisites: prerequisiteCheck.missingPrerequisites
        });
      } else {
        setLessonError(null);
      }
      
      // Track analytics event
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'lesson_view', {
          module_id: moduleIdFromQuery,
          lesson_id: lessonIdFromQuery
        });
      }
    }
  }, [router.query.tab, isViewingLesson, moduleIdFromQuery, lessonIdFromQuery, checkLessonPrerequisites]);
  
  /**
   * Prefetch siguiente lección para carga más rápida
   */
  useEffect(() => {
    if (!isViewingLesson || !moduleIdFromQuery || !lessonIdFromQuery) return;
    
    // Obtener información del módulo para encontrar la siguiente lección
    const module = curriculumData.modules[moduleIdFromQuery];
    if (!module?.lessons) return;
    
    const currentLessonIndex = module.lessons.findIndex(l => l.id === lessonIdFromQuery);
    if (currentLessonIndex >= 0 && currentLessonIndex < module.lessons.length - 1) {
      const nextLesson = module.lessons[currentLessonIndex + 1];
      
      // Prefetch el siguiente archivo JSON (solo en producción se beneficiaría realmente)
      // En desarrollo, esto ayuda a que el navegador cachee el recurso
      if (typeof window !== 'undefined' && nextLesson) {
        // Prefetch puede hacerse usando link rel="prefetch" o simplemente
        // precargando el módulo en memoria
        const nextModuleId = moduleIdFromQuery;
        const nextLessonId = nextLesson.id;
        
        // Prefetch usando router.prefetch (Next.js)
        router.prefetch({
          pathname: router.pathname,
          query: {
            ...router.query,
            moduleId: nextModuleId,
            lessonId: nextLessonId
          }
        }).catch(err => {
          // Silently fail - prefetch is optional
          console.debug('Prefetch failed for next lesson:', err);
        });
      }
    }
  }, [isViewingLesson, moduleIdFromQuery, lessonIdFromQuery, router]);
  
  /**
   * Obtener información del módulo y lección para breadcrumbs y SEO
   */
  const lessonInfo = useMemo(() => {
    if (!isViewingLesson) return null;
    
    const module = curriculumData.modules[moduleIdFromQuery];
    if (!module) return null;
    
    const lesson = module.lessons?.find(l => l.id === lessonIdFromQuery);
    
    return {
      moduleTitle: module.title,
      lessonTitle: lesson?.title || lessonIdFromQuery,
      moduleLevel: module.level
    };
  }, [isViewingLesson, moduleIdFromQuery, lessonIdFromQuery]);

  return (
    <>
      {/* SEO Head */}
      {isViewingLesson && lessonInfo && (
        <Head>
          <title>{`${lessonInfo.lessonTitle} - VentyLab`}</title>
          <meta
            name="description"
            content={`Aprende sobre ${lessonInfo.lessonTitle} en el módulo ${lessonInfo.moduleTitle}. Curso de ventilación mecánica para profesionales de la salud.`}
          />
          <meta
            name="keywords"
            content={`ventilación mecánica, ${lessonInfo.lessonTitle}, ${lessonInfo.moduleTitle}, medicina intensiva, respiración artificial`}
          />
          <meta property="og:title" content={`${lessonInfo.lessonTitle} - VentyLab`} />
          <meta property="og:description" content={`Aprende sobre ${lessonInfo.lessonTitle} en VentyLab`} />
          <meta property="og:type" content="article" />
        </Head>
      )}
      
      <Container maxWidth="xl" sx={{ py: 4, minHeight: '100vh' }}>
        {/* Renderizado condicional: LessonViewer o Dashboard normal */}
        {isViewingLesson ? (
          /* Vista de Lección Completa - Using extracted component */
          <TeachingLessonView
            lessonId={lessonIdFromQuery}
            moduleId={moduleIdFromQuery}
            lessonInfo={lessonInfo}
            lessonProgress={lessonProgress}
            lessonError={lessonError}
            onBackToDashboard={handleBackToDashboard}
            onLessonComplete={handleLessonComplete}
            onNavigateLesson={handleNavigateLesson}
            onLessonError={handleLessonError}
            onProgressUpdate={handleLessonProgressUpdate}
          />
        ) : (
        /* Vista de Dashboard Normal */
        <Fade in timeout={500}>
          <Box>
            {/* Header: Breadcrumb, título y descripción */}
            <DashboardHeader 
              activeTab={activeTab}
            />

      {/* Tabs Navigation - Using extracted component */}
      <TeachingTabs
        activeTab={activeTab}
        onTabChange={handleTabChange}
        isMobile={isMobile}
      />

      {/* TAB PANEL 0: Dashboard */}
      {activeTab === 0 && (
        dashboardDataForTab ? (
          <DashboardTab
            data={dashboardDataForTab}
            loading={isLoadingProgress}
            error={null}
            onRefresh={() => {
              // Aquí se puede agregar lógica de refresh si es necesario
              if (typeof window !== 'undefined') {
                setDashboardDataForTab(prepareDashboardData());
              }
            }}
          />
        ) : (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
          </Box>
        )
      )}

      {/* TAB PANEL 1: Curriculum */}
      {activeTab === 1 && (
        <Box>
          <CurriculumPanel
            moduleIdFromQuery={moduleIdFromQuery}
            lessonIdFromQuery={lessonIdFromQuery}
            router={router}
            activeCategoryId={activeCategoryId}
            activeLessonId={activeLessonId}
            setModule={setModule}
            setCategory={setCategory}
            setLesson={setLesson}
            handleSectionClick={handleSectionClick}
            levelProgress={levelProgressAggregated || levelProgress}
            calculateModuleProgress={calculateModuleProgress}
            isModuleAvailable={isModuleAvailable}
            getModuleStatus={getModuleStatus}
            getTooltipMessage={getTooltipMessage}
            favoriteModules={favoriteModules}
            toggleFavorite={toggleFavorite}
            levels={curriculumData.levels}
          />

          {/* Module 3 Progress Dashboard - Mostrado cuando se está en el módulo 3 */}
          {showModule3Dashboard && (
            <Box sx={{ mt: 4 }}>
              <Paper elevation={3} sx={{ p: 3, borderRadius: 3, backgroundColor: '#f8f9fa' }}>
                <Typography variant="h5" fontWeight="700" gutterBottom sx={{ mb: 3 }}>
                  Tu Progreso en Configuración y Manejo
                </Typography>

                <Suspense
                  fallback={
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                      <CircularProgress />
                    </Box>
                  }
                >
                  <Module3ProgressDashboard />
                </Suspense>

                <Divider sx={{ my: 4 }} />

                <Suspense
                  fallback={
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                      <CircularProgress />
                    </Box>
                  }
                >
                  <ReadinessIndicator />
                </Suspense>
              </Paper>
            </Box>
          )}
        </Box>
      )}

      {/* TAB PANEL 2: Mi Progreso */}
      {activeTab === 2 && (
        <Box>
          <Suspense fallback={<ProgressTabSkeleton />}>
            {isLoadingProgress ? (
              <ProgressTabSkeleton />
            ) : (
              <ProgressTab />
            )}
          </Suspense>
        </Box>
      )}

      {/* Sistema de Flashcards: Modal */}
      {/*
        Nota HU-001: FlashcardSystem se mantiene disponible para uso futuro.
        Actualmente no tiene trigger desde el dashboard principal.
        Puede ser reintegrado cuando se diseñe una sección dedicada para
        el sistema de repetición espaciada.
      */}
      <FlashcardSystem
        isOpen={flashcardSystemOpen}
        onClose={() => setFlashcardSystemOpen(false)}
        autoGenerateFromLesson={false}
      />

      {/* Snackbar para alertas de usuario */}
      <Snackbar
        open={alertOpen}
        autoHideDuration={6000}
        onClose={handleCloseAlert}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseAlert} 
          severity={alertMessage.includes('Felicitaciones') ? 'success' : 'warning'} 
          sx={{ width: '100%' }}
        >
          {alertMessage}
        </Alert>
      </Snackbar>
          </Box>
        </Fade>
      )}
      </Container>
    </>
  );
};

export default TeachingModule;
