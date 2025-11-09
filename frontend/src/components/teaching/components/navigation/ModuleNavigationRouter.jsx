/**
 * =============================================================================
 * ModuleNavigationRouter Component for VentyLab
 * =============================================================================
 *
 * Smart router that automatically detects and renders the appropriate navigation
 * type for a module based on its metadata structure (category-based vs standard).
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
  Description as DescriptionIcon,
  Science as ScienceIcon,
  LocalHospital as LocalHospitalIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import ModuleCategoryNav from './ModuleCategoryNav';
import { TeachingModuleProvider } from '../../contexts/TeachingModuleContext';
import LevelStepper from '../curriculum/LevelStepper';
import ModuleInfoPanel from '../curriculum/ModuleInfoPanel';
import { getModulesByLevel } from '../../../../data/curriculum/index.js';

// Category icon mapping
const CATEGORY_ICONS = {
  pathologyProtocols: MedicalServicesIcon,
  protectiveStrategies: ShieldIcon,
  weaningContent: TrendingUpIcon,
  weaning: TrendingUpIcon,
  troubleshootingGuides: BuildIcon,
  troubleshooting: BuildIcon,
  checklistProtocols: ChecklistIcon,
  protocols: ChecklistIcon,
  theory: DescriptionIcon,
  practice: ScienceIcon,
  clinical: LocalHospitalIcon,
  assessment: AssessmentIcon,
};

// Category color mapping
const CATEGORY_COLORS = {
  pathologyProtocols: '#e53935',
  protectiveStrategies: '#1976d2',
  weaningContent: '#2e7d32',
  weaning: '#2e7d32',
  troubleshootingGuides: '#f57c00',
  troubleshooting: '#f57c00',
  checklistProtocols: '#7b1fa2',
  protocols: '#7b1fa2',
  theory: '#424242',
  practice: '#00897b',
  clinical: '#c62828',
  assessment: '#6a1b9a',
};

// Category title mapping
const CATEGORY_TITLES = {
  pathologyProtocols: 'Protocolos por Patología',
  protectiveStrategies: 'Estrategias de Protección Pulmonar',
  weaningContent: 'Destete Ventilatorio',
  weaning: 'Destete Ventilatorio',
  troubleshootingGuides: 'Troubleshooting',
  troubleshooting: 'Troubleshooting',
  checklistProtocols: 'Checklists Clínicos',
  protocols: 'Protocolos Clínicos',
};

const getCategoryIcon = (id) => CATEGORY_ICONS[id] || DescriptionIcon;
const getCategoryColor = (id) => CATEGORY_COLORS[id] || '#424242';
const getCategoryTitle = (key) => CATEGORY_TITLES[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();

/**
 * Prepares categories from module content and metadata
 * @param {Object} moduleContent - Module content object
 * @param {Object} moduleMetadata - Module metadata object
 * @returns {Array|null} Array of category objects or null
 */
const prepareCategories = (moduleContent, moduleMetadata) => {
  if (!moduleMetadata?.categories || !moduleContent) return null;

  const categories = [];

  Object.entries(moduleMetadata.categories).forEach(([categoryKey, categoryMetadata]) => {
    const contentKey = Object.keys(moduleContent).find(
      key => key === categoryKey || key === `${categoryKey}Content` ||
             key === `${categoryKey}Guides` || key === `${categoryKey}Protocols`
    );

    if (!contentKey || !moduleContent[contentKey]) return;

    const lessons = Object.entries(moduleContent[contentKey])
      .filter(([, value]) => value && typeof value === 'object' && value.title)
      .map(([lessonKey, lessonData]) => ({
        id: lessonKey,
        title: lessonData.title || lessonKey,
        estimatedTime: lessonData.estimatedTime || 0,
        type: lessonData.type || 'theory',
      }));

    if (lessons.length > 0) {
      categories.push({
        id: categoryKey,
        title: getCategoryTitle(categoryKey),
        description: categoryMetadata.description || '',
        icon: getCategoryIcon(categoryKey),
        color: getCategoryColor(categoryKey),
        lessons,
      });
    }
  });

  return categories.length > 0 ? categories : null;
};

