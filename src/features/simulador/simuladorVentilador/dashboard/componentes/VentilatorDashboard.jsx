import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Box,
  Typography,
  CssBaseline,
  ThemeProvider,
  Menu,
  MenuItem,
} from '@mui/material';
import { muiTheme } from '@/styles/mui-overrides';
import DownloadIcon from '@mui/icons-material/Download';

// Chart.js registration — must be imported before any react-chartjs-2 usage
import '@/features/simulador/conexion/websocket/registro/ChartRegistry';

// Centralized value color/trend functions
import { getValueColor, getTrend } from '@/features/simulador/compartido/constantes/ventilator-limits';

// Componentes del simulador
import SimuladorTabs from '@/features/simulador/compartido/navegacion/SimuladorTabs';
import MonitoringTab from '@/features/simulador/simuladorVentilador/dashboard/componentes/MonitoringTab';
import ConnectionTabContent from '@/features/simulador/conexion/serial/componentes/ConnectionTabContent';
import { ConnectionPanel } from '@/features/simulador/compartido/componentes/ConnectionPanel';
import { buildCardData } from '../utils/cardDataBuilder';

// Hooks
import { useSerialConnection } from '@/features/simulador/conexion/serial/hooks/useSerialConnection';
import { useVentilatorData } from '@/features/simulador/conexion/serial/hooks/useVentilatorData';
import { useComplianceCalculation } from '@/features/simulador/simuladorVentilador/graficasMonitor/hooks/useComplianceCalculation';
import { useSignalProcessing } from '@/features/simulador/simuladorVentilador/graficasMonitor/hooks/useSignalProcessing';
import { useErrorDetection } from '@/features/simulador/simuladorVentilador/panelControl/hooks/useErrorDetection';
import { useDataRecording } from '@/features/simulador/compartido/hooks/useDataRecording';
import { useParameterValidation } from '@/features/simulador/simuladorVentilador/panelControl/hooks/useParameterValidation';
import { usePatientData } from '@/features/simulador/simuladorPaciente/hooks/usePatientData';
import { useQRBridge } from '@/features/simulador/compartido/hooks/useQRBridge';
import { useAIAnalysis } from '@/features/simulador/simuladorVentilador/IAMonitor/hooks/useAIAnalysis';
import { useVentilatorConnection } from '@/features/simulador/conexion/websocket/hooks/useVentilatorConnection';
import { useVentilatorControls } from '@/features/simulador/simuladorVentilador/panelControl/hooks/useVentilatorControls';
import useDashboardState from '@/features/simulador/simuladorVentilador/dashboard/hooks/useDashboardState';
import AIAnalysisPanel from '@/features/simulador/simuladorVentilador/IAMonitor/componentes/AIAnalysisPanel';
import VentilatorCharts from '@/features/simulador/simuladorVentilador/dashboard/componentes/VentilatorCharts';
import { useSidebar } from '@/shared/contexts/SidebarContext';

// Usar el tema centralizado desde mui-overrides.js
const ventilatorTheme = muiTheme;

