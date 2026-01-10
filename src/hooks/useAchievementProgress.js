/**
 * =============================================================================
 * Achievement Progress Hook
 * =============================================================================
 * Custom hook for tracking and calculating progress toward specific achievements
 * Handles progressive achievements that require completing X amount of something
 * (e.g., LESSONS_10, STREAK_7_DAYS, FIVE_PERFECT_QUIZZES)
 * =============================================================================
 */

import { useMemo } from 'react';
import useAchievements from './useAchievements';

/**
 * Achievement progression mapping
 * Defines target values and next milestones for progressive achievements
 */
const ACHIEVEMENT_TARGETS = {
  // Lesson completion milestones
  LESSONS_10: { target: 10, nextMilestone: 'LESSONS_25' },
  LESSONS_25: { target: 25, nextMilestone: 'LESSONS_50' },
  LESSONS_50: { target: 50, nextMilestone: null },
  
  // Streak achievements
  STREAK_3_DAYS: { target: 3, nextMilestone: 'STREAK_7_DAYS' },
  STREAK_7_DAYS: { target: 7, nextMilestone: 'STREAK_30_DAYS' },
  STREAK_30_DAYS: { target: 30, nextMilestone: null },
  
  // Quiz achievements
  PERFECT_QUIZ: { target: 1, nextMilestone: 'FIVE_PERFECT_QUIZZES' },
  FIVE_PERFECT_QUIZZES: { target: 5, nextMilestone: null },
  
  // Exploration
  EXPLORING: { target: 5, nextMilestone: null },
  
  // Review
  REVIEWING_PRO: { target: 10, nextMilestone: null },
  
  // Search usage
  CURIOUS_SEARCHER: { target: 20, nextMilestone: null },
  
  // Module completion by difficulty
  ALL_BEGINNER: { target: null, nextMilestone: 'ALL_INTERMEDIATE', isDynamic: true },
  ALL_INTERMEDIATE: { target: null, nextMilestone: 'ALL_ADVANCED', isDynamic: true },
  ALL_ADVANCED: { target: null, nextMilestone: 'COMPLETE_KNOWLEDGE', isDynamic: true },
  COMPLETE_KNOWLEDGE: { target: null, nextMilestone: null, isDynamic: true },
};

/**
 * Custom hook for tracking progress toward a specific achievement
 * 
 * @param {string} achievementType - Type of achievement to track
 * @returns {Object} Progress information
 * @returns {number} progress.current - Current progress value
 * @returns {number} progress.target - Target value to complete achievement
 * @returns {number} progress.percentage - Progress percentage (0-100)
 * @returns {boolean} progress.isComplete - Whether achievement is unlocked
 * @returns {string|null} progress.nextMilestone - Next achievement in progression
 * @returns {number} progress.remaining - Items remaining to complete
 * @returns {boolean} progress.isProgressive - Whether this achievement has progression
 * @returns {Object|null} progress.achievementData - Full achievement object from API
 * @returns {boolean} progress.loading - Loading state
 * @returns {string|null} progress.error - Error message if any
 * 
 * @example
 * // Track progress toward completing 10 lessons
 * function LessonProgressBar() {
 *   const progress = useAchievementProgress('LESSONS_10');
 *   
 *   return (
 *     <div>
 *       <ProgressBar 
 *         value={progress.percentage} 
 *         label={`${progress.current} / ${progress.target} lecciones`}
 *       />
 *       {progress.isComplete && <Badge>Completado! ✓</Badge>}
 *       {progress.nextMilestone && (
 *         <p>Siguiente: {progress.nextMilestone}</p>
 *       )}
 *     </div>
 *   );
 * }
 * 
 * @example
 * // Track streak progress
 * function StreakIndicator() {
 *   const streakProgress = useAchievementProgress('STREAK_7_DAYS');
 *   
 *   return (
 *     <div>
 *       <h3>Racha Actual: {streakProgress.current} días</h3>
 *       <p>{streakProgress.remaining} días más para el logro!</p>
 *       {streakProgress.percentage > 50 && (
 *         <p>¡Vas por buen camino! 🔥</p>
 *       )}
 *     </div>
 *   );
 * }
 */
export default function useAchievementProgress(achievementType) {
  const { allAchievements, achievements, loading, error } = useAchievements();

  /**
   * Calculate progress information
   * Memoized to prevent unnecessary recalculations
   */
  const progress = useMemo(() => {
    // Handle loading and error states
    if (loading) {
      return {
        current: 0,
        target: 0,
        percentage: 0,
        isComplete: false,
        nextMilestone: null,
        remaining: 0,
        isProgressive: false,
        achievementData: null,
        loading: true,
        error: null
      };
    }

    if (error) {
      return {
        current: 0,
        target: 0,
        percentage: 0,
        isComplete: false,
        nextMilestone: null,
        remaining: 0,
        isProgressive: false,
        achievementData: null,
        loading: false,
        error
      };
    }

    // Find the achievement in allAchievements (includes progress data from backend)
    const achievementData = allAchievements.find(a => a.type === achievementType);

    // Check if achievement is already unlocked
    const unlockedAchievement = achievements.find(a => a.type === achievementType);
    const isComplete = !!unlockedAchievement;

    // Get target information from configuration
    const targetConfig = ACHIEVEMENT_TARGETS[achievementType];
    const isProgressive = !!targetConfig;

    // If no achievement data from backend, return defaults
    if (!achievementData) {
      return {
        current: 0,
        target: targetConfig?.target || 0,
        percentage: 0,
        isComplete,
        nextMilestone: targetConfig?.nextMilestone || null,
        remaining: targetConfig?.target || 0,
        isProgressive,
        achievementData: null,
        loading: false,
        error: null
      };
    }

    // Extract progress data from backend response
    const progressData = achievementData.progress || {};
    const current = progressData.current || 0;
    const target = progressData.target || targetConfig?.target || 0;
    const percentage = progressData.percentage || 0;

    // Calculate remaining items
    const remaining = Math.max(0, target - current);

    // Determine next milestone in progression
    let nextMilestone = targetConfig?.nextMilestone || null;

    // If current achievement is complete, next milestone is relevant
    // If not complete, there's no next milestone yet
    if (!isComplete) {
      nextMilestone = null;
    }

    return {
      current,
      target,
      percentage: Math.min(100, percentage), // Cap at 100%
      isComplete,
      nextMilestone,
      remaining,
      isProgressive,
      achievementData,
      loading: false,
      error: null
    };
  }, [achievementType, allAchievements, achievements, loading, error]);

  return progress;
}

