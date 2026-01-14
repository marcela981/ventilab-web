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
  // =================================================================
  // NUEVO: Mapeo directo para módulos de ventilación mecánica (module-XX-*)
  // Estos archivos usan formato module-XX-name.json en lugar de lesson-XX-name.json
  // =================================================================
  const directModuleMapping = {
    // Módulo 01: Fundamentos - archivos con formato module-XX-*.json
    'module-01-inversion-fisiologica': 'lessons/module-01-fundamentals/module-01-inversion-fisiologica.json',
    'module-02-ecuacion-movimiento': 'lessons/module-01-fundamentals/module-02-ecuacion-movimiento.json',
    'module-03-variables-fase': 'lessons/module-01-fundamentals/module-03-variables-fase.json',
    'module-04-modos-ventilatorios': 'lessons/module-01-fundamentals/module-04-modos-ventilatorios.json',
    'module-05-monitorizacion-grafica': 'lessons/module-01-fundamentals/module-05-monitorizacion-grafica.json',
    'module-06-efectos-sistemicos': 'lessons/module-01-fundamentals/module-06-efectos-sistemicos.json',
  };
  
  // Si el lessonId tiene mapeo directo, usarlo
  if (directModuleMapping[lessonId]) {
    console.log(`[lessonLoader] Using direct mapping for: ${lessonId}`);
    return directModuleMapping[lessonId];
  }
  
  // Normalize lessonId: Extract name from IDs with format "lesson-XX-name"
  // Examples: "lesson-02-gas-exchange" -> "gas-exchange", "lesson-01-respiratory-mechanics" -> "respiratory-mechanics"
  let normalizedLessonId = lessonId;
  if (lessonId.startsWith('lesson-')) {
    // Extract the name part after "lesson-XX-"
    // Pattern: lesson-XX-name -> name
    const parts = lessonId.split('-');
    if (parts.length >= 3 && /^\d+$/.test(parts[1])) {
      // parts[0] = "lesson", parts[1] = number, parts[2+] = name
      normalizedLessonId = parts.slice(2).join('-');
    }
  }

  // Mapping of lesson IDs to file names (for lessons with different IDs than filenames)
  // This maps curriculum lesson IDs to actual JSON file names
  const lessonIdToFileName = {
    'anatomy-overview': 'respiratory-anatomy', // curriculumData uses 'anatomy-overview', file is 'respiratory-anatomy'
    'airway-structures': 'respiratory-anatomy', // sub-lesson, same file
    'lung-mechanics': 'respiratory-anatomy', // sub-lesson, same file
    'respiratory-anatomy': 'respiratory-anatomy', // Direct mapping
    'respiratory-mechanics': 'respiratory-mechanics', // Direct mapping
    'gas-exchange': 'gas-exchange', // Direct mapping
    'arterial-blood-gas': 'arterial-blood-gas', // Direct mapping
  };

  // Mapping of lesson IDs to file numbers
  const lessonIdToNumber = {
    'respiratory-anatomy': '01',
    'anatomy-overview': '01',
    'airway-structures': '01',
    'lung-mechanics': '01',
    'respiratory-mechanics': '01',
    'ventilation-mechanics': '01',
    'gas-exchange': '02',
    'arterial-blood-gas': '03',
  };

  // Normalize module folder
  // Map module IDs to actual folder names
  const moduleIdToFolder = {
    'module-02-modalidades-parametros': 'module-02-parameters',
    // Add other mappings as needed
  };
  
  let moduleFolder = moduleIdToFolder[moduleId] || moduleId;
  if (!moduleFolder.startsWith('module-')) {
    moduleFolder = `module-01-fundamentals`; // Default fallback
  }

  // Determine lesson number and filename using normalized ID
  const lessonNumber = lessonIdToNumber[normalizedLessonId] || '01';
  
  // Check if this lessonId maps to a different filename
  const fileName = lessonIdToFileName[normalizedLessonId] || normalizedLessonId;

  // Construct file path
  // Handle special cases for module-03-configuration with subcategories
  if (moduleFolder === 'module-03-configuration') {
    // Check if normalizedLessonId suggests a subcategory
    const subcategories = ['pathologies', 'protective-strategies', 'weaning'];
    for (const subcat of subcategories) {
      if (normalizedLessonId.includes(subcat.split('-')[0])) {
        return `${LESSON_PATH_PREFIX}/${moduleFolder}/${subcat}/${normalizedLessonId}.json`;
      }
    }
    // Check for protocol files
    if (normalizedLessonId.includes('protocol') || normalizedLessonId.includes('criteria') || normalizedLessonId.includes('sbt')) {
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
      
      // Also check for exact matches first (more specific)
      const exactMatches = {
        'sdra-protocol': 'pathologies',
        'copd-protocol': 'pathologies',
        'asthma-protocol': 'pathologies',
        'pneumonia-protocol': 'pathologies',
        'low-tidal-volume': 'protective-strategies',
        'permissive-hypercapnia': 'protective-strategies',
        'peep-strategies': 'protective-strategies',
        'lung-protective-ventilation': 'protective-strategies',
        'sbt-protocol': 'weaning',
        'readiness-criteria': 'weaning',
      };
      
      // Check exact matches first
      if (exactMatches[normalizedLessonId]) {
        return `${LESSON_PATH_PREFIX}/${moduleFolder}/${exactMatches[normalizedLessonId]}/${normalizedLessonId}.json`;
      }

      for (const [keyword, category] of Object.entries(categoryMap)) {
        if (normalizedLessonId.includes(keyword)) {
          return `${LESSON_PATH_PREFIX}/${moduleFolder}/${category}/${normalizedLessonId}.json`;
        }
      }
    }
  }

  // Standard path for module-01-fundamentals and others
  // For module-02-parameters, use the lessonId directly if it already has the format lesson-XX-name
  if (moduleFolder === 'module-02-parameters' && lessonId.startsWith('lesson-')) {
    // Use lessonId directly as it matches the filename format
    return `${LESSON_PATH_PREFIX}/${moduleFolder}/${lessonId}.json`;
  }
  
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
  // Already in new format with content.introduction
  if (rawData.lessonId && rawData.content && rawData.content.introduction) {
    return rawData;
  }

  // Check if it's the new format with sections array
  if (rawData.sections && Array.isArray(rawData.sections)) {
    console.log('[lessonLoader] Normalizing sections format to content structure...');
    return normalizeSectionsFormat(rawData);
  }

  console.log('[lessonLoader] Normalizing legacy format...');

  // Extract or infer basic metadata
  const normalized = {
    lessonId: rawData.id || rawData.lessonId || '',
    moduleId: rawData.moduleId || '',
    title: rawData.title || rawData.titulo || rawData['Título'] || 'Untitled Lesson',
    lastUpdated: rawData.lastUpdated || new Date().toISOString(),
    authors: rawData.authors || [],
    reviewers: rawData.reviewers || [],
    content: {
      introduction: {
        text: rawData.content?.introduction?.text ||
              rawData['Introducción']?.texto ||
              rawData['Introducción']?.text ||
              rawData.introduccion || '',
        objectives: rawData.content?.introduction?.objectives ||
                   rawData.learningObjectives ||
                   rawData['Introducción']?.objetivos ||
                   rawData.objetivos_de_aprendizaje || [],
      },
      theory: {
        sections: rawData.content?.theory?.sections ||
                 (rawData['Conceptos Teóricos'] ? [{
                   title: 'Conceptos Teóricos',
                   content: typeof rawData['Conceptos Teóricos'] === 'string'
                     ? rawData['Conceptos Teóricos']
                     : rawData.conceptos_teoricos || '',
                 }] : []),
        examples: rawData.content?.theory?.examples || [],
        analogies: rawData.content?.theory?.analogies || [],
      },
      visualElements: rawData.content?.visualElements ||
                     rawData['Elementos Visuales'] ||
                     rawData.elementos_visuales_requeridos || [],
      practicalCases: rawData.content?.practicalCases ||
                      rawData['Casos Prácticos'] ||
                      rawData.casos_practicos || [],
      keyPoints: rawData.content?.keyPoints ||
                rawData['Puntos Clave'] ||
                rawData.puntos_clave || [],
      assessment: {
        questions: rawData.content?.assessment?.questions ||
                  rawData['Autoevaluación'] ||
                  rawData.autoevaluacion || [],
      },
      references: rawData.content?.references ||
                 rawData['Referencias Bibliográficas'] ||
                 rawData.referencias || [],
    },
  };

  return normalized;
}

