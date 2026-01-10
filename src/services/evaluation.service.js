/**
 * Evaluation Service - Servicio de evaluación de configuraciones
 *
 * Este servicio proporciona funcionalidades para evaluar las configuraciones del ventilador
 * realizadas por el usuario y compararlas con configuraciones expertas.
 *
 * NOTA: Esta es una implementación stub/mock para preparar la integración futura.
 * Las funciones retornan datos simulados pero con interfaces bien definidas que
 * facilitarán la implementación real cuando se desarrolle el módulo de evaluación.
 *
 * @module evaluation.service
 */

// Simular delay de red para hacer el mock más realista
const simulateNetworkDelay = (ms = 500) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Casos clínicos de ejemplo para evaluación
 * En producción, estos vendrán del backend
 */
const MOCK_PATIENT_CASES = {
  'case-sdra-001': {
    id: 'case-sdra-001',
    title: 'SDRA Moderado Post-Neumonía',
    description: 'Paciente de 55 años con SDRA moderado secundario a neumonía bacteriana',
    clinicalData: {
      age: 55,
      weight: 75,
      height: 170,
      diagnosis: 'SDRA moderado',
      pao2_fio2: 150,
      compliance: 35,
      peep: 12,
      xray: 'Infiltrados bilaterales'
    },
    difficulty: 'intermediate'
  },
  'case-copd-001': {
    id: 'case-copd-001',
    title: 'Exacerbación Severa de EPOC',
    description: 'Paciente de 68 años con exacerbación severa de EPOC',
    clinicalData: {
      age: 68,
      weight: 70,
      height: 165,
      diagnosis: 'Exacerbación EPOC',
      paco2: 65,
      ph: 7.28,
      autopeep: 'Presente',
      wheezing: 'Bilateral'
    },
    difficulty: 'intermediate'
  }
};

/**
 * Configuraciones expertas de referencia
 * En producción, estas vendrán del backend y serán validadas por especialistas
 */
const MOCK_EXPERT_CONFIGURATIONS = {
  'case-sdra-001': {
    caseId: 'case-sdra-001',
    expertId: 'expert-001',
    expertName: 'Dr. María González',
    configuration: {
      mode: 'VCV', // Volumen Control Ventilation
      tidalVolume: 450, // 6 ml/kg peso ideal (75kg)
      peep: 14,
      fio2: 0.6,
      respiratoryRate: 20,
      flowRate: 60,
      plateauPressure: 28,
      drivingPressure: 14
    },
    rationale: {
      mode: 'VCV permite control estricto del volumen tidal para protección pulmonar',
      tidalVolume: 'Ventilación protectora a 6 ml/kg peso ideal según protocolo ARDSNet',
      peep: 'PEEP moderado-alto para reclutamiento alveolar en SDRA moderado',
      fio2: 'FiO2 60% para mantener SpO2 > 88% minimizando toxicidad por oxígeno',
      respiratoryRate: 'FR para mantener ventilación minuto adecuada con volumen bajo',
      plateauPressure: 'Presión plateau < 30 cmH2O para prevenir volutrauma'
    },
    acceptableRanges: {
      tidalVolume: { min: 420, max: 480 },
      peep: { min: 12, max: 16 },
      fio2: { min: 0.5, max: 0.7 },
      respiratoryRate: { min: 18, max: 24 },
      plateauPressure: { max: 30 }
    }
  },
  'case-copd-001': {
    caseId: 'case-copd-001',
    expertId: 'expert-002',
    expertName: 'Dr. Carlos Rodríguez',
    configuration: {
      mode: 'PSV', // Pressure Support Ventilation
      pressureSupport: 15,
      peep: 5,
      fio2: 0.35,
      inspiratoryTime: 0.8,
      flowCycle: 25
    },
    rationale: {
      mode: 'PSV permite respiración espontánea y reduce auto-PEEP',
      pressureSupport: 'PS suficiente para reducir trabajo respiratorio sin hiperinflación',
      peep: 'PEEP bajo para evitar hiperinflación dinámica',
      fio2: 'FiO2 relativamente baja, paciente EPOC tolera hipoxemia leve',
      inspiratoryTime: 'Tiempo inspiratorio corto para permitir espiración completa'
    },
    acceptableRanges: {
      pressureSupport: { min: 12, max: 18 },
      peep: { min: 4, max: 6 },
      fio2: { min: 0.3, max: 0.4 },
      inspiratoryTime: { min: 0.7, max: 1.0 }
    }
  }
};

