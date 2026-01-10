/**
 * =============================================================================
 * useChecklistState Hook for VentyLab
 * =============================================================================
 * Custom React hook that manages checklist state including item completion,
 * progress calculation, and localStorage persistence.
 * 
 * This hook encapsulates all checklist state logic and provides:
 * - Item state management (completed/not completed)
 * - Progress calculation (percentage of mandatory items completed)
 * - All mandatory items completion tracking
 * - localStorage persistence
 * - Helper functions for state manipulation
 * 
 * @param {Object} checklistData - The checklist data object
 * @param {string} checklistData.id - Unique identifier for the checklist
 * @param {Array} checklistData.items - Array of checklist items
 * @param {boolean} persistState - Whether to persist state to localStorage
 * @param {string} storageKey - Key for localStorage if persistState is true
 * 
 * @returns {Object} Checklist state and functions
 * @returns {Object} itemStates - Map of item IDs to completion state (boolean)
 * @returns {number} progress - Progress percentage (0-100)
 * @returns {boolean} allMandatoryComplete - True if all mandatory items are completed
 * @returns {Function} toggleItem - Function to toggle item completion state
 * @returns {Function} resetChecklist - Function to reset all items to incomplete
 * @returns {Function} isItemCompleted - Helper to check if specific item is completed
 * 
 * @example
 * const {
 *   itemStates,
 *   progress,
 *   allMandatoryComplete,
 *   toggleItem,
 *   resetChecklist,
 *   isItemCompleted
 * } = useChecklistState({
 *   checklistData: {
 *     id: 'checklist-1',
 *     items: [
 *       { id: 'item-1', text: 'Item 1', optional: false },
 *       { id: 'item-2', text: 'Item 2', optional: true }
 *     ]
 *   },
 *   persistState: true,
 *   storageKey: 'checklist-1-state'
 * });
 * 
 * // Toggle item completion
 * toggleItem('item-1');
 * 
 * // Check if item is completed
 * const isComplete = isItemCompleted('item-1');
 * 
 * // Reset all items
 * resetChecklist();
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * Load state from localStorage
 * @param {string} storageKey - Key to load from
 * @returns {Object|null} Saved state or null if not found/invalid
 */
const loadStateFromStorage = (storageKey) => {
  try {
    const savedState = localStorage.getItem(storageKey);
    if (savedState) {
      return JSON.parse(savedState);
    }
  } catch (error) {
    console.warn(`Failed to load checklist state from localStorage: ${error.message}`);
  }
  return null;
};

/**
 * Save state to localStorage
 * @param {string} storageKey - Key to save to
 * @param {Object} state - State to save
 */
const saveStateToStorage = (storageKey, state) => {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch (error) {
    console.warn(`Failed to save checklist state to localStorage: ${error.message}`);
  }
};

/**
 * Initialize item states from checklist data
 * @param {Array} items - Array of checklist items
 * @returns {Object} Map of item IDs to false (not completed)
 */
const initializeItemStates = (items) => {
  if (!items || !Array.isArray(items)) {
    return {};
  }
  
  return items.reduce((states, item) => {
    if (item && item.id) {
      states[item.id] = false;
    }
    return states;
  }, {});
};

/**
 * Calculate progress percentage
 * @param {Object} itemStates - Map of item IDs to completion state
 * @param {Array} items - Array of checklist items
 * @returns {number} Progress percentage (0-100)
 */
const calculateProgress = (itemStates, items) => {
  if (!items || !Array.isArray(items) || items.length === 0) {
    return 0;
  }
  
  // Filter mandatory items only
  const mandatoryItems = items.filter(item => !item.optional);
  
  if (mandatoryItems.length === 0) {
    // If all items are optional, calculate based on all items
    const totalItems = items.length;
    const completedItems = items.filter(item => itemStates[item.id] === true).length;
    return totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  }
  
  // Calculate based on mandatory items
  const completedMandatory = mandatoryItems.filter(
    item => itemStates[item.id] === true
  ).length;
  
  return Math.round((completedMandatory / mandatoryItems.length) * 100);
};

/**
 * Check if all mandatory items are completed
 * @param {Object} itemStates - Map of item IDs to completion state
 * @param {Array} items - Array of checklist items
 * @returns {boolean} True if all mandatory items are completed
 */
