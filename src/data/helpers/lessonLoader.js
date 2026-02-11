/**
 * =============================================================================
 * Lesson Loader - VentyLab
 * =============================================================================
 *
 * Loads lesson content from the database via the Pages API.
 *
 * Data flow:
 *   1. Check LRU cache
 *   2. Call GET /api/pages/by-lesson/:lessonId (coexistence resolver)
 *   3a. If source === "page"  → transform DB data to normalized format (migrated)
 *   3b. If source === "lesson" → fall back to legacy JSON (non-migrated content)
 *   4. Cache and return normalized lesson data
 *
 * Migrated content (beginner modules 01-06) is served exclusively from the DB.
 * Non-migrated content (intermediate/advanced) still uses legacy JSON files.
 *
 * @module lessonLoader
 */

import { get as apiGet } from '../../services/api/http';

// =============================================================================
// Constants
// =============================================================================

/** @deprecated Only used by legacy JSON fallback path */
export const LESSON_PATH_PREFIX = 'lessons';

/** @deprecated Only used by legacy JSON fallback path */
export const MODULE_PATH_PREFIX = 'module';

export const DEFAULT_LANGUAGE = 'es';

export const MAX_CACHE_SIZE = 50;

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;

// =============================================================================
// LRU Cache Implementation (Singleton)
// =============================================================================

/**
 * @private
 */
class LRUCache {
  constructor(maxSize = MAX_CACHE_SIZE) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  get(key) {
    if (!this.cache.has(key)) return undefined;
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    this.cache.set(key, value);
  }

  has(key) {
    return this.cache.has(key);
  }

  clear() {
    this.cache.clear();
    console.log('[lessonLoader] Cache cleared');
  }

  get size() {
    return this.cache.size;
  }
}

const lessonCache = new LRUCache(MAX_CACHE_SIZE);

// =============================================================================
// Cache Functions
// =============================================================================

export function getCachedLesson(lessonId) {
  return lessonCache.get(lessonId);
}

export function cacheLesson(lessonId, data) {
  lessonCache.set(lessonId, data);
}

export function clearCache() {
  lessonCache.clear();
}

// =============================================================================
// API → Normalized Format Transformer
// =============================================================================

/**
 * Transforms a Page object (from the Pages API) into the normalized lesson data
 * format that LessonViewer and other components expect.
 *
 * Page sections (INTRODUCTION, THEORY, CASE_STUDY, etc.) are mapped to the
 * content structure: { introduction, theory, visualElements, practicalCases,
 * keyPoints, assessment, references }.
 *
 * @param {Object} page - Page object with sections from GET /api/pages/:id
 * @returns {Object} Normalized lesson data
 */
function transformPageToLessonData(page) {
  const sections = page.sections || [];

  // --- Introduction ---
  const introSections = sections.filter(s => s.type === 'INTRODUCTION');
  const introText = introSections
    .map(s => s.content?.markdown || s.content?.text || '')
    .join('\n\n');

  // --- Theory (THEORY + TEXT + EQUATION + CODE + CALLOUT) ---
  const theorySections = sections
    .filter(s =>
      s.type === 'THEORY' ||
      s.type === 'TEXT' ||
      s.type === 'EQUATION' ||
      s.type === 'CODE' ||
      s.type === 'CALLOUT'
    )
    .map(s => ({
      title: s.title || '',
      content: s.content?.markdown || s.content?.text || '',
      media: s.content?.media || null,
    }));

  // --- Practical cases (CASE_STUDY) ---
  const practicalCases = sections
    .filter(s => s.type === 'CASE_STUDY')
    .map((s, idx) => ({
      id: s.sectionId || s.id || `case-${idx}`,
      title: s.title || '',
      description: s.content?.markdown || s.content?.text || '',
      patientData: s.content?.patientData || null,
      questions: s.content?.questions || [],
    }));

  // --- Key points (SUMMARY) ---
  const keyPoints = [];
  sections
    .filter(s => s.type === 'SUMMARY')
    .forEach(s => {
      const md = s.content?.markdown || s.content?.text || '';
      const bullets = md.match(/^[-*]\s+(.+)$/gm);
      if (bullets) {
        keyPoints.push(...bullets.map(b => b.replace(/^[-*]\s+/, '')));
      } else if (md.trim()) {
        keyPoints.push(md.trim());
      }
    });

  // --- Assessment questions (EXERCISE + QUIZ) ---
  const assessmentQuestions = [];
  sections
    .filter(s => s.type === 'EXERCISE' || s.type === 'QUIZ')
    .forEach(s => {
      if (Array.isArray(s.content?.questions)) {
        assessmentQuestions.push(...s.content.questions);
      }
    });

  // --- References ---
  const references = [];
  sections
    .filter(s => s.type === 'REFERENCES')
    .forEach(s => {
      if (Array.isArray(s.content?.references)) {
        references.push(...s.content.references);
      } else if (s.content?.markdown) {
        references.push(s.content.markdown);
      }
    });

  // --- Visual elements (IMAGE + VIDEO) ---
  const visualElements = sections
    .filter(s => s.type === 'IMAGE' || s.type === 'VIDEO')
    .map(s => ({
      name: s.title || s.sectionId || 'Media',
      description: s.content?.caption || s.content?.alt || '',
      type: s.type.toLowerCase(),
      url: s.content?.url || s.content?.imageUrl || '',
    }));

  return {
    lessonId: page.legacyLessonId || page.id,
    moduleId: page.module?.id || page.moduleId || '',
    title: page.title || 'Sin título',
    description: page.description || '',
    lastUpdated: page.updatedAt || page.createdAt || new Date().toISOString(),
    authors: [],
    reviewers: [],
    learningObjectives: page.learningObjectives || [],
    estimatedTime: page.estimatedMinutes || 45,
    difficulty: (page.difficulty || 'beginner').toLowerCase(),
    bloomLevel: page.bloomLevel || 'understand',
    // Raw sections preserved for useLessonPages parameter-table check
    sections: sections.map(s => ({
      id: s.sectionId || s.id,
      order: s.order,
      type: s.type.toLowerCase(),
      title: s.title || '',
      content: s.content || {},
    })),
    content: {
      introduction: {
        text: introText,
        objectives: page.learningObjectives || [],
      },
      theory: {
        sections: theorySections,
        examples: [],
        analogies: [],
      },
      visualElements,
      practicalCases,
      keyPoints: keyPoints.length > 0 ? keyPoints : (page.keyTakeaways || []),
      assessment: {
        questions: assessmentQuestions,
      },
      references,
    },
  };
}

