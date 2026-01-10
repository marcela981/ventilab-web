/**
 * =============================================================================
 * Achievement Hooks
 * =============================================================================
 * Custom hook for managing achievements and gamification data
 * Handles fetching unlocked achievements, all available achievements with progress,
 * and provides useful statistics for UI components
 * =============================================================================
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Base API URL
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

/**
 * Helper function to make authenticated API requests
 * @param {string} url - API endpoint URL
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} Parsed JSON response
 * @throws {Error} If request fails
 */
async function fetchWithAuth(url, options = {}) {
  const token = localStorage.getItem('ventilab_auth_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

/**
 * Custom hook for managing user achievements
 * 
 * Provides access to:
 * - User's unlocked achievements
 * - All available achievements with unlock status and progress
 * - Statistics (total points, completion percentage)
 * - Functions to refresh data
 * 
 * @returns {Object} Achievement data and functions
 * @returns {Array} achievements - Array of unlocked achievements
 * @returns {Array} allAchievements - All achievements with status and progress
 * @returns {boolean} loading - Loading state
 * @returns {string|null} error - Error message if any
 * @returns {Function} fetchMyAchievements - Refresh unlocked achievements
 * @returns {Function} fetchAllAchievements - Refresh all achievements
 * @returns {number} totalAchievements - Count of unlocked achievements
 * @returns {number} totalPoints - Sum of points from unlocked achievements
 * @returns {number} completionPercentage - Percentage of achievements unlocked (0-100)
 * @returns {Object} achievementsByCategory - Achievements grouped by category
 * @returns {Object} achievementsByRarity - Achievements grouped by rarity
 * 
 * @example
 * function AchievementsPage() {
 *   const {
 *     achievements,
 *     allAchievements,
 *     loading,
 *     error,
 *     totalPoints,
 *     completionPercentage,
 *     fetchMyAchievements
 *   } = useAchievements();
 * 
 *   if (loading) return <Loading />;
 *   if (error) return <Error message={error} />;
 * 
 *   return (
 *     <div>
 *       <h1>My Achievements ({totalPoints} points)</h1>
 *       <p>Completion: {completionPercentage}%</p>
 *       <AchievementList achievements={achievements} />
 *     </div>
 *   );
 * }
 */
export default function useAchievements() {
  // State management
  const [achievements, setAchievements] = useState([]);
  const [allAchievements, setAllAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const { user, isAuthenticated } = useAuth();

  /**
   * Fetch user's unlocked achievements
   * Makes GET request to /api/achievements
   */
  const fetchMyAchievements = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetchWithAuth(`${API_BASE_URL}/achievements`);

      // Handle response structure: { success, data, message }
      const achievementsData = response.data || response;
      
      setAchievements(Array.isArray(achievementsData) ? achievementsData : []);
      
      console.log(`[useAchievements] Fetched ${achievementsData.length} unlocked achievements`);
    } catch (err) {
      console.error('[useAchievements] Error fetching my achievements:', err);
      setError(err.message || 'Failed to load achievements');
      setAchievements([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  /**
   * Fetch all available achievements with status and progress
   * Makes GET request to /api/achievements/all
   */
  const fetchAllAchievements = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetchWithAuth(`${API_BASE_URL}/achievements/all`);

      // Handle response structure: { success, data, message }
      const allAchievementsData = response.data || response;
      
      setAllAchievements(Array.isArray(allAchievementsData) ? allAchievementsData : []);
      
      console.log(`[useAchievements] Fetched ${allAchievementsData.length} total achievements`);
    } catch (err) {
      console.error('[useAchievements] Error fetching all achievements:', err);
      setError(err.message || 'Failed to load all achievements');
      setAllAchievements([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  /**
   * Auto-fetch achievements on mount if user is authenticated
   */
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchMyAchievements();
    } else {
      setLoading(false);
      setAchievements([]);
      setAllAchievements([]);
    }
  }, [isAuthenticated, user, fetchMyAchievements]);

  /**
   * Calculate statistics and derived data
   * Uses useMemo to avoid recalculation on every render
   */
  const statistics = useMemo(() => {
    // Total achievements unlocked
    const totalAchievements = achievements.length;

    // Sum of points from unlocked achievements
    const totalPoints = achievements.reduce((sum, achievement) => {
      return sum + (achievement.points || 0);
    }, 0);

    // Completion percentage (unlocked / total available)
    const totalAvailable = allAchievements.length || 1; // Avoid division by zero
    const completionPercentage = Math.round((totalAchievements / totalAvailable) * 100);

    // Group achievements by category
    const achievementsByCategory = achievements.reduce((acc, achievement) => {
      const category = achievement.category || 'OTROS';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(achievement);
      return acc;
    }, {});

    // Group achievements by rarity
    const achievementsByRarity = achievements.reduce((acc, achievement) => {
      const rarity = achievement.rarity || 'COMMON';
      if (!acc[rarity]) {
        acc[rarity] = [];
      }
      acc[rarity].push(achievement);
      return acc;
    }, {});

    // Count by rarity
    const rarityCount = {
      COMMON: achievementsByRarity.COMMON?.length || 0,
      RARE: achievementsByRarity.RARE?.length || 0,
      EPIC: achievementsByRarity.EPIC?.length || 0
    };

    return {
      totalAchievements,
      totalPoints,
      completionPercentage,
      achievementsByCategory,
      achievementsByRarity,
      rarityCount
    };
  }, [achievements, allAchievements]);

  // Return all data and functions
  return {
    // Raw data
    achievements,
    allAchievements,
    
    // Loading states
    loading,
    error,
    
    // Functions
    fetchMyAchievements,
    fetchAllAchievements,
    refetch: fetchMyAchievements, // Alias for convenience
    
    // Computed statistics
    ...statistics
  };
}

/**
 * Helper hook to get a specific achievement by type
 * @param {string} achievementType - Type of achievement to find
 * @returns {Object|null} Achievement object or null if not found
 * 
 * @example
 * export function useAchievement(achievementType) {
 *   const { achievements } = useAchievements();
 *   return achievements.find(a => a.type === achievementType) || null;
 * }
 */
export function useAchievement(achievementType) {
  const { achievements } = useAchievements();
  
  return useMemo(() => {
    return achievements.find(a => a.type === achievementType) || null;
  }, [achievements, achievementType]);
}

/**
 * Helper hook to get progress for a specific achievement
 * @param {string} achievementType - Type of achievement
 * @returns {Object} Progress data with current, target, and percentage
 * 
 * @example
 * const progress = useAchievementProgress('LESSONS_10');
 * // Returns: { current: 7, target: 10, percentage: 70 }
 */
export function useAchievementProgress(achievementType) {
  const { allAchievements } = useAchievements();
  
  return useMemo(() => {
    const achievement = allAchievements.find(a => a.type === achievementType);
    
    if (!achievement || !achievement.progress) {
      return { current: 0, target: 0, percentage: 0 };
    }
    
    return achievement.progress;
  }, [allAchievements, achievementType]);
}

