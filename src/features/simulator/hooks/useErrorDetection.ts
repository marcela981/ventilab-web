import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ERROR_THRESHOLD_PERCENT,
  HIGH_SEVERITY_THRESHOLD_PIP,
  HIGH_SEVERITY_THRESHOLD_VOLUME,
  HIGH_SEVERITY_THRESHOLD_FLOW,
  ADJUSTMENT_LIMITS,
  COMPLIANCE_NORMAL_RANGE,
} from '../constants/ventilator-limits';
import type {
  VentilatorData,
  FilteredSignalData,
  DetectedError,
  AdjustmentRecord,
  ErrorDetectionResult,
} from '../simulator.types';

/**
 * Hook for detecting ventilator parameter errors and suggesting adjustments.
 *
 * FIX: Uses primitive deps instead of full objects to prevent infinite re-render.
 * The previous version had `[targetValues, currentValues, compliance]` as deps,
 * which are new object refs every render → effect fires every render → loop.
 */
const useErrorDetection = (
  targetValues: VentilatorData,
  currentValues: FilteredSignalData,
  compliance: number,
): ErrorDetectionResult => {
  const [errors, setErrors] = useState<DetectedError[]>([]);
  const [adjustmentHistory, setAdjustmentHistory] = useState<AdjustmentRecord[]>([]);

  const calculatePIPAdjustment = useCallback(
    (target: VentilatorData, _current: FilteredSignalData, comp: number) => {
      if (comp > 0) {
        const suggestedPIP = (target.volumen / 1000) / comp + target.peep;
        return Math.max(ADJUSTMENT_LIMITS.pip.min, Math.min(ADJUSTMENT_LIMITS.pip.max, suggestedPIP));
      }
      return target.presionMax;
    },
    [],
  );

  const calculateVolumeAdjustment = useCallback(
    (target: VentilatorData, _current: FilteredSignalData, comp: number) => {
      if (comp > 0 && target.presionMax && target.peep) {
        const expectedVolume = comp * (target.presionMax - target.peep) * 1000;
        return Math.max(ADJUSTMENT_LIMITS.volume.min, Math.min(ADJUSTMENT_LIMITS.volume.max, expectedVolume));
      }
      return target.volumen;
    },
    [],
  );

  const calculateFlowAdjustment = useCallback(
    (target: VentilatorData, _current: FilteredSignalData, comp: number, inspiratoryTime = 1) => {
      if (comp > 0 && target.presionMax && target.peep) {
        const correctedVolume = comp * (target.presionMax - target.peep);
        const suggestedFlow = (correctedVolume * 60) / inspiratoryTime;
        return Math.max(ADJUSTMENT_LIMITS.flow.min, Math.min(ADJUSTMENT_LIMITS.flow.max, suggestedFlow));
      }
      return target.qMax;
    },
    [],
  );

  const logAdjustment = useCallback((type: string, oldValue: number, newValue: number, reason: string) => {
    setAdjustmentHistory((prev) => [
      ...prev.slice(-9),
      { type, oldValue, newValue, reason, timestamp: new Date(), id: Date.now() },
    ]);
  }, []);

  // Extract PRIMITIVE values for deps to avoid infinite re-render
  const tPresionMax = targetValues.presionMax;
  const tPeep = targetValues.peep;
  const tVolumen = targetValues.volumen;
  const tQMax = targetValues.qMax;
  const cPressureMax = currentValues.pressure?.max;
  const cPressureMin = currentValues.pressure?.min;
  const cVolumeMax = currentValues.volume?.max;
  const cFlowMax = currentValues.flow?.max;

  // Keep refs for objects to avoid them as deps (new ref every render → loop)
  const targetValuesRef = useRef(targetValues);
  const currentValuesRef = useRef(currentValues);
  targetValuesRef.current = targetValues;
  currentValuesRef.current = currentValues;

  useEffect(() => {
    const newErrors: DetectedError[] = [];

    // PIP error
    if (tPresionMax && cPressureMax) {
      const pipError = (Math.abs(tPresionMax - cPressureMax) / tPresionMax) * 100;
      if (pipError > ERROR_THRESHOLD_PERCENT) {
        const suggestedAdjustment = calculatePIPAdjustment(targetValuesRef.current, currentValuesRef.current, compliance);
        newErrors.push({
          type: 'PIP_ERROR',
          message: `Error PIP: ${pipError.toFixed(1)}% (Objetivo: ${tPresionMax.toFixed(1)}, Actual: ${cPressureMax.toFixed(1)})`,
          severity: pipError > HIGH_SEVERITY_THRESHOLD_PIP ? 'high' : 'medium',
          suggestedAdjustment,
          currentValue: cPressureMax,
          targetValue: tPresionMax,
          errorPercentage: pipError,
          adjustmentReason: `Ajuste automático basado en compliance ${compliance.toFixed(5)} L/cmH2O`,
        });
      }
    }

    // PEEP error
    if (tPeep && cPressureMin) {
      const peepError = (Math.abs(tPeep - cPressureMin) / tPeep) * 100;
      if (peepError > ERROR_THRESHOLD_PERCENT) {
        newErrors.push({
          type: 'PEEP_ERROR',
          message: `Error PEEP: ${peepError.toFixed(1)}% (Objetivo: ${tPeep.toFixed(1)}, Actual: ${cPressureMin.toFixed(1)})`,
          severity: peepError > HIGH_SEVERITY_THRESHOLD_PIP ? 'high' : 'medium',
          suggestedAdjustment: tPeep,
          currentValue: cPressureMin,
          targetValue: tPeep,
          errorPercentage: peepError,
          adjustmentReason: 'Mantener PEEP objetivo',
        });
      }
    }

    // Volume error
    if (tVolumen && cVolumeMax) {
      const volumeError = (Math.abs(tVolumen - cVolumeMax) / tVolumen) * 100;
      if (volumeError > ERROR_THRESHOLD_PERCENT) {
        const suggestedAdjustment = calculateVolumeAdjustment(targetValuesRef.current, currentValuesRef.current, compliance);
        newErrors.push({
          type: 'VOLUME_ERROR',
          message: `Error Volumen: ${volumeError.toFixed(1)}% (Objetivo: ${tVolumen.toFixed(0)}, Actual: ${cVolumeMax.toFixed(0)})`,
          severity: volumeError > HIGH_SEVERITY_THRESHOLD_VOLUME ? 'high' : 'medium',
          suggestedAdjustment,
          currentValue: cVolumeMax,
          targetValue: tVolumen,
          errorPercentage: volumeError,
          adjustmentReason: `Ajuste basado en compliance recalculada: ${compliance.toFixed(5)} L/cmH2O`,
        });
      }
    }

    // Flow error
    if (tQMax && cFlowMax) {
      const flowError = (Math.abs(tQMax - cFlowMax) / tQMax) * 100;
      if (flowError > ERROR_THRESHOLD_PERCENT) {
        const suggestedAdjustment = calculateFlowAdjustment(targetValuesRef.current, currentValuesRef.current, compliance);
        newErrors.push({
          type: 'FLOW_ERROR',
          message: `Error Flujo: ${flowError.toFixed(1)}% (Objetivo: ${tQMax.toFixed(1)}, Actual: ${cFlowMax.toFixed(1)})`,
          severity: flowError > HIGH_SEVERITY_THRESHOLD_FLOW ? 'high' : 'medium',
          suggestedAdjustment,
          currentValue: cFlowMax,
          targetValue: tQMax,
          errorPercentage: flowError,
          adjustmentReason: 'Ajuste de flujo basado en nueva compliance',
        });
      }
    }

    // Compliance out of range
    if (compliance < COMPLIANCE_NORMAL_RANGE.min || compliance > COMPLIANCE_NORMAL_RANGE.max) {
      newErrors.push({
        type: 'COMPLIANCE_WARNING',
        message: `Compliance ${compliance < COMPLIANCE_NORMAL_RANGE.min ? 'muy baja' : 'muy alta'}: ${compliance.toFixed(5)} L/cmH2O`,
        severity: 'medium',
        suggestedAdjustment: null,
        currentValue: compliance,
        targetValue: 0.02051,
        adjustmentReason: 'Verificar condición del paciente y configuración del ventilador',
      });
    }

    setErrors(newErrors);
  }, [
    // Primitive deps only — object refs accessed via useRef to avoid loop
    tPresionMax, tPeep, tVolumen, tQMax,
    cPressureMax, cPressureMin, cVolumeMax, cFlowMax,
    compliance,
    calculatePIPAdjustment, calculateVolumeAdjustment, calculateFlowAdjustment,
  ]);

  const applyAdjustment = useCallback(
    (error: DetectedError, onParameterChange: (param: string, value: number) => void) => {
      if (error.suggestedAdjustment == null || !onParameterChange) return;

      const paramMap: Record<string, string> = {
        PIP_ERROR: 'presionMax',
        PEEP_ERROR: 'peep',
        VOLUME_ERROR: 'volumen',
        FLOW_ERROR: 'qMax',
      };
      const parameterName = paramMap[error.type];
      if (!parameterName) return;

      logAdjustment(error.type, error.currentValue, error.suggestedAdjustment, error.adjustmentReason);
      onParameterChange(parameterName, error.suggestedAdjustment);
    },
    [logAdjustment],
  );

  const getHighSeverityErrors = useCallback(() => {
    return errors.filter((e) => e.severity === 'high');
  }, [errors]);

  const getAdjustmentSummary = useCallback(() => {
    const summary: Record<string, { current: number; suggested: number; error: number; reason: string }> = {};
    errors.forEach((error) => {
      if (error.suggestedAdjustment !== null) {
        const parameterName = error.type.replace('_ERROR', '').toLowerCase();
        summary[parameterName] = {
          current: error.currentValue,
          suggested: error.suggestedAdjustment,
          error: error.errorPercentage ?? 0,
          reason: error.adjustmentReason,
        };
      }
    });
    return summary;
  }, [errors]);

  const errorSummary = useMemo(
    () => ({
      total: errors.length,
      high: errors.filter((e) => e.severity === 'high').length,
      medium: errors.filter((e) => e.severity === 'medium').length,
      compliance: errors.filter((e) => e.type === 'COMPLIANCE_WARNING').length,
    }),
    [errors],
  );

  return {
    errors,
    hasErrors: errors.length > 0,
    hasHighSeverityErrors: errors.some((e) => e.severity === 'high'),
    adjustmentHistory,
    applyAdjustment,
    getHighSeverityErrors,
    getAdjustmentSummary,
    suggestedAdjustments: errors.map((e) => e.suggestedAdjustment).filter((a): a is number => a !== null),
    errorSummary,
  };
};

export { useErrorDetection };
