import { useState, useCallback, useMemo } from 'react';
import { ventilatorCalculations } from '@/features/simulator/utils/ventilatorCalculations';

export const useParameterValidation = () => {
  const [validationState, setValidationState] = useState({
    isValid: true,
    criticalErrors: [],
    warnings: [],
    severity: 'safe',
    patientType: 'general'
  });

  const validateParameters = useCallback((ventilatorData, ventilationMode) => {
    const {
      frecuencia,
      volumen,
      presionMax,
      peep,
      fio2,
      tiempoInspiratorio,
      tiempoEspiratorio,
      inspiracionEspiracion
    } = ventilatorData;

    let validation;

    if (ventilationMode === 'volume') {
      validation = ventilatorCalculations.validateVolumeControlParameters(
        frecuencia,
        volumen,
        tiempoInspiratorio,
        peep,
        fio2
      );
    } else if (ventilationMode === 'pressure') {
      validation = ventilatorCalculations.validatePressureControlParameters(
        frecuencia,
        presionMax,
        peep,
        tiempoInspiratorio,
        fio2
      );
    } else {
      // Validación general
      validation = ventilatorCalculations.validateParameters(
        frecuencia,
        tiempoInspiratorio,
        tiempoEspiratorio,
        volumen,
        presionMax,
        peep,
        fio2,
        inspiracionEspiracion
      );
    }

    return validation;
  }, []);

  const validateSingleParameter = useCallback((parameter, value, ventilatorData, ventilationMode) => {
    // Crear datos temporales con el nuevo valor
    const tempData = { ...ventilatorData, [parameter]: value };
    
    // Validar el parámetro específico sin actualizar el estado
    const validation = validateParameters(tempData, ventilationMode);
    
    // Filtrar errores relacionados con este parámetro
    const parameterErrors = validation.criticalErrors.filter(error => 
      error.toLowerCase().includes(parameter.toLowerCase()) ||
      error.toLowerCase().includes(getParameterDisplayName(parameter).toLowerCase())
    );
    
    const parameterWarnings = validation.warnings.filter(warning => 
      warning.toLowerCase().includes(parameter.toLowerCase()) ||
      warning.toLowerCase().includes(getParameterDisplayName(parameter).toLowerCase())
    );

    return {
      isValid: parameterErrors.length === 0,
      errors: parameterErrors,
      warnings: parameterWarnings,
      severity: parameterErrors.length > 0 ? 'critical' : parameterWarnings.length > 0 ? 'warning' : 'safe'
    };
  }, [validateParameters]);

  const getParameterDisplayName = useCallback((parameter) => {
    const displayNames = {
      frecuencia: 'Frecuencia',
      volumen: 'Volumen',
      presionMax: 'Presión pico',
      peep: 'PEEP',
      fio2: 'FIO2',
      tiempoInspiratorio: 'Tiempo inspiratorio',
      tiempoEspiratorio: 'Tiempo espiratorio',
      inspiracionEspiracion: 'Relación I:E'
    };
    return displayNames[parameter] || parameter;
  }, []);

  const getParameterRanges = useCallback((parameter) => {
    const ranges = {
      frecuencia: { min: 5, max: 60, unit: 'resp/min', safe: [8, 35] },
      volumen: { min: 50, max: 2000, unit: 'ml', safe: [200, 1000] },
      presionMax: { min: 5, max: 60, unit: 'cmH2O', safe: [10, 35] },
      peep: { min: 0, max: 20, unit: 'cmH2O', safe: [3, 15] },
      fio2: { min: 21, max: 100, unit: '%', safe: [21, 80] },
      tiempoInspiratorio: { min: 0.2, max: 3.0, unit: 's', safe: [0.3, 2.0] },
      tiempoEspiratorio: { min: 0.2, max: 10.0, unit: 's', safe: [0.5, 5.0] },
      inspiracionEspiracion: { min: 0, max: 1, unit: '', safe: [0.3, 0.7] }
    };
    return ranges[parameter];
  }, []);

  const clearValidation = useCallback(() => {
    setValidationState({
      isValid: true,
      criticalErrors: [],
      warnings: [],
      severity: 'safe',
      patientType: 'general'
    });
  }, []);

  const updateValidationState = useCallback((ventilatorData, ventilationMode) => {
    const validation = validateParameters(ventilatorData, ventilationMode);
    setValidationState({
      isValid: validation.valid,
      criticalErrors: validation.criticalErrors,
      warnings: validation.warnings,
      severity: validation.severity,
      patientType: validation.patientType
    });
    return validation;
  }, [validateParameters]);

  return {
    validationState,
    validateParameters,
    validateSingleParameter,
    updateValidationState,
    getParameterRanges,
    getParameterDisplayName,
    clearValidation
  };
}; 