/**
 * =============================================================================
 * Achievement Notification Hook
 * =============================================================================
 * Custom hook for managing achievement notification queue and display timing
 * Handles showing celebratory notifications when achievements are unlocked
 * with proper queuing and timing to avoid overwhelming the user
 * =============================================================================
 */

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Default delay between consecutive notifications (in milliseconds)
 */
const DEFAULT_NOTIFICATION_DELAY = 5000; // 5 seconds

/**
 * Custom hook for managing achievement notifications
 * 
 * Provides a queue system for displaying achievement notifications one at a time
 * with configurable delays between each notification. Automatically processes
 * the queue and manages the display lifecycle.
 * 
 * @param {Object} options - Configuration options
 * @param {number} options.delay - Delay between notifications in ms (default: 5000)
 * @param {boolean} options.autoDismiss - Auto-dismiss after delay (default: true)
 * 
 * @returns {Object} Notification management functions and state
 * @returns {Function} showAchievementNotification - Add achievement to notification queue
 * @returns {Object|null} currentNotification - Currently displayed notification
 * @returns {Function} dismissNotification - Manually dismiss current notification
 * @returns {boolean} hasNotifications - Whether there are pending notifications
 * @returns {number} queueLength - Number of notifications in queue
 * @returns {Function} clearQueue - Clear all pending notifications
 * 
 * @example
 * function MyComponent() {
 *   const {
 *     showAchievementNotification,
 *     currentNotification,
 *     dismissNotification,
 *     hasNotifications
 *   } = useAchievementNotifications({ delay: 6000 });
 * 
 *   // When an achievement is unlocked
 *   useEffect(() => {
 *     if (newAchievements.length > 0) {
 *       newAchievements.forEach(achievement => {
 *         showAchievementNotification(achievement);
 *       });
 *     }
 *   }, [newAchievements]);
 * 
 *   return (
 *     <>
 *       {currentNotification && (
 *         <AchievementToast
 *           achievement={currentNotification}
 *           onDismiss={dismissNotification}
 *         />
 *       )}
 *     </>
 *   );
 * }
 */
export default function useAchievementNotifications(options = {}) {
  const {
    delay = DEFAULT_NOTIFICATION_DELAY,
    autoDismiss = true
  } = options;

  // State for notification queue and current notification
  const [queue, setQueue] = useState([]);
  const [currentNotification, setCurrentNotification] = useState(null);
  
  // Refs to persist values across renders without causing re-renders
  const timeoutRef = useRef(null);
  const isProcessingRef = useRef(false);

  /**
   * Add a new achievement notification to the queue
   * @param {Object} achievement - Achievement object to display
   * @param {string} achievement.type - Achievement type identifier
   * @param {string} achievement.title - Display title
   * @param {string} achievement.description - Achievement description
   * @param {string} achievement.icon - Icon identifier or path
   * @param {number} achievement.points - Points awarded
   * @param {string} achievement.unlockedAt - ISO timestamp of unlock
   * @param {string} achievement.rarity - Rarity level (COMMON, RARE, EPIC)
   */
  const showAchievementNotification = useCallback((achievement) => {
    if (!achievement || !achievement.type) {
      console.warn('[useAchievementNotifications] Invalid achievement object:', achievement);
      return;
    }

    console.log(`[useAchievementNotifications] Adding to queue: ${achievement.type}`);

    // Add achievement to the end of the queue
    setQueue(prevQueue => [...prevQueue, {
      ...achievement,
      id: `${achievement.type}-${Date.now()}`, // Unique ID for tracking
      queuedAt: new Date().toISOString()
    }]);
  }, []);

  /**
   * Manually dismiss the current notification and show next in queue
   */
  const dismissNotification = useCallback(() => {
    console.log('[useAchievementNotifications] Dismissing current notification');
    
    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Clear current notification
    setCurrentNotification(null);
    isProcessingRef.current = false;
  }, []);

  /**
   * Clear all notifications from queue
   */
  const clearQueue = useCallback(() => {
    console.log('[useAchievementNotifications] Clearing notification queue');
    setQueue([]);
    dismissNotification();
  }, [dismissNotification]);

  /**
   * Process the notification queue
   * Shows one notification at a time with proper timing
   */
  useEffect(() => {
    // Don't process if already showing a notification or queue is empty
    if (isProcessingRef.current || queue.length === 0) {
      return;
    }

    // Don't show new notification if one is currently displayed
    if (currentNotification) {
      return;
    }

    // Mark as processing
    isProcessingRef.current = true;

    // Get the next notification from queue (FIFO)
    const [nextNotification, ...remainingQueue] = queue;
    
    console.log(
      `[useAchievementNotifications] Showing notification: ${nextNotification.type} ` +
      `(${remainingQueue.length} remaining in queue)`
    );

    // Update queue (remove the notification we're about to show)
    setQueue(remainingQueue);

    // Show the notification
    setCurrentNotification(nextNotification);

    // Set up auto-dismiss if enabled
    if (autoDismiss) {
      timeoutRef.current = setTimeout(() => {
        console.log(`[useAchievementNotifications] Auto-dismissing ${nextNotification.type}`);
        setCurrentNotification(null);
        isProcessingRef.current = false;
        timeoutRef.current = null;
      }, delay);
    }
  }, [queue, currentNotification, delay, autoDismiss]);

  /**
   * Cleanup: Clear timeout on unmount
   */
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  /**
   * When current notification is cleared, allow processing next item
   */
  useEffect(() => {
    if (!currentNotification) {
      isProcessingRef.current = false;
    }
  }, [currentNotification]);

  // Calculate derived state
  const hasNotifications = queue.length > 0 || currentNotification !== null;
  const queueLength = queue.length;

  return {
    // Functions
    showAchievementNotification,
    dismissNotification,
    clearQueue,
    
    // State
    currentNotification,
    hasNotifications,
    queueLength,
    
    // Queue preview (first 3 items for UI purposes)
    queuePreview: queue.slice(0, 3)
  };
}

