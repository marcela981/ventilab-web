import { useState, useEffect, useCallback } from 'react';

/**
 * Hook simplificado para el sistema de compliance automático
 * Combina cálculo de compliance y detección de errores
 */
export const useAutoCompliance = (realTimeData, targetValues, ventilationMode = 'pressure') => {
  // Estados principales
  const [compliance, setCompliance] = useState(0.02051);
  const [cycleData, setCycleData] = useState({
    count: 0,
    samples: 0,
    pipArray: [],
    peepArray: [],
    volumeArray: []
  });
  
  const [status, setStatus] = useState({
    isCalculating: false,
    currentCycle: 0,
    lastError: null,
    lastAdjustment: null
  });
  
  const [errors, setErrors] = useState([]);
  const [onUpdateCallback, setOnUpdateCallback] = useState(null);

  // Función para procesar ciclo
  const processCycle = useCallback(() => {
    if (realTimeData.pressure.length >= 100 && realTimeData.volume.length >= 100) {
      const recent = {
        pressure: realTimeData.pressure.slice(-100),
        volume: realTimeData.volume.slice(-100)
      };
      
      const cycleStats = {
        maxPressure: Math.max(...recent.pressure),
        minPressure: Math.min(...recent.pressure),
        maxVolume: Math.max(...recent.volume)
      };
      
      setCycleData(prev => ({
        count: prev.count + 1,
        samples: 0,
        pipArray: [...prev.pipArray, cycleStats.maxPressure],
        peepArray: [...prev.peepArray, cycleStats.minPressure],
        volumeArray: [...prev.volumeArray, cycleStats.maxVolume]
      }));
      
      setStatus(prev => ({
        ...prev,
        currentCycle: prev.currentCycle + 1,
        isCalculating: true
      }));
    }
  }, [realTimeData]);

  // Función para calcular nueva compliance
  const calculateCompliance = useCallback((targetPIP) => {
    const { pipArray, peepArray, volumeArray } = cycleData;
    
    if (pipArray.length >= 5) {
      const lastPIP = pipArray[pipArray.length - 1];
      const error = targetPIP ? ((Math.abs(targetPIP - lastPIP)) / targetPIP) * 100 : 0;
      
      if (error > 5) {
        // Filtrar primeros 2 ciclos y calcular promedios
        const filtered = {
          pip: pipArray.slice(2),
          peep: peepArray.slice(2),
          volume: volumeArray.slice(2)
        };
        
        const averages = {
          pip: filtered.pip.reduce((a, b) => a + b, 0) / filtered.pip.length,
          peep: filtered.peep.reduce((a, b) => a + b, 0) / filtered.peep.length,
          volume: (filtered.volume.reduce((a, b) => a + b, 0) / filtered.volume.length) / 1000
        };
        
        const newCompliance = Math.max(0.01, Math.min(0.2, 
          averages.volume / (averages.pip - averages.peep)
        ));
        
        setCompliance(newCompliance);
        setStatus(prev => ({
          ...prev,
          isCalculating: false,
          lastError: error,
          lastAdjustment: {
            newCompliance,
            error,
            timestamp: new Date(),
            ...averages
          }
        }));
        
        // Callback para recálculo de parámetros
        if (onUpdateCallback) {
          onUpdateCallback(newCompliance, { error, ...averages });
        }
        
        // Reiniciar
        setCycleData({ count: 0, samples: 0, pipArray: [], peepArray: [], volumeArray: [] });
        setStatus(prev => ({ ...prev, currentCycle: 0 }));
        
        return true;
      }
      
      // Error dentro del rango aceptable
      setStatus(prev => ({ ...prev, isCalculating: false, lastError: error }));
      setCycleData({ count: 0, samples: 0, pipArray: [], peepArray: [], volumeArray: [] });
      setStatus(prev => ({ ...prev, currentCycle: 0 }));
    }
    
    return false;
  }, [cycleData, onUpdateCallback]);

  // Detección de errores simplificada
  const checkErrors = useCallback(() => {
    const newErrors = [];
    const threshold = 5;
    
    if (targetValues.presionMax && realTimeData.pressure?.length > 0) {
      const currentPIP = Math.max(...realTimeData.pressure.slice(-100));
      const pipError = Math.abs(targetValues.presionMax - currentPIP) / targetValues.presionMax * 100;
      
      if (pipError > threshold) {
        newErrors.push({
          type: 'PIP_ERROR',
          severity: pipError > 10 ? 'high' : 'medium',
          error: pipError,
          current: currentPIP,
          target: targetValues.presionMax
        });
      }
    }
    
    if (targetValues.volumen && realTimeData.volume?.length > 0) {
      const currentVol = Math.max(...realTimeData.volume.slice(-100));
      const volError = Math.abs(targetValues.volumen - currentVol) / targetValues.volumen * 100;
      
      if (volError > threshold) {
        newErrors.push({
          type: 'VOLUME_ERROR',
          severity: volError > 15 ? 'high' : 'medium',
          error: volError,
          current: currentVol,
          target: targetValues.volumen
        });
      }
    }
    
    setErrors(newErrors);
  }, [targetValues, realTimeData]);

  // Efectos principales
  useEffect(() => {
    if (ventilationMode === 'pressure' && realTimeData.pressure.length > 0) {
      setCycleData(prev => ({ ...prev, samples: prev.samples + 1 }));
      
      if (cycleData.samples >= 100) {
        processCycle();
      }
    }
  }, [realTimeData.pressure, ventilationMode, processCycle, cycleData.samples]);

  useEffect(() => {
    if (cycleData.count >= 5) {
      calculateCompliance(targetValues.presionMax);
    }
  }, [cycleData.count, calculateCompliance, targetValues.presionMax]);

  useEffect(() => {
    checkErrors();
  }, [checkErrors]);

  // API pública
  return {
    // Datos principales
    compliance,
    status: {
      ...status,
      isCalculating: status.isCalculating && cycleData.count < 5,
      progress: Math.min(cycleData.count, 5)
    },
    errors,
    
    // Funciones de control
    registerCallback: useCallback((callback) => {
      setOnUpdateCallback(() => callback);
    }, []),
    
    reset: useCallback(() => {
      setCycleData({ count: 0, samples: 0, pipArray: [], peepArray: [], volumeArray: [] });
      setStatus({ isCalculating: false, currentCycle: 0, lastError: null, lastAdjustment: null });
      setErrors([]);
    }, []),
    
    // Utilidades
    hasErrors: errors.length > 0,
    hasHighSeverityErrors: errors.some(e => e.severity === 'high'),
    
    // Debug (opcional, se puede eliminar en producción)
    debug: {
      cycleCount: cycleData.count,
      sampleCount: cycleData.samples,
      dataPoints: {
        pip: cycleData.pipArray.length,
        peep: cycleData.peepArray.length,
        volume: cycleData.volumeArray.length
      }
    }
  };
}; 