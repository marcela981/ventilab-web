/**
 * =============================================================================
 * CurriculumPanel Component for VentyLab
 * =============================================================================
 *
 * Main curriculum view component that delegates navigation rendering to
 * ModuleNavigationRouter. This component is now generic and doesn't contain
 * module-specific logic.
 *
 * @component
 */

import React, { useMemo, useEffect } from 'react';
import PropTypes from 'prop-types';
import ModuleNavigationRouter from '../../../../../components/teaching/components/navigation/ModuleNavigationRouter';
import { debug } from '@/utils/debug';
import { useLearningProgress } from '@/contexts/LearningProgressContext';

// Static imports for module data (required for Next.js bundler)
import module03Content, { metadata as module03Metadata } from '@/data/lessons/module-03-configuration';

/**
 * Gets module content and metadata based on moduleId
 * @param {string} moduleId - The module identifier
 * @returns {Object} Object containing moduleContent and moduleMetadata
 */
const loadModuleData = (moduleId) => {
  if (!moduleId) return { moduleContent: null, moduleMetadata: null };

  // Static module mapping (bundler-compatible)
  switch (moduleId) {
    case 'module-03-configuration':
      return {
        moduleContent: module03Content,
        moduleMetadata: module03Metadata,
      };
    // Add more modules here as they implement category-based navigation
    default:
      return { moduleContent: null, moduleMetadata: null };
  }
};

/**
 * CurriculumPanel Component
 *
 * Displays the curriculum and delegates to ModuleNavigationRouter for rendering
 * the appropriate navigation type (category-based or standard level-based).
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
  levels,
}) => {
  const { snapshot, isLoadingSnapshot, snapshotError } = useLearningProgress();
  
  useEffect(() => {
    const g = debug.group('CurriculumPanel render');
    g.info('state', {
      loading: isLoadingSnapshot, error: !!snapshotError,
      source: snapshot?.source,
      completed: snapshot?.overview?.completedLessons,
      total: snapshot?.overview?.totalLessons
    });
    g.end();
  }, [isLoadingSnapshot, snapshotError, snapshot]);

  // Load module data if a specific module is selected
  const { moduleContent, moduleMetadata } = useMemo(
    () => loadModuleData(moduleIdFromQuery || router.query.module),
    [moduleIdFromQuery, router.query.module]
  );

  return (
    <ModuleNavigationRouter
      moduleIdFromQuery={moduleIdFromQuery || router.query.module}
      lessonIdFromQuery={lessonIdFromQuery}
      router={router}
      activeCategoryId={activeCategoryId}
      activeLessonId={activeLessonId}
      setModule={setModule}
      setCategory={setCategory}
      setLesson={setLesson}
      handleSectionClick={handleSectionClick}
      levelProgress={levelProgress}
      calculateModuleProgress={calculateModuleProgress}
      isModuleAvailable={isModuleAvailable}
      getModuleStatus={getModuleStatus}
      getTooltipMessage={getTooltipMessage}
      favoriteModules={favoriteModules}
      toggleFavorite={toggleFavorite}
      levels={levels}
      moduleContent={moduleContent}
      moduleMetadata={moduleMetadata}
    />
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
  levels: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    color: PropTypes.string.isRequired,
    emoji: PropTypes.string,
  })).isRequired,
};

export default CurriculumPanel;

