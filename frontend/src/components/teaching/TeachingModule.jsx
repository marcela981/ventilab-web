"use client";

import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useRouter } from 'next/router';
import {
  Container,
  Paper,
  Typography,
  Box,
  Alert,
  Snackbar,
  Tabs,
  Tab,
  Skeleton,
  IconButton,
  Fade,
  Grid
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  School as SchoolIcon,
  TrendingUp,
  ArrowBack
} from '@mui/icons-material';

// Hooks personalizados
import { useLearningProgress } from '../../contexts/LearningProgressContext';
import useModuleProgress from './hooks/useModuleProgress';
import useModuleAvailability from './hooks/useModuleAvailability';
import { curriculumData } from '../../data/curriculumData';

// Componentes hijos
import DashboardHeader from './components/DashboardHeader';
import ContinueLearningSection from './components/ContinueLearningSection';
import SessionStats from './components/SessionStats';
import ProgressOverview from './components/ProgressOverview';
import LevelStepper from './components/LevelStepper';
import ModuleInfoPanel from './components/ModuleInfoPanel';
import FlashcardSystem from './FlashcardSystem';
import QuickAccessLessons from './components/dashboard/QuickAccessLessons';
import LessonViewer from './components/LessonViewer';

// Lazy load ProgressDashboard for better performance
const ProgressDashboard = lazy(() => import('./components/progress/ProgressDashboard'));

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

  // Estado para lección seleccionada (cuando se visualiza una lección completa)
  const [selectedLesson, setSelectedLesson] = useState(null);

  // Context: progreso de aprendizaje
  const {
    completedLessons,
    timeSpent,
    markLessonComplete,
    updateTimeSpent,
    setCurrentModule,
    isLoadingProgress,
    streak
  } = useLearningProgress();

  // Hook: progreso de módulos
  const {
    calculateModuleProgress,
    calculateGlobalStats,
    levelProgress
  } = useModuleProgress(completedLessons, timeSpent);

  // Hook: disponibilidad de módulos
  const {
    isModuleAvailable,
    getNextAvailableModule: nextModule,
    getTooltipMessage,
    getModuleStatus
  } = useModuleAvailability(calculateModuleProgress);

  // Estados locales mínimos
  const [favoriteModules, setFavoriteModules] = useState(new Set());

  // FlashcardSystem modal - Mantenido para uso futuro
  // Nota: Actualmente sin trigger en dashboard principal (removido en HU-001)
  // Puede ser activado desde otras secciones o reintegrado en el futuro
  const [flashcardSystemOpen, setFlashcardSystemOpen] = useState(false);

  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

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

  // Handlers mínimos
  const handleSectionClick = useCallback((moduleId, lessonId = null) => {
    const module = curriculumData.modules[moduleId];
    if (module?.lessons?.length > 0) {
      // Si se proporciona lessonId específico, usarlo; sino usar el primero
      const targetLessonId = lessonId || module.lessons[0].id;
      
      // Actualizar estado para mostrar LessonViewer en lugar de navegar
      setSelectedLesson({
        moduleId,
        lessonId: targetLessonId
      });

      // Scroll suave al inicio
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Mostrar alerta al usuario cuando el módulo no tiene lecciones
      const moduleName = module?.title || moduleId;
      setAlertMessage(`El módulo "${moduleName}" no tiene lecciones configuradas todavía.`);
      setAlertOpen(true);
      console.warn(`Módulo ${moduleId} no tiene lecciones disponibles`);
    }
  }, []);

  const handleContinueLearning = useCallback(() => {
    if (nextModule) {
      handleSectionClick(nextModule.id);
    }
  }, [nextModule, handleSectionClick]);

  /**
   * Handler para volver al dashboard desde LessonViewer
   */
  const handleBackToDashboard = useCallback(() => {
    setSelectedLesson(null);
    // Scroll suave al inicio
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  /**
   * Handler cuando se completa una lección
   */
  const handleLessonComplete = useCallback(() => {
    // Marcar lección como completada en el contexto
    if (selectedLesson) {
      const lessonFullId = `${selectedLesson.moduleId}.${selectedLesson.lessonId}`;
      markLessonComplete(lessonFullId);
      
      // Mostrar mensaje de éxito
      setAlertMessage('¡Felicitaciones! Has completado la lección.');
      setAlertOpen(true);
      
      // Opcional: volver al dashboard después de un delay
      setTimeout(() => {
        handleBackToDashboard();
      }, 2000);
    }
  }, [selectedLesson, markLessonComplete, handleBackToDashboard]);

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

    // Scroll to top on tab change
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [router]);

  // Calcular estadísticas globales
  const globalStats = calculateGlobalStats;

  // Preparar array de todos los módulos para QuickAccessLessons
  const allModules = Object.values(curriculumData.modules);

  // Calcular XP y nivel para el dashboard
  const xpTotal = completedLessons.size * 100; // 100 XP por lección
  const currentLevel = Math.floor(completedLessons.size / 5) + 1; // Nivel cada 5 lecciones
  const xpForCurrentLevel = (completedLessons.size % 5) * 100;
  const xpForNextLevel = 500; // 5 lecciones * 100 XP
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
          progress: Math.min((Object.keys(curriculumData.modules).filter(moduleId => 
            calculateModuleProgress(moduleId) === 100
          ).length / Object.keys(curriculumData.modules).length) * 100, 100),
          target: Object.keys(curriculumData.modules).length,
          current: Object.keys(curriculumData.modules).filter(moduleId => 
            calculateModuleProgress(moduleId) === 100
          ).length,
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
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDashboardDataForTab(prepareDashboardData());
    }
  }, [prepareDashboardData]);

  // Effect: inicialización y responsive
  useEffect(() => {
    setCurrentModule('teaching');

    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 960);
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);

    return () => window.removeEventListener('resize', checkIsMobile);
  }, [setCurrentModule]);

  // Effect: leer query parameter para tab inicial
  useEffect(() => {
    const tabParam = router.query.tab;

    if (tabParam === 'dashboard') {
      setActiveTab(0);
    } else if (tabParam === 'curriculum') {
      setActiveTab(1);
    } else if (tabParam === 'progress') {
      setActiveTab(2);
    }
  }, [router.query.tab]);

  return (
    <Container maxWidth="xl" sx={{ py: 4, minHeight: '100vh' }}>
      {/* Renderizado condicional: LessonViewer o Dashboard normal */}
      {selectedLesson ? (
        /* Vista de Lección Completa */
        <Fade in timeout={500}>
          <Box>
            {/* Botón para volver al dashboard */}
            <Box sx={{ mb: 2 }}>
              <IconButton
                onClick={handleBackToDashboard}
                sx={{
                  backgroundColor: 'background.paper',
                  boxShadow: 2,
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                }}
                aria-label="Volver al dashboard"
              >
                <ArrowBack />
              </IconButton>
              <Typography
                component="span"
                sx={{ ml: 2, color: 'text.secondary', fontWeight: 500 }}
              >
                Volver al Dashboard
              </Typography>
            </Box>

            {/* Componente LessonViewer */}
            <LessonViewer
              lessonId={selectedLesson.lessonId}
              moduleId={selectedLesson.moduleId}
              onComplete={handleLessonComplete}
              onSectionChange={(sectionIndex) => {
                // Tracking opcional de cambio de sección
                console.log('Section changed:', sectionIndex);
              }}
            />
          </Box>
        </Fade>
      ) : (
        /* Vista de Dashboard Normal */
        <Fade in timeout={500}>
          <Box>
            {/* Header: Breadcrumb, título y descripción */}
            <DashboardHeader 
              activeTab={activeTab}
            />

      {/* Tabs Navigation - Diseño Moderno */}
      <Box
        sx={{
          mb: 4,
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(33, 150, 243, 0.3), transparent)',
          },
        }}
      >
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant={isMobile ? 'fullWidth' : 'standard'}
          sx={{
            position: 'relative',
            '& .MuiTab-root': {
              minHeight: 72,
              fontSize: isMobile ? '0.875rem' : '1rem',
              fontWeight: 600,
              textTransform: 'none',
              color: 'rgba(255, 255, 255, 0.6)',
              padding: '12px 24px',
              marginRight: { xs: 0, sm: 2 },
              borderRadius: '12px 12px 0 0',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              position: 'relative',
              '&:hover': {
                color: 'rgba(255, 255, 255, 0.9)',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                transform: 'translateY(-2px)',
              },
              '&.Mui-selected': {
                color: '#ffffff',
                backgroundColor: 'rgba(33, 150, 243, 0.15)',
              },
              '& .MuiTab-iconWrapper': {
                marginRight: { xs: 0.5, sm: 1.5 },
                transition: 'transform 0.3s ease',
                fontSize: { xs: '1.1rem', sm: '1.25rem' },
              },
              '&:hover .MuiTab-iconWrapper': {
                transform: 'scale(1.1)',
              },
              '&.Mui-selected .MuiTab-iconWrapper': {
                transform: 'scale(1.15)',
                color: '#2196F3',
              },
            },
            '& .MuiTabs-indicator': {
              height: 4,
              borderRadius: '4px 4px 0 0',
              background: 'linear-gradient(90deg, #2196F3, #42A5F5, #2196F3)',
              boxShadow: '0 2px 8px rgba(33, 150, 243, 0.4)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            },
            '& .MuiTabs-flexContainer': {
              gap: { xs: 0, sm: 1 },
            },
          }}
        >
          <Tab
            label={isMobile ? '' : 'Dashboard'}
            icon={<DashboardIcon />}
            iconPosition="start"
            value={0}
            sx={{
              '&.Mui-selected': {
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '2px',
                  background: 'linear-gradient(90deg, transparent, #2196F3, transparent)',
                },
              },
            }}
          />
          <Tab
            label={isMobile ? '' : 'Curriculum'}
            icon={<SchoolIcon />}
            iconPosition="start"
            value={1}
            sx={{
              '&.Mui-selected': {
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '2px',
                  background: 'linear-gradient(90deg, transparent, #2196F3, transparent)',
                },
              },
            }}
          />
          <Tab
            label={isMobile ? '' : 'Mi Progreso'}
            icon={<TrendingUp />}
            iconPosition="start"
            value={2}
            sx={{
              '&.Mui-selected': {
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '2px',
                  background: 'linear-gradient(90deg, transparent, #2196F3, transparent)',
                },
              },
            }}
          />
        </Tabs>
      </Box>

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
          {/* Mapa de Progreso - Camino de aprendizaje por niveles */}
          <LevelStepper
            levelProgress={levelProgress}
            calculateProgress={calculateModuleProgress}
            isModuleAvailable={isModuleAvailable}
            getModuleStatus={getModuleStatus}
            getTooltipMessage={getTooltipMessage}
            onSectionClick={handleSectionClick}
            favoriteModules={favoriteModules}
            onToggleFavorite={toggleFavorite}
          />

          {/* Panel Informativo: Sobre el módulo */}
          <ModuleInfoPanel />
        </Box>
      )}

      {/* TAB PANEL 2: Mi Progreso */}
      {activeTab === 2 && (
        <Box>
          <Suspense
            fallback={
              <Box sx={{ py: 4 }}>
                {/* Loading skeleton for ProgressDashboard */}
                <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
                  <Skeleton variant="text" width="40%" height={40} sx={{ mb: 2 }} />
                  <Grid container spacing={3}>
                    {[1, 2, 3, 4].map((item) => (
                      <Grid item xs={12} sm={6} md={3} key={item}>
                        <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2 }} />
                      </Grid>
                    ))}
                  </Grid>
                </Paper>

                <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
                  <Skeleton variant="text" width="30%" height={40} sx={{ mb: 2 }} />
                  <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
                </Paper>

                <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
                  <Skeleton variant="text" width="35%" height={40} sx={{ mb: 2 }} />
                  <Grid container spacing={2}>
                    {[1, 2, 3].map((item) => (
                      <Grid item xs={12} md={4} key={item}>
                        <Skeleton variant="rectangular" height={180} sx={{ borderRadius: 2 }} />
                      </Grid>
                    ))}
                  </Grid>
                </Paper>
              </Box>
            }
          >
            {isLoadingProgress ? (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <Paper elevation={2} sx={{ p: 4, borderRadius: 2 }}>
                  <Typography variant="h6" sx={{ mb: 2, color: '#6c757d' }}>
                    Cargando tu progreso...
                  </Typography>
                  <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2, mt: 2 }} />
                </Paper>
              </Box>
            ) : (
              <ProgressDashboard />
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
  );
};

export default TeachingModule;
