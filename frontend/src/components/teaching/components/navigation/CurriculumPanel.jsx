/**
 * =============================================================================
 * CurriculumPanel Component for VentyLab
 * =============================================================================
 * 
 * Component that renders the curriculum view, with special handling for
 * Module 03 (Configuration and Management) which has category-based navigation.
 * 
 * @component
 */

import React, { useMemo, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Box, Typography } from '@mui/material';
import {
  MedicalServices as MedicalServicesIcon,
  Shield as ShieldIcon,
  TrendingUp as TrendingUpIcon,
  Build as BuildIcon,
  ChecklistRtl as ChecklistIcon,
} from '@mui/icons-material';
import module03Content, { metadata as module03Metadata } from '../../../../data/lessons/module-03-configuration';
import ModuleCategoryNav from './ModuleCategoryNav';
import { TeachingModuleProvider } from '../../contexts/TeachingModuleContext';
import useTeachingModule from '../../../../hooks/useTeachingModule';
import LevelStepper from '../curriculum/LevelStepper';
import ModuleInfoPanel from '../curriculum/ModuleInfoPanel';

/**
 * CurriculumPanel Component
 */
const CurriculumPanel = ({
  moduleIdFromQuery,
  lessonIdFromQuery,
  router,
  activeCategoryId,
  activeLessonId,
  setModule,
  setCategory,
  setLesson,
  handleSectionClick,
  levelProgress,
  calculateModuleProgress,
  isModuleAvailable,
  getModuleStatus,
  getTooltipMessage,
  favoriteModules,
  toggleFavorite,
}) => {
  // Check if we're viewing module-03-configuration
  const isModule03 = useMemo(() => {
    return moduleIdFromQuery === 'module-03-configuration' || 
           (!moduleIdFromQuery && router.query.module === 'module-03-configuration');
  }, [moduleIdFromQuery, router.query.module]);

  // Prepare categories for Module 03
  const module03Categories = useMemo(() => {
    if (!isModule03 || !module03Metadata?.categories) return null;
    
    const categoryConfig = {
      pathologyProtocols: {
        id: 'pathologyProtocols',
        title: 'Protocolos por Patología',
        description: 'Protocolos específicos de ventilación mecánica para diferentes patologías',
        icon: MedicalServicesIcon,
        color: '#e53935',
        lessons: Object.entries(module03Content.pathologyProtocols || {}).map(([key, lesson]) => ({
          id: key,
          title: lesson.title || key,
          estimatedTime: lesson.estimatedTime || 0,
          type: 'protocol',
        })),
      },
      protectiveStrategies: {
        id: 'protectiveStrategies',
        title: 'Estrategias de Protección Pulmonar',
        description: 'Estrategias de protección pulmonar para prevenir VILI',
        icon: ShieldIcon,
        color: '#1976d2',
        lessons: Object.entries(module03Content.protectiveStrategies || {}).map(([key, lesson]) => ({
          id: key,
          title: lesson.title || key,
          estimatedTime: lesson.estimatedTime || 0,
          type: 'theory',
        })),
      },
      weaningContent: {
        id: 'weaningContent',
        title: 'Destete Ventilatorio',
        description: 'Protocolos y guías para destete ventilatorio',
        icon: TrendingUpIcon,
        color: '#2e7d32',
        lessons: Object.entries(module03Content.weaningContent || {}).map(([key, lesson]) => ({
          id: key,
          title: lesson.title || key,
          estimatedTime: lesson.estimatedTime || 0,
          type: 'protocol',
        })),
      },
      troubleshootingGuides: {
        id: 'troubleshootingGuides',
        title: 'Troubleshooting',
        description: 'Guías prácticas para resolver problemas comunes',
        icon: BuildIcon,
        color: '#f57c00',
        lessons: Object.entries(module03Content.troubleshootingGuides || {}).map(([key, lesson]) => ({
          id: key,
          title: lesson.title || key,
          estimatedTime: lesson.estimatedTime || 0,
          type: 'case',
        })),
      },
      checklistProtocols: {
        id: 'checklistProtocols',
        title: 'Checklists Clínicos',
        description: 'Checklists y protocolos rápidos de referencia',
        icon: ChecklistIcon,
        color: '#7b1fa2',
        lessons: Object.entries(module03Content.checklistProtocols || {}).map(([key, lesson]) => ({
          id: key,
          title: lesson.title || key,
          estimatedTime: lesson.estimatedTime || 0,
          type: 'checklist',
        })),
      },
    };
    
    return Object.values(categoryConfig).filter(cat => cat.lessons.length > 0);
  }, [isModule03]);

  // Handle category change for Module 03
  const handleModule03CategoryChange = useCallback((categoryId) => {
    setCategory(categoryId);
    // Update URL if needed
    router.push({
      pathname: router.pathname,
      query: {
        ...router.query,
        category: categoryId,
      },
    }, undefined, { shallow: true });
  }, [router, setCategory]);

  // Handle lesson click for Module 03
  const handleModule03LessonClick = useCallback((lessonId, categoryId) => {
    handleSectionClick('module-03-configuration', lessonId);
    setLesson(lessonId, categoryId);
  }, [handleSectionClick, setLesson]);

  // Initialize module 03 context when module is selected
  useEffect(() => {
    if (isModule03 && module03Categories && module03Categories.length > 0) {
      setModule('module-03-configuration', module03Content, null, null, module03Categories);
    }
  }, [isModule03, module03Categories, setModule]);

  if (isModule03 && module03Categories && module03Categories.length > 0) {
    return (
      <TeachingModuleProvider>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
            {module03Metadata?.title || 'Configuración y Manejo del Ventilador Mecánico'}
          </Typography>
          
          {module03Metadata?.description && (
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
              {module03Metadata.description}
            </Typography>
          )}

          <ModuleCategoryNav
            moduleId="module-03-configuration"
            categories={module03Categories}
            currentCategory={activeCategoryId || router.query.category}
            currentLesson={lessonIdFromQuery || activeLessonId}
            onCategoryChange={handleModule03CategoryChange}
            onLessonClick={handleModule03LessonClick}
          />
        </Box>
      </TeachingModuleProvider>
    );
  }

  // Default navigation for other modules
  return (
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
  );
};

CurriculumPanel.propTypes = {
  moduleIdFromQuery: PropTypes.string,
  lessonIdFromQuery: PropTypes.string,
  router: PropTypes.object.isRequired,
  activeCategoryId: PropTypes.string,
  activeLessonId: PropTypes.string,
  setModule: PropTypes.func.isRequired,
  setCategory: PropTypes.func.isRequired,
  setLesson: PropTypes.func.isRequired,
  handleSectionClick: PropTypes.func.isRequired,
  levelProgress: PropTypes.object.isRequired,
  calculateModuleProgress: PropTypes.func.isRequired,
  isModuleAvailable: PropTypes.func.isRequired,
  getModuleStatus: PropTypes.func.isRequired,
  getTooltipMessage: PropTypes.func.isRequired,
  favoriteModules: PropTypes.instanceOf(Set).isRequired,
  toggleFavorite: PropTypes.func.isRequired,
};

export default CurriculumPanel;