/**
 * Normalizes lesson data with sections array to content structure
 * Converts sections array format to the format expected by LessonViewer
 * 
 * @param {Object} rawData - Lesson data with sections array
 * @returns {Object} Normalized lesson data with content structure
 */
function normalizeSectionsFormat(rawData) {
  const sections = rawData.sections || [];
  
  // Extract introduction section
  const introductionSection = sections.find(s => s.type === 'introduction');
  const introductionText = introductionSection?.content?.markdown || 
                          introductionSection?.content?.text || 
                          introductionSection?.content || '';
  
  // Extract theory sections (include both 'theory' and 'procedure' types)
  const theorySections = sections
    .filter(s => s.type === 'theory' || s.type === 'procedure')
    .map(s => ({
      title: s.title || '',
      content: s.content?.markdown || s.content?.text || s.content || '',
      media: s.content?.media || s.media || null,
    }));

  // Extract visual elements from sections with media
  const visualElements = [];
  sections.forEach(section => {
    if (section.content?.media?.images) {
      section.content.media.images.forEach(img => {
        visualElements.push({
          name: img.id || img.alt || 'Image',
          description: img.caption || img.alt || '',
          type: 'image',
          url: img.url || '',
        });
      });
    }
  });

  // Extract practical cases
  const practicalCases = sections
    .filter(s => s.type === 'case' || s.type === 'practical')
    .map(s => ({
      id: s.id || `case-${s.order}`,
      title: s.title || '',
      description: s.content?.markdown || s.content?.text || s.content || '',
      patientData: s.content?.patientData || null,
      questions: s.content?.questions || [],
    }));

  // Extract key points from summary sections or dedicated sections
  const keyPoints = [];
  const summarySection = sections.find(s => s.type === 'summary');
  if (summarySection) {
    const summaryContent = summarySection.content?.markdown || summarySection.content?.text || '';
    // Try to extract bullet points from markdown
    const bulletPoints = summaryContent.match(/^[-*]\s+(.+)$/gm);
    if (bulletPoints) {
      keyPoints.push(...bulletPoints.map(bp => bp.replace(/^[-*]\s+/, '')));
    }
  }

  // Extract assessment from sections
  const assessmentQuestions = [];
  sections.forEach(section => {
    if (section.content?.questions && Array.isArray(section.content.questions)) {
      assessmentQuestions.push(...section.content.questions);
    }
    if (section.type === 'assessment' || section.type === 'quiz') {
      const questions = section.content?.questions || section.questions || [];
      assessmentQuestions.push(...questions);
    }
  });

  // Extract references from sections
  const references = [];
  sections.forEach(section => {
    if (section.content?.references) {
      references.push(...section.content.references);
    }
    if (section.references) {
      references.push(...section.references);
    }
  });

  return {
    lessonId: rawData.id || rawData.lessonId || '',
    moduleId: rawData.moduleId || '',
    title: rawData.title || 'Untitled Lesson',
    description: rawData.description || '',
    lastUpdated: rawData.lastUpdated || new Date().toISOString(),
    authors: rawData.authors || [],
    reviewers: rawData.reviewers || [],
    learningObjectives: rawData.learningObjectives || [],
    estimatedTime: rawData.estimatedTime || 45,
    difficulty: rawData.difficulty || 'beginner',
    bloomLevel: rawData.bloomLevel || 'understand',
    content: {
      introduction: {
        text: introductionText,
        objectives: rawData.learningObjectives || [],
      },
      theory: {
        sections: theorySections,
        examples: [],
        analogies: [],
      },
      visualElements: visualElements.length > 0 ? visualElements : rawData.content?.visualElements || [],
      practicalCases: practicalCases.length > 0 ? practicalCases : rawData.content?.practicalCases || [],
      keyPoints: keyPoints.length > 0 ? keyPoints : rawData.content?.keyPoints || rawData.keyPoints || [],
      assessment: {
        questions: assessmentQuestions.length > 0 ? assessmentQuestions : rawData.content?.assessment?.questions || [],
      },
      references: references.length > 0 ? references : rawData.content?.references || rawData.references || [],
    },
  };
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