// =============================================================================
// API Loading (primary path - DB-backed content)
// =============================================================================

/**
 * Fetch lesson content from the Pages API (database).
 * Uses the coexistence resolver endpoint.
 *
 * @param {string} lessonId - Lesson identifier (matches Page.legacyLessonId)
 * @returns {Promise<Object|null>} Normalized lesson data, or null if not migrated
 * @throws {Error} If the API call fails (network error, 5xx, etc.)
 */
async function loadFromApi(lessonId) {
  // The /backend proxy rewrites to http://localhost:3001/api
  // So /pages/by-lesson/:id → /backend/pages/by-lesson/:id → backend /api/pages/by-lesson/:id
  const response = await apiGet(`/pages/by-lesson/${encodeURIComponent(lessonId)}`);

  const result = response?.data;
  if (!result) return null;

  if (result.source === 'page' && result.data) {
    console.log(`[lessonLoader] DB hit for: ${lessonId}`);
    return transformPageToLessonData(result.data);
  }

  if (result.source === 'lesson') {
    // Not migrated yet — caller should use legacy JSON
    console.log(`[lessonLoader] Not migrated: ${lessonId} (will use legacy JSON)`);
    return null;
  }

  return null;
}

// =============================================================================
// Legacy JSON Loading (fallback for non-migrated content)
// =============================================================================

/**
 * @deprecated Legacy JSON loading for non-migrated content (intermediate/advanced).
 * Will be removed once all content is migrated to the database.
 */
