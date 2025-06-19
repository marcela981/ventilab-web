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
    presionMax: 20,
    volumenObjetivo: 500,
    relacionIE1: 1,
    relacionIE2: 2,
    pausaInspiratoria: 0.1,
    pausaEspiratoria: 0.1,
    inspiracionEspiracion: 0.5,
    // Nuevos campos para cálculos automáticos
    tiempoInspiratorio: 2.5,
    tiempoEspiratorio: 2.5,
    presionTanque: 0,
    relacionTexto: "Relación 1:2 [s]"
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
      
      // Filtro de media móvil exponencial
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

const useComplianceCalculation = (realTimeData) => {
  const [compliance, setCompliance] = useState(0.02051); // Valor inicial
  const [cycleCount, setCycleCount] = useState(0);
  const [pipArray, setPipArray] = useState([]);
  const [peepArray, setPeepArray] = useState([]);
  const [volumeArray, setVolumeArray] = useState([]);

  useEffect(() => {
    // Cada 100 muestras = 1 ciclo
    if (realTimeData.pressure.length >= 100) {
      const maxPressure = Math.max(...realTimeData.pressure);
      const minPressure = Math.min(...realTimeData.pressure);
      const maxVolume = Math.max(...realTimeData.volume);

      setPipArray(prev => [...prev, maxPressure]);
      setPeepArray(prev => [...prev, minPressure]);
      setVolumeArray(prev => [...prev, maxVolume]);
      setCycleCount(prev => prev + 1);

      // Después de 5 ciclos
      if (cycleCount === 5) {
        // Eliminar los primeros dos términos
        const filteredPip = pipArray.slice(2);
        const filteredPeep = peepArray.slice(2);
        const filteredVolume = volumeArray.slice(2);

        // Calcular promedios
        const avgPip = filteredPip.reduce((a, b) => a + b) / filteredPip.length;
        const avgPeep = filteredPeep.reduce((a, b) => a + b) / filteredPeep.length;
        const avgVolume = (filteredVolume.reduce((a, b) => a + b) / filteredVolume.length) / 1000; // convertir a L

        // Calcular nueva compliance
        const newCompliance = avgVolume / (avgPip - avgPeep);
        setCompliance(newCompliance);

        // Reiniciar contadores
        setCycleCount(0);
        setPipArray([]);
        setPeepArray([]);
        setVolumeArray([]);
      }
    }
  }, [realTimeData]);

  return compliance;
};
