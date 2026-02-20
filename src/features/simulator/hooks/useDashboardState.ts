import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { SerialProtocol } from '@/features/simulator/utils/serialCommunication';
import { useCardConfig } from './useCardConfig';
import { useNotifications } from './useNotifications';
import { useDataExport } from './useDataExport';
import type { VentilatorData, VentilationMode, RealTimeData } from '../simulator.types';

/**
 * useDashboardState - Main orchestration hook for VentilatorDashboard.
 *
 * Phase 4 refactor: card config, notifications, and data export extracted
 * into dedicated hooks. Core logic (ventilation mode, calculations,
 * connection handlers) remains here.
 *
 * FIX 1d: Removed `ventilatorData` object from data-source-switch deps.
 * Used a ref to avoid the loop where setVentilatorData → new ventilatorData → re-trigger.
 */

interface DashboardDeps {
  serialConnection: any;
  ventilatorData: VentilatorData;
  setVentilatorData: React.Dispatch<React.SetStateAction<VentilatorData>>;
  realTimeData: RealTimeData;
  patientData: any;
  isDataPersisted: boolean;
  sendPatientDataToConnection: (conn: any) => boolean;
  activatePatientMode: () => void;
  deactivatePatientMode: () => void;
  parameterValidation: any;
  dataRecording: any;
  registerDataRecording: (hook: any) => void;
  integratedVolume: number;
  resetIntegratedVolume: () => void;
  useComplianceCalculation: (data: RealTimeData, mode: VentilationMode) => any;
  useSignalProcessing: (data: RealTimeData) => any;
  useErrorDetection: (target: VentilatorData, current: any, compliance: number) => any;
  useAIAnalysis: () => any;
}

