import React, { createContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';

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

export const PatientDataProvider = ({ children }) => {
  const [patientData, setPatientData] = useState(null);
  const [isPatientDataActive, setIsPatientDataActive] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [isDataPersisted, setIsDataPersisted] = useState(false);

  const patientDataRef = useRef(null);
  const isActiveRef = useRef(false);

  const receivePatientData = useCallback((data) => {
    if (!data || !data.patientBasicData || !data.calculatedParams) {
      console.warn("PatientDataContext: Datos incompletos recibidos", data);
      return;
    }

    setPatientData(data);
    patientDataRef.current = data;
    setLastUpdate(new Date());
    setIsDataPersisted(true);
    setIsPatientDataActive(true);
    isActiveRef.current = true;
  }, []);

  const activatePatientMode = useCallback(() => {
    if (patientData) {
      setIsPatientDataActive(true);
      isActiveRef.current = true;
    }
  }, [patientData]);

  const deactivatePatientMode = useCallback(() => {
    setIsPatientDataActive(false);
    isActiveRef.current = false;
  }, []);

  const clearPatientData = useCallback(() => {
    setPatientData(null);
    patientDataRef.current = null;
    setIsPatientDataActive(false);
    isActiveRef.current = false;
    setLastUpdate(null);
    setIsDataPersisted(false);
  }, []);

  const sendPatientDataToConnection = useCallback((serialConnection) => {
    if (!patientData || !serialConnection || !serialConnection.isConnected) {
      return false;
    }

    try {
      const ventilatorParams = {
        fio2: patientData.calculatedParams.fio2Inicial || 21,
        volumen: patientData.calculatedParams.volumenTidal || 500,
        peep: patientData.calculatedParams.peepRecomendado || 5,
        frecuencia: patientData.calculatedParams.frecuenciaResp || 12,
      };

      if (serialConnection.sendConfiguration) {
        serialConnection.sendConfiguration(ventilatorParams);
        return true;
      }
      return false;
    } catch (error) {
      console.error("PatientDataContext: Error al enviar datos:", error);
      return false;
    }
  }, [patientData]);

  useEffect(() => {
    patientDataRef.current = patientData;
  }, [patientData]);

  useEffect(() => {
    isActiveRef.current = isPatientDataActive;
  }, [isPatientDataActive]);

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
