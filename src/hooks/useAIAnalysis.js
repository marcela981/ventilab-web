import { useState, useCallback } from 'react';
import geminiService from '../service/geminiService';

export const useAIAnalysis = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisError, setAnalysisError] = useState(null);

  const analyzeConfiguration = useCallback(async (userConfig, optimalConfig, ventilationMode, patientData = null) => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    
    // Validaciones básicas antes de llamar al servicio
    if (!userConfig || typeof userConfig !== 'object') {
      setAnalysisError('Configuración del ventilador no válida');
      setIsAnalyzing(false);
      return;
    }
    
    if (!ventilationMode || !['volume', 'pressure'].includes(ventilationMode)) {
      setAnalysisError('Modo de ventilación no válido');
      setIsAnalyzing(false);
      return;
    }
    
    try {
      const result = await geminiService.analyzeVentilatorConfiguration(
        userConfig, 
        optimalConfig, 
        ventilationMode, 
        patientData
      );
      
      if (result.success) {
        setAnalysisResult(result);
      } else {
        setAnalysisError(result.error || 'Error desconocido en el análisis');
      }
    } catch (error) {
      console.error('Error en análisis de IA:', error);
      setAnalysisError('Error inesperado al analizar la configuración. Por favor, verifica tu conexión a internet.');
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const clearAnalysis = useCallback(() => {
    setAnalysisResult(null);
    setAnalysisError(null);
  }, []);

  return {
    isAnalyzing,
    analysisResult,
    analysisError,
    analyzeConfiguration,
    clearAnalysis
  };
};