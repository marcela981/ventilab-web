import { useState, useEffect, useCallback, useRef } from 'react';
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
    integratedVolume: [], // Nuevo array para el volumen integrado
    time: [],
  });

  // Estado para el volumen integrado (equivalente a self.v2 en Python)
  const [integratedVolume, setIntegratedVolume] = useState(0);

  // Estados para cálculo de máx/mín cada 100 muestras (como en Python)
  const [maxMinData, setMaxMinData] = useState({
    pressureMax: 0,
    pressureMin: 0,
    flowMax: 0,
    flowMin: 0,
    volumeMax: 0,
    pressureAvg: 0 // Para la media móvil de presión
  });

  // Buffers para acumular 100 muestras (como listp, listf, listv en Python)
  const pressureBuffer = useRef([]);
  const flowBuffer = useRef([]);
  const volumeBuffer = useRef([]);
  const sampleCounter = useRef(0); // Equivalente a self.cont en Python

  // Referencias para filtros (equivalente a self.filtradoP, etc.)
  const filteredPressure = useRef(0);
  const filteredFlow = useRef(0);
  const filteredVolume = useRef(0);
  const dataRecordingRef = useRef(null); // Referencia para grabación de datos

  const [systemStatus, setSystemStatus] = useState({
    lastMessage: '',
    connectionState: 'disconnected',
    lastError: null,
    lastAck: null,
    configConfirmed: false
  });

  const [calculations] = useState(new VentilatorCalculations());

  // Función para registrar el hook de grabación de datos
  const registerDataRecording = useCallback((dataRecordingHook) => {
    dataRecordingRef.current = dataRecordingHook;
  }, []);

  // Función para resetear el volumen integrado
  const resetIntegratedVolume = useCallback(() => {
    setIntegratedVolume(0);
    setRealTimeData(prev => ({
      ...prev,
      integratedVolume: []
    }));
  }, []);

  // Función para obtener el volumen integrado actual
  const getCurrentIntegratedVolume = useCallback(() => {
    return integratedVolume;
  }, [integratedVolume]);

  // Callback para procesar datos de sensores
  const processSensorData = useCallback((decodedFrame) => {
    if (decodedFrame.error) {
      console.error('Error en trama de sensores:', decodedFrame.error);
      return;
    }

    const { pressure, flow, volume } = decodedFrame.data;
    
    // Aplicar filtro de media móvil exponencial (valores exactos del Python)
    const alphaP = 0.1;
    const alphaQ = 0.5;
    const alphaV = 0.3;
    
    filteredPressure.current = (alphaP * pressure) + (1 - alphaP) * filteredPressure.current;
    filteredFlow.current = (alphaQ * flow) + (1 - alphaQ) * filteredFlow.current;
    filteredVolume.current = (alphaV * volume) + (1 - alphaV) * filteredVolume.current;

    const p = filteredPressure.current;
    const f = filteredFlow.current;
    const v = filteredVolume.current;

    // Agregar a buffers para cálculo de máx/mín cada 100 muestras
    pressureBuffer.current.push(p);
    flowBuffer.current.push(f);
    volumeBuffer.current.push(v);

    // Incrementar contador de muestras
    sampleCounter.current += 1;

    // Cálculo de máx/mín cada 100 muestras (como en Python: if(self.cont==100))
    if (sampleCounter.current >= 100) {
      const pressureMax = Math.max(...pressureBuffer.current);
      const pressureMin = Math.min(...pressureBuffer.current);
      const flowMax = Math.max(...flowBuffer.current);
      const flowMin = Math.min(...flowBuffer.current);
      const volumeMax = Math.max(...volumeBuffer.current);
      const pressureAvg = pressureBuffer.current.reduce((a, b) => a + b, 0) / pressureBuffer.current.length;

      setMaxMinData({
        pressureMax: parseFloat(pressureMax.toFixed(1)),
        pressureMin: parseFloat(pressureMin.toFixed(1)),
        flowMax: parseFloat(flowMax.toFixed(0)),
        flowMin: parseFloat(flowMin.toFixed(0)),
        volumeMax: parseFloat(volumeMax.toFixed(0)),
        pressureAvg: parseFloat(pressureAvg.toFixed(1))
      });

      // Limpiar buffers y resetear contador
      pressureBuffer.current = [];
      flowBuffer.current = [];
      volumeBuffer.current = [];
      sampleCounter.current = 0;

      console.log(`100 muestras completadas - PMax: ${pressureMax.toFixed(1)}, PMin: ${pressureMin.toFixed(1)}, FMax: ${flowMax.toFixed(0)}, FMin: ${flowMin.toFixed(0)}, VMax: ${volumeMax.toFixed(0)}`);
    }

    // Actualizar datos en tiempo real
    setRealTimeData(prev => {
      const now = Date.now();
      return {
        pressure: [...prev.pressure.slice(-699), p], // Mantener 700 puntos como en Python
        flow: [...prev.flow.slice(-699), f],
        volume: [...prev.volume.slice(-699), v],
        integratedVolume: [...prev.integratedVolume.slice(-699)], // Se actualizará después
        time: [...prev.time.slice(-699), now],
      };
    });

    // Cálculo del volumen integrado (equivalente a Python: self.v2=self.v2+f)
    setIntegratedVolume(prevIntegratedVol => {
      let newIntegratedVol = prevIntegratedVol + f;
      
      // Reset del volumen integrado si es negativo o si el volumen del sensor es 0
      // (equivalente a Python: if(self.v2<0 or v==0): self.v2=0)
      if (newIntegratedVol < 0 || v === 0) {
        newIntegratedVol = 0;
      }

      // Actualizar el array de volumen integrado en realTimeData
      setRealTimeData(prev => ({
        ...prev,
        integratedVolume: [...prev.integratedVolume.slice(-699), newIntegratedVol]
      }));

      return newIntegratedVol;
    });

    // Agregar datos al hook de grabación si está disponible
    if (dataRecordingRef.current && dataRecordingRef.current.addSensorData) {
      dataRecordingRef.current.addSensorData(p, f, v);
    }

    setVentilatorData(prev => ({
      ...prev,
      pressure: p,
      flow: f,
      volume: v,
    }));
  }, []);

  // Callback para procesar mensajes de estado
  const processStatusMessage = useCallback((decodedFrame) => {
    if (decodedFrame.error) {
      console.error('Error en trama de estado:', decodedFrame.error);
      return;
    }

    setSystemStatus(prev => ({
      ...prev,
      lastMessage: decodedFrame.data.message,
      connectionState: 'connected'
    }));

    console.log('Estado del sistema:', decodedFrame.data.message);
  }, []);

  // Callback para procesar errores
  const processErrorMessage = useCallback((decodedFrame) => {
    if (decodedFrame.error) {
      console.error('Error procesando trama de error:', decodedFrame.error);
      return;
    }

    setSystemStatus(prev => ({
      ...prev,
      lastError: {
        code: decodedFrame.data.code,
        description: decodedFrame.data.description,
        severity: decodedFrame.data.severity,
        timestamp: decodedFrame.data.timestamp
      }
    }));

    console.error(`Error del sistema [${decodedFrame.data.code}]:`, decodedFrame.data.description);
  }, []);

  // Callback para procesar confirmaciones (ACK)
  const processAckMessage = useCallback((decodedFrame) => {
    if (decodedFrame.error) {
      console.error('Error en trama ACK:', decodedFrame.error);
      return;
    }

    setSystemStatus(prev => ({
      ...prev,
      lastAck: {
        code: decodedFrame.data.code,
        message: decodedFrame.data.message,
        timestamp: decodedFrame.data.timestamp
      }
    }));

    console.log('Confirmación recibida:', decodedFrame.data.message);
  }, []);

  // Callback para procesar confirmaciones de configuración
  const processConfigConfirm = useCallback((decodedFrame) => {
    if (decodedFrame.error) {
      console.error('Error en confirmación de configuración:', decodedFrame.error);
      return;
    }

    setSystemStatus(prev => ({
      ...prev,
      configConfirmed: decodedFrame.data.success,
      lastMessage: decodedFrame.data.success 
        ? 'Configuración aplicada exitosamente'
        : `Error en configuración: ${decodedFrame.data.details}`
    }));

    if (decodedFrame.data.success) {
      console.log('Configuración confirmada:', decodedFrame.data.details);
    } else {
      console.error('Error en configuración:', decodedFrame.data.details);
    }
  }, []);

  // Callback para procesar mensajes de debug
  const processDebugMessage = useCallback((decodedFrame) => {
    if (decodedFrame.error) {
      console.error('Error en trama de debug:', decodedFrame.error);
      return;
    }

    console.debug('Debug info:', decodedFrame.data.info);
  }, []);

  // Callback para procesar tramas desconocidas
  const processUnknownMessage = useCallback((decodedFrame) => {
    console.warn('Trama desconocida recibida:', decodedFrame.data);
  }, []);

  // Registrar callbacks cuando la conexión esté disponible
  useEffect(() => {
    if (serialConnection && serialConnection.isConnected) {
      // Registrar todos los callbacks para diferentes tipos de tramas
      serialConnection.onSensorData(processSensorData);
      serialConnection.onStatusMessage(processStatusMessage);
      serialConnection.onErrorMessage(processErrorMessage);
      serialConnection.onAckMessage(processAckMessage);
      serialConnection.onConfigConfirm(processConfigConfirm);
      serialConnection.onDebugMessage(processDebugMessage);
      serialConnection.onUnknownMessage(processUnknownMessage);

      // Actualizar estado de conexión
      setSystemStatus(prev => ({
        ...prev,
        connectionState: 'connected'
      }));
    } else {
      // Actualizar estado de desconexión
      setSystemStatus(prev => ({
        ...prev,
        connectionState: 'disconnected',
        lastMessage: 'Desconectado'
      }));
    }
  }, [
    serialConnection, 
    serialConnection?.isConnected,
    processSensorData,
    processStatusMessage,
    processErrorMessage,
    processAckMessage,
    processConfigConfirm,
    processDebugMessage,
    processUnknownMessage
  ]);

  // Funciones de conveniencia para enviar comandos
  const sendConfiguration = useCallback(async (mode, waveType, parameters) => {
    if (!serialConnection || !serialConnection.isConnected) {
      console.warn('No se puede enviar configuración: sin conexión');
      return false;
    }

    return await serialConnection.sendConfiguration(mode, waveType, parameters);
  }, [serialConnection]);

  const startVentilation = useCallback(async () => {
    if (!serialConnection || !serialConnection.isConnected) {
      console.warn('No se puede iniciar ventilación: sin conexión');
      return false;
    }

    return await serialConnection.startSystem();
  }, [serialConnection]);

  const stopVentilation = useCallback(async () => {
    if (!serialConnection || !serialConnection.isConnected) {
      console.warn('No se puede detener ventilación: sin conexión');
      return false;
    }

    return await serialConnection.stopSystem();
  }, [serialConnection]);

  const resetSystem = useCallback(async () => {
    if (!serialConnection || !serialConnection.isConnected) {
      console.warn('No se puede reiniciar sistema: sin conexión');
      return false;
    }

    return await serialConnection.resetSystem();
  }, [serialConnection]);

  return {
    ventilatorData,
    realTimeData,
    systemStatus,
    setVentilatorData,
    calculations,
    // Datos del volumen integrado
    integratedVolume,
    getCurrentIntegratedVolume,
    resetIntegratedVolume,
    // Funciones de comando
    sendConfiguration,
    startVentilation,
    stopVentilation,
    resetSystem,
    // Datos de máx/mín cada 100 muestras
    maxMinData,
    // Funciones adicionales
    registerDataRecording
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
