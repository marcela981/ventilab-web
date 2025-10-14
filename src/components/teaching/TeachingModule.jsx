"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Paper,
  Typography,
  Grid,
  Box
} from '@mui/material';
import {
  Assessment
} from '@mui/icons-material';

// Hooks personalizados
import { useLearningProgress } from '../../contexts/LearningProgressContext';
import useModuleProgress from './hooks/useModuleProgress';
import useModuleAvailability from './hooks/useModuleAvailability';
import useRecommendations from './hooks/useRecommendations';

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
  const handleSectionClick = useCallback((sectionId) => {
    const module = require('../../data/curriculumData').curriculumData.modules[sectionId];
    if (module?.lessons?.length > 0) {
      markLessonComplete(`${sectionId}-${module.lessons[0].id}`);
    }
    updateTimeSpent(1);
    console.log(`Navegando a la sección: ${sectionId}`);
  }, [markLessonComplete, updateTimeSpent]);

  const handleContinueLearning = useCallback(() => {
    if (nextModule) {
      handleSectionClick(nextModule.id);
    }
  }, [nextModule, handleSectionClick]);

  const handleOpenFlashcards = useCallback(() => {
    setFlashcardSystemOpen(true);
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

      {/* Estadísticas: Tiempo y lecciones completadas */}
      <ClientOnly fallback={
        <SessionStats timeSpent={0} completedLessonsCount={0} />
      }>
        <SessionStats
          timeSpent={timeSpent}
          completedLessonsCount={completedLessons.size}
        />
      </ClientOnly>

      {/* Mapa de Progreso: Camino de aprendizaje por niveles */}
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

      {/* Sistema de Flashcards: Modal */}
      <FlashcardSystem
        isOpen={flashcardSystemOpen}
        onClose={() => setFlashcardSystemOpen(false)}
        autoGenerateFromLesson={false}
      />
    </Container>
  );
};

export default TeachingModule;
