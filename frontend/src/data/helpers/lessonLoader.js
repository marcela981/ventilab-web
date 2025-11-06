/**
 * =============================================================================
 * Lesson Loader - VentyLab
 * =============================================================================
 *
 * Helper module that encapsulates all lesson loading logic from JSON files.
 * This module provides a centralized, cached, and robust solution for loading
 * lesson content with retry logic, validation, and normalization.
 *
 * Features:
 * - LRU cache with configurable size limit
 * - Retry logic for failed loads (max 3 attempts)
 * - Support for multiple module structures
 * - Legacy format normalization
 * - Comprehensive error handling
 * - Pure JavaScript (no React dependencies)
 * - SSR compatible
 *
 * @module lessonLoader
 */

// =============================================================================
// Constants
// =============================================================================

/**
 * Base path prefix for lesson files
 * @constant {string}
 */
export const LESSON_PATH_PREFIX = 'lessons';

/**
 * Base path prefix for module directories
 * @constant {string}
 */
export const MODULE_PATH_PREFIX = 'module';

/**
 * Default language for content
 * @constant {string}
 */
export const DEFAULT_LANGUAGE = 'es';

/**
 * Maximum number of lessons to cache
 * @constant {number}
 */
export const MAX_CACHE_SIZE = 50;

/**
 * Maximum retry attempts for failed loads
 * @constant {number}
 */
const MAX_RETRY_ATTEMPTS = 3;

/**
 * Delay between retry attempts in milliseconds
 * @constant {number}
 */
const RETRY_DELAY_MS = 1000;

// =============================================================================
// LRU Cache Implementation (Singleton)
// =============================================================================

/**
 * LRU (Least Recently Used) Cache for lesson data
 * Uses Map to maintain insertion order and implements size limit
 * @private
 */
class LRUCache {
  constructor(maxSize = MAX_CACHE_SIZE) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  /**
   * Get item from cache and mark as recently used
   * @param {string} key - Cache key
   * @returns {*} Cached value or undefined
   */
  get(key) {
    if (!this.cache.has(key)) return undefined;

    // Move to end (most recently used)
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);

    return value;
  }

  /**
   * Set item in cache, evict LRU if at capacity
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   */
  set(key, value) {
    // Delete if exists (to update position)
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
      console.log(`[lessonLoader] Cache evicted: ${oldestKey}`);
    }

    this.cache.set(key, value);
  }

  /**
   * Check if key exists in cache
   * @param {string} key - Cache key
   * @returns {boolean}
   */
  has(key) {
    return this.cache.has(key);
  }

  /**
   * Clear all cached items
   */
  clear() {
    this.cache.clear();
    console.log('[lessonLoader] Cache cleared');
  }

  /**
   * Get current cache size
   * @returns {number}
   */
  get size() {
    return this.cache.size;
  }
}

/**
 * Singleton cache instance
 * @private
 */
const lessonCache = new LRUCache(MAX_CACHE_SIZE);

// =============================================================================
// Mapping Functions
// =============================================================================

/**
 * Maps lesson and module IDs to the appropriate file path
 * Handles multiple module structures and naming conventions
 *
 * @param {string} lessonId - Lesson identifier
 * @param {string} moduleId - Module identifier
 * @returns {string} Relative path to lesson JSON file
 *
 * @example
 * getLessonPath('respiratory-anatomy', 'module-01-fundamentals')
 * // Returns: 'lessons/module-01-fundamentals/lesson-01-respiratory-anatomy.json'
 */
