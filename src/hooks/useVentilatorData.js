import { useState, useEffect, useCallback } from 'react';
import { VentilatorCalculations } from '../utils/ventilatorCalculations';

export const useVentilatorData = (serialConnection) => {
  const [ventilatorData, setVentilatorData] = useState({
    pressure: 0,
    flow: 0,
    volume: 0,
    fio2: 21,
    volumen: 500,
    qMax: 60,
    peep: 5,
    frecuencia: 12,
    // Parámetros específicos del modo presión control
    presionMax: 20,
    volumenObjetivo: 500,
    // Parámetros de relación I:E y pausas
    relacionIE1: 1,
    relacionIE2: 2,
    pausaInspiratoria: 0.1,
    pausaEspiratoria: 0.1,
    inspiracionEspiracion: 0.5,
    // ... otros parámetros
  });

  const [realTimeData, setRealTimeData] = useState({
    pressure: [],
    flow: [],
    volume: [],
    time: [],
  });

  const [calculations] = useState(new VentilatorCalculations());

  const processSensorData = useCallback((frame) => {
    if (frame.startsWith('S')) {
      const { pressure, flow, volume } = calculations.decodeSensorFrame(frame);
      
      // Filtro de media móvil exponencial (como en Python)
      const alphaP = 0.1;
      const alphaQ = 0.5;
      const alphaV = 0.3;
      
      setRealTimeData(prev => {
        const now = Date.now();
        const filteredPressure = (alphaP * pressure) + (1 - alphaP) * (prev.pressure[prev.pressure.length - 1] || 0);
        const filteredFlow = (alphaQ * flow) + (1 - alphaQ) * (prev.flow[prev.flow.length - 1] || 0);
        const filteredVolume = (alphaV * volume) + (1 - alphaV) * (prev.volume[prev.volume.length - 1] || 0);

        return {
          pressure: [...prev.pressure.slice(-100), filteredPressure],
          flow: [...prev.flow.slice(-100), filteredFlow],
          volume: [...prev.volume.slice(-100), filteredVolume],
          time: [...prev.time.slice(-100), now],
        };
      });

      setVentilatorData(prev => ({
        ...prev,
        pressure,
        flow,
        volume,
      }));
    }
  }, [calculations]);

  useEffect(() => {
    if (serialConnection.isConnected) {
      serialConnection.readData(processSensorData);
    }
  }, [serialConnection.isConnected, processSensorData]);

  return {
    ventilatorData,
    realTimeData,
    setVentilatorData,
    calculations
  };
};
