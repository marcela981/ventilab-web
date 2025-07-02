import React, { createContext, useState, useCallback, useMemo } from 'react';

// 1. Crear el Context con valores por defecto
export const PatientDataContext = createContext({
  patientData: null,
  isPatientDataActive: false,
  lastUpdate: null,
  receivePatientData: () => {},
  activatePatientMode: () => {},
  deactivatePatientMode: () => {},
  clearPatientData: () => {},
});

// 2. Crear el Provider que contendrá la lógica y el estado
export const PatientDataProvider = ({ children }) => {
  const [patientData, setPatientData] = useState(null);
  const [isPatientDataActive, setIsPatientDataActive] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Función para que PatientSimulator envíe los datos
  const receivePatientData = useCallback((data) => {
    console.log("PatientDataContext: Datos recibidos del simulador", data);
    setPatientData(data);
    setLastUpdate(new Date());
    // Por defecto, no activamos el modo simulado, el usuario debe hacerlo
    setIsPatientDataActive(false); 
  }, []);

  // Activar modo simulado en el dashboard
  const activatePatientMode = useCallback(() => {
    if (patientData) {
      console.log("PatientDataContext: Activando modo paciente simulado");
      setIsPatientDataActive(true);
    } else {
      console.warn("PatientDataContext: Intento de activar modo simulado sin datos.");
    }
  }, [patientData]);

  // Desactivar modo simulado y volver a datos reales
  const deactivatePatientMode = useCallback(() => {
    console.log("PatientDataContext: Desactivando modo paciente simulado");
    setIsPatientDataActive(false);
  }, []);
  
  // Limpiar los datos del paciente
  const clearPatientData = useCallback(() => {
    console.log("PatientDataContext: Limpiando datos del paciente");
    setPatientData(null);
    setIsPatientDataActive(false);
    setLastUpdate(null);
  }, []);

  // Memoizar el valor del context para evitar re-renders innecesarios
  const contextValue = useMemo(() => ({
    patientData,
    isPatientDataActive,
    lastUpdate,
    receivePatientData,
    activatePatientMode,
    deactivatePatientMode,
    clearPatientData
  }), [patientData, isPatientDataActive, lastUpdate, receivePatientData, activatePatientMode, deactivatePatientMode, clearPatientData]);

  return (
    <PatientDataContext.Provider value={contextValue}>
      {children}
    </PatientDataContext.Provider>
  );
}; 