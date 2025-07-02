// NUEVO ARCHIVO: Generar datos en tiempo real basados en el paciente simulado

export const generateSimulatedRealTimeData = (patientData) => {
  if (!patientData) return { pressure: [], flow: [], volume: [], time: [] };

  const { calculatedParams, clinicalData, respiratoryConditions } = patientData;
  
  // Generar datos basados en los parámetros calculados y condiciones del paciente
  const timePoints = Array.from({ length: 50 }, (_, i) => i * 0.1);
  
  // Factores de modificación basados en condiciones respiratorias
  let pressureModifier = 1;
  let flowModifier = 1;
  let volumeModifier = 1;
  
  if (respiratoryConditions.ards) {
    pressureModifier = 1.3; // Mayor presión para ARDS
    volumeModifier = 0.7;   // Menor volumen
  }
  
  if (respiratoryConditions.epoc) {
    flowModifier = 0.8;     // Flujo reducido
    pressureModifier = 0.9; // Presión ligeramente menor
  }
  
  if (respiratoryConditions.neumonia) {
    pressureModifier = 1.1; // Presión ligeramente aumentada
    volumeModifier = 0.9;   // Volumen ligeramente reducido
  }

  // Generar ondas simuladas basadas en parámetros del paciente
  const pressure = timePoints.map(t => {
    const cycleTime = t % 4; // Ciclo de 4 segundos
    const baseValue = calculatedParams.peepRecomendado || 5;
    
    if (cycleTime < 1) {
      // Fase inspiratoria
      return (baseValue + 15 * Math.sin(Math.PI * cycleTime)) * pressureModifier;
    } else {
      // Fase espiratoria
      return baseValue * pressureModifier;
    }
  });

  const flow = timePoints.map(t => {
    const cycleTime = t % 4;
    const maxFlow = (calculatedParams.volumenTidal || 500) * 0.1; // Convertir a L/min
    
    if (cycleTime < 1) {
      // Flujo inspiratorio positivo
      return maxFlow * Math.sin(Math.PI * cycleTime) * flowModifier;
    } else if (cycleTime < 2.5) {
      // Flujo espiratorio negativo
      return -maxFlow * 0.6 * Math.sin(Math.PI * (cycleTime - 1) / 1.5) * flowModifier;
    } else {
      // Pausa
      return 0;
    }
  });

  const volume = timePoints.map(t => {
    const cycleTime = t % 4;
    const maxVolume = calculatedParams.volumenTidal || 500;
    
    if (cycleTime < 1) {
      // Llenado inspiratorio
      return maxVolume * (1 - Math.cos(Math.PI * cycleTime)) / 2 * volumeModifier;
    } else if (cycleTime < 2.5) {
      // Vaciado espiratorio
      return maxVolume * (1 + Math.cos(Math.PI * (cycleTime - 1) / 1.5)) / 2 * volumeModifier;
    } else {
      // Volumen residual
      return 0;
    }
  });

  return {
    pressure,
    flow,
    volume,
    time: timePoints
  };
}; 