/**
 * =============================================================================
 * Achievement Context
 * =============================================================================
 * Global context for managing achievement notifications throughout the app.
 * Provides a centralized way to show achievement unlock notifications
 * from any component without prop drilling.
 *
 * Features:
 * - Global notification queue management
 * - Automatic notification display
 * - One notification at a time to avoid overwhelming user
 * - Easy integration from any component
 * - Confetti and sound effects
 * - Auto-dismiss functionality
 *
 * =============================================================================
 */

import React, { createContext, useContext, useMemo } from 'react';
import PropTypes from 'prop-types';
import useAchievementNotifications from '../hooks/useAchievementNotifications';
import AchievementNotification from '../components/gamification/AchievementNotification';

/**
 * Achievement Context
 * Provides achievement notification functionality globally
 */
const AchievementContext = createContext(null);

/**
 * Custom hook to access achievement context
 *
 * @throws {Error} If used outside of AchievementProvider
 * @returns {Object} Achievement notification functions
 *
 * @example
 * function MyComponent() {
 *   const { showAchievementNotification } = useAchievementContext();
 *
 *   const handleLessonComplete = (newAchievements) => {
 *     newAchievements.forEach(achievement => {
 *       showAchievementNotification(achievement);
 *     });
 *   };
 * }
 */
export function useAchievementContext() {
  const context = useContext(AchievementContext);

  if (!context) {
    throw new Error(
      'useAchievementContext must be used within an AchievementProvider. ' +
      'Make sure your component is wrapped in <AchievementProvider>.'
    );
  }

  return context;
}

/**
 * Achievement Provider Component
 *
 * Wraps the app and provides achievement notification functionality
 * to all child components through context.
 *
 * @component
 * @example
 * // In _app.js or Layout
 * <AchievementProvider>
 *   <YourApp />
 * </AchievementProvider>
 *
 * // In any child component
 * const { showAchievementNotification } = useAchievementContext();
 * showAchievementNotification(achievement);
 */
export function AchievementProvider({ children }) {
  // Use the notification hook to manage queue
  const {
    showAchievementNotification,
    currentNotification,
    dismissNotification,
    hasNotifications,
    queueLength,
    clearQueue,
  } = useAchievementNotifications({
    delay: 5000, // 5 seconds per notification
    autoDismiss: true,
  });

  // Memoize context value to prevent unnecessary rerenders
  const contextValue = useMemo(
    () => ({
      // Primary function - show a new achievement notification
      showAchievementNotification,

      // Queue management
      dismissNotification,
      clearQueue,

      // State information (useful for debugging or UI)
      hasNotifications,
      queueLength,
      isShowing: currentNotification !== null,
    }),
    [
      showAchievementNotification,
      dismissNotification,
      clearQueue,
      hasNotifications,
      queueLength,
      currentNotification,
    ]
  );

  return (
    <AchievementContext.Provider value={contextValue}>
      {/* App content */}
      {children}

      {/* Global achievement notification display */}
      <AchievementNotification
        achievement={currentNotification}
        show={currentNotification !== null}
        onDismiss={dismissNotification}
      />
    </AchievementContext.Provider>
  );
}

AchievementProvider.propTypes = {
  /**
   * Child components that will have access to achievement notifications
   */
  children: PropTypes.node.isRequired,
};

/**
 * HOC (Higher Order Component) to inject achievement notification functionality
 * into a component as props. Alternative to using the hook.
 *
 * @param {React.Component} Component - Component to enhance
 * @returns {React.Component} Enhanced component with achievement props
 *
 * @example
 * function LessonComponent({ showAchievementNotification }) {
 *   const handleComplete = () => {
 *     showAchievementNotification(achievement);
 *   };
 * }
 *
 * export default withAchievements(LessonComponent);
 */
export function withAchievements(Component) {
  function ComponentWithAchievements(props) {
    const achievementContext = useAchievementContext();

    return <Component {...props} {...achievementContext} />;
  }

  ComponentWithAchievements.displayName = `withAchievements(${
    Component.displayName || Component.name || 'Component'
  })`;

  return ComponentWithAchievements;
}

/**
 * =============================================================================
 * USAGE EXAMPLES
 * =============================================================================
 *
 * 1. SETUP IN LAYOUT OR _APP:
 *
 * import { AchievementProvider } from '../contexts/AchievementContext';
 *
 * function MyApp({ Component, pageProps }) {
 *   return (
 *     <AchievementProvider>
 *       <Layout>
 *         <Component {...pageProps} />
 *       </Layout>
 *     </AchievementProvider>
 *   );
 * }
 *
 * 2. USE IN ANY COMPONENT WITH HOOK:
 *
 * import { useAchievementContext } from '../contexts/AchievementContext';
 *
 * function LessonViewer() {
 *   const { showAchievementNotification } = useAchievementContext();
 *
 *   const handleLessonComplete = async () => {
 *     const response = await fetch('/api/lessons/complete', {
 *       method: 'POST',
 *       body: JSON.stringify({ lessonId })
 *     });
 *
 *     const { newAchievements } = await response.json();
 *
 *     // Show each new achievement
 *     newAchievements.forEach(achievement => {
 *       showAchievementNotification(achievement);
 *     });
 *   };
 * }
 *
 * 3. USE WITH HOC (Alternative approach):
 *
 * import { withAchievements } from '../contexts/AchievementContext';
 *
 * function QuizComponent({ showAchievementNotification }) {
 *   const handleQuizComplete = (achievement) => {
 *     showAchievementNotification(achievement);
 *   };
 * }
 *
 * export default withAchievements(QuizComponent);
 *
 * 4. BATCH NOTIFICATIONS:
 *
 * const { showAchievementNotification } = useAchievementContext();
 *
 * // These will be queued and shown one at a time
 * achievements.forEach(achievement => {
 *   showAchievementNotification(achievement);
 * });
 *
 * 5. MANUAL CONTROL:
 *
 * const {
 *   showAchievementNotification,
 *   dismissNotification,
 *   clearQueue,
 *   queueLength
 * } = useAchievementContext();
 *
 * // Show notification
 * showAchievementNotification(achievement);
 *
 * // Manually dismiss current notification
 * dismissNotification();
 *
 * // Clear all pending notifications
 * clearQueue();
 *
 * // Check queue status
 * console.log(`${queueLength} notifications pending`);
 *
 * =============================================================================
 * INTEGRATION WITH BACKEND
 * =============================================================================
 *
 * When completing lessons, quizzes, or modules, the backend should return
 * newAchievements in the response:
 *
 * Backend response:
 * {
 *   success: true,
 *   progress: { ... },
 *   newAchievements: [
 *     {
 *       type: "FIRST_LESSON",
 *       title: "Primera Lección",
 *       description: "Completaste tu primera lección",
 *       points: 10,
 *       rarity: "COMMON",
 *       icon: "school",
 *       unlockedAt: "2024-01-15T10:30:00Z"
 *     }
 *   ]
 * }
 *
 * Frontend handling:
 * const response = await fetch('/api/lessons/complete', { ... });
 * const data = await response.json();
 *
 * if (data.newAchievements && data.newAchievements.length > 0) {
 *   data.newAchievements.forEach(achievement => {
 *     showAchievementNotification(achievement);
 *   });
 * }
 *
 * =============================================================================
 */