export function getLessonPath(lessonId, moduleId) {
  // Mapping of lesson IDs to file names (for lessons with different IDs than filenames)
  // This maps curriculum lesson IDs to actual JSON file names
  const lessonIdToFileName = {
    'anatomy-overview': 'respiratory-anatomy', // curriculumData uses 'anatomy-overview', file is 'respiratory-anatomy'
    'airway-structures': 'respiratory-anatomy', // sub-lesson, same file
    'lung-mechanics': 'respiratory-anatomy', // sub-lesson, same file
  };

  // Mapping of lesson IDs to file numbers
  const lessonIdToNumber = {
    'respiratory-anatomy': '01',
    'anatomy-overview': '01',
    'airway-structures': '01',
    'lung-mechanics': '01',
    'respiratory-mechanics': '02',
    'ventilation-mechanics': '02',
    'gas-exchange': '03',
    'arterial-blood-gas': '04',
  };

  // Normalize module folder
  let moduleFolder = moduleId;
  if (!moduleId.startsWith('module-')) {
    moduleFolder = `module-01-fundamentals`; // Default fallback
  }

  // Determine lesson number and filename
  const lessonNumber = lessonIdToNumber[lessonId] || '01';
  
  // Check if this lessonId maps to a different filename
  const fileName = lessonIdToFileName[lessonId] || lessonId;

  // Construct file path
  // Handle special cases for module-03-configuration with subcategories
  if (moduleFolder === 'module-03-configuration') {
    // Check if lessonId suggests a subcategory
    const subcategories = ['pathologies', 'protective-strategies', 'weaning'];
    for (const subcat of subcategories) {
      if (lessonId.includes(subcat.split('-')[0])) {
        return `${LESSON_PATH_PREFIX}/${moduleFolder}/${subcat}/${lessonId}.json`;
      }
    }
    // Check for protocol files
    if (lessonId.includes('protocol') || lessonId.includes('criteria') || lessonId.includes('sbt')) {
      const categoryMap = {
        'sdra': 'pathologies',
        'copd': 'pathologies',
        'asthma': 'pathologies',
        'pneumonia': 'pathologies',
        'low-tidal': 'protective-strategies',
        'permissive': 'protective-strategies',
        'peep': 'protective-strategies',
        'lung-protective': 'protective-strategies',
        'sbt': 'weaning',
        'readiness': 'weaning',
      };

      for (const [keyword, category] of Object.entries(categoryMap)) {
        if (lessonId.includes(keyword)) {
          return `${LESSON_PATH_PREFIX}/${moduleFolder}/${category}/${lessonId}.json`;
        }
      }
    }
  }

  // Standard path for module-01-fundamentals and others
  // Use fileName instead of lessonId to handle ID mappings
  return `${LESSON_PATH_PREFIX}/${moduleFolder}/lesson-${lessonNumber}-${fileName}.json`;
}

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * Validates lesson data structure
 * Checks for required fields and proper formatting
 *
 * @param {Object} lessonData - Lesson data object to validate
 * @returns {boolean} True if valid
 * @throws {Error} If validation fails
 *
 * @example
 * validateLessonData(lessonData);
 * // Returns true or throws Error with descriptive message
 */
export function validateLessonData(lessonData) {
  if (!lessonData || typeof lessonData !== 'object') {
    throw new Error('Lesson data must be a valid object');
  }

  // Required fields for new format
  if (lessonData.lessonId && lessonData.content) {
    if (!lessonData.moduleId) {
      throw new Error("Missing required field 'moduleId'");
    }
    if (!lessonData.title) {
      throw new Error("Missing required field 'title'");
    }
    if (typeof lessonData.content !== 'object') {
      throw new Error("Field 'content' must be an object");
    }
  }
  // Legacy format - just check it's an object
  // Normalization will handle the rest

  return true;
}

// =============================================================================
// Normalization Functions
// =============================================================================

/**
 * Normalizes lesson data from legacy format to current format
 * Handles Spanish field names and old structures
 *
 * @param {Object} rawData - Raw lesson data (any format)
 * @returns {Object} Normalized lesson data in current format
 *
 * @example
 * const normalized = normalizeLessonData(legacyData);
 * // Returns data with consistent structure
 */
export function normalizeLessonData(rawData) {
  // Already in new format
  if (rawData.lessonId && rawData.content && rawData.content.introduction) {
    return rawData;
  }

  console.log('[lessonLoader] Normalizing legacy format...');

  // Extract or infer basic metadata
  const normalized = {
    lessonId: rawData.lessonId || '',
    moduleId: rawData.moduleId || '',
    title: rawData.title || rawData['Título'] || 'Untitled Lesson',
    lastUpdated: rawData.lastUpdated || new Date().toISOString(),
    authors: rawData.authors || [],
    reviewers: rawData.reviewers || [],
    content: {
      introduction: {
        text: rawData.content?.introduction?.text ||
              rawData['Introducción']?.texto ||
              rawData['Introducción']?.text || '',
        objectives: rawData.content?.introduction?.objectives ||
                   rawData['Introducción']?.objetivos || [],
      },
      theory: {
        sections: rawData.content?.theory?.sections ||
                 (rawData['Conceptos Teóricos'] ? [{
                   title: 'Conceptos Teóricos',
                   content: typeof rawData['Conceptos Teóricos'] === 'string'
                     ? rawData['Conceptos Teóricos']
                     : '',
                 }] : []),
        examples: rawData.content?.theory?.examples || [],
        analogies: rawData.content?.theory?.analogies || [],
      },
      visualElements: rawData.content?.visualElements ||
                     rawData['Elementos Visuales'] || [],
      practicalCases: rawData.content?.practicalCases ||
                      rawData['Casos Prácticos'] || [],
      keyPoints: rawData.content?.keyPoints ||
                rawData['Puntos Clave'] || [],
      assessment: {
        questions: rawData.content?.assessment?.questions ||
                  rawData['Autoevaluación'] || [],
      },
      references: rawData.content?.references ||
                 rawData['Referencias Bibliográficas'] || [],
    },
  };

  return normalized;
}