const useDashboardState = ({
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
  registerDataRecording,
  integratedVolume,
  resetIntegratedVolume,
  useComplianceCalculation,
  useSignalProcessing,
  useErrorDetection,
  useAIAnalysis,
}: DashboardDeps) => {

  // ==================== CORE STATE ====================
  const [ventilationMode, setVentilationMode] = useState<VentilationMode>('volume');
  const [configSent, setConfigSent] = useState(false);
  const [dataSource, setDataSource] = useState<'real' | 'simulated'>('real');
  const [realDataBackup, setRealDataBackup] = useState<VentilatorData | null>(null);
  const [activeTab, setActiveTab] = useState(1);

  // UI state
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [autoAdjustmentEnabled, setAutoAdjustmentEnabled] = useState(true);
  const [lastAutoAdjustment, setLastAutoAdjustment] = useState<any>(null);
  const [complianceCardExpanded, setComplianceCardExpanded] = useState(false);
  const [showValidationAlerts, setShowValidationAlerts] = useState(false);
  const [showCompactValidationAlerts, setShowCompactValidationAlerts] = useState(false);

  // ==================== SUB-HOOKS ====================
  const { notification, notify, setNotification } = useNotifications();
  const cardConfig = useCardConfig();
  const dataExport = useDataExport(dataRecording, notify);

  // ==================== REFS (stable references for effects) ====================
  const ventilatorDataRef = useRef(ventilatorData);
  const complianceDataRef = useRef<any>(null);
  const serialConnectionRef = useRef(serialConnection);
  const autoAdjustmentEnabledRef = useRef(autoAdjustmentEnabled);

  // Keep refs in sync
  useEffect(() => { ventilatorDataRef.current = ventilatorData; }, [ventilatorData]);
  useEffect(() => { serialConnectionRef.current = serialConnection; }, [serialConnection]);
  useEffect(() => { autoAdjustmentEnabledRef.current = autoAdjustmentEnabled; }, [autoAdjustmentEnabled]);

  // ==================== DEPENDENT HOOKS ====================
  const displayData = useMemo(() => {
    if (dataSource === 'simulated') {
      return { isSimulated: true, pressure: [], flow: [], volume: [], time: [] } as any;
    }
    return serialConnection.isConnected ? realTimeData : { pressure: [], flow: [], volume: [], time: [] };
  }, [serialConnection.isConnected, realTimeData, dataSource]);

  const complianceDataCalculated = useComplianceCalculation(displayData, ventilationMode);
  const filteredData = useSignalProcessing(displayData);
  const errorDetectionCalculated = useErrorDetection(ventilatorData, filteredData, complianceDataCalculated.compliance);

  const { isAnalyzing, analysisResult, analysisError, analyzeConfiguration, clearAnalysis } = useAIAnalysis();

  // Keep compliance ref in sync
  useEffect(() => { complianceDataRef.current = complianceDataCalculated; }, [complianceDataCalculated]);

  // ==================== EFFECTS ====================

  // FIX 1d: Data source switch — use a flag to prevent the loop.
  // Previously `ventilatorData` was in deps → setVentilatorData → new ref → re-trigger.
  const hasBackedUpRef = useRef(false);

  useEffect(() => {
    if (dataSource === 'simulated' && patientData) {
      if (!hasBackedUpRef.current) {
        hasBackedUpRef.current = true;
        setRealDataBackup(ventilatorDataRef.current);
      }
      setVentilatorData((prev) => ({
        ...prev,
        fio2: patientData.calculatedParams?.fio2Inicial || 21,
        volumen: patientData.calculatedParams?.volumenTidal || 500,
        peep: patientData.calculatedParams?.peepRecomendado || 5,
        frecuencia: patientData.calculatedParams?.frecuenciaResp || 12,
      }));
      activatePatientMode();
    } else if (dataSource === 'real' && realDataBackup) {
      hasBackedUpRef.current = false;
      setVentilatorData(realDataBackup);
      setRealDataBackup(null);
      deactivatePatientMode();
    }
  }, [dataSource, patientData]); // eslint-disable-line react-hooks/exhaustive-deps
  // Intentionally omitting ventilatorData, realDataBackup, setVentilatorData, etc.
  // to break the infinite loop. Refs are used for current values instead.

  // Auto-send patient data on persist
  useEffect(() => {
    if (isDataPersisted && patientData && serialConnection.isConnected && dataSource === 'simulated') {
      const success = sendPatientDataToConnection(serialConnection);
      if (success) {
        notify('success', `Datos del paciente enviados al ventilador`);
      } else {
        notify('warning', 'No se pudieron enviar los datos del paciente al ventilador');
      }
    }
  }, [isDataPersisted, patientData, serialConnection.isConnected, dataSource, sendPatientDataToConnection, notify]);

  // Register data recording hook
  useEffect(() => {
    registerDataRecording(dataRecording);
  }, [registerDataRecording, dataRecording]);

  // Auto-adjustment on critical errors
  useEffect(() => {
    if (
      errorDetectionCalculated.hasHighSeverityErrors &&
      ventilationMode === 'pressure' &&
      autoAdjustmentEnabledRef.current
    ) {
      const highErrors = errorDetectionCalculated.getHighSeverityErrors();
      highErrors.forEach((error: any) => {
        errorDetectionCalculated.applyAdjustment(error, handleParameterChange);
      });

      if (highErrors.length > 0) {
        setTimeout(() => {
          if (serialConnectionRef.current.isConnected) {
            handleSendConfiguration();
          }
        }, 1500);
      }
    }
  }, [errorDetectionCalculated.hasHighSeverityErrors, ventilationMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Validate parameters on change (primitive deps)
  useEffect(() => {
    if (ventilatorData && Object.keys(ventilatorData).length > 0) {
      const timeoutId = setTimeout(() => {
        const validation = parameterValidation.updateValidationState(ventilatorData, ventilationMode);
        setShowCompactValidationAlerts(validation.criticalErrors.length > 0);
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [
    ventilatorData.frecuencia, ventilatorData.volumen, ventilatorData.presionMax,
    ventilatorData.peep, ventilatorData.fio2, ventilationMode,
    parameterValidation, ventilatorData,
  ]);

  // ==================== CALCULATION FUNCTIONS ====================

  const calculateVolumeControlParameters = useCallback(() => {
    const d = ventilatorDataRef.current;
    const SL = d.inspiracionEspiracion || 0.5;
    const frecuencia = d.frecuencia || 12;
    const pausaEsp1 = d.pausaInspiratoria || 0.1;
    const pausaEsp2 = d.pausaEspiratoria || 0.1;
    const vMax = d.volumen || 500;

    const tciclo = (60 / frecuencia) - pausaEsp1 - pausaEsp2;

    let ti = 0;
    let mensaje = '';

    if (SL === 0.5) {
      mensaje = 'Relación 1:1 [s]';
      ti = tciclo * 0.5;
    } else if (SL > 0.5) {
      const ratio = 1 + (SL - 0.5) * 10;
      mensaje = `Relación 1:${ratio.toFixed(1)} [s]`;
      ti = tciclo * (1 / (1 + ratio));
    } else {
      const ratio = 1 + (0.5 - SL) * 10;
      mensaje = `Relación ${ratio.toFixed(1)}:1 [s]`;
      ti = tciclo * (ratio / (1 + ratio));
    }

    const te = tciclo - ti;
    const qMax = (60 * vMax) / (1000 * ti) * 0.98;
    const presT = 0.0025 * Math.pow(qMax, 2) + 0.2203 * qMax - 0.5912;

    const ieRatio = SL <= 0.5
      ? [1, Math.round((1 + (0.5 - SL) * 10) * 10) / 10]
      : [1, Math.round((1 + (SL - 0.5) * 10) * 10) / 10];

    setVentilatorData((prev) => ({
      ...prev,
      qMax: Math.round(qMax * 10) / 10,
      presionTanque: Math.round(presT * 10) / 10,
      relacionIE1: ieRatio[0],
      relacionIE2: ieRatio[1],
      tiempoInspiratorio: Math.round(ti * 100) / 100,
      tiempoEspiratorio: Math.round(te * 100) / 100,
      relacionTexto: mensaje,
    }));

    return { ti, te, qMax, presT, mensaje };
  }, [setVentilatorData]);

  const calculatePressureControlParameters = useCallback(() => {
    const d = ventilatorDataRef.current;
    const c = complianceDataRef.current;
    const SL = d.inspiracionEspiracion || 0.5;
    const frecuencia = d.frecuencia || 12;
    const pausaEsp1 = d.pausaInspiratoria || 0.1;
    const pausaEsp2 = d.pausaEspiratoria || 0.1;
    const peep = d.peep || 5;
    const pip = d.presionMax || 20;
    const C = c?.compliance || 0.02051;

    const tciclo = (60 / frecuencia) - pausaEsp1 - pausaEsp2;

    let ti = 0;
    let mensaje = '';

    if (SL === 0.5) {
      mensaje = 'Rel 1:1 [s]';
      ti = tciclo * 0.5;
    } else if (SL > 0.5) {
      const ratio = 1 + (SL - 0.5) * 10;
      mensaje = `Rel 1:${ratio.toFixed(1)} [s]`;
      ti = tciclo * (1 / (1 + ratio));
    } else {
      const ratio = 1 + (0.5 - SL) * 10;
      mensaje = `Rel ${ratio.toFixed(1)}:1 [s]`;
      ti = tciclo * (ratio / (1 + ratio));
    }

    const te = tciclo - ti;
    const vtil = 1000 * (C * (pip - peep));
    const qMax = (C * (pip - peep)) / (ti / 60);
    const presT = 0.0025 * Math.pow(qMax, 2) + 0.2203 * qMax - 0.5912;

    const ieRatio = SL <= 0.5
      ? [1, Math.round((1 + (0.5 - SL) * 10) * 10) / 10]
      : [1, Math.round((1 + (SL - 0.5) * 10) * 10) / 10];

    setVentilatorData((prev) => ({
      ...prev,
      volumen: Math.round(vtil),
      qMax: Math.round(qMax * 10) / 10,
      presionTanque: Math.round(presT * 10) / 10,
      relacionIE1: ieRatio[0],
      relacionIE2: ieRatio[1],
      tiempoInspiratorio: Math.round(ti * 100) / 100,
      tiempoEspiratorio: Math.round(te * 100) / 100,
      relacionTexto: mensaje,
    }));

    return { ti, te, vtil, qMax, presT, mensaje };
  }, [setVentilatorData]);

  // ==================== HANDLERS ====================

  const handleConnection = useCallback(async (port: any, baudRate: number) => {
    const result = await serialConnection.connect(port, baudRate);

    if (result.success) {
      await serialConnection.sendData(SerialProtocol.createStartFrame());
      notify('success', 'Conectado exitosamente al ventilador');
    } else {
      const errorMessages: Record<string, string> = {
        USER_CANCELLED: 'Conexión cancelada: No se seleccionó ningún puerto',
        PERMISSION_DENIED: 'Conexión rechazada: Permisos de acceso denegados',
        UNSUPPORTED_BROWSER: 'Navegador no compatible: Se requiere Chrome/Edge con Web Serial API',
        NO_DEVICE_CONNECTED: 'Sin dispositivos: Verifica que el ventilador esté conectado',
      };
      notify('error', errorMessages[result.errorType] || `Error de conexión: ${result.error}`);
    }
  }, [serialConnection, notify]);

  const handleDisconnection = useCallback(async () => {
    await serialConnection.sendData(SerialProtocol.createStopFrame());
    await serialConnection.disconnect();
  }, [serialConnection]);

  const handleStopVentilator = useCallback(async () => {
    if (serialConnection.isConnected) {
      await serialConnection.stopSystem();
      notify('warning', 'Comando de detención enviado');
    }
  }, [serialConnection, notify]);

  const handleSendConfiguration = useCallback(async () => {
    const validation = parameterValidation.updateValidationState(ventilatorData, ventilationMode);

    if (!validation.valid) {
      notify('error', `No se puede enviar configuración: ${validation.criticalErrors.length} error(es) crítico(s)`);
      setShowCompactValidationAlerts(true);
      return;
    }

    if (validation.warnings.length > 0) {
      notify('warning', `Configuración enviada con ${validation.warnings.length} advertencia(s)`);
    } else {
      notify('success', 'Configuración enviada exitosamente');
    }

    const mode = ventilationMode === 'volume' ? 'Volumen control' : 'Presion control';
    const configFrame = SerialProtocol.createConfigFrame(mode, ventilatorData);
    await serialConnection.sendData(configFrame);
    setConfigSent(true);

    dataExport.recordSentConfig(ventilationMode, ventilatorData, configFrame);

    setTimeout(() => {
      dataExport.downloadSentConfigData();
      dataRecording.downloadAsTxt();
    }, 500);

    if (ventilationMode === 'pressure') {
      complianceDataCalculated.resetComplianceCalculation();
    }

    setTimeout(() => setConfigSent(false), 3000);
  }, [ventilatorData, ventilationMode, parameterValidation, serialConnection, dataRecording, complianceDataCalculated, notify, dataExport]);

  const handleParameterChange = useCallback((parameter: string, value: number) => {
    setVentilatorData((prev) => ({ ...prev, [parameter]: value }));
  }, [setVentilatorData]);

  const handleModeChange = useCallback((newMode: VentilationMode) => {
    setVentilationMode(newMode);
    cardConfig.updateCardVisibilityForMode(newMode);
  }, [cardConfig]);

  // AI handlers
  const handleAIAnalysis = useCallback(() => {
    setShowAIPanel(true);
    clearAnalysis();
  }, [clearAnalysis]);

  const executeAIAnalysis = useCallback(
    (userConfig: any, optimalConfig: any, mode: VentilationMode, patient: any) => {
      if (!userConfig || Object.keys(userConfig).length === 0) return;
      if (!mode || !['volume', 'pressure'].includes(mode)) return;
      analyzeConfiguration(userConfig, optimalConfig, mode, patient);
    },
    [analyzeConfiguration],
  );

  const generateOptimalConfig = useCallback(() => {
    if (!patientData?.calculatedParams) return null;
    try {
      const { calculatedParams } = patientData;
      return {
        fio2: calculatedParams.fio2Inicial || 21,
        volumen: calculatedParams.volumenTidal || 500,
        peep: calculatedParams.peepRecomendado || 5,
        frecuencia: calculatedParams.frecuenciaResp || 12,
        presionMax: calculatedParams.presionMaxRecomendada || 20,
        inspiracionEspiracion: 0.5,
        pausaInspiratoria: 0.1,
        pausaEspiratoria: 0.1,
      };
    } catch {
      return null;
    }
  }, [patientData]);

  // ==================== RETURN ====================
  return {
    state: {
      ventilationMode,
      configSent,
      dataSource,
      activeTab,
      isAdjustMode: cardConfig.isAdjustMode,
      cardConfig: cardConfig.cardConfig,
      draggedCard: cardConfig.draggedCard,
      showAIPanel,
      autoAdjustmentEnabled,
      lastAutoAdjustment,
      complianceCardExpanded,
      downloadMenuAnchor: dataExport.downloadMenuAnchor,
      notification,
      showValidationAlerts,
      showCompactValidationAlerts,
      lastSentConfigData: dataExport.lastSentConfigData,
      displayData,
      complianceData: complianceDataCalculated,
      filteredData,
      errorDetection: errorDetectionCalculated,
      isAnalyzing,
      analysisResult,
      analysisError,
    },
    actions: {
      setVentilationMode,
      setDataSource,
      setActiveTab,
      setShowAIPanel,
      setAutoAdjustmentEnabled,
      setComplianceCardExpanded,
      setShowValidationAlerts,
      setShowCompactValidationAlerts,
      setNotification,

      handleConnection,
      handleDisconnection,
      handleStopVentilator,
      handleSendConfiguration,
      handleParameterChange,
      handleModeChange,

      toggleAdjustMode: cardConfig.toggleAdjustMode,
      toggleCardVisibility: cardConfig.toggleCardVisibility,
      handleDragStart: cardConfig.handleDragStart,
      handleDragOver: cardConfig.handleDragOver,
      handleDrop: cardConfig.handleDrop,
      handleDragEnd: cardConfig.handleDragEnd,
      resetCardConfiguration: () => cardConfig.resetCardConfiguration(ventilationMode),

      handleDownloadMenuOpen: dataExport.handleDownloadMenuOpen,
      handleDownloadMenuClose: dataExport.handleDownloadMenuClose,
      handleDownloadTxt: dataExport.handleDownloadTxt,
      handleDownloadPdf: dataExport.handleDownloadPdf,
      handleToggleRecording: dataExport.handleToggleRecording,
      downloadSentConfigData: dataExport.downloadSentConfigData,

      handleAIAnalysis,
      executeAIAnalysis,
      generateOptimalConfig,
      clearAnalysis,

      calculateVolumeControlParameters,
      calculatePressureControlParameters,
    },
  };
};

export default useDashboardState;
