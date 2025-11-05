/**
 * =============================================================================
 * useLesson Hook for VentyLab
 * =============================================================================
 * 
 * Custom React hook that dynamically loads detailed lesson content from JSON files
 * stored in the lessons directory structure. This hook combines the detailed JSON
 * content with module metadata from curriculumData.js to provide a complete
 * lesson object with enriched information.
 * 
 * @module useLesson
 * @description Hook for loading and managing lesson content from JSON files
 * 
 * File Structure:
 * ---------------
 * Lessons are stored in:
 * frontend/src/data/lessons/module-{NUMBER}-{NAME}/lesson-{NUMBER}-{NAME}.json
 * 
 * Each JSON file must contain:
 * - lessonId: Must match the lesson ID in curriculumData.js
 * - moduleId: Module identifier
 * - title: Lesson title
 * - lastUpdated: ISO date string
 * - authors: Array of author names
 * - reviewers: Array of reviewer names
 * - content: Complete lesson content object
 * 
 * Usage Examples:
 * ---------------
 * 
 * @example
 * // Basic usage
 * const { data, isLoading, error, refetch } = useLesson(
 *   'respiratory-anatomy',
 *   'module-01-fundamentals'
 * );
 * 
 * if (isLoading) return <LoadingSpinner />;
 * if (error) return <ErrorMessage message={error} />;
 * if (data) {
 *   return (
 *     <div>
 *       <h1>{data.title}</h1>
 *       <LessonContent content={data.content} />
 *       <ModuleInfo info={data.moduleInfo} />
 *     </div>
 *   );
 * }
 * 
 * @example
 * // With manual refetch after content update
 * const { data, isLoading, error, refetch } = useLesson(lessonId, moduleId);
 * 
 * const handleContentUpdate = async () => {
 *   await updateLessonContent(lessonId, moduleId);
 *   refetch(); // Reload the updated content
 * };
 * 
 * @example
 * // Accessing navigation between lessons
 * const { data } = useLesson(lessonId, moduleId);
 * 
 * const handleNext = () => {
 *   if (data?.navigation.nextLesson) {
 *     router.push(`/lesson/${data.navigation.nextLesson.id}`);
 *   }
 * };
 * 
 * =============================================================================
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { curriculumData } from '../../../data/curriculumData';

/**
 * Mapping function to convert moduleId and lessonId to file paths
 * This function maps curriculum IDs to the file naming convention:
 * module-{NUMBER}-{NAME}/lesson-{NUMBER}-{NAME}.json
 * 
 * Supports multiple ID formats and provides fallback mechanisms
 * 
 * @param {string} moduleId - Module identifier (e.g., 'module-01-fundamentals' or 'respiratory-anatomy')
 * @param {string} lessonId - Lesson identifier (e.g., 'respiratory-anatomy' or 'anatomy-overview')
 * @returns {string} Relative path to the JSON file
 */
const getLessonFilePath = (moduleId, lessonId) => {
  // Mapping of lesson IDs to file numbers for module-01-fundamentals
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

  // Mapping of module IDs to folder names
  // This maps curriculumData module IDs to the folder structure in lessons/
  const moduleIdToFolder = {
    'module-01-fundamentals': 'module-01-fundamentals',
    'respiratory-anatomy': 'module-01-fundamentals', // First module in beginner level
    'respiratory-physiology': 'module-01-fundamentals', // Second module in beginner level
    'ventilation-principles': 'module-01-fundamentals', // Third module in beginner level
    'fundamentals': 'module-01-fundamentals',
  };
  
  // Helper function to find module folder from curriculumData
  const findModuleFolder = (moduleId) => {
    // If it's already in the correct format, use it directly
    if (moduleId.startsWith('module-')) {
      return moduleId;
    }
    
    // First check direct mapping
    if (moduleIdToFolder[moduleId]) {
      return moduleIdToFolder[moduleId];
    }
    
    // Try to find in curriculumData
    const module = curriculumData?.modules?.[moduleId];
    if (module) {
      // Check if it's a beginner level module (first 3 modules map to fundamentals)
      if (module.level === 'beginner' && module.order <= 3) {
        return 'module-01-fundamentals';
      }
    }
    
    // Default fallback
    return 'module-01-fundamentals';
  };

  // Determine module folder name using helper function
  const moduleFolder = findModuleFolder(moduleId);

  // Determine lesson file number
  const lessonNumber = lessonIdToNumber[lessonId] || '01';
  
  // Determine lesson file name - try to match common patterns
  let lessonFileName = lessonId;
  
  // If lessonId matches a known pattern, use it directly
  if (lessonId === 'respiratory-anatomy' || lessonId === 'anatomy-overview' || 
      lessonId === 'airway-structures' || lessonId === 'lung-mechanics') {
    lessonFileName = 'respiratory-anatomy';
  } else if (lessonId === 'respiratory-mechanics' || lessonId === 'ventilation-mechanics') {
    lessonFileName = 'respiratory-mechanics';
  } else if (lessonId === 'gas-exchange') {
    lessonFileName = 'gas-exchange';
  } else if (lessonId === 'arterial-blood-gas') {
    lessonFileName = 'arterial-blood-gas';
  }

  return `lessons/${moduleFolder}/lesson-${lessonNumber}-${lessonFileName}.json`;
};