// =============================================================================
// Cache Functions
// =============================================================================

/**
 * Retrieves cached lesson data by ID
 *
 * @param {string} lessonId - Lesson identifier
 * @returns {Object|undefined} Cached lesson data or undefined
 *
 * @example
 * const cached = getCachedLesson('respiratory-anatomy');
 * if (cached) {
 *   console.log('Using cached data');
 * }
 */
export function getCachedLesson(lessonId) {
  return lessonCache.get(lessonId);
}

/**
 * Caches lesson data by ID
 *
 * @param {string} lessonId - Lesson identifier
 * @param {Object} data - Lesson data to cache
 *
 * @example
 * cacheLesson('respiratory-anatomy', lessonData);
 */
export function cacheLesson(lessonId, data) {
  lessonCache.set(lessonId, data);
  console.log(`[lessonLoader] Cached lesson: ${lessonId}`);
}

/**
 * Clears all cached lessons
 *
 * @example
 * clearCache();
 */
export function clearCache() {
  lessonCache.clear();
}

// =============================================================================
// Loading Functions
// =============================================================================

/**
 * Loads lesson content by ID with retry logic and caching
 *
 * @param {string} lessonId - Lesson identifier
 * @param {string} moduleId - Module identifier
 * @returns {Promise<Object>} Loaded and normalized lesson data
 * @throws {Error} If loading fails after retries
 *
 * @example
 * try {
 *   const lesson = await loadLessonById('respiratory-anatomy', 'module-01-fundamentals');
 *   console.log(lesson.title);
 * } catch (error) {
 *   console.error('Failed to load lesson:', error.message);
 * }
 */
export async function loadLessonById(lessonId, moduleId) {
  console.log(`[lessonLoader] Loading lesson: ${lessonId} from module: ${moduleId}`);

  // Check cache first
  const cached = getCachedLesson(lessonId);
  if (cached) {
    console.log(`[lessonLoader] Cache hit for: ${lessonId}`);
    return cached;
  }

  // Build file path
  const filePath = getLessonPath(lessonId, moduleId);

  // Retry logic
  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      console.log(`[lessonLoader] Attempt ${attempt}/${MAX_RETRY_ATTEMPTS} for: ${filePath}`);

      // Try dynamic import first
      let jsonContent;
      try {
        const moduleData = await import(`../${filePath}`);
        jsonContent = moduleData.default || moduleData;
      } catch (importError) {
        // Fallback to fetch for public files
        const response = await fetch(`/data/${filePath}`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        jsonContent = await response.json();
      }

      // Validate and normalize
      validateLessonData(jsonContent);
      const normalized = normalizeLessonData(jsonContent);

      // Set IDs - use requested lessonId to handle ID mappings (e.g., anatomy-overview -> respiratory-anatomy)
      // This ensures the returned lesson has the ID that was requested, not necessarily the file's ID
      normalized.lessonId = lessonId;
      if (!normalized.moduleId) normalized.moduleId = moduleId;

      // Cache the result using the requested lessonId
      cacheLesson(lessonId, normalized);

      console.log(`[lessonLoader] Successfully loaded: ${lessonId}`);
      return normalized;

    } catch (error) {
      lastError = error;
      console.error(`[lessonLoader] Attempt ${attempt} failed:`, error.message);

      // Wait before retry (except on last attempt)
      if (attempt < MAX_RETRY_ATTEMPTS) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt));
      }
    }
  }

  // All retries failed
  throw new Error(
    `Failed to load lesson ${lessonId} after ${MAX_RETRY_ATTEMPTS} attempts: ${lastError.message}`
  );
}

/**
 * Loads all lessons from a module (not yet implemented - placeholder)
 *
 * @param {string} moduleId - Module identifier
 * @returns {Promise<Array<Object>>} Array of lesson data objects
 *
 * @example
 * const lessons = await loadModuleLessons('module-01-fundamentals');
 * console.log(`Loaded ${lessons.length} lessons`);
 */
export async function loadModuleLessons(moduleId) {
  console.log(`[lessonLoader] Loading all lessons for module: ${moduleId}`);

  // This would require a manifest or directory listing
  // For now, return empty array as placeholder
  console.warn('[lessonLoader] loadModuleLessons not fully implemented yet');
  return [];
}

// =============================================================================
// Exports
// =============================================================================

export default {
  // Constants
  LESSON_PATH_PREFIX,
  MODULE_PATH_PREFIX,
  DEFAULT_LANGUAGE,
  MAX_CACHE_SIZE,

  // Functions
  getLessonPath,
  validateLessonData,
  normalizeLessonData,
  getCachedLesson,
  cacheLesson,
  clearCache,
  loadLessonById,
  loadModuleLessons,
};
