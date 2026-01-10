/**
 * =============================================================================
 * useTeachingModule Hook for VentyLab
 * =============================================================================
 * 
 * Custom hook that wraps the TeachingModuleContext and provides a clean
 * interface for components to access teaching module state and actions.
 * 
 * This hook re-exports the context hook for consistency with other hooks
 * in the project and provides a single import point.
 * 
 * @module useTeachingModule
 * 
 * @returns {Object} Teaching module context value
 * @returns {string|null} activeModuleId - Currently active module ID
 * @returns {string|null} activeCategoryId - Currently active category ID
 * @returns {string|null} activeLessonId - Currently active lesson ID
 * @returns {Object|null} moduleData - Full module data object
 * @returns {Object} lessonProgress - Map of lesson progress
 * @returns {Array} categories - Array of category objects
 * @returns {Function} setModule - Set active module
 * @returns {Function} setCategory - Set active category
 * @returns {Function} setLesson - Set active lesson
 * @returns {Function} markLessonComplete - Mark lesson as completed
 * @returns {Function} resetProgress - Reset progress
 * @returns {Function} setModuleData - Set module data
 * @returns {Function} isLessonCompleted - Check if lesson is completed
 * @returns {Function} getLessonProgress - Get progress for a lesson
 * @returns {Function} getCategoryProgress - Get progress for a category
 * 
 * @example
 * ```jsx
 * import useTeachingModule from './hooks/useTeachingModule';
 * 
 * function MyComponent() {
 *   const {
 *     activeModuleId,
 *     activeCategoryId,
 *     activeLessonId,
 *     setModule,
 *     setCategory,
 *     setLesson,
 *     isLessonCompleted,
 *   } = useTeachingModule();
 * 
 *   return (
 *     <div>
 *       <p>Module: {activeModuleId}</p>
 *       <p>Category: {activeCategoryId}</p>
 *       <p>Lesson: {activeLessonId}</p>
 *     </div>
 *   );
 * }
 * ```
 * 
 * @example
 * ```jsx
 * // Navigate to a module and lesson
 * const { setModule, setLesson } = useTeachingModule();
 * 
 * const handleClick = () => {
 *   setModule('module-03-configuration', moduleData, 'pathologyProtocols');
 *   setLesson('sdra-protocol', 'pathologyProtocols');
 * };
 * ```
 */

import { useTeachingModule as useTeachingModuleContext } from '../components/teaching/contexts/TeachingModuleContext';

/**
 * useTeachingModule Hook
 * Re-exports the context hook for consistency
 */
const useTeachingModule = () => {
  return useTeachingModuleContext();
};

export default useTeachingModule;

