/**
 * Content Generator Service
 * Servicio para generar contenido educativo clínico
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

/**
 * Obtiene el token de autenticación desde localStorage o sessionStorage
 */
const getAuthToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token') || sessionStorage.getItem('token');
};

/**
 * Realiza una petición a la API con autenticación
 */
const apiRequest = async (endpoint, method = 'GET', body = null) => {
  const token = getAuthToken();
  
  const headers = {
    'Content-Type': 'application/json'
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    method,
    headers
  };

  if (body && (method === 'POST' || method === 'PUT')) {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Error en la petición');
    }

    return data;
  } catch (error) {
    console.error('API Request Error:', error);
    throw error;
  }
};

/**
 * Genera contenido de lección (sin guardar)
 * @param {Object} context - Contexto para generar la lección
 * @returns {Promise<Object>} Contenido generado con warnings
 */
export const generateContent = async (context) => {
  return apiRequest('/content-generator/generate', 'POST', context);
};

/**
 * Genera y guarda una lección completa
 * @param {Object} params - Parámetros { context, moduleId, order, estimatedTime }
 * @returns {Promise<Object>} Lección guardada con warnings
 */
export const generateAndSaveLesson = async ({ context, moduleId, order, estimatedTime }) => {
  return apiRequest('/content-generator/generate-and-save', 'POST', {
    context,
    moduleId,
    order,
    estimatedTime
  });
};

/**
 * Genera documento base: Fundamentos Fisiológicos
 * @param {Object} params - Parámetros { context, moduleId?, order?, estimatedTime? }
 * @returns {Promise<Object>} Documento generado
 */
export const generatePhysiologyFoundations = async ({ context, moduleId, order, estimatedTime }) => {
  return apiRequest('/content-generator/generate-physiology-foundations', 'POST', {
    context,
    moduleId,
    order,
    estimatedTime
  });
};

/**
 * Genera documento base: Principios de Ventilación
 * @param {Object} params - Parámetros { context, moduleId?, order?, estimatedTime? }
 * @returns {Promise<Object>} Documento generado
 */
export const generateVentilationPrinciples = async ({ context, moduleId, order, estimatedTime }) => {
  return apiRequest('/content-generator/generate-ventilation-principles', 'POST', {
    context,
    moduleId,
    order,
    estimatedTime
  });
};

/**
 * Genera documento base: Configuración del Ventilador
 * @param {Object} params - Parámetros { context, moduleId?, order?, estimatedTime? }
 * @returns {Promise<Object>} Documento generado
 */
export const generateVentilatorConfiguration = async ({ context, moduleId, order, estimatedTime }) => {
  return apiRequest('/content-generator/generate-ventilator-configuration', 'POST', {
    context,
    moduleId,
    order,
    estimatedTime
  });
};

/**
 * Vista previa de contenido generado (sin guardar)
 * @param {Object} context - Contexto para generar la lección
 * @returns {Promise<Object>} Vista previa con estadísticas
 */
export const previewContent = async (context) => {
  return apiRequest('/content-generator/preview', 'POST', context);
};

/**
 * Extrae contexto de un módulo de curriculumData
 * @param {Object} module - Módulo de curriculumData
 * @returns {Object} Contexto estructurado
 */
export const extractContextFromModule = (module) => {
  if (!module) return null;

  const context = {
    topic: module.title || '[[MISSING]]',
    level: mapLevel(module.level),
    learningObjectives: module.learningObjectives || [],
    keyPoints: [],
    parameters: [],
    ranges: {},
    clinicalScenarios: [],
    references: [],
    text: '',
    videoUrl: undefined,
    diagrams: [],
    tables: []
  };

  // Extraer información de las lecciones del módulo
  if (module.lessons && Array.isArray(module.lessons)) {
    module.lessons.forEach((lesson) => {
      if (lesson.content) {
        // Agregar puntos clave
        if (lesson.content.keyPoints) {
          context.keyPoints = [...context.keyPoints, ...lesson.content.keyPoints];
        }

        // Agregar parámetros
        if (lesson.content.parameters) {
          context.parameters = lesson.content.parameters;
        }

        // Agregar rangos
        if (lesson.content.ranges) {
          context.ranges = { ...context.ranges, ...lesson.content.ranges };
        }

        // Agregar escenarios
        if (lesson.content.clinicalScenarios) {
          context.clinicalScenarios = [
            ...context.clinicalScenarios,
            ...lesson.content.clinicalScenarios
          ];
        }

        // Agregar referencias
        if (lesson.content.references) {
          context.references = [...context.references, ...lesson.content.references];
        }

        // Agregar texto o transcripción
        if (lesson.content.text && !context.text) {
          context.text = lesson.content.text;
        } else if (lesson.content.transcript && !context.text) {
          context.text = lesson.content.transcript;
        }

        // Agregar video URL
        if (lesson.content.videoUrl && !context.videoUrl) {
          context.videoUrl = lesson.content.videoUrl;
        }

        // Agregar diagramas
        if (lesson.content.diagrams) {
          context.diagrams = [...context.diagrams, ...lesson.content.diagrams];
        }

        // Agregar tablas
        if (lesson.content.tables) {
          context.tables = [...context.tables, ...lesson.content.tables];
        }

        // Agregar datos del paciente (para casos clínicos)
        if (lesson.content.patientData) {
          context.patientData = lesson.content.patientData;
        }

        // Agregar complicaciones
        if (lesson.content.complications) {
          context.complications = lesson.content.complications;
        }

        // Agregar objetivos
        if (lesson.content.objectives) {
          context.objectives = lesson.content.objectives;
        }
      }
    });
  }

  // Eliminar duplicados
  context.keyPoints = [...new Set(context.keyPoints)];
  context.clinicalScenarios = [...new Set(context.clinicalScenarios)];
  context.references = [...new Set(context.references)];
  context.diagrams = [...new Set(context.diagrams)];
  context.tables = [...new Set(context.tables)];

  return context;
};

/**
 * Mapea el nivel del curriculumData al formato del generador
 * @param {string} level - Nivel del módulo
 * @returns {string} Nivel mapeado
 */
export const mapLevel = (level) => {
  const levelMap = {
    'beginner': 'Beginner',
    'básico': 'Beginner',
    'intermediate': 'Intermediate',
    'intermedio': 'Intermediate',
    'advanced': 'Advanced',
    'avanzado': 'Advanced'
  };

  return levelMap[level?.toLowerCase()] || 'Beginner';
};

/**
 * Cuenta campos con [[MISSING]] en el contenido
 * @param {Object} content - Contenido generado
 * @returns {number} Cantidad de campos faltantes
 */
export const countMissingFields = (content) => {
  if (!content) return 0;
  
  const contentStr = JSON.stringify(content);
  const matches = contentStr.match(/\[\[MISSING\]\]/g);
  
  return matches ? matches.length : 0;
};

/**
 * Valida que el contexto tenga los campos mínimos requeridos
 * @param {Object} context - Contexto a validar
 * @returns {Object} { isValid, errors }
 */
export const validateContext = (context) => {
  const errors = [];

  if (!context.topic || context.topic.trim() === '') {
    errors.push('El campo "topic" es requerido');
  }

  if (!context.level || !['Beginner', 'Intermediate', 'Advanced'].includes(context.level)) {
    errors.push('El campo "level" debe ser Beginner, Intermediate o Advanced');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export default {
  generateContent,
  generateAndSaveLesson,
  generatePhysiologyFoundations,
  generateVentilationPrinciples,
  generateVentilatorConfiguration,
  previewContent,
  extractContextFromModule,
  mapLevel,
  countMissingFields,
  validateContext
};