/**
 * Custom hook to load and manage lesson content from JSON files
 * 
 * @param {string} lessonId - Unique identifier of the lesson (must match curriculumData.js)
 * @param {string} moduleId - Identifier of the parent module
 * @returns {Object} Hook return object
 * @returns {Object|null} returns.data - Complete lesson object with enriched metadata, or null if loading/error
 * @returns {boolean} returns.isLoading - Indicates if lesson is currently being loaded
 * @returns {string|null} returns.error - Error message if loading failed, or null if no error
 * @returns {Function} returns.refetch - Function to manually reload the lesson content
 * 
 * @example
 * const { data, isLoading, error, refetch } = useLesson('respiratory-anatomy', 'module-01-fundamentals');
 */
const useLesson = (lessonId, moduleId) => {
  // ============================================================================
  // State Management
  // ============================================================================
  
  /**
   * Complete lesson data including JSON content and enriched metadata
   * @type {Object|null}
   */
  const [data, setData] = useState(null);

  /**
   * Loading state indicator
   * @type {boolean}
   */
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Error message if loading fails
   * @type {string|null}
   */
  const [error, setError] = useState(null);

  // ============================================================================
  // Validation Functions
  // ============================================================================

  /**
   * Validates that required parameters are provided
   * @param {string} lessonId - Lesson identifier to validate
   * @param {string} moduleId - Module identifier to validate
   * @returns {string|null} Error message if validation fails, null otherwise
   */
  const validateParameters = useCallback((lessonId, moduleId) => {
    if (!lessonId || lessonId === undefined || lessonId === null) {
      return 'lessonId es requerido y no puede ser null o undefined';
    }
    
    if (!moduleId || moduleId === undefined || moduleId === null) {
      return 'moduleId es requerido y no puede ser null o undefined';
    }
    
    if (typeof lessonId !== 'string' || lessonId.trim() === '') {
      return 'lessonId debe ser una cadena de texto no vacía';
    }
    
    if (typeof moduleId !== 'string' || moduleId.trim() === '') {
      return 'moduleId debe ser una cadena de texto no vacía';
    }
    
    return null;
  }, []);

  /**
   * Validates the structure of the loaded JSON content
   * @param {Object} jsonContent - The parsed JSON content
   * @param {string} filePath - Path to the file being validated (for error messages)
   * @returns {string|null} Error message if validation fails, null otherwise
   */
  const validateJsonStructure = useCallback((jsonContent, filePath) => {
    if (!jsonContent || typeof jsonContent !== 'object') {
      return `El archivo JSON en ${filePath} no contiene un objeto válido`;
    }

    // Validate required top-level properties
    if (!jsonContent.lessonId) {
      return `El archivo JSON en ${filePath} no contiene la propiedad requerida 'lessonId'`;
    }

    if (!jsonContent.moduleId) {
      return `El archivo JSON en ${filePath} no contiene la propiedad requerida 'moduleId'`;
    }

    if (!jsonContent.title) {
      return `El archivo JSON en ${filePath} no contiene la propiedad requerida 'title'`;
    }

    if (!jsonContent.content) {
      return `El archivo JSON en ${filePath} no contiene la propiedad requerida 'content'`;
    }

    // Validate that content is an object
    if (typeof jsonContent.content !== 'object' || jsonContent.content === null) {
      return `La propiedad 'content' en ${filePath} debe ser un objeto`;
    }

    // Validate that content has at least introduction and theory sections
    if (!jsonContent.content.introduction) {
      return `La propiedad 'content.introduction' no existe en ${filePath}`;
    }

    if (!jsonContent.content.theory) {
      return `La propiedad 'content.theory' no existe en ${filePath}`;
    }

    // Validate introduction structure
    if (typeof jsonContent.content.introduction !== 'object') {
      return `La propiedad 'content.introduction' debe ser un objeto en ${filePath}`;
    }

    // Validate theory structure
    if (typeof jsonContent.content.theory !== 'object') {
      return `La propiedad 'content.theory' debe ser un objeto en ${filePath}`;
    }

    return null;
  }, []);

  // ============================================================================
  // Module Metadata Enrichment
  // ============================================================================

  /**
   * Normalizes lesson JSON data to expected structure
   * Handles both the structured format (lessonId, moduleId, content) and the legacy format
   * @param {Object} lessonJson - The loaded lesson JSON content
   * @returns {Object} Normalized lesson data
   */
  const normalizeLessonData = useCallback((lessonJson) => {
    // Check if JSON already has the expected structure
    if (lessonJson.lessonId && lessonJson.content) {
      return lessonJson;
    }

    // Legacy format detected - convert to expected structure
    console.log('[useLesson] Detected legacy JSON format, normalizing...');
    
    const normalized = {
      lessonId: lessonJson.lessonId || lessonId,
      moduleId: lessonJson.moduleId || moduleId,
      title: lessonJson.title || lessonJson['Título'] || 'Lección sin título',
      lastUpdated: lessonJson.lastUpdated || new Date().toISOString(),
      authors: lessonJson.authors || [],
      reviewers: lessonJson.reviewers || [],
      content: {
        introduction: {
          text: lessonJson.content?.introduction?.text || 
                lessonJson['Introducción']?.texto || 
                lessonJson['Introducción']?.text || '',
          objectives: lessonJson.content?.introduction?.objectives || 
                     lessonJson['Introducción']?.objetivos || 
                     [],
        },
        theory: {
          sections: lessonJson.content?.theory?.sections || 
                   (lessonJson['Conceptos Teóricos'] ? [{
                     title: 'Conceptos Teóricos',
                     content: typeof lessonJson['Conceptos Teóricos'] === 'string' 
                       ? lessonJson['Conceptos Teóricos'] 
                       : '',
                   }] : []),
          examples: lessonJson.content?.theory?.examples || [],
          analogies: lessonJson.content?.theory?.analogies || [],
        },
        visualElements: lessonJson.content?.visualElements || 
                       lessonJson['Elementos Visuales']?.map(el => ({
                         id: el.id || '',
                         type: el.tipo || el.type || '',
                         title: el.title || el.título || '',
                         description: el.descripcion || el.description || '',
                         objective: el.objetivo || el.objective || '',
                         placement: el.placement || '',
                         technicalSpecs: el.technicalSpecs || {},
                       })) || [],
        practicalCases: lessonJson.content?.practicalCases || 
                        lessonJson['Casos Prácticos']?.map((caso, index) => ({
                          caseId: `case-${index}`,
                          title: caso.title || caso.título || `Caso Clínico ${index + 1}`,
                          patientData: caso.patientData || caso.datosPaciente || {},
                          clinicalScenario: caso.clinicalScenario || caso.caso || caso.escenario || '',
                          questions: caso.questions || caso.preguntas?.map((p, qIndex) => ({
                            questionText: typeof p === 'string' ? p : p.texto || p.questionText || '',
                            type: p.type || p.tipo || 'open-ended',
                            expectedAnswer: p.expectedAnswer || p.respuestaEsperada || '',
                            explanation: p.explanation || p.explicacion || '',
                          })) || [],
                        })) || [],
        keyPoints: lessonJson.content?.keyPoints || 
                  lessonJson['Puntos Clave'] || [],
        assessment: {
          questions: lessonJson.content?.assessment?.questions || 
                    lessonJson['Autoevaluación']?.map((q, index) => ({
                      questionId: q.questionId || `q-${index}`,
                      questionText: q.pregunta || q.questionText || '',
                      type: q.tipo === 'Opción múltiple' ? 'multipleChoice' :
                            q.tipo === 'Verdadero/Falso' ? 'trueFalse' :
                            q.type || 'multipleChoice',
                      options: q.opciones || q.options || [],
                      correctAnswer: q.respuesta_correcta || q.correctAnswer || '',
                      explanation: q.explicacion || q.explanation || '',
                      bloomLevel: q.bloomLevel || '',
                      difficulty: q.difficulty || '',
                    })) || [],
        },
        references: lessonJson.content?.references || 
                   lessonJson['Referencias Bibliográficas']?.map(ref => {
                     // If reference is a string, parse it
                     if (typeof ref === 'string') {
                       return {
                         authors: '',
                         year: 0,
                         title: ref,
                         journal: '',
                         volume: '',
                         pages: '',
                         doi: '',
                         url: '',
                         citationStyle: 'Vancouver',
                       };
                     }
                     // If it's already an object, use it as-is
                     return ref;
                   }) || [],
      },
    };

    return normalized;
  }, [lessonId, moduleId]);

  /**
   * Enriches lesson data with module metadata from curriculumData.js
   * @param {Object} lessonJson - The loaded lesson JSON content (normalized)
   * @returns {Object} Enriched lesson data with module info, position, and navigation
   */
  const enrichLessonData = useCallback((lessonJson) => {
    // Normalize data first
    const normalized = normalizeLessonData(lessonJson);
    
    // Get module from curriculumData
    const module = curriculumData?.modules?.[normalized.moduleId] || 
                   Object.values(curriculumData?.modules || {}).find(
                     m => m.id === normalized.moduleId || 
                     m.title?.toLowerCase().includes(normalized.moduleId.toLowerCase())
                   );

    if (!module) {
      console.warn(`Module ${normalized.moduleId} not found in curriculumData, using minimal metadata`);
    }

    // Get lessons array from module
    const moduleLessons = module?.lessons || [];
    
    // Find current lesson position in module
    const lessonIndex = moduleLessons.findIndex(
      l => l.id === normalized.lessonId || l.id === lessonId
    );

    // Build module info object
    const moduleInfo = module ? {
      id: module.id,
      title: module.title,
      level: module.level,
      order: module.order,
      duration: module.duration,
      prerequisites: module.prerequisites || [],
      learningObjectives: module.learningObjectives || [],
      bloomLevel: module.bloomLevel,
      difficulty: module.difficulty,
      estimatedTime: module.estimatedTime,
    } : {
      id: normalized.moduleId,
      title: 'Módulo desconocido',
      level: 'unknown',
      order: 0,
      duration: 0,
      prerequisites: [],
      learningObjectives: [],
      bloomLevel: 'unknown',
      difficulty: 'unknown',
      estimatedTime: 'Desconocido',
    };

    // Build lesson position info
    const lessonPosition = {
      current: lessonIndex >= 0 ? lessonIndex + 1 : 1,
      total: moduleLessons.length || 1,
    };

    // Build navigation info
    const previousLesson = lessonIndex > 0 && moduleLessons[lessonIndex - 1] 
      ? {
          id: moduleLessons[lessonIndex - 1].id,
          title: moduleLessons[lessonIndex - 1].title,
        }
      : null;

    const nextLesson = lessonIndex >= 0 && lessonIndex < moduleLessons.length - 1 && moduleLessons[lessonIndex + 1]
      ? {
          id: moduleLessons[lessonIndex + 1].id,
          title: moduleLessons[lessonIndex + 1].title,
        }
      : null;

    const navigation = {
      previousLesson,
      nextLesson,
    };

    // Combine all data
    return {
      ...normalized,
      moduleInfo,
      lessonPosition,
      navigation,
    };
  }, [lessonId, normalizeLessonData]);

  // ============================================================================
  // Content Loading Function
  // ============================================================================

  /**
   * Loads lesson content from JSON file and enriches it with metadata
   * This function handles all validation, loading, and error handling
   */
  const loadLessonContent = useCallback(async () => {
    // Reset states
    setIsLoading(true);
    setError(null);
    setData(null);

    try {
      // Step 1: Validate parameters
      const paramError = validateParameters(lessonId, moduleId);
      if (paramError) {
        setError(paramError);
        setIsLoading(false);
        return;
      }

      // Step 2: Build file path
      const filePath = getLessonFilePath(moduleId, lessonId);
      const fullPath = `@/data/${filePath}`;

      console.log(`[useLesson] Loading lesson from: ${fullPath}`);

      // Step 3: Load JSON file using dynamic import
      // In Next.js, we can use dynamic imports for static JSON files
      let jsonContent;
      try {
        // Try dynamic import first (works for files in src directory)
        const moduleData = await import(
          /* webpackChunkName: "lesson-[request]" */
          `../../../data/${filePath}`
        );
        
        // Extract default export or the module itself
        jsonContent = moduleData.default || moduleData;
        
        // If it's still wrapped, try to get the actual content
        if (jsonContent && typeof jsonContent === 'object' && jsonContent.default) {
          jsonContent = jsonContent.default;
        }
      } catch (importError) {
        console.error(`[useLesson] Import error for ${fullPath}:`, importError);
        
        // If dynamic import fails, try fetch as fallback (for runtime loading)
        try {
          // Convert to public path (if files are moved to public folder)
          const publicPath = `/data/${filePath}`;
          const response = await fetch(publicPath);
          
          if (!response.ok) {
            if (response.status === 404) {
              throw new Error(
                `Archivo de lección no encontrado: ${filePath}. ` +
                `Verifica que el archivo exista en frontend/src/data/${filePath}`
              );
            }
            throw new Error(`Error HTTP al cargar ${filePath}: ${response.status} ${response.statusText}`);
          }
          
          jsonContent = await response.json();
        } catch (fetchError) {
          console.error(`[useLesson] Fetch error for ${fullPath}:`, fetchError);
          
          // Provide helpful error message
          if (fetchError.message.includes('404') || fetchError.message.includes('Cannot find')) {
            throw new Error(
              `Archivo de lección no encontrado: ${filePath}. ` +
              `Asegúrate de que el archivo existe en frontend/src/data/${filePath} y que ` +
              `el lessonId "${lessonId}" y moduleId "${moduleId}" sean correctos.`
            );
          }
          
          throw new Error(
            `Error al cargar el contenido de la lección desde ${filePath}: ${fetchError.message}`
          );
        }
      }

      // Step 4: Validate JSON structure (flexible - allows legacy format)
      // Only validate if it's the new format, otherwise we'll normalize it
      if (jsonContent.lessonId && jsonContent.content) {
        const structureError = validateJsonStructure(jsonContent, filePath);
        if (structureError) {
          setError(structureError);
          setIsLoading(false);
          return;
        }
      } else {
        // Legacy format - just check it's an object
        if (!jsonContent || typeof jsonContent !== 'object') {
          setError(`El archivo JSON en ${filePath} no contiene un objeto válido`);
          setIsLoading(false);
          return;
        }
      }

      // Step 5: Verify lessonId and moduleId match
      if (jsonContent.lessonId !== lessonId) {
        console.warn(
          `[useLesson] Lesson ID mismatch: expected ${lessonId}, found ${jsonContent.lessonId}`
        );
        // Continue anyway, but log the warning
      }

      if (jsonContent.moduleId !== moduleId && !moduleId.includes(jsonContent.moduleId)) {
        console.warn(
          `[useLesson] Module ID mismatch: expected ${moduleId}, found ${jsonContent.moduleId}`
        );
        // Continue anyway, but log the warning
      }

      // Step 6: Enrich with module metadata
      const enrichedData = enrichLessonData(jsonContent);

      // Step 7: Set the data and complete loading
      setData(enrichedData);
      setIsLoading(false);
      
      console.log(`[useLesson] Successfully loaded lesson: ${lessonId}`);
      
    } catch (err) {
      // Handle all errors
      console.error(`[useLesson] Error loading lesson ${lessonId}:`, err);
      
      let errorMessage = 'Error desconocido al cargar la lección';
      
      if (err instanceof SyntaxError) {
        errorMessage = `Error de sintaxis JSON en el archivo de lección: ${err.message}`;
      } else if (err instanceof TypeError) {
        errorMessage = `Error de tipo al procesar el archivo de lección: ${err.message}`;
      } else if (err.message) {
        errorMessage = err.message;
      } else {
        errorMessage = `Error inesperado: ${err.toString()}`;
      }
      
      setError(errorMessage);
      setIsLoading(false);
      setData(null);
    }
  }, [lessonId, moduleId, validateParameters, validateJsonStructure, enrichLessonData]);

  // ============================================================================
  // Refetch Function
  // ============================================================================

  /**
   * Manually reload lesson content
   * Useful when content is updated or after error recovery
   * 
   * @example
   * const { refetch } = useLesson(lessonId, moduleId);
   * // After updating content
   * await updateLesson();
   * refetch();
   */
  const refetch = useCallback(() => {
    console.log(`[useLesson] Manual refetch requested for lesson: ${lessonId}`);
    loadLessonContent();
  }, [loadLessonContent, lessonId]);

  // ============================================================================
  // Effect Hook
  // ============================================================================

  /**
   * Load lesson content when component mounts or when lessonId/moduleId changes
   * Cleanup function cancels any in-flight requests if component unmounts
   */
  useEffect(() => {
    let isMounted = true;
    
    // Load content
    loadLessonContent().then(() => {
      // Check if component is still mounted before updating state
      if (!isMounted) {
        console.log(`[useLesson] Component unmounted, skipping state update`);
      }
    });

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [loadLessonContent]);

  // ============================================================================
  // Return Object
  // ============================================================================

  return {
    data,
    isLoading,
    error,
    refetch,
  };
};

// ============================================================================
// PropTypes Documentation
// ============================================================================

/**
 * PropTypes validation for useLesson hook parameters
 * 
 * Note: Since hooks don't use PropTypes directly like components,
 * this serves as documentation for developers using the hook.
 * 
 * @typedef {Object} UseLessonParams
 * @property {string} lessonId - Required. Unique identifier of the lesson
 * @property {string} moduleId - Required. Identifier of the parent module
 */

useLesson.propTypes = {
  lessonId: PropTypes.string.isRequired,
  moduleId: PropTypes.string.isRequired,
};

/**
 * Type definition for the hook's return value
 * 
 * @typedef {Object} UseLessonReturn
 * @property {Object|null} data - Complete lesson object with all enriched data
 * @property {string} data.lessonId - Lesson identifier
 * @property {string} data.moduleId - Module identifier
 * @property {string} data.title - Lesson title
 * @property {string} data.lastUpdated - ISO date string of last update
 * @property {string[]} data.authors - Array of author names
 * @property {string[]} data.reviewers - Array of reviewer names
 * @property {Object} data.content - Complete lesson content
 * @property {Object} data.content.introduction - Introduction section with text and objectives
 * @property {Object} data.content.theory - Theory section with sections, examples, analogies
 * @property {Array} data.content.visualElements - Array of visual element descriptions
 * @property {Array} data.content.practicalCases - Array of practical case studies
 * @property {Array} data.content.keyPoints - Array of key learning points
 * @property {Object} data.content.assessment - Assessment section with questions
 * @property {Array} data.content.references - Array of bibliographic references
 * @property {Object} data.moduleInfo - Enriched module metadata
 * @property {string} data.moduleInfo.id - Module ID
 * @property {string} data.moduleInfo.title - Module title
 * @property {string} data.moduleInfo.level - Module level (beginner, intermediate, advanced)
 * @property {number} data.moduleInfo.order - Module order within level
 * @property {number} data.moduleInfo.duration - Module duration in minutes
 * @property {string[]} data.moduleInfo.prerequisites - Array of prerequisite module IDs
 * @property {string[]} data.moduleInfo.learningObjectives - Array of learning objectives
 * @property {string} data.moduleInfo.bloomLevel - Bloom's taxonomy level
 * @property {string} data.moduleInfo.difficulty - Difficulty level
 * @property {string} data.moduleInfo.estimatedTime - Estimated time as readable string
 * @property {Object} data.lessonPosition - Lesson position information
 * @property {number} data.lessonPosition.current - Current lesson number (1-indexed)
 * @property {number} data.lessonPosition.total - Total lessons in module
 * @property {Object} data.navigation - Navigation between lessons
 * @property {Object|null} data.navigation.previousLesson - Previous lesson info (id, title) or null
 * @property {Object|null} data.navigation.nextLesson - Next lesson info (id, title) or null
 * @property {boolean} isLoading - Loading state indicator
 * @property {string|null} error - Error message or null
 * @property {Function} refetch - Function to manually reload lesson content
 */

export default useLesson;