/**
 * Submits a user's ventilator configuration for evaluation
 *
 * @param {Object} data - Submission data
 * @param {Object} data.patientCase - Patient case object or case ID
 * @param {Object} data.userConfiguration - User's ventilator configuration
 * @param {string} data.userConfiguration.mode - Ventilation mode
 * @param {number} data.userConfiguration.tidalVolume - Tidal volume (if applicable)
 * @param {number} data.userConfiguration.peep - PEEP level
 * @param {number} data.userConfiguration.fio2 - FiO2 (0-1 or 0-100)
 * @param {number} data.userConfiguration.respiratoryRate - Respiratory rate
 * @param {Object} data.userConfiguration.[...] - Other parameters
 * @param {string} [data.userId] - User ID (optional for now)
 *
 * @returns {Promise<Object>} Evaluation result with comparative analysis
 *
 * @example
 * const result = await submitConfiguration({
 *   patientCase: 'case-sdra-001',
 *   userConfiguration: {
 *     mode: 'VCV',
 *     tidalVolume: 450,
 *     peep: 14,
 *     fio2: 0.6,
 *     respiratoryRate: 20
 *   }
 * });
 */
export async function submitConfiguration({ patientCase, userConfiguration, userId = null }) {
  await simulateNetworkDelay(800);

  // Validar entrada
  if (!patientCase || !userConfiguration) {
    throw new Error('patientCase and userConfiguration are required');
  }

  const caseId = typeof patientCase === 'string' ? patientCase : patientCase.id;

  // Obtener configuración experta
  const expertConfig = MOCK_EXPERT_CONFIGURATIONS[caseId];
  if (!expertConfig) {
    throw new Error(`No expert configuration found for case: ${caseId}`);
  }

  // Calcular score y análisis
  const analysis = calculateConfigurationScore(userConfiguration, expertConfig);

  // Simular respuesta del backend
  return {
    success: true,
    evaluationId: `eval-${Date.now()}`,
    timestamp: new Date().toISOString(),
    caseId,
    userId,
    score: analysis.overallScore,
    grade: getGrade(analysis.overallScore),
    analysis,
    expertConfiguration: expertConfig.configuration,
    expertRationale: expertConfig.rationale,
    recommendations: generateRecommendations(analysis),
    nextSteps: [
      'Revisa los parámetros marcados en rojo',
      'Lee la justificación del experto para cada parámetro',
      'Intenta otra evaluación con las recomendaciones aplicadas'
    ]
  };
}

/**
 * Retrieves the expert configuration for a specific patient case
 *
 * @param {string} patientCaseId - ID of the patient case
 * @returns {Promise<Object>} Expert configuration with rationale
 *
 * @example
 * const expertConfig = await getExpertConfiguration('case-sdra-001');
 */
export async function getExpertConfiguration(patientCaseId) {
  await simulateNetworkDelay(400);

  const expertConfig = MOCK_EXPERT_CONFIGURATIONS[patientCaseId];

  if (!expertConfig) {
    throw new Error(`Expert configuration not found for case: ${patientCaseId}`);
  }

  return {
    success: true,
    ...expertConfig
  };
}

/**
 * Retrieves user's evaluation history
 *
 * @param {string} [userId] - User ID (optional, uses current user if not provided)
 * @param {Object} [filters] - Filter options
 * @param {string} [filters.caseId] - Filter by specific case
 * @param {Date} [filters.fromDate] - Filter from date
 * @param {Date} [filters.toDate] - Filter to date
 * @param {number} [filters.limit=10] - Number of results to return
 *
 * @returns {Promise<Object>} Evaluation history
 *
 * @example
 * const history = await getEvaluationHistory(null, { limit: 5 });
 */
