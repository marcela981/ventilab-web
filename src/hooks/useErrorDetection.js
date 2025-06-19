import { useState, useEffect, useCallback } from 'react';

const useErrorDetection = (targetValues, currentValues, compliance) => {
    const [errors, setErrors] = useState([]);
  const [adjustmentHistory, setAdjustmentHistory] = useState([]);
    const ERROR_THRESHOLD = 5; // 5%
  // Función para calcular ajuste de PIP basado en compliance
  const calculatePIPAdjustment = useCallback((target, current, compliance) => {
    if (compliance > 0) {
      // Calcular PIP sugerido basado en volumen objetivo y compliance actual
      const suggestedPIP = (target.volumen / 1000) / compliance + target.peep;
      return Math.max(5, Math.min(50, suggestedPIP)); // Limitar entre 5 y 50 cmH2O
    }
    return target.presionMax;
  }, []);

  // Función para calcular ajuste de volumen basado en compliance
  const calculateVolumeAdjustment = useCallback((target, current, compliance) => {
    if (compliance > 0 && target.presionMax && target.peep) {
      // Calcular volumen esperado con la compliance actual
      const expectedVolume = compliance * (target.presionMax - target.peep) * 1000;
      return Math.max(100, Math.min(2000, expectedVolume)); // Limitar entre 100 y 2000 ml
    }
    return target.volumen;
  }, []);

  // Función para calcular ajuste de flujo máximo
  const calculateFlowAdjustment = useCallback((target, current, compliance, inspiratoryTime = 1) => {
    if (compliance > 0 && target.presionMax && target.peep) {
      // Calcular flujo basado en volumen corregido y tiempo inspiratorio
      const correctedVolume = compliance * (target.presionMax - target.peep); // L
      const suggestedFlow = (correctedVolume * 60) / inspiratoryTime; // L/min
      return Math.max(10, Math.min(150, suggestedFlow));
    }
    return target.qMax;
  }, []);

  // Función para registrar un ajuste en el historial
  const logAdjustment = useCallback((type, oldValue, newValue, reason) => {
    setAdjustmentHistory(prev => [
      ...prev.slice(-9), // Mantener solo los últimos 10 ajustes
      {
        type,
        oldValue,
        newValue,
        reason,
        timestamp: new Date(),
        id: Date.now()
      }
    ]);
  }, []);
  
    useEffect(() => {
      const newErrors = [];
      
      // Verificar error en PIP (Presión Inspiratoria Pico)
      if (targetValues.presionMax && currentValues.pressure?.max) {
        const pipError = Math.abs(targetValues.presionMax - currentValues.pressure.max) / targetValues.presionMax * 100;
        if (pipError > ERROR_THRESHOLD) {
        const suggestedAdjustment = calculatePIPAdjustment(targetValues, currentValues, compliance);
          newErrors.push({
            type: 'PIP_ERROR',
          message: `Error PIP: ${pipError.toFixed(1)}% (Objetivo: ${targetValues.presionMax.toFixed(1)}, Actual: ${currentValues.pressure.max.toFixed(1)})`,
            severity: pipError > 10 ? 'high' : 'medium',
          suggestedAdjustment,
          currentValue: currentValues.pressure.max,
          targetValue: targetValues.presionMax,
          errorPercentage: pipError,
          adjustmentReason: `Ajuste automático basado en compliance ${compliance.toFixed(5)} L/cmH2O`
          });
        }
      }
  
      // Verificar error en PEEP
      if (targetValues.peep && currentValues.pressure?.min) {
        const peepError = Math.abs(targetValues.peep - currentValues.pressure.min) / targetValues.peep * 100;
        if (peepError > ERROR_THRESHOLD) {
          newErrors.push({
            type: 'PEEP_ERROR',
          message: `Error PEEP: ${peepError.toFixed(1)}% (Objetivo: ${targetValues.peep.toFixed(1)}, Actual: ${currentValues.pressure.min.toFixed(1)})`,
            severity: peepError > 10 ? 'high' : 'medium',
          suggestedAdjustment: targetValues.peep,
          currentValue: currentValues.pressure.min,
          targetValue: targetValues.peep,
          errorPercentage: peepError,
          adjustmentReason: 'Mantener PEEP objetivo'
          });
        }
      }
  
      // Verificar error en Volumen Tidal
      if (targetValues.volumen && currentValues.volume?.max) {
        const volumeError = Math.abs(targetValues.volumen - currentValues.volume.max) / targetValues.volumen * 100;
        if (volumeError > ERROR_THRESHOLD) {
        const suggestedAdjustment = calculateVolumeAdjustment(targetValues, currentValues, compliance);
          newErrors.push({
            type: 'VOLUME_ERROR',
          message: `Error Volumen: ${volumeError.toFixed(1)}% (Objetivo: ${targetValues.volumen.toFixed(0)}, Actual: ${currentValues.volume.max.toFixed(0)})`,
          severity: volumeError > 15 ? 'high' : 'medium',
          suggestedAdjustment,
          currentValue: currentValues.volume.max,
          targetValue: targetValues.volumen,
          errorPercentage: volumeError,
          adjustmentReason: `Ajuste basado en compliance recalculada: ${compliance.toFixed(5)} L/cmH2O`
          });
        }
      }
  
      // Verificar error en Flujo
      if (targetValues.qMax && currentValues.flow?.max) {
        const flowError = Math.abs(targetValues.qMax - currentValues.flow.max) / targetValues.qMax * 100;
        if (flowError > ERROR_THRESHOLD) {
        const suggestedAdjustment = calculateFlowAdjustment(targetValues, currentValues, compliance);
          newErrors.push({
            type: 'FLOW_ERROR',
          message: `Error Flujo: ${flowError.toFixed(1)}% (Objetivo: ${targetValues.qMax.toFixed(1)}, Actual: ${currentValues.flow.max.toFixed(1)})`,
          severity: flowError > 15 ? 'high' : 'medium',
          suggestedAdjustment,
          currentValue: currentValues.flow.max,
          targetValue: targetValues.qMax,
          errorPercentage: flowError,
          adjustmentReason: `Ajuste de flujo basado en nueva compliance`
          });
        }
      }

    // Verificar compliance fuera de rango normal
    if (compliance < 0.015 || compliance > 0.15) {
      newErrors.push({
        type: 'COMPLIANCE_WARNING',
        message: `Compliance ${compliance < 0.015 ? 'muy baja' : 'muy alta'}: ${compliance.toFixed(5)} L/cmH2O`,
        severity: 'medium',
        suggestedAdjustment: null,
        currentValue: compliance,
        targetValue: 0.02051, // Valor normal
        adjustmentReason: 'Verificar condición del paciente y configuración del ventilador'
      });
    }
      
      setErrors(newErrors);
  }, [targetValues, currentValues, compliance, calculatePIPAdjustment, calculateVolumeAdjustment, calculateFlowAdjustment]);

  // Función para aplicar un ajuste sugerido
  const applyAdjustment = useCallback((error, onParameterChange) => {
    if (!error.suggestedAdjustment || !onParameterChange) return;

    let parameterName = '';
    switch (error.type) {
      case 'PIP_ERROR':
        parameterName = 'presionMax';
        break;
      case 'PEEP_ERROR':
        parameterName = 'peep';
        break;
      case 'VOLUME_ERROR':
        parameterName = 'volumen';
        break;
      case 'FLOW_ERROR':
        parameterName = 'qMax';
        break;
      default:
        return;
    }

    // Registrar el ajuste
    logAdjustment(
      error.type,
      error.currentValue,
      error.suggestedAdjustment,
      error.adjustmentReason
    );

    // Aplicar el cambio
    onParameterChange(parameterName, error.suggestedAdjustment);
    
    console.log(`Ajuste automático aplicado: ${parameterName} = ${error.suggestedAdjustment.toFixed(2)} (${error.adjustmentReason})`);
  }, [logAdjustment]);

  // Función para obtener errores de alta severidad que requieren ajuste inmediato
  const getHighSeverityErrors = useCallback(() => {
    return errors.filter(error => error.severity === 'high');
  }, [errors]);

  // Función para obtener un resumen de ajustes sugeridos
  const getAdjustmentSummary = useCallback(() => {
    const summary = {};
    errors.forEach(error => {
      if (error.suggestedAdjustment !== null) {
        const parameterName = error.type.replace('_ERROR', '').toLowerCase();
        summary[parameterName] = {
          current: error.currentValue,
          suggested: error.suggestedAdjustment,
          error: error.errorPercentage,
          reason: error.adjustmentReason
        };
      }
    });
    return summary;
  }, [errors]);
  
    return {
      errors,
      hasErrors: errors.length > 0,
      hasHighSeverityErrors: errors.some(e => e.severity === 'high'),
    adjustmentHistory,
    applyAdjustment,
    getHighSeverityErrors,
    getAdjustmentSummary,
    // Funciones de utilidad para componentes
    suggestedAdjustments: errors.map(e => e.suggestedAdjustment).filter(a => a !== null),
      errorSummary: {
        total: errors.length,
        high: errors.filter(e => e.severity === 'high').length,
      medium: errors.filter(e => e.severity === 'medium').length,
      compliance: errors.filter(e => e.type === 'COMPLIANCE_WARNING').length
      }
    };
  };

export { useErrorDetection };