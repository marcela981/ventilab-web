/**
 * =============================================================================
 * Module03CurriculumView Component for VentyLab
 * =============================================================================
 * 
 * Component that renders the curriculum view for Module 03 (Configuration and Management)
 * with category-based navigation. This component handles the complex structure
 * of Module 03 which has subcategories.
 * 
 * @component
 */

import React, { useMemo, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Box, Typography } from '@mui/material';
import {
  MedicalServices as MedicalServicesIcon,
  School as SchoolIcon,
} from '@mui/icons-material';
import module03Content, { metadata as module03Metadata } from '@/features/ensenanza/shared/data/lessons/mecanica/level03-avanzado';
import ModuleCategoryNav from '@/features/ensenanza/shared/components/navigation/ModuleCategoryNav';
import { TeachingModuleProvider } from '@/features/ensenanza/shared/contexts/TeachingModuleContext';
import useTeachingModule from '@/features/ensenanza/shared/hooks/useTeachingModule';

/**
 * Module03CurriculumView Component
 */
const Module03CurriculumView = ({
  moduleIdFromQuery,
  lessonIdFromQuery,
  router,
  activeCategoryId,
  activeLessonId,
  setModule,
  setCategory,
  setLesson,
  handleSectionClick,
}) => {
  // Check if we're viewing module-03-configuration
  const isModule03 = useMemo(() => {
    return moduleIdFromQuery === 'module-03-configuration' || 
           (!moduleIdFromQuery && router.query.module === 'module-03-configuration');
  }, [moduleIdFromQuery, router.query.module]);

  // Prepare categories for Module 03 (avanzado — nueva estructura)
  const module03Categories = useMemo(() => {
    if (!isModule03) return null;

    const categoryConfig = {
      coreModules: {
        id: 'coreModules',
        title: 'Módulos Avanzados',
        description: 'Ventilación protectora, monitorización, asincronías y destete complejo',
        icon: SchoolIcon,
        color: '#1976d2',
        lessons: Object.entries(module03Content.coreModules || {}).map(([key, lesson]) => ({
          id: lesson.id || key,
          title: lesson.title || key,
          estimatedTime: lesson.estimatedTime || 0,
          type: 'theory',
        })),
      },
      pathologyModules: {
        id: 'pathologyModules',
        title: 'Enseñanza especial — Patologías',
        description: 'Protocolos por patología: obesidad, EPOC/asma, SDRA y recuperación',
        icon: MedicalServicesIcon,
        color: '#e53935',
        lessons: Object.entries(module03Content.pathologyModules || {}).map(([key, lesson]) => ({
          id: lesson.id || key,
          title: lesson.title || key,
          estimatedTime: lesson.estimatedTime || 0,
          type: 'protocol',
        })),
      },
    };

    return Object.values(categoryConfig).filter(cat => cat.lessons.length > 0);
  }, [isModule03]);

  // Handle category change for Module 03
  // Preserva moduleId y lessonId al cambiar de categoría
  const handleModule03CategoryChange = useCallback((categoryId) => {
    setCategory(categoryId);
    // Usar handleSectionClick centralizado para preservar moduleId y lessonId
    // Si hay un lessonId activo, mantenerlo; si no, solo cambiar la categoría
    const currentLessonId = lessonIdFromQuery || activeLessonId;
    handleSectionClick('module-03-configuration', currentLessonId || null, categoryId);
  }, [setCategory, handleSectionClick, lessonIdFromQuery, activeLessonId]);

  // Handle lesson click for Module 03
  // Usa handleSectionClick centralizado para navegación
  const handleModule03LessonClick = useCallback((lessonId, categoryId) => {
    // Usar handleSectionClick centralizado que preserva moduleId y maneja category
    handleSectionClick('module-03-configuration', lessonId, categoryId);
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
    );
  }

  return null;
};

Module03CurriculumView.propTypes = {
  moduleIdFromQuery: PropTypes.string,
  lessonIdFromQuery: PropTypes.string,
  router: PropTypes.object.isRequired,
  activeCategoryId: PropTypes.string,
  activeLessonId: PropTypes.string,
  setModule: PropTypes.func.isRequired,
  setCategory: PropTypes.func.isRequired,
  setLesson: PropTypes.func.isRequired,
  handleSectionClick: PropTypes.func.isRequired,
};

export default Module03CurriculumView;

