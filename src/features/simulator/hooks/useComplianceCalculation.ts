import { useState, useEffect, useCallback, useRef } from 'react';
import {
  DEFAULT_COMPLIANCE,
  COMPLIANCE_RANGE,
  SAMPLES_PER_CYCLE,
  CYCLES_FOR_COMPLIANCE,
  CYCLES_TO_SKIP,
} from '../constants/ventilator-limits';
import type {
  RealTimeData,
  VentilationMode,
  VentilatorData,
  ComplianceCalculationStatus,
  ComplianceAdjustment,
  ComplianceUpdateCallback,
} from '../simulator.types';

/**
 * Hook for automatic pulmonary compliance calculation.
 *
 * Uses ref-based sample counting to avoid re-render loops.
 * Only state that drives UI (compliance, calculationStatus) is in useState.
 */
export const useComplianceCalculation = (
  realTimeData: RealTimeData,
  ventilationMode: VentilationMode = 'pressure',
) => {
  const [compliance, setCompliance] = useState(DEFAULT_COMPLIANCE);

  const [calculationStatus, setCalculationStatus] = useState<ComplianceCalculationStatus>({
    isCalculating: false,
    currentCycle: 0,
    totalCycles: CYCLES_FOR_COMPLIANCE,
    lastError: null,
    lastAdjustment: null,
    requiresRecalculation: false,
  });

  // --- Refs for cycle tracking (avoids re-render loops) ---
  const sampleCountRef = useRef(0);
  const cycleCountRef = useRef(0);
  const pipArrayRef = useRef<number[]>([]);
  const peepArrayRef = useRef<number[]>([]);
  const volumeArrayRef = useRef<number[]>([]);
  const callbackRef = useRef<ComplianceUpdateCallback | null>(null);

  const registerUpdateCallback = useCallback((callback: ComplianceUpdateCallback) => {
    callbackRef.current = callback;
  }, []);

  // Process a complete respiratory cycle from the last SAMPLES_PER_CYCLE readings
  const processCycle = useCallback(() => {
    if (
      realTimeData.pressure.length >= SAMPLES_PER_CYCLE &&
      realTimeData.volume.length >= SAMPLES_PER_CYCLE
    ) {
      const recentPressure = realTimeData.pressure.slice(-SAMPLES_PER_CYCLE);
      const recentVolume = realTimeData.volume.slice(-SAMPLES_PER_CYCLE);

      const maxPressure = Math.max(...recentPressure);
      const minPressure = Math.min(...recentPressure);
      const maxVolume = Math.max(...recentVolume);

      pipArrayRef.current.push(maxPressure);
      peepArrayRef.current.push(minPressure);
      volumeArrayRef.current.push(maxVolume);

      cycleCountRef.current += 1;

      setCalculationStatus((prev) => ({
        ...prev,
        currentCycle: cycleCountRef.current,
        isCalculating: true,
      }));
    }
  }, [realTimeData.pressure, realTimeData.volume]);

  // Calculate new compliance after CYCLES_FOR_COMPLIANCE cycles
  const calculateNewCompliance = useCallback(
    (targetPIP?: number) => {
      const pip = pipArrayRef.current;
      const peep = peepArrayRef.current;
      const vol = volumeArrayRef.current;

      if (pip.length < CYCLES_FOR_COMPLIANCE) return null;

      const lastMeasuredPIP = pip[pip.length - 1];
      const error = targetPIP
        ? (Math.abs(targetPIP - lastMeasuredPIP) / targetPIP) * 100
        : 0;

      // Only recalculate if error > 5%
      if (error > 5) {
        const filteredPip = pip.slice(CYCLES_TO_SKIP);
        const filteredPeep = peep.slice(CYCLES_TO_SKIP);
        const filteredVolume = vol.slice(CYCLES_TO_SKIP);

        const avgPip = filteredPip.reduce((a, b) => a + b, 0) / filteredPip.length;
        const avgPeep = filteredPeep.reduce((a, b) => a + b, 0) / filteredPeep.length;
        const avgVolume =
          filteredVolume.reduce((a, b) => a + b, 0) / filteredVolume.length / 1000;

        const newCompliance = Math.max(
          COMPLIANCE_RANGE.min,
          Math.min(COMPLIANCE_RANGE.max, avgVolume / (avgPip - avgPeep)),
        );

        setCompliance(newCompliance);

        const adjustment: ComplianceAdjustment = {
          newCompliance,
          averagePressure: avgPip,
          averagePEEP: avgPeep,
          averageVolume: avgVolume,
          error,
          timestamp: new Date(),
        };

        setCalculationStatus((prev) => ({
          ...prev,
          isCalculating: false,
          requiresRecalculation: true,
          lastError: error,
          lastAdjustment: adjustment,
        }));

        if (callbackRef.current) {
          callbackRef.current(newCompliance, {
            averagePressure: avgPip,
            averagePEEP: avgPeep,
            averageVolume: avgVolume,
            error,
          });
        }
      } else {
        setCalculationStatus((prev) => ({
          ...prev,
          isCalculating: false,
          requiresRecalculation: false,
          lastError: error,
        }));
      }

      // Reset cycle tracking
      cycleCountRef.current = 0;
      pipArrayRef.current = [];
      peepArrayRef.current = [];
      volumeArrayRef.current = [];
      setCalculationStatus((prev) => ({ ...prev, currentCycle: 0 }));

      return null;
    },
    [], // No state deps — all data is in refs
  );

  // Monitor incoming data and process cycles.
  // Uses ref-based counter to avoid the infinite loop that sampleCount-as-state caused.
  const pressureLength = realTimeData.pressure.length;

  useEffect(() => {
    if (ventilationMode !== 'pressure' || pressureLength === 0) return;

    sampleCountRef.current += 1;

    if (sampleCountRef.current >= SAMPLES_PER_CYCLE) {
      sampleCountRef.current = 0;
      processCycle();
    }
  }, [pressureLength, ventilationMode, processCycle]);

  // Trigger compliance calculation when enough cycles are collected
  useEffect(() => {
    if (cycleCountRef.current >= CYCLES_FOR_COMPLIANCE) {
      calculateNewCompliance();
    }
    // We watch calculationStatus.currentCycle because that's the state mirror of cycleCountRef
  }, [calculationStatus.currentCycle, calculateNewCompliance]);

  const resetComplianceCalculation = useCallback(() => {
    cycleCountRef.current = 0;
    sampleCountRef.current = 0;
    pipArrayRef.current = [];
    peepArrayRef.current = [];
    volumeArrayRef.current = [];
    setCalculationStatus({
      isCalculating: false,
      currentCycle: 0,
      totalCycles: CYCLES_FOR_COMPLIANCE,
      lastError: null,
      lastAdjustment: null,
      requiresRecalculation: false,
    });
  }, []);

  const setComplianceManually = useCallback((newCompliance: number) => {
    const validated = Math.max(COMPLIANCE_RANGE.min, Math.min(COMPLIANCE_RANGE.max, newCompliance));
    setCompliance(validated);
    setCalculationStatus((prev) => ({
      ...prev,
      lastAdjustment: {
        newCompliance: validated,
        manual: true,
        timestamp: new Date(),
      },
    }));
  }, []);

  const calculateParametersWithCompliance = useCallback(
    (currentParams: Partial<VentilatorData>, newCompliance = compliance) => {
      const C = newCompliance;
      const PEEP = currentParams.peep ?? 5;
      const PIP = currentParams.presionMax ?? 20;
      const ti = currentParams.tiempoInspiratorio ?? 1;

      const Vtil = 1000 * (C * (PIP - PEEP));
      const Qmax = (C * (PIP - PEEP)) / (ti / 60);
      const PresT = 0.0025 * Math.pow(Qmax, 2) + 0.2203 * Qmax - 0.5912;

      return {
        volumen: Math.round(Vtil),
        qMax: Math.round(Qmax * 10) / 10,
        presionTanque: Math.round(PresT * 10) / 10,
        compliance: C,
      };
    },
    [compliance],
  );

  const markRecalculationProcessed = useCallback(() => {
    setCalculationStatus((prev) => ({ ...prev, requiresRecalculation: false }));
  }, []);

  return {
    compliance,
    calculationStatus,
    resetComplianceCalculation,
    setComplianceManually,
    registerUpdateCallback,
    calculateParametersWithCompliance,
    markRecalculationProcessed,
    debug: {
      cycleCount: cycleCountRef.current,
      sampleCount: sampleCountRef.current,
      pipArray: [...pipArrayRef.current],
      peepArray: [...peepArrayRef.current],
      volumeArray: [...volumeArrayRef.current],
    },
  };
};
