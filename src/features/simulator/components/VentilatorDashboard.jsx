import React, { useState, useEffect, useCallback, useRef, useMemo, Suspense } from 'react';
import {
  Box,
  Typography,
  CssBaseline,
  ThemeProvider,
  Menu,
  MenuItem,
} from '@mui/material';
import { muiTheme } from '@/styles/mui-overrides';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import DownloadIcon from '@mui/icons-material/Download';

// Chart.js registration — must be imported before any react-chartjs-2 usage
import '@/features/simulator/charts/ChartRegistry';
import { Line } from 'react-chartjs-2';

// Centralized value color/trend functions
import { getValueColor, getTrend } from '@/features/simulator/constants/ventilator-limits';
import LoopChart from '@/shared/components/LoopChart';
import MonitoringTab from '@/shared/components/MonitoringTab';
import ConnectionTabContent from '@/shared/components/ConnectionTabContent';

// Componentes del simulador
import MonitoringCards from '@/features/simulator/components/MonitoringCards';
import SimulatorTabs from '@/features/simulator/components/SimulatorTabs';
import ControlPanel from '@/features/simulator/components/ControlPanel';
import ComplianceStatus from '@/features/simulator/components/ComplianceStatus';
import ValidationAlerts from '@/features/simulator/components/ValidationAlerts';

// Importación adicional para el simulador de paciente
const PatientSimulator = React.lazy(() => import('@/features/simulator/components/PatientSimulator'));

// Hooks
import { useSerialConnection } from '@/features/simulator/hooks/useSerialConnection';
import { useVentilatorData } from '@/features/simulator/hooks/useVentilatorData';
import { SerialProtocol } from '@/features/simulator/utils/serialCommunication';
import { useComplianceCalculation } from '@/features/simulator/hooks/useComplianceCalculation';
import { useSignalProcessing } from '@/features/simulator/hooks/useSignalProcessing';
import { useErrorDetection } from '@/features/simulator/hooks/useErrorDetection';
import { useDataRecording } from '@/features/simulator/hooks/useDataRecording';
import { useParameterValidation } from '@/features/simulator/hooks/useParameterValidation';
import { usePatientData } from '@/features/simulator/hooks/usePatientData'; // Importar hook de paciente
import { useQRBridge } from '@/features/simulator/hooks/useQRBridge';
import { useAIAnalysis } from '@/features/simulator/hooks/useAIAnalysis';
import { useVentilatorConnection } from '@/features/simulator/hooks/useVentilatorConnection';
import { useVentilatorControls } from '@/features/simulator/hooks/useVentilatorControls';
import useDashboardState from '@/features/simulator/hooks/useDashboardState';
import AIAnalysisPanel from '@/features/simulator/components/AIAnalysisPanel';
import { useSidebar } from '../../../../pages/_app';

// LoopChart moved to ./common/LoopChart

// Usar el tema centralizado desde mui-overrides.js
const ventilatorTheme = muiTheme;

// EditControls moved to common component

// AIAnalysisButton moved to common component