export async function getEvaluationHistory(userId = null, filters = {}) {
  await simulateNetworkDelay(600);

  // Mock data - En producción esto vendría del backend
  const mockHistory = [
    {
      evaluationId: 'eval-001',
      caseId: 'case-sdra-001',
      caseTitle: 'SDRA Moderado Post-Neumonía',
      timestamp: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 días atrás
      score: 85,
      grade: 'B',
      attempts: 2
    },
    {
      evaluationId: 'eval-002',
      caseId: 'case-copd-001',
      caseTitle: 'Exacerbación Severa de EPOC',
      timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 día atrás
      score: 72,
      grade: 'C',
      attempts: 1
    }
  ];

  const limit = filters.limit || 10;

  return {
    success: true,
    userId,
    evaluations: mockHistory.slice(0, limit),
    total: mockHistory.length,
    filters
  };
}

/**
 * Compares user configuration with expert configuration and returns detailed score
 *
 * @param {Object} userConfiguration - User's ventilator configuration
 * @param {Object} expertConfig - Expert configuration with acceptable ranges
 * @returns {Object} Detailed scoring and analysis
 *
 * @example
 * const score = calculateConfigurationScore(userConfig, expertConfig);
 */
export function calculateConfigurationScore(userConfiguration, expertConfig) {
  const { configuration: expertSettings, acceptableRanges } = expertConfig;

  const parameterScores = [];
  let totalScore = 0;
  let maxScore = 0;

  // Evaluar cada parámetro
  for (const [param, expertValue] of Object.entries(expertSettings)) {
    const userValue = userConfiguration[param];

    if (userValue === undefined) {
      // Parámetro no proporcionado por el usuario
      parameterScores.push({
        parameter: param,
        score: 0,
        maxScore: 10,
        status: 'missing',
        userValue: null,
        expertValue,
        feedback: `Parámetro ${param} no fue configurado`,
        recommendation: `Configura ${param} según el protocolo clínico`
      });
      maxScore += 10;
      continue;
    }

    // Verificar si está dentro del rango aceptable
    const range = acceptableRanges[param];
    let score = 0;
    let status = 'incorrect';
    let feedback = '';
    let recommendation = '';

    if (!range) {
      // No hay rango definido, comparar directamente
      if (userValue === expertValue) {
        score = 10;
        status = 'perfect';
        feedback = 'Valor correcto';
      } else {
        score = 5;
        status = 'acceptable';
        feedback = 'Valor aceptable pero no óptimo';
        recommendation = `Considera usar ${expertValue}`;
      }
    } else {
      // Hay rango definido
      const { min, max } = range;

      if (max !== undefined && userValue > max) {
        score = 2;
        status = 'too-high';
        feedback = `Valor muy alto (máximo recomendado: ${max})`;
        recommendation = `Reduce ${param} a rango ${min}-${max}`;
      } else if (min !== undefined && userValue < min) {
        score = 2;
        status = 'too-low';
        feedback = `Valor muy bajo (mínimo recomendado: ${min})`;
        recommendation = `Aumenta ${param} a rango ${min}-${max}`;
      } else if (userValue === expertValue) {
        score = 10;
        status = 'perfect';
        feedback = 'Valor óptimo según configuración experta';
      } else {
        score = 8;
        status = 'acceptable';
        feedback = 'Valor dentro del rango aceptable';
        recommendation = `Valor óptimo sugerido: ${expertValue}`;
      }
    }

    parameterScores.push({
      parameter: param,
      score,
      maxScore: 10,
      status,
      userValue,
      expertValue,
      acceptableRange: range,
      feedback,
      recommendation
    });

    totalScore += score;
    maxScore += 10;
  }

  const overallScore = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  // Categorizar parámetros por estado
  const criticalErrors = parameterScores.filter(p => p.status === 'too-high' || p.status === 'too-low');
  const perfectParameters = parameterScores.filter(p => p.status === 'perfect');
  const acceptableParameters = parameterScores.filter(p => p.status === 'acceptable');

  return {
    overallScore,
    totalScore,
    maxScore,
    parameterScores,
    criticalErrors: criticalErrors.length,
    perfectParameters: perfectParameters.length,
    acceptableParameters: acceptableParameters.length,
    summary: {
      perfect: perfectParameters.length,
      acceptable: acceptableParameters.length,
      needsImprovement: criticalErrors.length,
      total: parameterScores.length
    }
  };
}