/**
 * ModuleNavigationRouter - Automatically routes to appropriate navigation type
 *
 * Detects whether a module uses category-based navigation (by checking for
 * categories in metadata) or standard level-based navigation, and renders
 * the appropriate UI component.
 *
 * @param {Object} props - Component props
 * @returns {React.ReactElement} Rendered navigation component
 */
const ModuleNavigationRouter = ({
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
  levels,
  moduleContent,
  moduleMetadata,
}) => {
  // Detect if this module uses category-based navigation
  const categories = useMemo(
    () => prepareCategories(moduleContent, moduleMetadata),
    [moduleContent, moduleMetadata]
  );

  const usesCategoryNavigation = useMemo(
    () => categories !== null && categories.length > 0,
    [categories]
  );

  const handleCategoryChange = useCallback((categoryId) => {
    setCategory(categoryId);
    // Usar handleSectionClick centralizado para preservar moduleId y lessonId
    // al cambiar de categoría
    const currentLessonId = lessonIdFromQuery || activeLessonId;
    if (moduleIdFromQuery) {
      handleSectionClick(moduleIdFromQuery, currentLessonId || null, categoryId);
    }
  }, [setCategory, handleSectionClick, moduleIdFromQuery, lessonIdFromQuery, activeLessonId]);

  const handleLessonClick = useCallback((lessonId, categoryId) => {
    // Usar handleSectionClick centralizado para navegación
    if (moduleIdFromQuery) {
      handleSectionClick(moduleIdFromQuery, lessonId, categoryId || null);
    }
    setLesson(lessonId, categoryId);
  }, [handleSectionClick, setLesson, moduleIdFromQuery]);

  useEffect(() => {
    if (usesCategoryNavigation && moduleIdFromQuery && moduleContent) {
      setModule(moduleIdFromQuery, moduleContent, null, null, categories);
    }
  }, [usesCategoryNavigation, moduleIdFromQuery, moduleContent, categories, setModule]);
  if (usesCategoryNavigation) {
    return (
      <TeachingModuleProvider>
        <Box>
          {moduleMetadata?.title && (
            <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
              {moduleMetadata.title}
            </Typography>
          )}
          {moduleMetadata?.description && (
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
              {moduleMetadata.description}
            </Typography>
          )}
          <ModuleCategoryNav
            moduleId={moduleIdFromQuery}
            categories={categories}
            currentCategory={activeCategoryId || router.query.category}
            currentLesson={lessonIdFromQuery || activeLessonId}
            onCategoryChange={handleCategoryChange}
            onLessonClick={handleLessonClick}
          />
        </Box>
      </TeachingModuleProvider>
    );
  }

  return (
    <Box>
      <LevelStepper
        levels={levels}
        levelProgress={levelProgress}
        getModulesByLevel={getModulesByLevel}
        calculateModuleProgress={calculateModuleProgress}
        isModuleAvailable={isModuleAvailable}
        getModuleStatus={getModuleStatus}
        getTooltipMessage={getTooltipMessage}
        onSectionClick={handleSectionClick}
        favoriteModules={favoriteModules}
        onToggleFavorite={toggleFavorite}
        renderMode="lessons" // Usar modo 'lessons' para mostrar cards por lección en niveles 1, 2, 3
      />
      <ModuleInfoPanel />
    </Box>
  );
};

ModuleNavigationRouter.propTypes = {
  moduleIdFromQuery: PropTypes.string,
  lessonIdFromQuery: PropTypes.string,
  router: PropTypes.shape({
    pathname: PropTypes.string.isRequired,
    query: PropTypes.object.isRequired,
    push: PropTypes.func.isRequired,
  }).isRequired,
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
  levels: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    color: PropTypes.string.isRequired,
    emoji: PropTypes.string,
  })).isRequired,
  moduleContent: PropTypes.object,
  moduleMetadata: PropTypes.shape({
    id: PropTypes.string,
    title: PropTypes.string,
    description: PropTypes.string,
    categories: PropTypes.object,
  }),
};

export default ModuleNavigationRouter;