const checkAllMandatoryComplete = (itemStates, items) => {
  if (!items || !Array.isArray(items)) {
    return false;
  }
  
  const mandatoryItems = items.filter(item => !item.optional);
  
  if (mandatoryItems.length === 0) {
    // If all items are optional, check if all items are completed
    return items.every(item => itemStates[item.id] === true);
  }
  
  return mandatoryItems.every(item => itemStates[item.id] === true);
};

/**
 * useChecklistState Hook
 */
const useChecklistState = ({ checklistData, persistState = false, storageKey = null }) => {
  // Initialize item states
  const initialStates = useMemo(() => {
    if (!checklistData || !checklistData.items) {
      return {};
    }
    
    // Try to load from localStorage if persistence is enabled
    if (persistState && storageKey) {
      const savedState = loadStateFromStorage(storageKey);
      if (savedState && typeof savedState === 'object') {
        // Validate saved state structure
        const isValid = checklistData.items.every(
          item => item.id in savedState && typeof savedState[item.id] === 'boolean'
        );
        if (isValid) {
          return savedState;
        }
      }
    }
    
    // Initialize all items as not completed
    return initializeItemStates(checklistData.items);
  }, [checklistData, persistState, storageKey]);
  
  // State management
  const [itemStates, setItemStates] = useState(initialStates);
  
  // Re-initialize if checklistData changes
  useEffect(() => {
    if (checklistData && checklistData.items) {
      const newStates = initializeItemStates(checklistData.items);
      
      // If persistence is enabled, try to load saved state
      if (persistState && storageKey) {
        const savedState = loadStateFromStorage(storageKey);
        if (savedState && typeof savedState === 'object') {
          const isValid = checklistData.items.every(
            item => item.id in savedState && typeof savedState[item.id] === 'boolean'
          );
          if (isValid) {
            setItemStates(savedState);
            return;
          }
        }
      }
      
      setItemStates(newStates);
    }
  }, [checklistData?.id, persistState, storageKey]);
  
  // Save to localStorage whenever itemStates changes (if persistence is enabled)
  useEffect(() => {
    if (persistState && storageKey && checklistData) {
      saveStateToStorage(storageKey, itemStates);
    }
  }, [itemStates, persistState, storageKey, checklistData]);
  
  // Calculate progress
  const progress = useMemo(() => {
    if (!checklistData || !checklistData.items) {
      return 0;
    }
    return calculateProgress(itemStates, checklistData.items);
  }, [itemStates, checklistData]);
  
  // Check if all mandatory items are complete
  const allMandatoryComplete = useMemo(() => {
    if (!checklistData || !checklistData.items) {
      return false;
    }
    return checkAllMandatoryComplete(itemStates, checklistData.items);
  }, [itemStates, checklistData]);
  
  /**
   * Toggle item completion state
   * @param {string} itemId - ID of the item to toggle
   */
  const toggleItem = useCallback((itemId) => {
    setItemStates((prevStates) => {
      const newStates = {
        ...prevStates,
        [itemId]: !prevStates[itemId],
      };
      return newStates;
    });
  }, []);
  
  /**
   * Reset all items to incomplete
   */
  const resetChecklist = useCallback(() => {
    if (!checklistData || !checklistData.items) {
      return;
    }
    
    const newStates = initializeItemStates(checklistData.items);
    setItemStates(newStates);
    
    // Clear localStorage if persistence is enabled
    if (persistState && storageKey) {
      try {
        localStorage.removeItem(storageKey);
      } catch (error) {
        console.warn(`Failed to clear checklist state from localStorage: ${error.message}`);
      }
    }
  }, [checklistData, persistState, storageKey]);
  
  /**
   * Check if specific item is completed
   * @param {string} itemId - ID of the item to check
   * @returns {boolean} True if item is completed
   */
  const isItemCompleted = useCallback((itemId) => {
    return itemStates[itemId] === true;
  }, [itemStates]);
  
  return {
    itemStates,
    progress,
    allMandatoryComplete,
    toggleItem,
    resetChecklist,
    isItemCompleted,
  };
};

export default useChecklistState;