function getLessonPath(lessonId, moduleId) {
  const directModuleMapping = {
    'module-01-inversion-fisiologica': 'lessons/module-01-fundamentals/module-01-inversion-fisiologica.json',
    'module-02-ecuacion-movimiento': 'lessons/module-01-fundamentals/module-02-ecuacion-movimiento.json',
    'module-03-variables-fase': 'lessons/module-01-fundamentals/module-03-variables-fase.json',
    'module-04-modos-ventilatorios': 'lessons/module-01-fundamentals/module-04-modos-ventilatorios.json',
    'module-05-monitorizacion-grafica': 'lessons/module-01-fundamentals/module-05-monitorizacion-grafica.json',
    'module-06-efectos-sistemicos': 'lessons/module-01-fundamentals/module-06-efectos-sistemicos.json',
  };

  if (directModuleMapping[lessonId]) {
    return directModuleMapping[lessonId];
  }

  let normalizedLessonId = lessonId;
  if (lessonId.startsWith('lesson-')) {
    const parts = lessonId.split('-');
    if (parts.length >= 3 && /^\d+$/.test(parts[1])) {
      normalizedLessonId = parts.slice(2).join('-');
    }
  }

  const lessonIdToFileName = {
    'anatomy-overview': 'respiratory-anatomy',
    'airway-structures': 'respiratory-anatomy',
    'lung-mechanics': 'respiratory-anatomy',
    'respiratory-anatomy': 'respiratory-anatomy',
    'respiratory-mechanics': 'respiratory-mechanics',
    'gas-exchange': 'gas-exchange',
    'arterial-blood-gas': 'arterial-blood-gas',
  };

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

  const moduleIdToFolder = {
    'module-02-modalidades-parametros': 'module-02-parameters',
  };

  let moduleFolder = moduleIdToFolder[moduleId] || moduleId;
  if (!moduleFolder.startsWith('module-')) {
    moduleFolder = 'module-01-fundamentals';
  }

  const lessonNumber = lessonIdToNumber[normalizedLessonId] || '01';
  const fileName = lessonIdToFileName[normalizedLessonId] || normalizedLessonId;

  if (moduleFolder === 'module-03-configuration') {
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

    if (exactMatches[normalizedLessonId]) {
      return `${LESSON_PATH_PREFIX}/${moduleFolder}/${exactMatches[normalizedLessonId]}/${normalizedLessonId}.json`;
    }

    const subcategories = ['pathologies', 'protective-strategies', 'weaning'];
    for (const subcat of subcategories) {
      if (normalizedLessonId.includes(subcat.split('-')[0])) {
        return `${LESSON_PATH_PREFIX}/${moduleFolder}/${subcat}/${normalizedLessonId}.json`;
      }
    }

    const categoryMap = {
      'sdra': 'pathologies', 'copd': 'pathologies', 'asthma': 'pathologies', 'pneumonia': 'pathologies',
      'low-tidal': 'protective-strategies', 'permissive': 'protective-strategies',
      'peep': 'protective-strategies', 'lung-protective': 'protective-strategies',
      'sbt': 'weaning', 'readiness': 'weaning',
    };
    for (const [keyword, category] of Object.entries(categoryMap)) {
      if (normalizedLessonId.includes(keyword)) {
        return `${LESSON_PATH_PREFIX}/${moduleFolder}/${category}/${normalizedLessonId}.json`;
      }
    }
  }

  if (moduleFolder === 'module-02-parameters' && lessonId.startsWith('lesson-')) {
    return `${LESSON_PATH_PREFIX}/${moduleFolder}/${lessonId}.json`;
  }

  return `${LESSON_PATH_PREFIX}/${moduleFolder}/lesson-${lessonNumber}-${fileName}.json`;
}

/** @deprecated Used only for non-migrated JSON validation */
export function validateLessonData(lessonData) {
  if (!lessonData || typeof lessonData !== 'object') {
    throw new Error('Lesson data must be a valid object');
  }
  if (lessonData.lessonId && lessonData.content) {
    if (!lessonData.moduleId) throw new Error("Missing required field 'moduleId'");
    if (!lessonData.title) throw new Error("Missing required field 'title'");
    if (typeof lessonData.content !== 'object') throw new Error("Field 'content' must be an object");
  }
  return true;
}

/** @deprecated Used only for non-migrated JSON normalization */
export function normalizeLessonData(rawData) {
  if (rawData.lessonId && rawData.content && rawData.content.introduction) {
    return rawData;
  }
  if (rawData.sections && Array.isArray(rawData.sections)) {
    return normalizeSectionsFormat(rawData);
  }

  return {
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
}

/** @deprecated */
function normalizeSectionsFormat(rawData) {
  const sections = rawData.sections || [];

  const introductionSection = sections.find(s => s.type === 'introduction');
  const introductionText = introductionSection?.content?.markdown ||
                          introductionSection?.content?.text ||
                          introductionSection?.content || '';

  const theorySections = sections
    .filter(s => s.type === 'theory' || s.type === 'procedure')
    .map(s => ({
      title: s.title || '',
      content: s.content?.markdown || s.content?.text || s.content || '',
      media: s.content?.media || s.media || null,
    }));

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

  const practicalCases = sections
    .filter(s => s.type === 'case' || s.type === 'practical')
    .map(s => ({
      id: s.id || `case-${s.order}`,
      title: s.title || '',
      description: s.content?.markdown || s.content?.text || s.content || '',
      patientData: s.content?.patientData || null,
      questions: s.content?.questions || [],
    }));

  const keyPoints = [];
  const summarySection = sections.find(s => s.type === 'summary');
  if (summarySection) {
    const summaryContent = summarySection.content?.markdown || summarySection.content?.text || '';
    const bulletPoints = summaryContent.match(/^[-*]\s+(.+)$/gm);
    if (bulletPoints) {
      keyPoints.push(...bulletPoints.map(bp => bp.replace(/^[-*]\s+/, '')));
    }
  }

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

  const references = [];
  sections.forEach(section => {
    if (section.content?.references) references.push(...section.content.references);
    if (section.references) references.push(...section.references);
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

/**
 * @deprecated Legacy JSON loading for non-migrated content only.
 * Will be removed once all content is migrated to the database.
 */
async function loadFromLegacyJson(lessonId, moduleId) {
  const filePath = getLessonPath(lessonId, moduleId);

  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      let jsonContent;
      try {
        const moduleData = await import(`../${filePath}`);
        jsonContent = moduleData.default || moduleData;
      } catch (importError) {
        const response = await fetch(`/data/${filePath}`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        jsonContent = await response.json();
      }

      validateLessonData(jsonContent);
      const normalized = normalizeLessonData(jsonContent);
      normalized.lessonId = lessonId;
      if (!normalized.moduleId) normalized.moduleId = moduleId;

      return normalized;
    } catch (error) {
      lastError = error;
      console.error(`[lessonLoader] Legacy attempt ${attempt} failed:`, error.message);
      if (attempt < MAX_RETRY_ATTEMPTS) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt));
      }
    }
  }

  throw new Error(
    `Failed to load lesson ${lessonId} after ${MAX_RETRY_ATTEMPTS} attempts: ${lastError.message}`
  );
}

