import React, { createContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';

// 1. Crear el Context con valores por defecto
export const PatientDataContext = createContext({
  patientData: null,
  isPatientDataActive: false,
  lastUpdate: null,
  receivePatientData: () => {},
  activatePatientMode: () => {},
  deactivatePatientMode: () => {},
  clearPatientData: () => {},
  sendPatientDataToConnection: () => {},
  isDataPersisted: false,
});

// 2. Crear el Provider que contendrá la lógica y el estado
export const PatientDataProvider = ({ children }) => {
  const [patientData, setPatientData] = useState(null);
  const [isPatientDataActive, setIsPatientDataActive] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [isDataPersisted, setIsDataPersisted] = useState(false);
  
  // Ref para mantener una referencia estable a los datos del paciente
  const patientDataRef = useRef(null);
  const isActiveRef = useRef(false);

  // Función para que PatientSimulator envíe los datos
  const receivePatientData = useCallback((data) => {
    console.log("PatientDataContext: Datos recibidos del simulador", data);
    
    // Validar que los datos sean completos
    if (!data || !data.patientBasicData || !data.calculatedParams) {
      console.warn("PatientDataContext: Datos incompletos recibidos", data);
      return;
    }

    // Guardar los datos en el estado y en la ref
    setPatientData(data);
    patientDataRef.current = data;
    setLastUpdate(new Date());
    setIsDataPersisted(true);
    
    // Por defecto, activamos el modo simulado automáticamente
    setIsPatientDataActive(true);
    isActiveRef.current = true;
    
    console.log("PatientDataContext: Datos del paciente persistidos y modo activado");
  }, []);

  // Activar modo simulado en el dashboard
  const activatePatientMode = useCallback(() => {
    if (patientData) {
      console.log("PatientDataContext: Activando modo paciente simulado");
      setIsPatientDataActive(true);
      isActiveRef.current = true;
    } else {
      console.warn("PatientDataContext: Intento de activar modo simulado sin datos.");
    }
  }, [patientData]);

  // Desactivar modo simulado y volver a datos reales
  const deactivatePatientMode = useCallback(() => {
    console.log("PatientDataContext: Desactivando modo paciente simulado");
    setIsPatientDataActive(false);
    isActiveRef.current = false;
  }, []);
  
  // Limpiar los datos del paciente
  const clearPatientData = useCallback(() => {
    console.log("PatientDataContext: Limpiando datos del paciente");
    setPatientData(null);
    patientDataRef.current = null;
    setIsPatientDataActive(false);
    isActiveRef.current = false;
    setLastUpdate(null);
    setIsDataPersisted(false);
  }, []);

  // Función para enviar datos del paciente a la conexión serial
  const sendPatientDataToConnection = useCallback((serialConnection) => {
    if (!patientData || !serialConnection || !serialConnection.isConnected) {
      console.warn("PatientDataContext: No se pueden enviar datos - faltan datos o conexión");
      return false;
    }

    try {
      // Preparar los parámetros calculados para enviar al ventilador
      const ventilatorParams = {
        fio2: patientData.calculatedParams.fio2Inicial || 21,
        volumen: patientData.calculatedParams.volumenTidal || 500,
        peep: patientData.calculatedParams.peepRecomendado || 5,
        frecuencia: patientData.calculatedParams.frecuenciaResp || 12,
      };

      console.log("PatientDataContext: Enviando parámetros del paciente al ventilador:", ventilatorParams);
      
      // Aquí se enviarían los parámetros al ventilador a través de la conexión serial
      // Por ahora solo simulamos el envío
      if (serialConnection.sendConfiguration) {
        serialConnection.sendConfiguration(ventilatorParams);
        console.log("PatientDataContext: Parámetros enviados exitosamente al ventilador");
        return true;
      } else {
        console.warn("PatientDataContext: Método sendConfiguration no disponible en la conexión");
        return false;
      }
    } catch (error) {
      console.error("PatientDataContext: Error al enviar datos del paciente:", error);
      return false;
    }
  }, [patientData]);

  // Efecto para mantener la persistencia de datos en memoria
  useEffect(() => {
    // Los datos se mantienen en memoria hasta que se recargue la página
    // o se llame explícitamente a clearPatientData
    const handleBeforeUnload = () => {
      console.log("PatientDataContext: Página recargándose - datos del paciente se perderán");
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Efecto para sincronizar el estado con las refs
  useEffect(() => {
    patientDataRef.current = patientData;
  }, [patientData]);

  useEffect(() => {
    isActiveRef.current = isPatientDataActive;
  }, [isPatientDataActive]);

  // Memoizar el valor del context para evitar re-renders innecesarios
  const contextValue = useMemo(() => ({
    patientData,
    isPatientDataActive,
    lastUpdate,
    isDataPersisted,
    receivePatientData,
    activatePatientMode,
    deactivatePatientMode,
    clearPatientData,
    sendPatientDataToConnection
  }), [
    patientData, 
    isPatientDataActive, 
    lastUpdate, 
    isDataPersisted,
    receivePatientData, 
    activatePatientMode, 
    deactivatePatientMode, 
    clearPatientData,
    sendPatientDataToConnection
  ]);

  return (
    <PatientDataContext.Provider value={contextValue}>
      {children}
    </PatientDataContext.Provider>
  );
}; 