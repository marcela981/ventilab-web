import { useState, useEffect } from 'react';

const useSignalProcessing = (realTimeData) => {
    // Filtros de media móvil exponencial (valores del archivo Python)
    const filterSignal = (newValue, prevFiltered, alpha) => {
      return (alpha * newValue) + (1 - alpha) * prevFiltered;
    };
  
    const [filteredData, setFilteredData] = useState({
      pressure: { filtered: 0, max: 0, min: 0, avg: 0 },
      flow: { filtered: 0, max: 0, min: 0, avg: 0 },
      volume: { filtered: 0, max: 0, min: 0, avg: 0 }
    });
  
    useEffect(() => {
      if (realTimeData.pressure.length > 0) {
        // Aplicar filtros con los mismos valores alpha del archivo Python
        const newPressure = filterSignal(
          realTimeData.pressure[realTimeData.pressure.length - 1],
          filteredData.pressure.filtered,
          0.1 // alphaP
        );
        const newFlow = filterSignal(
          realTimeData.flow[realTimeData.flow.length - 1],
          filteredData.flow.filtered,
          0.5 // alphaQ
        );
        const newVolume = filterSignal(
          realTimeData.volume[realTimeData.volume.length - 1],
          filteredData.volume.filtered,
          0.3 // alphaV
        );
  
        // Calcular máximos, mínimos y promedios
        setFilteredData({
          pressure: {
            filtered: newPressure,
            max: Math.max(...realTimeData.pressure),
            min: Math.min(...realTimeData.pressure),
            avg: realTimeData.pressure.reduce((a, b) => a + b, 0) / realTimeData.pressure.length
          },
          flow: {
            filtered: newFlow,
            max: Math.max(...realTimeData.flow),
            min: Math.min(...realTimeData.flow),
            avg: realTimeData.flow.reduce((a, b) => a + b, 0) / realTimeData.flow.length
          },
          volume: {
            filtered: newVolume,
            max: Math.max(...realTimeData.volume),
            min: 0, // El volumen mínimo siempre es 0
            avg: realTimeData.volume.reduce((a, b) => a + b, 0) / realTimeData.volume.length
          }
        });
      }
    }, [realTimeData, filteredData.pressure.filtered, filteredData.flow.filtered, filteredData.volume.filtered]);
  
    return filteredData;
  };

export { useSignalProcessing };