const VentilatorDashboard = ({
  externalVentilatorData,
  externalRealTimeData,
  externalSystemStatus,
  isRemoteConnection,
} = {}) => {
  const { sidebarOpen } = useSidebar();

  // Calcular valores para la barra de navegación
  const sidebarWidth = sidebarOpen ? '240px' : '64px';
  const navigationLeft = sidebarWidth;
  const navigationWidth = `calc(100% - ${sidebarWidth})`;

  // Hooks principales
  const serialConnection = useSerialConnection();
  const {
    ventilatorData: _ventilatorData,
    realTimeData: _realTimeData,
    setVentilatorData, // Necesitamos el setter
    calculations,
    integratedVolume,
    getCurrentIntegratedVolume,
    resetIntegratedVolume,
    maxMinData, // Nuevos datos de máx/mín cada 100 muestras
    registerDataRecording, // Función para registrar el hook de grabación
    systemStatus // Estado del sistema
  } = useVentilatorData(serialConnection);

  // Remote/WebSocket mode: merge external data over local serial data.
  // User-configured params (PEEP, FiO2, mode…) come from local state (control panel).
  // Real-time measured values (pressure, flow, volume) come from the WebSocket stream.
  // realTimeData arrays are fully replaced so Chart.js paints the simulated curves.
  const ventilatorData = externalVentilatorData
    ? { ..._ventilatorData, ...externalVentilatorData }
    : _ventilatorData;
  const realTimeData = externalRealTimeData ?? _realTimeData;

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

  /**
   * Wrapped configuration sender.
   *
   * 1. Executes the original serial/validation flow from useDashboardState.
   * 2. ALSO sends a VentilatorCommand via REST to the backend simulation endpoint.
   *    - If a synthetic patient is running  → `patientSim.updateCommand()` is called server-side.
   *    - If no patient configured           → backend falls through to MQTT (physical mode).
   *    Either way the call is non-blocking and non-critical from the UI's perspective.
   */
  const handleSendConfigWrapped = useCallback(async () => {
    await actions.handleSendConfiguration();

    const d = _ventilatorDataRef.current;
    sendCommand({
      mode: state.ventilationMode === 'volume' ? 'VCV' : 'PCV',
      tidalVolume: d.volumen || 500,
      respiratoryRate: d.frecuencia || 12,
      peep: d.peep || 5,
      fio2: (d.fio2 || 21) / 100,
      ...(d.presionMax ? { pressureLimit: d.presionMax } : {}),
      ...(d.tiempoInspiratorio ? { inspiratoryTime: d.tiempoInspiratorio } : {}),
      ...(d.tiempoInspiratorio && d.tiempoEspiratorio
        ? { ieRatio: `${d.relacionIE1 ?? 1}:${d.relacionIE2 ?? 1}` }
        : {}),
    }).catch(() => {
      // Non-blocking: serial flow already notified the user if there was a validation error.
    });
  }, [actions, sendCommand, state.ventilationMode]); // eslint-disable-line react-hooks/exhaustive-deps

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



  // Generar datos de tarjetas basados en la configuración utilizando la nueva función helper
  const cardData = buildCardData(state, ventilatorData, integratedVolume, resetIntegratedVolume);

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

      <SimuladorTabs
        navigationLeft={navigationLeft}
        navigationWidth={navigationWidth}
        defaultTab={1}

        chartsContent={
          <VentilatorCharts
            realTimeData={realTimeData?.pressure?.length ? realTimeData : undefined}
            isRealVentilator={isRemoteConnection === false && serialConnection?.isConnected}
          />
        }

        monitoringContent={
          <MonitoringTab
            patientData={patientData}
            isDataPersisted={isDataPersisted}
            dataSource={state.dataSource}
            setDataSource={actions.setDataSource}
            serialConnection={serialConnection}
            handleSendConfiguration={handleSendConfigWrapped}
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
          />
        }

        connectionContent={
          <Box>
            {ventilatorConnection && (
              <ConnectionPanel
                connectionState={ventilatorConnection.connectionState}
                reservation={ventilatorConnection.reservation}
                onSwitchToLocal={ventilatorConnection.actions.switchToLocal}
                onSwitchToRemote={ventilatorConnection.actions.switchToRemote}
                onDisconnect={ventilatorConnection.actions.disconnect}
                onRequestReservation={ventilatorConnection.actions.requestReservation}
                onReleaseReservation={ventilatorConnection.actions.releaseReservation}
              />
            )}
            {(!ventilatorConnection || ventilatorConnection.connectionState.mode !== 'remote') && (
              <ConnectionTabContent
                serialConnection={serialConnection}
                systemStatus={systemStatus}
                handleConnection={actions.handleConnection}
                handleDisconnection={actions.handleDisconnection}
                handleSendConfiguration={handleSendConfigWrapped}
                getValueColor={getValueColor}
                ventilatorData={ventilatorData}
                maxMinData={maxMinData}
                dataRecording={dataRecording}
                setNotification={actions.setNotification}
                patientData={patientData}
                ventilationMode={state.ventilationMode}
              />
            )}
          </Box>
        }
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
