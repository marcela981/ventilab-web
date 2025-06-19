import { useState, useEffect, useCallback } from 'react';

/**
 * Hook para calcular automáticamente la compliance pulmonar
 * Basado en la lógica del archivo Python main ventilador.py
 */
export const useComplianceCalculation = (realTimeData, ventilationMode = 'pressure') => {
  // Estado inicial con el mismo valor del archivo Python
  const [compliance, setCompliance] = useState(0.02051); // L/cmH2O - Compliance pulmonar por defecto
  
  // Contadores y arrays para el cálculo de compliance
  const [cycleCount, setCycleCount] = useState(0);
  const [sampleCount, setSampleCount] = useState(0);
  const [pipArray, setPipArray] = useState([]);
  const [peepArray, setPeepArray] = useState([]);
  const [volumeArray, setVolumeArray] = useState([]);
  
  // Estado para mostrar información del cálculo
  const [calculationStatus, setCalculationStatus] = useState({
    isCalculating: false,
    currentCycle: 0,
    totalCycles: 5,
    lastError: null,
    lastAdjustment: null,
    requiresRecalculation: false
  });

  // Callback para cuando se requiere recálculo de parámetros
  const [onComplianceUpdateCallback, setOnComplianceUpdateCallback] = useState(null);

  // Función para registrar el callback de actualización
  const registerUpdateCallback = useCallback((callback) => {
    setOnComplianceUpdateCallback(() => callback);
  }, []);

  // Función para procesar un ciclo completo
  const processCycle = useCallback(() => {
    if (realTimeData.pressure.length >= 100 && realTimeData.volume.length >= 100) {
      // Tomar las últimas 100 muestras
      const recentPressure = realTimeData.pressure.slice(-100);
      const recentVolume = realTimeData.volume.slice(-100);
      
      // Calcular máximos y mínimos del ciclo
      const maxPressure = Math.max(...recentPressure);
      const minPressure = Math.min(...recentPressure);
      const maxVolume = Math.max(...recentVolume);
      
      // Agregar a los arrays de seguimiento
      setPipArray(prev => [...prev, maxPressure]);
      setPeepArray(prev => [...prev, minPressure]);
      setVolumeArray(prev => [...prev, maxVolume]);
      
      setCycleCount(prev => prev + 1);
      setCalculationStatus(prev => ({
        ...prev,
        currentCycle: prev.currentCycle + 1,
        isCalculating: true
      }));
      
      console.log(`Ciclo ${cycleCount + 1}: PIP=${maxPressure.toFixed(1)}, PEEP=${minPressure.toFixed(1)}, Vol=${maxVolume.toFixed(1)}`);
    }
  }, [realTimeData.pressure, realTimeData.volume, cycleCount]);

  // Función para calcular la nueva compliance después de 5 ciclos
  const calculateNewCompliance = useCallback((targetPIP) => {
    if (pipArray.length >= 5 && peepArray.length >= 5 && volumeArray.length >= 5) {
      // Calcular error como en Python (error porcentual respecto al PIP objetivo)
      const lastMeasuredPIP = pipArray[pipArray.length - 1];
      const error = targetPIP ? ((Math.abs(targetPIP - lastMeasuredPIP)) / targetPIP) * 100 : 0;
      
      console.log(`Error PIP: ${error.toFixed(1)}%`);
      
      // Solo recalcular si el error es mayor al 5%
      if (error > 5) {
        // Eliminar los primeros dos términos ya que siempre son elevados
        const filteredPip = pipArray.slice(2);
        const filteredPeep = peepArray.slice(2);
        const filteredVolume = volumeArray.slice(2);
        
        // Calcular promedios
        const avgPip = filteredPip.reduce((a, b) => a + b, 0) / filteredPip.length;
        const avgPeep = filteredPeep.reduce((a, b) => a + b, 0) / filteredPeep.length;
        const avgVolume = (filteredVolume.reduce((a, b) => a + b, 0) / filteredVolume.length) / 1000; // convertir a L
        
        // Calcular nueva compliance
        const newCompliance = avgVolume / (avgPip - avgPeep);
        
        // Validar que la compliance sea razonable (entre 0.01 y 0.2 L/cmH2O)
        const validatedCompliance = Math.max(0.01, Math.min(0.2, newCompliance));
        
        setCompliance(validatedCompliance);
        
        // Actualizar estado
        setCalculationStatus(prev => ({
          ...prev,
          isCalculating: false,
          requiresRecalculation: true,
          lastError: error,
          lastAdjustment: {
            oldCompliance: prev.lastAdjustment?.newCompliance || 0.02051,
            newCompliance: validatedCompliance,
            averagePressure: avgPip,
            averagePEEP: avgPeep,
            averageVolume: avgVolume,
            error: error,
            timestamp: new Date()
          }
        }));
        
        console.log(`Nueva compliance calculada: ${validatedCompliance.toFixed(5)} L/cmH2O`);
        console.log(`Promedios - PIP: ${avgPip.toFixed(1)}, PEEP: ${avgPeep.toFixed(1)}, Vol: ${avgVolume.toFixed(3)} L`);
        
        // Llamar al callback para recalcular parámetros si está disponible
        if (onComplianceUpdateCallback) {
          onComplianceUpdateCallback(validatedCompliance, {
            averagePressure: avgPip,
            averagePEEP: avgPeep,
            averageVolume: avgVolume,
            error: error
          });
        }
        
        return {
          newCompliance: validatedCompliance,
          requiresUpdate: true,
          adjustmentData: {
            averagePressure: avgPip,
            averagePEEP: avgPeep,
            averageVolume: avgVolume,
            error: error
          }
        };
      } else {
        console.log(`Error ${error.toFixed(1)}% está dentro del rango aceptable (<5%)`);
        
        // Actualizar estado sin recálculo
        setCalculationStatus(prev => ({
          ...prev,
          isCalculating: false,
          requiresRecalculation: false,
          lastError: error
        }));
      }
      
      // Reiniciar contadores y arrays
      setCycleCount(0);
      setPipArray([]);
      setPeepArray([]);
      setVolumeArray([]);
      setCalculationStatus(prev => ({
        ...prev,
        currentCycle: 0
      }));
    }
    
    return null;
  }, [pipArray, peepArray, volumeArray, onComplianceUpdateCallback]);

  // Efecto principal para monitorear los datos y procesar ciclos
  useEffect(() => {
    if (ventilationMode === 'pressure' && realTimeData.pressure.length > 0) {
      setSampleCount(prev => prev + 1);
      
      // Procesar un ciclo cada 100 muestras (como en Python)
      if (sampleCount >= 100) {
        processCycle();
        setSampleCount(0);
      }
    }
  }, [realTimeData.pressure, ventilationMode, sampleCount, processCycle]);

  // Efecto para calcular compliance cuando se completan 5 ciclos
  useEffect(() => {
    if (cycleCount >= 5) {
      calculateNewCompliance();
    }
  }, [cycleCount, calculateNewCompliance]);

  // Función para reiniciar el cálculo de compliance (llamar cuando se envían nuevos parámetros)
  const resetComplianceCalculation = useCallback(() => {
    setCycleCount(0);
    setSampleCount(0);
    setPipArray([]);
    setPeepArray([]);
    setVolumeArray([]);
    setCalculationStatus(prev => ({
      ...prev,
      isCalculating: false,
      currentCycle: 0,
      requiresRecalculation: false,
      lastError: null
    }));
    console.log('Reiniciando cálculo automático de compliance...');
  }, []);

  // Función para establecer compliance manualmente
  const setComplianceManually = useCallback((newCompliance) => {
    const validatedCompliance = Math.max(0.01, Math.min(0.2, newCompliance));
    setCompliance(validatedCompliance);
    setCalculationStatus(prev => ({
      ...prev,
      lastAdjustment: {
        oldCompliance: prev.lastAdjustment?.newCompliance || 0.02051,
        newCompliance: validatedCompliance,
        manual: true,
        timestamp: new Date()
      }
    }));
  }, []);

  // Función para calcular nuevos parámetros basados en la compliance (como calcularP en Python)
  const calculateParametersWithCompliance = useCallback((currentParams, newCompliance = compliance) => {
    const C = newCompliance; // Compliance pulmonar L/cmH2O
    const PEEP = currentParams.peep || 5;
    const PIP = currentParams.presionMax || 20;
    const ti = currentParams.inspiratoryTime || 1; // tiempo inspiratorio en segundos
    
    // Calcular volumen tidal y flujo máximo basado en la nueva compliance
    const Vtil = 1000 * (C * (PIP - PEEP)); // ml
    const Qmax = (C * (PIP - PEEP)) / (ti / 60); // L/min
    const PresT = (0.0025 * Math.pow(Qmax, 2)) + (0.2203 * Qmax) - 0.5912; // Presión tanque
    
    console.log(`Recalculando con C=${C.toFixed(5)}: PIP=${PIP}, PEEP=${PEEP}, Ti=${ti}s`);
    console.log(`Nuevos valores: Vt=${Vtil.toFixed(0)}ml, Qmax=${Qmax.toFixed(1)}L/min, PresT=${PresT.toFixed(1)}`);
    
    return {
      volumen: Math.round(Vtil),
      qMax: Math.round(Qmax * 10) / 10,
      presionTanque: Math.round(PresT * 10) / 10,
      compliance: C
    };
  }, [compliance]);

  // Función para marcar que ya se procesó la recalculación
  const markRecalculationProcessed = useCallback(() => {
    setCalculationStatus(prev => ({
      ...prev,
      requiresRecalculation: false
    }));
  }, []);

  return {
    compliance,
    calculationStatus,
    resetComplianceCalculation,
    setComplianceManually,
    registerUpdateCallback,
    calculateParametersWithCompliance,
    markRecalculationProcessed,
    // Información adicional para debugging
    debug: {
      cycleCount,
      sampleCount,
      pipArray: [...pipArray],
      peepArray: [...peepArray],
      volumeArray: [...volumeArray]
    }
  };
};