/**
 * Obtiene todas los casos de pacientes disponibles para evaluación
 *
 * @param {Object} [filters] - Filtros opcionales
 * @param {string} [filters.difficulty] - Nivel de dificultad
 * @param {string} [filters.pathology] - Filtrar por patología
 *
 * @returns {Promise<Object>} Lista de casos disponibles
 */
export async function getAvailableCases(filters = {}) {
  await simulateNetworkDelay(300);

  let cases = Object.values(MOCK_PATIENT_CASES);

  if (filters.difficulty) {
    cases = cases.filter(c => c.difficulty === filters.difficulty);
  }

  return {
    success: true,
    cases,
    total: cases.length,
    filters
  };
}

/**
 * Obtiene un caso específico de paciente por ID
 *
 * @param {string} caseId - ID del caso
 * @returns {Promise<Object>} Datos del caso
 */
export async function getPatientCase(caseId) {
  await simulateNetworkDelay(200);

  const patientCase = MOCK_PATIENT_CASES[caseId];

  if (!patientCase) {
    throw new Error(`Patient case not found: ${caseId}`);
  }

  return {
    success: true,
    case: patientCase
  };
}

/**
 * Genera recomendaciones basadas en el análisis
 *
 * @param {Object} analysis - Análisis de la configuración
 * @returns {Array<string>} Lista de recomendaciones
 */
function generateRecommendations(analysis) {
  const recommendations = [];

  if (analysis.criticalErrors > 0) {
    recommendations.push('Prioriza corregir los parámetros fuera de rango aceptable');
  }

  analysis.parameterScores
    .filter(p => p.recommendation)
    .forEach(p => {
      recommendations.push(`${p.parameter}: ${p.recommendation}`);
    });

  if (analysis.overallScore >= 90) {
    recommendations.push('¡Excelente trabajo! Considera revisar casos más complejos');
  } else if (analysis.overallScore >= 70) {
    recommendations.push('Buen desempeño. Revisa la justificación experta para optimizar');
  } else {
    recommendations.push('Revisa los protocolos clínicos y la teoría antes de reintentar');
  }

  return recommendations;
}

/**
 * Convierte un score numérico a calificación letra
 *
 * @param {number} score - Score de 0-100
 * @returns {string} Calificación (A, B, C, D, F)
 */
function getGrade(score) {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

/**
 * Guarda una evaluación para revisión posterior (stub)
 *
 * @param {string} evaluationId - ID de la evaluación
 * @returns {Promise<Object>} Resultado
 */
export async function saveEvaluationForReview(evaluationId) {
  await simulateNetworkDelay(300);

  return {
    success: true,
    message: 'Evaluación guardada para revisión posterior',
    evaluationId
  };
}

/**
 * Solicita retroalimentación adicional de un experto (stub)
 *
 * @param {string} evaluationId - ID de la evaluación
 * @param {string} question - Pregunta o comentario
 * @returns {Promise<Object>} Resultado
 */
export async function requestExpertFeedback(evaluationId, question) {
  await simulateNetworkDelay(500);

  return {
    success: true,
    message: 'Tu solicitud ha sido enviada. Recibirás retroalimentación en 24-48 horas',
    evaluationId,
    ticketId: `ticket-${Date.now()}`
  };
}

// Export default con todas las funciones
export default {
  submitConfiguration,
  getExpertConfiguration,
  getEvaluationHistory,
  calculateConfigurationScore,
  getAvailableCases,
  getPatientCase,
  saveEvaluationForReview,
  requestExpertFeedback
};