// =============================================================================
// Main Loading Function
// =============================================================================

/**
 * Loads lesson content by ID.
 *
 * Strategy:
 *   1. Return from LRU cache if available.
 *   2. Call Pages API coexistence resolver.
 *   3a. source === "page" → use DB data (no JSON fallback).
 *   3b. source === "lesson" → fall back to legacy JSON (non-migrated content).
 *   4. Cache the result.
 *
 * For migrated content, API errors propagate — there is no silent JSON fallback.
 *
 * @param {string} lessonId - Lesson identifier
 * @param {string} moduleId - Module identifier
 * @returns {Promise<Object>} Normalized lesson data
 */
export async function loadLessonById(lessonId, moduleId) {
  console.log(`[lessonLoader] Loading lesson: ${lessonId} (module: ${moduleId})`);

  // 1. Cache check
  const cached = getCachedLesson(lessonId);
  if (cached) {
    console.log(`[lessonLoader] Cache hit: ${lessonId}`);
    return cached;
  }

  // 2. Try the Pages API (DB-backed content)
  try {
    const apiData = await loadFromApi(lessonId);

    if (apiData) {
      // Migrated content — served from DB
      apiData.lessonId = lessonId;
      if (!apiData.moduleId) apiData.moduleId = moduleId;
      cacheLesson(lessonId, apiData);
      console.log(`[lessonLoader] Loaded from DB: ${lessonId}`);
      return apiData;
    }
  } catch (apiError) {
    // API failed — do NOT silently fall back to JSON for potentially-migrated content.
    // Log the error and let it propagate unless we can confirm the lesson
    // is definitely non-migrated (i.e., intermediate/advanced).
    console.error(`[lessonLoader] API error for ${lessonId}:`, apiError.message || apiError);

    // If we're definitely in SSR or the API is unreachable, try legacy JSON
    // as a last resort for backward compatibility.
    if (typeof window === 'undefined') {
      console.warn(`[lessonLoader] SSR fallback to legacy JSON for: ${lessonId}`);
    } else {
      // In the browser, API should be reachable. Propagate the error.
      throw new Error(
        `No se pudo cargar la lección "${lessonId}" desde la base de datos. ` +
        `Error: ${apiError.message || apiError}`
      );
    }
  }

  // 3. Not migrated (source === "lesson") or SSR fallback — use legacy JSON
  console.log(`[lessonLoader] Falling back to legacy JSON: ${lessonId}`);
  const legacyData = await loadFromLegacyJson(lessonId, moduleId);
  cacheLesson(lessonId, legacyData);
  console.log(`[lessonLoader] Loaded from legacy JSON: ${lessonId}`);
  return legacyData;
}

/**
 * Loads all pages for a module from the database.
 *
 * @param {string} moduleId - Module identifier
 * @returns {Promise<Array<Object>>} Array of page summary objects
 */
export async function loadModuleLessons(moduleId) {
  try {
    const response = await apiGet(`/pages/by-module/${encodeURIComponent(moduleId)}`);
    return response?.data || [];
  } catch (error) {
    console.warn(`[lessonLoader] Failed to load module pages for ${moduleId}:`, error.message);
    return [];
  }
}

// =============================================================================
// Exports
// =============================================================================

export { getLessonPath };

export default {
  LESSON_PATH_PREFIX,
  MODULE_PATH_PREFIX,
  DEFAULT_LANGUAGE,
  MAX_CACHE_SIZE,
  getLessonPath,
  validateLessonData,
  normalizeLessonData,
  getCachedLesson,
  cacheLesson,
  clearCache,
  loadLessonById,
  loadModuleLessons,
};
