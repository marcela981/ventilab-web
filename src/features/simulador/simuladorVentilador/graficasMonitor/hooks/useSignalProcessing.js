import { useState, useEffect, useRef } from 'react';

const useSignalProcessing = (realTimeData) => {
    const filterSignal = (newValue, prevFiltered, alpha) => {
      return (alpha * newValue) + (1 - alpha) * prevFiltered;
    };

    const [filteredData, setFilteredData] = useState({
      pressure: { filtered: 0, max: 0, min: 0, avg: 0 },
      flow: { filtered: 0, max: 0, min: 0, avg: 0 },
      volume: { filtered: 0, max: 0, min: 0, avg: 0 }
    });

    // Use refs for previous filtered values to break the dependency loop.
    // Previously filteredData.*.filtered was in deps → setFilteredData → new filtered → re-trigger.
    const filteredPressureRef = useRef(0);
    const filteredFlowRef = useRef(0);
    const filteredVolumeRef = useRef(0);

    useEffect(() => {
      if (realTimeData.pressure.length > 0) {
        const newPressure = filterSignal(
          realTimeData.pressure[realTimeData.pressure.length - 1],
          filteredPressureRef.current,
          0.1 // alphaP
        );
        const newFlow = filterSignal(
          realTimeData.flow[realTimeData.flow.length - 1],
          filteredFlowRef.current,
          0.5 // alphaQ
        );
        const newVolume = filterSignal(
          realTimeData.volume[realTimeData.volume.length - 1],
          filteredVolumeRef.current,
          0.3 // alphaV
        );

        // Update refs for next iteration
        filteredPressureRef.current = newPressure;
        filteredFlowRef.current = newFlow;
        filteredVolumeRef.current = newVolume;

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
    }, [realTimeData]); // Only depend on realTimeData — refs handle previous filtered values

    return filteredData;
  };

export { useSignalProcessing };
