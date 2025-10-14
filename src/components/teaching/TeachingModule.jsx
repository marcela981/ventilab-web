"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import {
  Container,
  Paper,
  Typography,
  Grid,
  Box,
  Alert,
  Snackbar
} from '@mui/material';
import {
  Assessment
} from '@mui/icons-material';

// Hooks personalizados
import { useLearningProgress } from '../../contexts/LearningProgressContext';
import useModuleProgress from './hooks/useModuleProgress';
import useModuleAvailability from './hooks/useModuleAvailability';
import useRecommendations from './hooks/useRecommendations';
import { curriculumData } from '../../data/curriculumData';

// Componentes hijos
import ClientOnly from '../common/ClientOnly';
import DashboardHeader from './components/DashboardHeader';
import ContinueLearningSection from './components/ContinueLearningSection';
import SessionStats from './components/SessionStats';
import FlashcardDashboard from './components/FlashcardDashboard';
import ProgressOverview from './components/ProgressOverview';
import RecommendationsPanel from './components/RecommendationsPanel';
import LevelStepper from './components/LevelStepper';
import ModuleInfoPanel from './components/ModuleInfoPanel';
import FlashcardSystem from './FlashcardSystem';
import QuickAccessLessons from './components/dashboard/QuickAccessLessons';

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

  // Context: progreso de aprendizaje
  const {
    completedLessons,
    timeSpent,
    markLessonComplete,
    updateTimeSpent,
    setCurrentModule
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
  const handleSectionClick = useCallback((moduleId) => {
    const module = curriculumData.modules[moduleId];
    if (module?.lessons?.length > 0) {
      // Navegar a la primera lección del módulo usando Next.js router
      const firstLessonId = module.lessons[0].id;
      router.push(`/teaching/${moduleId}/${firstLessonId}`);
    } else {
      // Mostrar alerta al usuario cuando el módulo no tiene lecciones
      const moduleName = module?.title || moduleId;
      setAlertMessage(`El módulo "${moduleName}" no tiene lecciones configuradas todavía.`);
      setAlertOpen(true);
      console.warn(`Módulo ${moduleId} no tiene lecciones disponibles`);
    }
  }, [router]);

  const handleContinueLearning = useCallback(() => {
    if (nextModule) {
      handleSectionClick(nextModule.id);
    }
  }, [nextModule, handleSectionClick]);

  const handleOpenFlashcards = useCallback(() => {
    setFlashcardSystemOpen(true);
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

  // Hook: recomendaciones inteligentes
  const recommendations = useRecommendations(
    nextModule,
    calculateModuleProgress,
    handleContinueLearning,
    handleSectionClick
  );

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
  }, []);

  return (
    <Container maxWidth="xl" sx={{ py: 4, backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      {/* Header: Breadcrumb, título y descripción */}
      <DashboardHeader isMobile={isMobile} />

      {/* Sección: Continuar Aprendiendo */}
      <ClientOnly fallback={
        <Paper elevation={2} sx={{ p: 3, mb: 4, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Continuar Aprendiendo
          </Typography>
          <Typography variant="body2" sx={{ mb: 2, opacity: 0.9 }}>
            Comienza tu viaje de aprendizaje
          </Typography>
        </Paper>
      }>
        <ContinueLearningSection
          nextModule={nextModule}
          onContinue={handleContinueLearning}
          calculateProgress={calculateModuleProgress}
        />
      </ClientOnly>

      {/* PRIORIDAD MÁXIMA: Acceso Rápido a Lecciones */}
      {/* Sección de acceso directo a todas las lecciones organizadas por nivel */}
      <ClientOnly fallback={
        <Paper elevation={3} sx={{ p: 3, mb: 4, backgroundColor: '#ffffff', border: '1px solid #e3f2fd', borderRadius: 3 }}>
          <Typography variant="h5" sx={{ mb: 3, color: '#1976d2', fontWeight: 700 }}>
            Acceso Rápido a Lecciones
          </Typography>
          <Typography variant="body2" sx={{ color: '#6c757d' }}>
            Cargando módulos disponibles...
          </Typography>
        </Paper>
      }>
        <QuickAccessLessons
          allModules={allModules}
          handleSectionClick={handleSectionClick}
          isMobile={isMobile}
        />
      </ClientOnly>

      {/* PRIORIDAD: Mapa de Progreso - Camino de aprendizaje por niveles */}
      {/* Movido arriba para acceso directo e inmediato a lecciones */}
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

      {/* Estadísticas: Tiempo y lecciones completadas */}
      <ClientOnly fallback={
        <SessionStats timeSpent={0} completedLessonsCount={0} />
      }>
        <SessionStats
          timeSpent={timeSpent}
          completedLessonsCount={completedLessons.size}
        />
      </ClientOnly>

      {/* Dashboard: Estadísticas de aprendizaje */}
      <ClientOnly fallback={
        <Paper elevation={2} sx={{ p: 3, mb: 4, backgroundColor: '#f8f9fa' }}>
          <Typography variant="h5" sx={{ mb: 3, color: '#2c3e50', fontWeight: 600 }}>
            📊 Estadísticas de Aprendizaje
          </Typography>
          <Typography variant="body2" sx={{ color: '#6c757d' }}>
            Cargando estadísticas...
          </Typography>
        </Paper>
      }>
        <Paper
          elevation={3}
          sx={{
            p: 3,
            mb: 4,
            backgroundColor: '#ffffff',
            border: '1px solid #e3f2fd',
            borderRadius: 3
          }}
        >
          <Typography variant="h5" sx={{
            mb: 3,
            color: '#1976d2',
            fontWeight: 700,
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1
          }}>
            <Assessment sx={{ fontSize: 28 }} />
            Dashboard de Aprendizaje
          </Typography>

          <Grid container spacing={3}>
            {/* Sistema de Repetición Espaciada */}
            <Grid item xs={12} md={6} lg={6}>
              <FlashcardDashboard onOpenFlashcards={handleOpenFlashcards} />
            </Grid>

            {/* Recomendaciones Inteligentes */}
            <Grid item xs={12} md={6} lg={6}>
              <RecommendationsPanel recommendations={recommendations} />
            </Grid>
          </Grid>

          {/* Sistema de Racha y Progreso Temporal */}
          <Box sx={{ mt: 3 }}>
            <ProgressOverview dashboardData={dashboardData} />
          </Box>
        </Paper>
      </ClientOnly>

      {/* Panel Informativo: Sobre el módulo */}
      <ModuleInfoPanel />

      {/* Sistema de Flashcards: Modal */}
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
        <Alert onClose={handleCloseAlert} severity="warning" sx={{ width: '100%' }}>
          {alertMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default TeachingModule;
