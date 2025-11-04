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
    isLoadingProgress
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
            <DashboardHeader />

      {/* Tabs Navigation */}
      <Paper elevation={2} sx={{ mb: 4, borderRadius: 2 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant={isMobile ? 'fullWidth' : 'standard'}
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': {
              minHeight: 64,
              fontSize: isMobile ? '0.875rem' : '1rem',
              fontWeight: 600,
              textTransform: 'none',
              color: '#6c757d',
              '&.Mui-selected': {
                color: '#1976d2',
              },
            },
            '& .MuiTabs-indicator': {
              height: 3,
              backgroundColor: '#1976d2',
            },
          }}
        >
          <Tab
            label="Dashboard"
            icon={<DashboardIcon />}
            iconPosition="start"
            value={0}
          />
          <Tab
            label="Curriculum"
            icon={<SchoolIcon />}
            iconPosition="start"
            value={1}
          />
          <Tab
            label="Mi Progreso"
            icon={<TrendingUp />}
            iconPosition="start"
            value={2}
          />
        </Tabs>
      </Paper>

      {/* TAB PANEL 0: Dashboard */}
      {activeTab === 0 && (
        <Box>
          {/* Sección: Continuar Aprendiendo */}
          <Box sx={{ mb: 4 }}>
            <ContinueLearningSection
              nextModule={nextModule}
              onContinue={handleContinueLearning}
              calculateProgress={calculateModuleProgress}
            />
          </Box>

          {/* Acceso Rápido a Lecciones */}
          <Box sx={{ mb: 4 }}>
            <QuickAccessLessons
              allModules={allModules}
              handleSectionClick={handleSectionClick}
              isMobile={isMobile}
            />
          </Box>

          {/* Estadísticas: Tiempo y lecciones completadas */}
          <Box sx={{ mb: 4 }}>
            <SessionStats
              timeSpent={timeSpent}
              completedLessonsCount={completedLessons.size}
            />
          </Box>

          {/* Sistema de Racha y Progreso Temporal */}
          <Box sx={{ mb: 4 }}>
            <ProgressOverview dashboardData={dashboardData} />
          </Box>
        </Box>
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