/**
 * Hook to track multiple achievements at once
 * Useful for displaying progress across multiple related achievements
 * 
 * @param {Array<string>} achievementTypes - Array of achievement types to track
 * @returns {Object} Map of achievement types to their progress
 * 
 * @example
 * function LessonMilestonesPanel() {
 *   const progressMap = useMultipleAchievementProgress([
 *     'LESSONS_10',
 *     'LESSONS_25',
 *     'LESSONS_50'
 *   ]);
 *   
 *   return (
 *     <div>
 *       {Object.entries(progressMap).map(([type, progress]) => (
 *         <MilestoneCard key={type} progress={progress} />
 *       ))}
 *     </div>
 *   );
 * }
 */
export function useMultipleAchievementProgress(achievementTypes) {
  const { allAchievements, achievements, loading, error } = useAchievements();

  return useMemo(() => {
    const progressMap = {};

    achievementTypes.forEach(type => {
      const achievementData = allAchievements.find(a => a.type === type);
      const unlockedAchievement = achievements.find(a => a.type === type);
      const isComplete = !!unlockedAchievement;
      const targetConfig = ACHIEVEMENT_TARGETS[type];

      const progressData = achievementData?.progress || {};
      const current = progressData.current || 0;
      const target = progressData.target || targetConfig?.target || 0;
      const percentage = progressData.percentage || 0;
      const remaining = Math.max(0, target - current);

      progressMap[type] = {
        current,
        target,
        percentage: Math.min(100, percentage),
        isComplete,
        nextMilestone: isComplete ? targetConfig?.nextMilestone : null,
        remaining,
        isProgressive: !!targetConfig,
        achievementData,
        loading,
        error
      };
    });

    return progressMap;
  }, [achievementTypes, allAchievements, achievements, loading, error]);
}

/**
 * Hook to get progress for a progression chain
 * Returns progress for an entire chain of related achievements
 * 
 * @param {string} startAchievementType - First achievement in the chain
 * @returns {Array} Array of progress objects for the entire chain
 * 
 * @example
 * // Get progress for entire lesson completion chain
 * function LessonProgressionChain() {
 *   const chain = useAchievementChain('LESSONS_10');
 *   // Returns progress for: LESSONS_10 -> LESSONS_25 -> LESSONS_50
 *   
 *   return (
 *     <div>
 *       {chain.map(progress => (
 *         <ChainLink key={progress.achievementData?.type} progress={progress} />
 *       ))}
 *     </div>
 *   );
 * }
 */
export function useAchievementChain(startAchievementType) {
  const { allAchievements, achievements, loading, error } = useAchievements();

  return useMemo(() => {
    const chain = [];
    let currentType = startAchievementType;

    // Build the chain by following nextMilestone links
    while (currentType) {
      const achievementData = allAchievements.find(a => a.type === currentType);
      const unlockedAchievement = achievements.find(a => a.type === currentType);
      const isComplete = !!unlockedAchievement;
      const targetConfig = ACHIEVEMENT_TARGETS[currentType];

      const progressData = achievementData?.progress || {};
      const current = progressData.current || 0;
      const target = progressData.target || targetConfig?.target || 0;
      const percentage = progressData.percentage || 0;
      const remaining = Math.max(0, target - current);

      chain.push({
        type: currentType,
        current,
        target,
        percentage: Math.min(100, percentage),
        isComplete,
        nextMilestone: targetConfig?.nextMilestone,
        remaining,
        isProgressive: !!targetConfig,
        achievementData,
        loading,
        error
      });

      // Move to next in chain
      currentType = targetConfig?.nextMilestone;
    }

    return chain;
  }, [startAchievementType, allAchievements, achievements, loading, error]);
}

/**
 * Hook to get the closest incomplete achievement in a progression
 * Useful for showing the user what they should focus on next
 * 
 * @param {string} startAchievementType - Start of the progression chain
 * @returns {Object|null} Progress for the next incomplete achievement
 * 
 * @example
 * function NextGoalCard() {
 *   const nextGoal = useNextAchievementGoal('LESSONS_10');
 *   
 *   if (!nextGoal) return <p>¡Has completado todos los hitos!</p>;
 *   
 *   return (
 *     <Card>
 *       <h3>Próximo Objetivo</h3>
 *       <p>{nextGoal.achievementData?.title}</p>
 *       <ProgressBar value={nextGoal.percentage} />
 *       <p>{nextGoal.remaining} más para desbloquear</p>
 *     </Card>
 *   );
 * }
 */
export function useNextAchievementGoal(startAchievementType) {
  const chain = useAchievementChain(startAchievementType);

  return useMemo(() => {
    // Find first incomplete achievement in chain
    return chain.find(progress => !progress.isComplete) || null;
  }, [chain]);
}

