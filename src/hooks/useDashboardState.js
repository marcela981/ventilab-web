import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { SerialProtocol } from '../utils/serialCommunication';

/**
 * useDashboardState.js
 * 
 * Custom hook que encapsula toda la lógica de estado del VentilatorDashboard.
 * Incluye estados, efectos, handlers y cálculos relacionados con el dashboard.
 */

const useDashboardState = ({
  // Dependencias externas
  serialConnection,
  ventilatorData,
  setVentilatorData,
  realTimeData,
  patientData,
  isDataPersisted,
  sendPatientDataToConnection,
  activatePatientMode,
  deactivatePatientMode,
  parameterValidation,
  dataRecording,
  complianceData,
  errorDetection,
  registerDataRecording,
  integratedVolume,
  resetIntegratedVolume,
  useComplianceCalculation,
  useSignalProcessing,
  useErrorDetection,
  useAIAnalysis
}) => {
  
  // ==================== ESTADOS ====================
  
  // Estados principales del dashboard
  const [ventilationMode, setVentilationMode] = useState('volume'); // 'volume' o 'pressure'
  const [configSent, setConfigSent] = useState(false);
  const [dataSource, setDataSource] = useState('real'); // 'real' o 'simulated'
  const [realDataBackup, setRealDataBackup] = useState(null); // Backup para datos reales
  const [activeTab, setActiveTab] = useState(1); // 0: Simular paciente, 1: Monitoreo, 2: Gráficas, 3: Conexión
  
  // Estados del modo de ajuste
  const [isAdjustMode, setIsAdjustMode] = useState(false);
  const [cardConfig, setCardConfig] = useState([
    { id: 'presionPico', label: 'Presión Pico', visible: true, order: 0 },
    { id: 'presionMedia', label: 'Presión Media', visible: true, order: 1 },
    { id: 'peep', label: 'PEEP', visible: true, order: 2 },
    { id: 'flujoMax', label: 'Flujo Max', visible: true, order: 3 },
    { id: 'flujo', label: 'Flujo', visible: true, order: 4 },
    { id: 'flujoMin', label: 'Flujo Min', visible: true, order: 5 },
    { id: 'volMax', label: 'Vol Max', visible: true, order: 6 },
    { id: 'volumen', label: 'Volumen', visible: true, order: 7 },
    { id: 'volumenIntegrado', label: 'Vol Integrado', visible: true, order: 8 },
    { id: 'compliance', label: 'Compliance', visible: false, order: 9 }, // Solo visible en presión control
    { id: 'presionMeseta', label: 'Presión Meseta', visible: false, order: 10 },
    { id: 'presionPlaton', label: 'Presión Platón', visible: false, order: 11 },
  ]);
  const [draggedCard, setDraggedCard] = useState(null);
  
  // Estados de UI y notificaciones
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [autoAdjustmentEnabled, setAutoAdjustmentEnabled] = useState(true);
  const [lastAutoAdjustment, setLastAutoAdjustment] = useState(null);
  const [complianceCardExpanded, setComplianceCardExpanded] = useState(false);
  const [downloadMenuAnchor, setDownloadMenuAnchor] = useState(null);
  const [notification, setNotification] = useState(null);
  const [showValidationAlerts, setShowValidationAlerts] = useState(false);
  const [showCompactValidationAlerts, setShowCompactValidationAlerts] = useState(false);
  const [lastSentConfigData, setLastSentConfigData] = useState(null);
  
  // ==================== REFS ====================
  
  // Refs para mantener referencias estables y evitar bucles infinitos
  const ventilatorDataRef = useRef(ventilatorData);
  const complianceDataRef = useRef(complianceData);
  const serialConnectionRef = useRef(serialConnection);
  const autoAdjustmentEnabledRef = useRef(autoAdjustmentEnabled);
  
  // ==================== HOOKS DEPENDIENTES ====================
  
  // Datos para mostrar en las gráficas
  const displayData = useMemo(() => {
    // Si estamos en modo simulado, no hay gráficas de tiempo real
    if (dataSource === 'simulated') {
      return { isSimulated: true, pressure: [], flow: [], volume: [], time: [] };
    }

    if (serialConnection.isConnected) {
      return realTimeData;
    } else {
      return { pressure: [], flow: [], volume: [], time: [] };
    }
  }, [serialConnection.isConnected, realTimeData, dataSource]);

  // Hooks para cálculos y monitoreo
  const complianceDataCalculated = useComplianceCalculation(displayData, ventilationMode);
  const filteredData = useSignalProcessing(displayData);
  const errorDetectionCalculated = useErrorDetection(
    ventilatorData, // valores objetivo
    filteredData,   // valores actuales
    complianceDataCalculated.compliance      // compliance calculada
  );

  // Hook para análisis de IA
  const {
    isAnalyzing,
    analysisResult,
    analysisError,
    analyzeConfiguration,
    clearAnalysis
  } = useAIAnalysis();

  // ==================== EFECTOS ====================
  
  // Actualizar refs cuando cambien los valores
  useEffect(() => {
    ventilatorDataRef.current = ventilatorData;
  }, [ventilatorData]);

  useEffect(() => {
    complianceDataRef.current = complianceDataCalculated;
  }, [complianceDataCalculated]);

  useEffect(() => {
    serialConnectionRef.current = serialConnection;
  }, [serialConnection]);

  useEffect(() => {
    autoAdjustmentEnabledRef.current = autoAdjustmentEnabled;
  }, [autoAdjustmentEnabled]);

  // Efecto para cambiar los parámetros del ventilador al usar datos simulados
  useEffect(() => {
    // Entrar a modo simulado
    if (dataSource === 'simulated' && patientData) {
      if (!realDataBackup) {
        setRealDataBackup(ventilatorData);
      }
      const simulatedParams = {
        ...ventilatorData,
        fio2: patientData.calculatedParams.fio2Inicial || 21,
        volumen: patientData.calculatedParams.volumenTidal || 500,
        peep: patientData.calculatedParams.peepRecomendado || 5,
        frecuencia: patientData.calculatedParams.frecuenciaResp || 12,
      };
      setVentilatorData(simulatedParams);
      
      // Activar el modo paciente automáticamente
      activatePatientMode();
    } 
    // Salir de modo simulado
    else if (dataSource === 'real' && realDataBackup) {
      setVentilatorData(realDataBackup);
      setRealDataBackup(null);
      
      // Desactivar el modo paciente
      deactivatePatientMode();
    }
  }, [dataSource, patientData, realDataBackup, setVentilatorData, ventilatorData, activatePatientMode, deactivatePatientMode]);

  // Efecto para enviar automáticamente los datos del paciente a la conexión
  useEffect(() => {
    if (isDataPersisted && patientData && serialConnection.isConnected && dataSource === 'simulated') {
      console.log('VentilatorDashboard: Enviando datos del paciente a la conexión automáticamente');
      const success = sendPatientDataToConnection(serialConnection);
      if (success) {
        setNotification({
          type: 'success',
          message: `Datos del paciente ${patientData.patientBasicData.nombre} ${patientData.patientBasicData.apellido} enviados al ventilador`,
          timestamp: Date.now()
        });
      } else {
        setNotification({
          type: 'warning',
          message: 'No se pudieron enviar los datos del paciente al ventilador',
          timestamp: Date.now()
        });
      }
    }
  }, [isDataPersisted, patientData, serialConnection.isConnected, dataSource, sendPatientDataToConnection]);

  // Registrar el hook de grabación con el hook del ventilador
  useEffect(() => {
    registerDataRecording(dataRecording);
  }, [registerDataRecording, dataRecording]);

  // Efecto para aplicar ajustes automáticos cuando hay errores críticos
  useEffect(() => {
    if (errorDetectionCalculated.hasErrors && ventilationMode === 'pressure' && errorDetectionCalculated.hasHighSeverityErrors && autoAdjustmentEnabled) {
      // Aplicar ajustes automáticos solo para errores de alta severidad
      const highSeverityErrors = errorDetectionCalculated.getHighSeverityErrors();
      
      highSeverityErrors.forEach(error => {
        errorDetectionCalculated.applyAdjustment(error, handleParameterChange);
      });

      if (highSeverityErrors.length > 0) {
        console.log(`Se aplicaron ${highSeverityErrors.length} ajustes automáticos por errores de alta severidad`);
        
        // Reenviar configuración después de ajustes
        setTimeout(() => {
          if (serialConnection.isConnected) {
            handleSendConfiguration();
            console.log('Configuración reenviada automáticamente tras ajustes por errores');
          }
        }, 1500);
      }
    }
  }, [errorDetectionCalculated.hasHighSeverityErrors, ventilationMode, autoAdjustmentEnabled, serialConnection.isConnected]);

  // Efecto para limpiar notificaciones automáticamente
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Efecto para validar parámetros cuando cambien
  useEffect(() => {
    // Solo validar si hay datos de ventilador
    if (ventilatorData && Object.keys(ventilatorData).length > 0) {
      const timeoutId = setTimeout(() => {
        const validation = parameterValidation.updateValidationState(ventilatorData, ventilationMode);
        
        // Mostrar alerta compacta automáticamente solo si hay errores críticos
        if (validation.criticalErrors.length > 0) {
          setShowCompactValidationAlerts(true);
        } else {
          setShowCompactValidationAlerts(false);
        }
      }, 100); // Pequeño delay para evitar validaciones muy frecuentes

      return () => clearTimeout(timeoutId);
    }
  }, [ventilatorData.frecuencia, ventilatorData.volumen, ventilatorData.presionMax, ventilatorData.peep, ventilatorData.fio2, ventilationMode]);

  // ==================== FUNCIONES DE CÁLCULO ====================
  
  const calculateVolumeControlParameters = useCallback(() => {
    const currentData = ventilatorDataRef.current;
    const SL = currentData.inspiracionEspiracion || 0.5;
    const frecuencia = currentData.frecuencia || 12;
    const pausaEsp1 = currentData.pausaInspiratoria || 0.1;
    const pausaEsp2 = currentData.pausaEspiratoria || 0.1;
    const vMax = currentData.volumen || 500;

    // Calcular tiempo de ciclo
    const tciclo = (60 / frecuencia) - pausaEsp1 - pausaEsp2;
    
    let ti = 0;
    let mensaje = "";
    
    // Calcular tiempo inspiratorio basado en el slider Insp-Esp
    if (SL === 0.5) {
      mensaje = "Relación 1:1 [s]";
      ti = tciclo * 0.5;
    } else if (SL > 0.5) {
      const ratio = 1 + ((SL - 0.5) * 10);
      mensaje = `Relación 1:${(1 + ((SL - 0.5) * 10)).toFixed(1)} [s]`;
      ti = tciclo * (1 / (1 + ratio));
    } else {
      const ratio = 1 + ((0.5 - SL) * 10);
      mensaje = `Relación ${(1 + ((0.5 - SL) * 10)).toFixed(1)}:1 [s]`;
      ti = tciclo * (ratio / (1 + ratio));
    }

    const te = tciclo - ti;
    
    // Calcular Q Max (multiplicar por 60 para pasar segundo a minutos y dividir por 1000 para pasar ml a L)
    const qMax = (60 * vMax) / (1000 * ti) * 0.98;
    
    // Calcular presión del tanque
    const presT = (0.0025 * Math.pow(qMax, 2)) + (0.2203 * qMax) - 0.5912;

    // Actualizar relación I:E mostrada
    const ieRatio = SL <= 0.5 ? 
      [1, Math.round((1 + ((0.5 - SL) * 10)) * 10) / 10] : 
      [1, Math.round((1 + ((SL - 0.5) * 10)) * 10) / 10];

    setVentilatorData(prev => ({
      ...prev,
      qMax: Math.round(qMax * 10) / 10,
      presionTanque: Math.round(presT * 10) / 10,
      relacionIE1: ieRatio[0],
      relacionIE2: ieRatio[1],
      tiempoInspiratorio: Math.round(ti * 100) / 100,
      tiempoEspiratorio: Math.round(te * 100) / 100,
      relacionTexto: mensaje
    }));

    return { ti, te, qMax, presT, mensaje };
  }, [setVentilatorData]);

  const calculatePressureControlParameters = useCallback(() => {
    const currentData = ventilatorDataRef.current;
    const currentCompliance = complianceDataRef.current;
    const SL = currentData.inspiracionEspiracion || 0.5;
    const frecuencia = currentData.frecuencia || 12;
    const pausaEsp1 = currentData.pausaInspiratoria || 0.1;
    const pausaEsp2 = currentData.pausaEspiratoria || 0.1;
    const peep = currentData.peep || 5;
    const pip = currentData.presionMax || 20;
    const C = currentCompliance.compliance || 0.02051; // Compliance pulmonar L/cmH2O

    // Calcular tiempo de ciclo
    const tciclo = (60 / frecuencia) - pausaEsp1 - pausaEsp2;
    
    let ti = 0;
    let mensaje = "";
    
    // Calcular tiempo inspiratorio basado en el slider Insp-Esp
    if (SL === 0.5) {
      mensaje = "Rel 1:1 [s]";
      ti = tciclo * 0.5;
    } else if (SL > 0.5) {
      const ratio = 1 + ((SL - 0.5) * 10);
      mensaje = `Rel 1:${(1 + ((SL - 0.5) * 10)).toFixed(1)} [s]`;
      ti = tciclo * (1 / (1 + ratio));
    } else {
      const ratio = 1 + ((0.5 - SL) * 10);
      mensaje = `Rel ${(1 + ((0.5 - SL) * 10)).toFixed(1)}:1 [s]`;
      ti = tciclo * (ratio / (1 + ratio));
    }

    const te = tciclo - ti;
    
    // Calcular volumen tidal
    const vtil = 1000 * (C * (pip - peep));
    
    // Calcular flujo máximo
    const qMax = (C * (pip - peep)) / (ti / 60); // L/min
    
    // Calcular presión del tanque
    const presT = (0.0025 * Math.pow(qMax, 2)) + (0.2203 * qMax) - 0.5912;

    // Actualizar relación I:E mostrada
    const ieRatio = SL <= 0.5 ? 
      [1, Math.round((1 + ((0.5 - SL) * 10)) * 10) / 10] : 
      [1, Math.round((1 + ((SL - 0.5) * 10)) * 10) / 10];

    setVentilatorData(prev => ({
      ...prev,
      volumen: Math.round(vtil),
      qMax: Math.round(qMax * 10) / 10,
      presionTanque: Math.round(presT * 10) / 10,
      relacionIE1: ieRatio[0],
      relacionIE2: ieRatio[1],
      tiempoInspiratorio: Math.round(ti * 100) / 100,
      tiempoEspiratorio: Math.round(te * 100) / 100,
      relacionTexto: mensaje
    }));

    console.log(`PIP = ${pip} PEEP = ${peep} C = ${C} Ti = ${ti} Vt= ${vtil}`);
    console.log(`Flujo = ${qMax} Presión tanque = ${presT}`);

    return { ti, te, vtil, qMax, presT, mensaje };
  }, [setVentilatorData]);

  // ==================== HANDLERS ====================
  
  const handleConnection = useCallback(async (port, baudRate) => {
    const result = await serialConnection.connect(port, baudRate);
    
    if (result.success) {
      // Enviar frame de inicio
      await serialConnection.sendData(SerialProtocol.createStartFrame());
      setNotification({
        type: 'success',
        message: 'Conectado exitosamente al ventilador',
        timestamp: Date.now()
      });
    } else {
      let errorMessage = 'Error de conexión desconocido';
      
      switch (result.errorType) {
        case 'USER_CANCELLED':
          errorMessage = 'Conexión cancelada: No se seleccionó ningún puerto';
          break;
        case 'PERMISSION_DENIED':
          errorMessage = 'Conexión rechazada: Permisos de acceso denegados';
          break;
        case 'UNSUPPORTED_BROWSER':
          errorMessage = 'Navegador no compatible: Se requiere Chrome/Edge más reciente con Web Serial API';
          break;
        case 'NO_DEVICE_CONNECTED':
          errorMessage = 'Sin dispositivos: Verifica que el ventilador esté conectado y encendido';
          break;
        default:
          errorMessage = `Error de conexión: ${result.error}`;
      }
      
      setNotification({
        type: 'error',
        message: errorMessage,
        timestamp: Date.now()
      });
    }
  }, [serialConnection]);

  const handleDisconnection = useCallback(async () => {
    await serialConnection.sendData(SerialProtocol.createStopFrame());
    await serialConnection.disconnect();
  }, [serialConnection]);

  const handleStopVentilator = useCallback(async () => {
    if (serialConnection.isConnected) {
      await serialConnection.stopSystem();
      setNotification({
        type: 'warning',
        message: 'Comando de detención enviado',
        timestamp: Date.now()
      });
    }
  }, [serialConnection]);

  const handleSendConfiguration = useCallback(async () => {
    // Validar parámetros antes de enviar
    const validation = parameterValidation.updateValidationState(ventilatorData, ventilationMode);
    
    if (!validation.valid) {
      setNotification({
        type: 'error',
        message: `No se puede enviar configuración: ${validation.criticalErrors.length} error(es) crítico(s)`,
        timestamp: Date.now()
      });
      setShowCompactValidationAlerts(true);
      return;
    }

    // Mostrar advertencias si las hay
    if (validation.warnings.length > 0) {
      setNotification({
        type: 'warning',
        message: `Configuración enviada con ${validation.warnings.length} advertencia(s)`,
        timestamp: Date.now()
      });
    } else {
      setNotification({
        type: 'success',
        message: 'Configuración enviada exitosamente',
        timestamp: Date.now()
      });
    }

    const mode = ventilationMode === 'volume' ? 'Volumen control' : 'Presion control';
    const configFrame = SerialProtocol.createConfigFrame(mode, ventilatorData);
    await serialConnection.sendData(configFrame);
    setConfigSent(true);
    
    // Guardar datos de configuración enviada (simplificación de REC/stop_REC)
    setLastSentConfigData({
      mode: ventilationMode,
      timestamp: Date.now(),
      parameters: { ...ventilatorData },
      configFrame
    });
    
    // Registrar los datos enviados si la grabación está activa
    dataRecording.addSentData(ventilationMode, ventilatorData, configFrame);

    // Descarga automática después de enviar (opcional - se puede comentar si no se desea)
    setTimeout(() => {
      downloadSentConfigData();
      dataRecording.downloadAsTxt();
    }, 500);

    if (ventilationMode === 'pressure') {
      complianceDataCalculated.resetComplianceCalculation();
      console.log('Reiniciando cálculo automático de compliance tras envío de configuración');
    }
    
    setTimeout(() => setConfigSent(false), 3000); // Ocultar después de 3 segundos
  }, [ventilatorData, ventilationMode, parameterValidation, serialConnection, dataRecording, complianceDataCalculated]);

  const handleParameterChange = useCallback((parameter, value) => {
    setVentilatorData(prev => ({
      ...prev,
      [parameter]: value,
    }));
  }, [setVentilatorData]);

  const handleModeChange = useCallback((newMode) => {
    setVentilationMode(newMode);
    
    // Actualizar visibilidad de tarjetas según el modo
    setCardConfig(prev => prev.map(card => {
      if (card.id === 'compliance') {
        return { ...card, visible: newMode === 'pressure' };
      }
      return card;
    }));
    
    // Aquí podrías enviar la configuración del nuevo modo al ventilador
    console.log(`Cambiando a modo: ${newMode === 'volume' ? 'Volumen Control' : 'Presión Control'}`);
  }, []);

  // Funciones para el modo de ajuste
  const toggleAdjustMode = useCallback(() => {
    setIsAdjustMode(!isAdjustMode);
  }, [isAdjustMode]);

  const toggleCardVisibility = useCallback((cardId) => {
    setCardConfig(prev => prev.map(card => 
      card.id === cardId ? { ...card, visible: !card.visible } : card
    ));
  }, []);

  const handleDragStart = useCallback((e, cardId) => {
    if (!isAdjustMode) return;
    setDraggedCard(cardId);
    e.dataTransfer.effectAllowed = 'move';
  }, [isAdjustMode]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e, targetCardId) => {
    e.preventDefault();
    if (!draggedCard || draggedCard === targetCardId) return;

    setCardConfig(prev => {
      const draggedCardConfig = prev.find(card => card.id === draggedCard);
      const targetCardConfig = prev.find(card => card.id === targetCardId);
      
      if (!draggedCardConfig || !targetCardConfig) return prev;

      const newConfig = prev.map(card => {
        if (card.id === draggedCard) {
          return { ...card, order: targetCardConfig.order };
        } else if (card.id === targetCardId) {
          return { ...card, order: draggedCardConfig.order };
        }
        return card;
      });

      // Reordenar basado en el nuevo orden
      return newConfig.sort((a, b) => a.order - b.order);
    });

    setDraggedCard(null);
  }, [draggedCard]);

  const handleDragEnd = useCallback(() => {
    setDraggedCard(null);
  }, []);

  const resetCardConfiguration = useCallback(() => {
    setCardConfig([
      { id: 'presionPico', label: 'Presión Pico', visible: true, order: 0 },
      { id: 'presionMedia', label: 'Presión Media', visible: true, order: 1 },
      { id: 'peep', label: 'PEEP', visible: true, order: 2 },
      { id: 'flujoMax', label: 'Flujo Max', visible: true, order: 3 },
      { id: 'flujo', label: 'Flujo', visible: true, order: 4 },
      { id: 'flujoMin', label: 'Flujo Min', visible: true, order: 5 },
      { id: 'volMax', label: 'Vol Max', visible: true, order: 6 },
      { id: 'volumen', label: 'Volumen', visible: true, order: 7 },
      { id: 'volumenIntegrado', label: 'Vol Integrado', visible: true, order: 8 },
      { id: 'compliance', label: 'Compliance', visible: ventilationMode === 'pressure', order: 9 }, // Solo visible en presión control
      { id: 'presionMeseta', label: 'Presión Meseta', visible: false, order: 10 },
      { id: 'presionPlaton', label: 'Presión Platón', visible: false, order: 11 },
    ]);
  }, [ventilationMode]);

  // Funciones para el menú de descarga
  const handleDownloadMenuOpen = useCallback((event) => {
    setDownloadMenuAnchor(event.currentTarget);
  }, []);

  const handleDownloadMenuClose = useCallback(() => {
    setDownloadMenuAnchor(null);
  }, []);

  const handleDownloadTxt = useCallback(() => {
    dataRecording.downloadAsTxt();
    setNotification({
      type: 'success',
      message: 'Configuraciones enviadas descargadas como TXT',
      timestamp: Date.now()
    });
    handleDownloadMenuClose();
  }, [dataRecording]);

  const handleDownloadPdf = useCallback(() => {
    dataRecording.downloadAsPdf();
    setNotification({
      type: 'success',
      message: 'Configuraciones enviadas descargadas como PDF',
      timestamp: Date.now()
    });
    handleDownloadMenuClose();
  }, [dataRecording]);

  const handleToggleRecording = useCallback(() => {
    if (dataRecording.isRecording) {
      dataRecording.stopRecording();
      // Descargar al detener la grabación
      dataRecording.downloadAsTxt();
      setNotification({
        type: 'success',
        message: 'Grabación detenida y datos guardados automáticamente',
        timestamp: Date.now()
      });
    } else {
      dataRecording.startRecording();
      setNotification({
        type: 'success',
        message: 'Grabación iniciada - Se guardará con cada envío',
        timestamp: Date.now()
      });
    }
  }, [dataRecording]);

  // Función para manejar el análisis con IA
  const handleAIAnalysis = useCallback(() => {
    setShowAIPanel(true);
    clearAnalysis();
  }, [clearAnalysis]);

  // Función para descargar datos de configuración enviada
  const downloadSentConfigData = useCallback(() => {
    if (lastSentConfigData) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `configuracion_enviada_${timestamp}.txt`;
      
      // Crear contenido formateado con los datos de configuración
      const { mode, parameters } = lastSentConfigData;
      
      let content = `Configuración enviada al Ventilador - VentyLab\n`;
      content += `Fecha: ${new Date().toLocaleString()}\n`;
      content += `Modo: ${mode}\n`;
      content += `========================================\n\n`;
      content += `Parámetros:\n`;
      
      Object.entries(parameters).forEach(([key, value]) => {
        let formattedValue = value;
        let unit = '';
        
        // Agregar unidades según el parámetro
        if (key === 'fio2') unit = '%';
        else if (key === 'volumen') unit = 'mL';
        else if (key === 'presionMax' || key === 'peep') unit = 'cmH₂O';
        else if (key === 'qMax') unit = 'L/min';
        else if (key === 'frecuencia') unit = 'resp/min';
        else if (key === 'tiempoInspiratorio' || key === 'tiempoEspiratorio') unit = 's';
        
        content += `  ${key}: ${formattedValue} ${unit}\n`;
      });
      
      // Crear y descargar el archivo
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      
      console.log('Datos de configuración enviada descargados:', filename);
    }
  }, [lastSentConfigData]);

  // Función para ejecutar el análisis de IA
  const executeAIAnalysis = useCallback((userConfig, optimalConfig, ventilationMode, patientData) => {
    // Validaciones adicionales antes de ejecutar el análisis
    if (!userConfig || Object.keys(userConfig).length === 0) {
      console.warn('Configuración del ventilador vacía o no válida');
      return;
    }
    
    if (!ventilationMode || !['volume', 'pressure'].includes(ventilationMode)) {
      console.warn('Modo de ventilación no válido:', ventilationMode);
      return;
    }
    
    console.log('Ejecutando análisis de IA con:', {
      userConfig: Object.keys(userConfig),
      optimalConfig: optimalConfig ? Object.keys(optimalConfig) : 'No disponible',
      ventilationMode,
      hasPatientData: !!patientData
    });
    
    analyzeConfiguration(userConfig, optimalConfig, ventilationMode, patientData);
  }, [analyzeConfiguration]);

  // Generar configuración óptima basada en datos del paciente
  const generateOptimalConfig = useCallback(() => {
    if (!patientData || !patientData.calculatedParams) {
      console.log('No hay datos del paciente para generar configuración óptima');
      return null;
    }
    
    try {
      const { calculatedParams } = patientData;
      const optimalConfig = {
        fio2: calculatedParams.fio2Inicial || 21,
        volumen: calculatedParams.volumenTidal || 500,
        peep: calculatedParams.peepRecomendado || 5,
        frecuencia: calculatedParams.frecuenciaResp || 12,
        presionMax: calculatedParams.presionMaxRecomendada || 20,
        inspiracionEspiracion: 0.5,
        pausaInspiratoria: 0.1,
        pausaEspiratoria: 0.1
      };
      
      console.log('Configuración óptima generada:', optimalConfig);
      return optimalConfig;
    } catch (error) {
      console.error('Error al generar configuración óptima:', error);
      return null;
    }
  }, [patientData]);

  // ==================== RETURN ====================
  
  return {
    // Estados
    state: {
      ventilationMode,
      configSent,
      dataSource,
      activeTab,
      isAdjustMode,
      cardConfig,
      draggedCard,
      showAIPanel,
      autoAdjustmentEnabled,
      lastAutoAdjustment,
      complianceCardExpanded,
      downloadMenuAnchor,
      notification,
      showValidationAlerts,
      showCompactValidationAlerts,
      lastSentConfigData,
      // Datos calculados
      displayData,
      complianceData: complianceDataCalculated,
      filteredData,
      errorDetection: errorDetectionCalculated,
      // IA
      isAnalyzing,
      analysisResult,
      analysisError,
    },
    
    // Acciones
    actions: {
      // Setters básicos
      setVentilationMode,
      setDataSource,
      setActiveTab,
      setShowAIPanel,
      setAutoAdjustmentEnabled,
      setComplianceCardExpanded,
      setShowValidationAlerts,
      setShowCompactValidationAlerts,
      
      // Handlers principales
      handleConnection,
      handleDisconnection,
      handleStopVentilator,
      handleSendConfiguration,
      handleParameterChange,
      handleModeChange,
      
      // Handlers de ajuste
      toggleAdjustMode,
      toggleCardVisibility,
      handleDragStart,
      handleDragOver,
      handleDrop,
      handleDragEnd,
      resetCardConfiguration,
      
      // Handlers de descarga
      handleDownloadMenuOpen,
      handleDownloadMenuClose,
      handleDownloadTxt,
      handleDownloadPdf,
      handleToggleRecording,
      downloadSentConfigData,
      
      // Handlers de IA
      handleAIAnalysis,
      executeAIAnalysis,
      generateOptimalConfig,
      clearAnalysis,
      
      // Funciones de cálculo
      calculateVolumeControlParameters,
      calculatePressureControlParameters,
    }
  };
};

export default useDashboardState;