const VentilatorDashboard = () => {
  const { sidebarOpen } = useSidebar();
  
  // Calcular valores para la barra de navegación
  const sidebarWidth = sidebarOpen ? '240px' : '64px';
  const navigationLeft = sidebarWidth;
  const navigationWidth = `calc(100% - ${sidebarWidth})`;

  // Hooks principales
  const serialConnection = useSerialConnection();
  const { 
    ventilatorData, 
    realTimeData, 
    setVentilatorData, // Necesitamos el setter
    calculations,
    integratedVolume,
    getCurrentIntegratedVolume,
    resetIntegratedVolume,
    maxMinData, // Nuevos datos de máx/mín cada 100 muestras
    registerDataRecording, // Función para registrar el hook de grabación
    systemStatus // Estado del sistema
  } = useVentilatorData(serialConnection);
  
  // Hook para datos del paciente simulado
  const { 
    patientData, 
    isDataPersisted,
    sendPatientDataToConnection,
    activatePatientMode,
    deactivatePatientMode
  } = usePatientData();
  
  // Hook para validación de parámetros
  const parameterValidation = useParameterValidation();

  // Hook para grabación de datos
  const dataRecording = useDataRecording();

  // Hook para análisis de IA
  const {
    isAnalyzing,
    analysisResult,
    analysisError,
    analyzeConfiguration,
    clearAnalysis
  } = useAIAnalysis();
  
  // Hook principal del dashboard que encapsula toda la lógica de estado
  const dashboardState = useDashboardState({
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
    registerDataRecording,
    integratedVolume,
    resetIntegratedVolume,
    useComplianceCalculation,
    useSignalProcessing,
    useErrorDetection,
    useAIAnalysis: () => ({ isAnalyzing, analysisResult, analysisError, analyzeConfiguration, clearAnalysis })
  });

  // Extraer estado y acciones del hook
  const { state, actions } = dashboardState;

  // ─── Ventilator controls (REST → backend simulation) ───────────────────────
  const { sendCommand } = useVentilatorControls();

  // Stable ref so handleModeChange doesn't stale-close over ventilatorData
  const _ventilatorDataRef = useRef(ventilatorData);
  useEffect(() => { _ventilatorDataRef.current = ventilatorData; }, [ventilatorData]);

  /**
   * Composed mode-change handler:
   *   1. Updates local dashboard state (ventilationMode + card visibility)
   *   2. Sends a VentilatorCommand to the backend simulation endpoint
   *
   * sendCommand is a stable useCallback (no deps), so this callback is
   * created once and never re-created, preventing unnecessary child re-renders.
   */
  const handleModeChange = useCallback((newMode) => {
    actions.handleModeChange(newMode);
    const d = _ventilatorDataRef.current;
    sendCommand({
      mode: newMode === 'volume' ? 'VCV' : 'PCV',
      tidalVolume: d.volumen || 500,
      respiratoryRate: d.frecuencia || 12,
      peep: d.peep || 5,
      fio2: (d.fio2 || 21) / 100, // contract: fraction 0.21–1.0
      ...(d.presionMax ? { pressureLimit: d.presionMax } : {}),
      ...(d.tiempoInspiratorio ? { inspiratoryTime: d.tiempoInspiratorio } : {}),
      ...(d.tiempoInspiratorio && d.tiempoEspiratorio
        ? { ieRatio: `${d.relacionIE1 ?? 1}:${d.relacionIE2 ?? 1}` }
        : {}),
    }).catch(() => {
      // Mode switch is local-first; backend errors are non-blocking.
    });
  }, [actions.handleModeChange, sendCommand]); // eslint-disable-line react-hooks/exhaustive-deps

  // Hook para códigos QR y compartir
  const qrBridge = useQRBridge();

  // Hook unificador: abstrae serial (local) vs WebSocket (remote)
  const ventilatorConnection = useVentilatorConnection({
    serialConnection,
    localData: { ventilatorData, realTimeData, systemStatus },
  });

  // Validación defensiva para asegurar que los hooks estén inicializados
  if (!parameterValidation || !parameterValidation.validationState) {
    return (
      <ThemeProvider theme={ventilatorTheme}>
        <CssBaseline />
        <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
          <Typography variant="h6">Cargando sistema de ventilación...</Typography>
        </Box>
      </ThemeProvider>
    );
  }

  // ─── Auto-recalculate derived parameters when user inputs change ────────────
  // IMPORTANT: Two separate effects (one per mode) prevent the infinite loop.
  //
  // Root cause of the old loop (single effect):
  //   In PCV mode, calcPress() writes ventilatorData.volumen (derived output).
  //   Having `vol` in the dep array caused: calcPress → volumen updates → vol
  //   dep changes → effect re-fires → calcPress → … (infinite).
  //
  // Fix: VCV effect includes `vol` (user input). PCV effect does NOT include
  // `vol` (it is an output) or `compliance` (read from complianceDataRef
  // inside calcPress, never reactive).

  const mode = state.ventilationMode;
  const ie = ventilatorData.inspiracionEspiracion;
  const freq = ventilatorData.frecuencia;
  const pi = ventilatorData.pausaInspiratoria;
  const pe = ventilatorData.pausaEspiratoria;
  const vol = ventilatorData.volumen;
  const peep = ventilatorData.peep;
  const pmax = ventilatorData.presionMax;

  const calcVol = actions.calculateVolumeControlParameters;
  const calcPress = actions.calculatePressureControlParameters;

  // VCV: tidal volume (vol) is a USER INPUT → safe to include in deps.
  useEffect(() => {
    if (mode !== 'volume') return;
    const id = setTimeout(() => calcVol(), 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- calcVol is a stable useCallback
  }, [mode, ie, freq, pi, pe, vol, peep]);

  // PCV: tidal volume (vol) is a DERIVED OUTPUT of calcPress → must NOT be
  // in deps or the effect will re-trigger itself. compliance is also read
  // from an internal ref inside calcPress, so it is intentionally omitted.
  useEffect(() => {
    if (mode !== 'pressure') return;
    const id = setTimeout(() => calcPress(), 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- calcPress is a stable useCallback
  }, [mode, ie, freq, pi, pe, peep, pmax]);



  // Funciones para calcular valores en tiempo real usando datos filtrados
  const getMax = arr => arr.length ? Math.max(...arr).toFixed(1) : '--';
  const getMin = arr => arr.length ? Math.min(...arr).toFixed(1) : '--';
  const getAvg = arr => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : '--';
  const getLast = arr => arr.length ? arr[arr.length - 1].toFixed(1) : '--';

  // Mapeo de datos de tarjetas mostrando valores reales de configuración y mediciones
  const cardDataMap = {
    presionPico: { 
      label: 'Presión Pico', 
      // En modo presión: mostrar valor configurado (PIP), en modo volumen: mostrar valor medido
      value: state.ventilationMode === 'pressure' 
        ? (ventilatorData.presionMax || 20).toFixed(1)
        : (state.filteredData.pressure.max > 0 ? state.filteredData.pressure.max.toFixed(1) : getMax(state.displayData.pressure)), 
      unit: 'cmH₂O',
      rawValue: state.ventilationMode === 'pressure' 
        ? (ventilatorData.presionMax || 20)
        : (state.filteredData.pressure.max || parseFloat(getMax(state.displayData.pressure)) || 0),
      isConfigured: state.ventilationMode === 'pressure'
    },
    presionMedia: { 
      label: 'Presión Media', 
      // Siempre mostrar valor medido
      value: state.filteredData.pressure.avg > 0 ? state.filteredData.pressure.avg.toFixed(1) : getAvg(state.displayData.pressure), 
      unit: 'cmH₂O',
      rawValue: state.filteredData.pressure.avg || parseFloat(getAvg(state.displayData.pressure)) || 0,
      isConfigured: false
    },
    peep: { 
      label: 'PEEP', 
      // Siempre mostrar valor configurado
      value: (ventilatorData.peep || 5).toFixed(1), 
      unit: 'cmH₂O',
      rawValue: ventilatorData.peep || 5,
      isConfigured: true
    },
    flujoMax: { 
      label: 'Flujo Max', 
      // Mostrar Q Max calculado si está disponible, sino valor medido
      value: ventilatorData.qMax ? ventilatorData.qMax.toFixed(1) : (state.filteredData.flow.max > 0 ? state.filteredData.flow.max.toFixed(1) : getMax(state.displayData.flow)), 
      unit: 'L/min',
      rawValue: ventilatorData.qMax || state.filteredData.flow.max || parseFloat(getMax(state.displayData.flow)) || 0,
      isConfigured: !!ventilatorData.qMax
    },
    flujo: { 
      label: 'Flujo', 
      // Siempre mostrar valor medido en tiempo real
      value: state.filteredData.flow.filtered > 0 ? state.filteredData.flow.filtered.toFixed(1) : getLast(state.displayData.flow), 
      unit: 'L/min',
      rawValue: state.filteredData.flow.filtered || parseFloat(getLast(state.displayData.flow)) || 0,
      isConfigured: false
    },
    flujoMin: { 
      label: 'Flujo Min', 
      // Siempre mostrar valor medido
      value: state.filteredData.flow.min > 0 ? state.filteredData.flow.min.toFixed(1) : getMin(state.displayData.flow), 
      unit: 'L/min',
      rawValue: state.filteredData.flow.min || parseFloat(getMin(state.displayData.flow)) || 0,
      isConfigured: false
    },
    volMax: { 
      label: 'Vol Max', 
      // Siempre mostrar valor medido
      value: state.filteredData.volume.max > 0 ? state.filteredData.volume.max.toFixed(1) : getMax(state.displayData.volume), 
      unit: 'mL',
      rawValue: state.filteredData.volume.max || parseFloat(getMax(state.displayData.volume)) || 0,
      isConfigured: false
    },
    volumen: { 
      label: 'Volumen', 
      // En modo volumen: mostrar valor configurado, en modo presión: mostrar valor medido/calculado
      value: state.ventilationMode === 'volume' 
        ? (ventilatorData.volumen || 500).toFixed(0)
        : (state.filteredData.volume.filtered > 0 ? state.filteredData.volume.filtered.toFixed(1) : getLast(state.displayData.volume)), 
      unit: 'mL',
      rawValue: state.ventilationMode === 'volume' 
        ? (ventilatorData.volumen || 500)
        : (state.filteredData.volume.filtered || parseFloat(getLast(state.displayData.volume)) || 0),
      isConfigured: state.ventilationMode === 'volume'
    },
    volumenIntegrado: { 
      label: 'Vol Integrado', 
      // Mostrar volumen integrado calculado
      value: integratedVolume.toFixed(1), 
      unit: 'mL',
      rawValue: integratedVolume,
      onReset: resetIntegratedVolume,
      isConfigured: false
    },
    compliance: {
      label: 'Compliance',
      // Mostrar compliance calculada
      value: state.complianceData.compliance.toFixed(5),
      unit: 'L/cmH₂O',
      rawValue: state.complianceData.compliance,
      status: state.complianceData.calculationStatus,
      errors: state.errorDetection.errors,
      isConfigured: false
    },
    presionMeseta: { 
      label: 'Presión Meseta', 
      // Mostrar presión de plateau calculada o medida
      value: ventilatorData.presionTanque ? ventilatorData.presionTanque.toFixed(1) : '--', 
      unit: 'cmH₂O',
      rawValue: ventilatorData.presionTanque || 0,
      isConfigured: !!ventilatorData.presionTanque
    },
    presionPlaton: { 
      label: 'Presión Platón', 
      // Placeholder para presión plateau cuando esté implementado
      value: '--', 
      unit: 'cmH₂O',
      rawValue: 0,
      isConfigured: false
    },
  };

  // Generar datos de tarjetas basados en la configuración
  const cardData = state.cardConfig
    .filter(card => {
      // En modo ajuste, mostrar todas las tarjetas
      if (state.isAdjustMode) return true;
      
      // En modo normal, mostrar solo las visibles
      if (!card.visible) return false;
      
      // Para compliance, solo mostrar en modo presión control
      if (card.id === 'compliance' && state.ventilationMode !== 'pressure') return false;
      
      return true;
    })
    .sort((a, b) => a.order - b.order)
    .map(card => ({
      ...cardDataMap[card.id],
      id: card.id,
      config: card,
    }));

  // getValueColor and getTrend are now imported from constants/ventilator-limits.ts


  return (
    <ThemeProvider theme={ventilatorTheme}>
      <CssBaseline />
      
      {/* TODO: Reimplementar alertas de validación como popover/popper al hacer click en ícono de alerta.
         Las alertas deben aparecer como overlay contextual, no como bloque en el layout.
         La lógica de detección sigue activa en useParameterValidation().
         Las alertas detalladas con toggle siguen disponibles en MonitoringTab (panel derecho). */}
      {/* <ValidationAlerts
        validationState={parameterValidation?.validationState}
        onClose={() => actions.setShowCompactValidationAlerts(false)}
        show={state.showCompactValidationAlerts}
        compact={true}
      /> */}

      {/* TODO: Reimplementar como ícono de alerta fijo que abre popover con detalles */}
      {/* <Box
        sx={{
          position: 'fixed', top: 20, right: 20, zIndex: 999,
          backgroundColor: 'error.main', color: '#fff', padding: '6px 12px',
          borderRadius: '20px', cursor: 'pointer',
        }}
        onClick={() => actions.setShowCompactValidationAlerts(true)}
      >
        <Box display="flex" alignItems="center" gap={0.5}>
          <ErrorIcon fontSize="small" />
          <Typography variant="caption">alertas</Typography>
        </Box>
      </Box> */}
      
      {/* Botones de grabación y descarga en la parte superior derecha */}
      <Box
        sx={{
          position: 'fixed',
          top: 20,
          right: 20,
          zIndex: 1000,
          display: 'flex',
          gap: 1,
          alignItems: 'center',
        }}
      >
        {/* Botón de grabación */}
        {/* Eliminado - reemplazado por botón Enviar */}

        {/* Botón de descarga - OCULTO TEMPORALMENTE */}
        {/* <Tooltip 
          title="Descargar configuraciones enviadas" 
          placement="bottom"
          arrow
        >
          <IconButton
            onClick={handleDownloadMenuOpen}
            disabled={!dataRecording.hasData}
            sx={{
              backgroundColor: dataRecording.hasData ? 'primary.main' : 'rgba(255, 255, 255, 0.1)',
              color: dataRecording.hasData ? '#000' : 'text.secondary',
              '&:hover': {
                backgroundColor: dataRecording.hasData ? 'primary.dark' : 'rgba(255, 255, 255, 0.2)',
              }
            }}
          >
            <DownloadIcon />
          </IconButton>
        </Tooltip> */}

        {/* Menú de descarga */}
        <Menu
          anchorEl={state.downloadMenuAnchor}
          open={Boolean(state.downloadMenuAnchor)}
          onClose={actions.handleDownloadMenuClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          <MenuItem onClick={actions.handleDownloadTxt}>
            <DownloadIcon sx={{ mr: 1 }} />
            Descargar como TXT
          </MenuItem>
          <MenuItem onClick={actions.handleDownloadPdf}>
            <DownloadIcon sx={{ mr: 1 }} />
            Descargar como PDF
          </MenuItem>
        </Menu>

        {/* Indicador de estado de grabación */}
        {dataRecording.isRecording && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              padding: '4px 8px',
              borderRadius: 1,
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: 'error.main',
                animation: 'pulse 1s infinite',
                '@keyframes pulse': {
                  '0%': { opacity: 1 },
                  '50%': { opacity: 0.5 },
                  '100%': { opacity: 1 }
                }
              }}
            />
            <Typography variant="caption" sx={{ fontSize: '10px', color: 'text.secondary' }}>
              Grabando configuraciones ({dataRecording.recordedData.length} enviadas)
            </Typography>
          </Box>
        )}
      </Box>
      
      {/* Notificación de descarga */}
      {state.notification && (
        <Box
          sx={{
            position: 'fixed',
            top: 80,
            right: 20,
            zIndex: 1001,
            backgroundColor: state.notification.type === 'success' ? 'success.main' : 'error.main',
            color: '#fff',
            padding: '8px 16px',
            borderRadius: 1,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            animation: 'slideIn 0.3s ease-out',
            '@keyframes slideIn': {
              from: { transform: 'translateX(100%)', opacity: 0 },
              to: { transform: 'translateX(0)', opacity: 1 }
            }
          }}
        >
          <Typography variant="body2">
            {state.notification.message}
          </Typography>
        </Box>
      )}
      
      <SimulatorTabs
        activeTab={state.activeTab}
        setActiveTab={actions.setActiveTab}
        navigationLeft={navigationLeft}
        navigationWidth={navigationWidth}
        
        // Props para MonitoringTab
        patientData={patientData}
        isDataPersisted={isDataPersisted}
        dataSource={state.dataSource}
        setDataSource={actions.setDataSource}
        serialConnection={serialConnection}
        handleSendConfiguration={actions.handleSendConfiguration}
        handleStopVentilator={actions.handleStopVentilator}
        configSent={state.configSent}
        isAdjustMode={state.isAdjustMode}
        toggleAdjustMode={actions.toggleAdjustMode}
        resetCardConfiguration={actions.resetCardConfiguration}
        cardData={cardData}
        draggedCard={state.draggedCard}
        handleDragStart={actions.handleDragStart}
        handleDragOver={actions.handleDragOver}
        handleDrop={actions.handleDrop}
        handleDragEnd={actions.handleDragEnd}
        toggleCardVisibility={actions.toggleCardVisibility}
        complianceCardExpanded={state.complianceCardExpanded}
        setComplianceCardExpanded={actions.setComplianceCardExpanded}
        ventilationMode={state.ventilationMode}
        handleModeChange={handleModeChange}
        getValueColor={getValueColor}
        getTrend={getTrend}
        displayData={state.displayData}
        ventilatorData={ventilatorData}
        parameterValidation={parameterValidation}
        handleParameterChange={actions.handleParameterChange}
        complianceData={state.complianceData}
        errorDetection={state.errorDetection}
        autoAdjustmentEnabled={state.autoAdjustmentEnabled}
        lastAutoAdjustment={state.lastAutoAdjustment}
        showValidationAlerts={state.showValidationAlerts}
        setShowValidationAlerts={actions.setShowValidationAlerts}
        isAnalyzing={state.isAnalyzing}
        handleAIAnalysis={actions.handleAIAnalysis}
        
        // Hook unificador local/remoto
        ventilatorConnection={ventilatorConnection}

        // Props para ConnectionTabContent
        systemStatus={systemStatus}
        handleConnection={actions.handleConnection}
        handleDisconnection={actions.handleDisconnection}
        maxMinData={maxMinData}
        dataRecording={dataRecording}
        setNotification={actions.setNotification}
      />
      
      {/* Panel de análisis de IA */}
      <AIAnalysisPanel
        open={state.showAIPanel}
        onClose={() => actions.setShowAIPanel(false)}
        isAnalyzing={isAnalyzing}
        analysisResult={analysisResult}
        analysisError={analysisError}
        onAnalyze={actions.executeAIAnalysis}
        userConfig={ventilatorData}
        optimalConfig={actions.generateOptimalConfig()}
        ventilationMode={state.ventilationMode}
        patientData={patientData}
      />
    </ThemeProvider>
  );
};

export default VentilatorDashboard; 