/**
 * Hook variant that automatically shows notifications from achievement events
 * Listens to a list of new achievements and automatically queues them
 * 
 * @param {Array} newAchievements - Array of newly unlocked achievements
 * @param {Object} options - Configuration options
 * @returns {Object} Same as useAchievementNotifications
 * 
 * @example
 * function LessonCompletionHandler() {
 *   const [newAchievements, setNewAchievements] = useState([]);
 *   
 *   const { currentNotification, dismissNotification } = 
 *     useAutoAchievementNotifications(newAchievements);
 *   
 *   // newAchievements will be automatically queued and displayed
 * }
 */
export function useAutoAchievementNotifications(newAchievements = [], options = {}) {
  const notifications = useAchievementNotifications(options);
  const { showAchievementNotification } = notifications;
  
  // Ref to track which achievements we've already shown
  const shownAchievementsRef = useRef(new Set());

  useEffect(() => {
    if (!Array.isArray(newAchievements) || newAchievements.length === 0) {
      return;
    }

    // Filter out achievements we've already shown
    const unseenAchievements = newAchievements.filter(achievement => {
      const key = `${achievement.type}-${achievement.unlockedAt || achievement.id}`;
      if (shownAchievementsRef.current.has(key)) {
        return false;
      }
      shownAchievementsRef.current.add(key);
      return true;
    });

    // Queue each new achievement
    unseenAchievements.forEach(achievement => {
      showAchievementNotification(achievement);
    });
  }, [newAchievements, showAchievementNotification]);

  return notifications;
}

/**
 * Hook for batch notification handling
 * Groups multiple achievements and can show them as a batch or individually
 * 
 * @param {Object} options - Configuration options
 * @param {boolean} options.batchMode - Show multiple achievements as one notification
 * @param {number} options.batchDelay - Wait time before showing batch (ms)
 * @returns {Object} Notification management
 */
export function useBatchAchievementNotifications(options = {}) {
  const {
    batchMode = false,
    batchDelay = 2000,
    ...notificationOptions
  } = options;

  const notifications = useAchievementNotifications(notificationOptions);
  const [pendingBatch, setPendingBatch] = useState([]);
  const batchTimeoutRef = useRef(null);

  const addToBatch = useCallback((achievement) => {
    setPendingBatch(prev => [...prev, achievement]);

    // Clear existing timeout
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
    }

    // Set new timeout to process batch
    batchTimeoutRef.current = setTimeout(() => {
      setPendingBatch(currentBatch => {
        if (currentBatch.length === 0) return currentBatch;

        if (batchMode && currentBatch.length > 1) {
          // Show as batch notification
          notifications.showAchievementNotification({
            type: 'BATCH',
            title: `${currentBatch.length} Logros Desbloqueados!`,
            description: `Has desbloqueado ${currentBatch.length} logros`,
            achievements: currentBatch,
            points: currentBatch.reduce((sum, a) => sum + (a.points || 0), 0),
            icon: 'emoji_events',
            rarity: 'EPIC'
          });
        } else {
          // Show individually
          currentBatch.forEach(notifications.showAchievementNotification);
        }

        return [];
      });
    }, batchDelay);
  }, [batchMode, batchDelay, notifications]);

  useEffect(() => {
    return () => {
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }
    };
  }, []);

  return {
    ...notifications,
    addToBatch,
    pendingBatchCount: pendingBatch.length
  };
}

