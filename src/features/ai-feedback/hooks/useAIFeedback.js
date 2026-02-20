import { useState, useCallback, useRef, useEffect } from 'react';
import AIServiceManager from '@/features/ai-feedback/services/AIServiceManager.js';

/**
 * Hook personalizado para manejo de feedback de IA
 * Sigue el patrón establecido de Ventilab
 */
export const useAIFeedback = (config = {}) => {
  // Configuración por defecto
  const defaultConfig = {
    maxHistorySize: 10,
    enableMetrics: true,
    autoAnalyze: false,
    criticalErrorThreshold: 0.7,
    learningMetrics: {
      trackImprovements: true,
      trackErrors: true,
      trackConfidence: true
    }
  };

  const finalConfig = { ...defaultConfig, ...config };

  // Estados principales
  const [feedback, setFeedback] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [analysisHistory, setAnalysisHistory] = useState([]);
  const [error, setError] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Estados adicionales
  const [currentAIModel, setCurrentAIModel] = useState('gemini');
  const [learningMetrics, setLearningMetrics] = useState({
    totalAnalyses: 0,
    successfulAnalyses: 0,
    averageConfidence: 0,
    improvementTrend: 0,
    criticalErrorsFixed: 0,
    lastAnalysisTime: null
  });

  // Referencias para evitar re-renders innecesarios
  const analysisCountRef = useRef(0);
  const lastAnalysisRef = useRef(null);

  /**
   * Analizar configuración de ventilador
   */
  const analyzeConfiguration = useCallback(async (userConfig, optimalConfig, ventilationMode, patientData = null) => {
    if (isAnalyzing) {
      console.warn('Análisis ya en progreso, ignorando solicitud');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    analysisCountRef.current++;

    try {
      console.log(`🔍 Iniciando análisis #${analysisCountRef.current}...`);
      
      const result = await AIServiceManager.analyzeVentilatorConfiguration(
        userConfig,
        optimalConfig,
        ventilationMode,
        patientData
      );

      if (result.success) {
        // Actualizar feedback principal
        setFeedback({
          analysis: result.analysis,
          confidence: result.confidence || 0.8,
          provider: result.provider || 'unknown',
          fallbackUsed: result.fallbackUsed || false,
          responseTime: result.responseTime || 0,
          timestamp: new Date().toISOString()
        });

        // Extraer recomendaciones
        const extractedRecommendations = extractRecommendations(result.analysis);
        setRecommendations(extractedRecommendations);

        // Actualizar historial
        const newAnalysis = {
          id: Date.now(),
          timestamp: new Date().toISOString(),
          userConfig,
          optimalConfig,
          ventilationMode,
          patientData,
          result: {
            analysis: result.analysis,
            confidence: result.confidence,
            provider: result.provider,
            fallbackUsed: result.fallbackUsed,
            responseTime: result.responseTime
          },
          recommendations: extractedRecommendations
        };

        setAnalysisHistory(prev => {
          const newHistory = [newAnalysis, ...prev];
          return newHistory.slice(0, finalConfig.maxHistorySize);
        });

        // Actualizar métricas de aprendizaje
        if (finalConfig.enableMetrics) {
          updateLearningMetrics(result, true);
        }

        console.log('✅ Análisis completado exitosamente');
        return result;

      } else {
        throw new Error(result.error || 'Error desconocido en el análisis');
      }

    } catch (err) {
      console.error('❌ Error en análisis:', err);
      setError(err.message || 'Error al analizar la configuración');
      
      // Actualizar métricas de error
      if (finalConfig.enableMetrics) {
        updateLearningMetrics(null, false, err);
      }

      return {
        success: false,
        error: err.message,
        analysis: 'No se pudo completar el análisis en este momento.'
      };
    } finally {
      setIsAnalyzing(false);
    }
  }, [isAnalyzing, finalConfig.maxHistorySize, finalConfig.enableMetrics]);

  /**
   * Analizar errores críticos específicos
   */
  const analyzeCriticalErrors = useCallback(async (userConfig, ventilationMode, patientData = null) => {
    if (isAnalyzing) {
      console.warn('Análisis ya en progreso, ignorando solicitud');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      console.log('🚨 Analizando errores críticos...');
      
      // Prompt específico para errores críticos
      const criticalPrompt = `Eres un experto en ventilación mecánica. Analiza SOLO los errores CRÍTICOS en esta configuración que podrían poner en peligro al paciente.

CONFIGURACIÓN:
${formatConfigForPrompt(userConfig)}

MODO: ${ventilationMode === 'volume' ? 'Volumen Control' : 'Presión Control'}

${patientData ? `DATOS DEL PACIENTE:
- Edad: ${patientData.patientBasicData?.edad || 'No especificada'} años
- Peso: ${patientData.patientBasicData?.peso || 'No especificado'} kg
- Diagnóstico: ${patientData.patientBasicData?.diagnostico || 'No especificado'}` : ''}

INSTRUCCIONES:
1. Identifica ÚNICAMENTE errores CRÍTICOS (riesgo de vida)
2. Prioriza por severidad máxima
3. Proporciona acciones inmediatas
4. Enfócate en seguridad del paciente

FORMATO:
- ERROR CRÍTICO: [descripción]
- ACCIÓN INMEDIATA: [qué hacer ahora]
- JUSTIFICACIÓN: [por qué es crítico]

Responde en español.`;

      const result = await AIServiceManager.generateResponse(criticalPrompt, {
        temperature: 0.3,
        maxTokens: 800
      });

      if (result.success) {
        const criticalAnalysis = {
          analysis: result.response,
          confidence: result.confidence,
          provider: result.provider,
          fallbackUsed: result.fallbackUsed,
          responseTime: result.responseTime,
          timestamp: new Date().toISOString(),
          type: 'critical_errors'
        };

        setFeedback(criticalAnalysis);
        
        // Extraer acciones críticas
        const criticalActions = extractCriticalActions(result.response);
        setRecommendations(criticalActions);

        // Actualizar historial
        const newAnalysis = {
          id: Date.now(),
          timestamp: new Date().toISOString(),
          userConfig,
          ventilationMode,
          patientData,
          result: criticalAnalysis,
          recommendations: criticalActions,
          type: 'critical_analysis'
        };

        setAnalysisHistory(prev => {
          const newHistory = [newAnalysis, ...prev];
          return newHistory.slice(0, finalConfig.maxHistorySize);
        });

        // Actualizar métricas
        if (finalConfig.enableMetrics) {
          updateLearningMetrics(result, true);
        }

        console.log('✅ Análisis de errores críticos completado');
        return result;

      } else {
        throw new Error(result.error || 'Error en análisis de errores críticos');
      }

    } catch (err) {
      console.error('❌ Error en análisis crítico:', err);
      setError(err.message || 'Error al analizar errores críticos');
      
      if (finalConfig.enableMetrics) {
        updateLearningMetrics(null, false, err);
      }

      return {
        success: false,
        error: err.message,
        analysis: 'No se pudo completar el análisis de errores críticos.'
      };
    } finally {
      setIsAnalyzing(false);
    }
  }, [isAnalyzing, finalConfig.maxHistorySize, finalConfig.enableMetrics]);

  /**
   * Limpiar feedback actual
   */
  const clearFeedback = useCallback(() => {
    setFeedback(null);
    setRecommendations([]);
    setError(null);
    console.log('🧹 Feedback limpiado');
  }, []);

  /**
   * Obtener métricas de aprendizaje
   */
  const getMetrics = useCallback(() => {
    const aiStats = AIServiceManager.getProviderStats();
    
    return {
      // Métricas del hook
      learning: learningMetrics,
      
      // Métricas del AI Service Manager
      ai: {
        currentProvider: aiStats.currentProvider,
        availableProviders: aiStats.availableProviders,
        globalStats: aiStats.globalStats,
        providerStats: aiStats.providerStats
      },
      
      // Métricas específicas del usuario
      user: {
        totalAnalyses: analysisCountRef.current,
        analysisHistory: analysisHistory.length,
        lastAnalysis: lastAnalysisRef.current,
        improvementTrend: learningMetrics.improvementTrend,
        criticalErrorsFixed: learningMetrics.criticalErrorsFixed
      }
    };
  }, [learningMetrics, analysisHistory]);

  /**
   * Cambiar modelo de IA
   */
  const changeAIModel = useCallback(async (newModel) => {
    try {
      console.log(`🔄 Cambiando modelo de IA a: ${newModel}`);
      
      const result = AIServiceManager.switchModel(newModel);
      
      if (result.success) {
        setCurrentAIModel(newModel);
        console.log(`✅ Modelo cambiado a: ${newModel}`);
        return {
          success: true,
          model: newModel,
          message: result.message
        };
      } else {
        throw new Error(result.error || 'Error al cambiar modelo');
      }
    } catch (err) {
      console.error('❌ Error cambiando modelo:', err);
      setError(err.message);
      return {
        success: false,
        error: err.message,
        availableModels: result?.availableProviders || []
      };
    }
  }, []);

  /**
   * Extraer recomendaciones del análisis
   */
  const extractRecommendations = (analysis) => {
    if (!analysis || typeof analysis !== 'string') return [];
    
    const recommendations = [];
    const lines = analysis.split('\n');
    
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.includes('recomendación') || 
          trimmed.includes('sugerencia') || 
          trimmed.includes('debería') ||
          trimmed.includes('considera')) {
        recommendations.push(trimmed);
      }
    });
    
    return recommendations.slice(0, 5); // Máximo 5 recomendaciones
  };

  /**
   * Extraer acciones críticas
   */
  const extractCriticalActions = (analysis) => {
    if (!analysis || typeof analysis !== 'string') return [];
    
    const actions = [];
    const lines = analysis.split('\n');
    
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.includes('ACCIÓN INMEDIATA') || 
          trimmed.includes('ERROR CRÍTICO') ||
          trimmed.includes('URGENTE')) {
        actions.push(trimmed);
      }
    });
    
    return actions;
  };

  /**
   * Formatear configuración para prompt
   */
  const formatConfigForPrompt = (config) => {
    if (!config || typeof config !== 'object') return 'Configuración no disponible';
    
    return Object.entries(config)
      .filter(([key, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => `- ${formatParameterName(key)}: ${value} ${getUnit(key)}`)
      .join('\n');
  };

  /**
   * Formatear nombre de parámetro
   */
  const formatParameterName = (key) => {
    const names = {
      fio2: 'FiO2',
      volumen: 'Volumen Tidal',
      presionMax: 'Presión Máxima',
      peep: 'PEEP',
      frecuencia: 'Frecuencia Respiratoria',
      inspiracionEspiracion: 'Relación I:E',
      pausaInspiratoria: 'Pausa Inspiratoria',
      pausaEspiratoria: 'Pausa Espiratoria',
      qMax: 'Flujo Máximo'
    };
    return names[key] || key;
  };

  /**
   * Obtener unidad de parámetro
   */
  const getUnit = (key) => {
    const units = {
      fio2: '%',
      volumen: 'ml',
      presionMax: 'cmH2O',
      peep: 'cmH2O',
      frecuencia: 'resp/min',
      inspiracionEspiracion: '',
      pausaInspiratoria: 's',
      pausaEspiratoria: 's',
      qMax: 'L/min'
    };
    return units[key] || '';
  };

  /**
   * Actualizar métricas de aprendizaje
   */
  const updateLearningMetrics = (result, success, error = null) => {
    if (!finalConfig.enableMetrics) return;

    setLearningMetrics(prev => {
      const newMetrics = { ...prev };
      
      newMetrics.totalAnalyses++;
      newMetrics.lastAnalysisTime = new Date().toISOString();
      
      if (success && result) {
        newMetrics.successfulAnalyses++;
        
        // Actualizar confianza promedio
        if (result.confidence) {
          const totalConfidence = (prev.averageConfidence * (newMetrics.successfulAnalyses - 1)) + result.confidence;
          newMetrics.averageConfidence = totalConfidence / newMetrics.successfulAnalyses;
        }
        
        // Detectar mejoras (confianza creciente)
        if (result.confidence > prev.averageConfidence) {
          newMetrics.improvementTrend++;
        }
        
        // Detectar errores críticos corregidos
        if (result.analysis && result.analysis.includes('crítico')) {
          newMetrics.criticalErrorsFixed++;
        }
      }
      
      return newMetrics;
    });
  };

  /**
   * Efecto para inicialización
   */
  useEffect(() => {
    console.log('🎯 useAIFeedback inicializado');
    
    // Verificar disponibilidad del AI Service Manager
    const isAvailable = AIServiceManager.isProviderAvailable('gemini');
    if (!isAvailable) {
      console.warn('⚠️ AI Service Manager no disponible');
    }
    
    return () => {
      console.log('🧹 useAIFeedback cleanup');
    };
  }, []);

  // Retornar interfaz del hook
  return {
    // Data
    feedback,
    recommendations,
    analysisHistory,
    error,
    
    // Loading states
    isAnalyzing,
    
    // Primary actions
    analyzeConfiguration,
    analyzeCriticalErrors,
    
    // Secondary actions
    clearFeedback,
    getMetrics,
    changeAIModel,
    
    // Additional data
    currentAIModel,
    learningMetrics,
    
    // Utility functions
    isAvailable: AIServiceManager.isProviderAvailable(currentAIModel),
    availableModels: AIServiceManager.getAvailableProviders()
  };
};

export default useAIFeedback;
