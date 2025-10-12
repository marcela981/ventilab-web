import React, { useState, useEffect, useCallback, useRef, useMemo, Suspense } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  AppBar,
  Toolbar,
  CssBaseline,
  ThemeProvider,
  TextField,
  Slider,
  Switch,
  FormControlLabel,
  Chip,
  Button,
  Alert,
  Tooltip,
  IconButton,
  Collapse,
  Menu,
  MenuItem,
  BottomNavigation,
  BottomNavigationAction,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { muiTheme } from '../styles/mui-overrides';
import ModeToggle from './common/ModeToggle';
import AIAnalysisButton from './common/AIAnalysisButton';
import { 
  DashboardContainer, 
  StyledPaper, 
  ModeIndicator, 
  AdjustButton, 
  EditableCard 
} from './dashboard/styles/DashboardStyles';
import { EditControls } from './common/EditableCard';
import ParameterControls from './dashboard/ParameterControls';
import MonitoringCards from './dashboard/MonitoringCards';
import DashboardTabs from './dashboard/DashboardTabs';
import SendIcon from '@mui/icons-material/Send';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SettingsIcon from '@mui/icons-material/Settings';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import DownloadIcon from '@mui/icons-material/Download';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import StopIcon from '@mui/icons-material/Stop';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PsychologyIcon from '@mui/icons-material/Psychology';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
// Iconos para las pestañas de navegación
import PersonIcon from '@mui/icons-material/Person';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import WifiIcon from '@mui/icons-material/Wifi';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';

// Importación para gráficas de bucles cerrados
import { Line } from 'react-chartjs-2';
import LoopChart from './common/LoopChart';
import PatientSimulatorTab from './tabs/PatientSimulatorTab';
import GraphsTab from './tabs/GraphsTab';
import MonitoringTab from './tabs/MonitoringTab';
import ConnectionTabContent from './tabs/ConnectionTabContent';

// Componentes que vamos a crear
import ControlPanel from './ControlPanel';
import RealTimeCharts from './RealTimeCharts';
import ConnectionPanel from './ConnectionPanel';
import ParameterDisplay from './ParameterDisplay';
import ComplianceStatus from './ComplianceStatus';
import ValidationAlerts from './ValidationAlerts';
import ValidatedInput from './common/ValidatedInput';

// Importación adicional para el simulador de paciente
const PatientSimulator = React.lazy(() => import('./PatientSimulator'));

// Hooks
import { useSerialConnection } from '../hooks/useSerialConnection';
import { useVentilatorData } from '../hooks/useVentilatorData';
import { SerialProtocol } from '../utils/serialCommunication';
import { useComplianceCalculation } from '../hooks/useComplianceCalculation';
import { useSignalProcessing } from '../hooks/useSignalProcessing';
import { useErrorDetection } from '../hooks/useErrorDetection';
import { useDataRecording } from '../hooks/useDataRecording';
import { useParameterValidation } from '../hooks/useParameterValidation';
import { usePatientData } from '../hooks/usePatientData'; // Importar hook de paciente
import { useQRBridge } from '../hooks/useQRBridge';
import { useAIAnalysis } from '../hooks/useAIAnalysis';
import useDashboardState from '../hooks/useDashboardState';
import AIAnalysisPanel from './AIAnalysisPanel';
import { useSidebar } from '../../pages/_app';

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

  // Debug: Log del estado del sidebar (temporal para verificar funcionamiento)
  useEffect(() => {
    console.log('Sidebar state changed:', sidebarOpen);
    console.log('BottomNavigation left:', navigationLeft);
    console.log('BottomNavigation width:', navigationWidth);
  }, [sidebarOpen, navigationLeft, navigationWidth]);
  
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

  // Hook para códigos QR y compartir
  const qrBridge = useQRBridge();

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

  // Efecto para ejecutar cálculos automáticos cuando cambien parámetros relevantes
  useEffect(() => {
    // Usar setTimeout para evitar actualizaciones síncronas que causen bucles
    const timeoutId = setTimeout(() => {
      if (state.ventilationMode === 'volume') {
        actions.calculateVolumeControlParameters();
      } else if (state.ventilationMode === 'pressure') {
        actions.calculatePressureControlParameters();
      }
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [
    state.ventilationMode,
    ventilatorData.inspiracionEspiracion,
    ventilatorData.frecuencia,
    ventilatorData.pausaInspiratoria,
    ventilatorData.pausaEspiratoria,
    ventilatorData.volumen,
    ventilatorData.peep,
    ventilatorData.presionMax,
    state.complianceData.compliance
  ]);



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

  // Función para obtener el color dinámico basado en el valor y tipo de parámetro
  const getValueColor = (id, value) => {
    // Definir rangos normales para cada parámetro (valores más específicos para ventilación)
    const ranges = {
      presionPico: { normal: [8, 30], warning: [30, 40], danger: [40, Infinity] },
      presionMedia: { normal: [4, 15], warning: [15, 25], danger: [25, Infinity] },
      peep: { normal: [3, 15], warning: [15, 20], danger: [20, Infinity] },
      flujoMax: { normal: [30, 100], warning: [100, 150], danger: [150, Infinity] },
      flujo: { normal: [-20, 80], warning: [80, 120], danger: [120, Infinity] },
      flujoMin: { normal: [-60, 0], warning: [-80, -60], danger: [-Infinity, -80] },
      volMax: { normal: [400, 900], warning: [900, 1200], danger: [1200, Infinity] },
      volumen: { normal: [300, 800], warning: [800, 1000], danger: [1000, Infinity] },
      volumenIntegrado: { normal: [0, 1000], warning: [1000, 1500], danger: [1500, Infinity] },
      compliance: { normal: [0.02, 0.1], warning: [0.01, 0.02], danger: [0, 0.01] },
      presionMeseta: { normal: [10, 25], warning: [25, 35], danger: [35, Infinity] }
    };

    const range = ranges[id];
    if (!range) return '#76c7c0'; // Color neutral para parámetros sin rango definido

    // Para compliance, la lógica es inversa (valores muy bajos son peligrosos)
    if (id === 'compliance') {
      if (value <= range.danger[1]) return '#f44336'; // Rojo para compliance muy baja
      if (value <= range.warning[1]) return '#ff9800'; // Amarillo para compliance baja
      if (value <= range.normal[1]) return '#4caf50'; // Verde para compliance normal
      return '#76c7c0'; // Azul para compliance alta
    }

    // Para otros parámetros
    if (value >= range.danger[0] && (range.danger[1] === Infinity || value <= range.danger[1])) return '#f44336'; // Rojo
    if (value >= range.warning[0] && value <= range.warning[1]) return '#ff9800'; // Amarillo
    if (value >= range.normal[0] && value <= range.normal[1]) return '#4caf50'; // Verde
    
    return '#76c7c0'; // Azul para valores fuera de rangos esperados
  };

  // Función para obtener la tendencia de un valor
  const getTrend = (id, value) => {
    const ranges = {
      presionPico: { normal: [10, 35], warning: [35, 50], danger: [50, Infinity] },
      presionMedia: { normal: [5, 20], warning: [20, 30], danger: [30, Infinity] },
      peep: { normal: [3, 12], warning: [12, 20], danger: [20, Infinity] },
      flujoMax: { normal: [20, 80], warning: [80, 120], danger: [120, Infinity] },
      flujo: { normal: [10, 60], warning: [60, 100], danger: [100, Infinity] },
      flujoMin: { normal: [-10, 10], warning: [-20, -10], danger: [-Infinity, -20] },
      volMax: { normal: [300, 800], warning: [800, 1200], danger: [1200, Infinity] },
      volumen: { normal: [200, 600], warning: [600, 1000], danger: [1000, Infinity] },
      volumenIntegrado: { normal: [0, 800], warning: [800, 1200], danger: [1200, Infinity] }
    };

    const range = ranges[id];
    if (!range) return 'stable';

    if (value > range.normal[1]) return 'increasing';
    if (value < range.normal[0]) return 'decreasing';
    return 'stable';
  };


  return (
    <ThemeProvider theme={ventilatorTheme}>
      <CssBaseline />
      
      {/* Alertas de validación compactas */}
      {parameterValidation && parameterValidation.validationState && (
        <ValidationAlerts
          validationState={parameterValidation.validationState}
          onClose={() => actions.setShowCompactValidationAlerts(false)}
          show={state.showCompactValidationAlerts}
          compact={true}
        />
      )}
      
      {/* Indicador compacto de alertas sin mostrar */}
      {!state.showCompactValidationAlerts && parameterValidation && parameterValidation.validationState && (parameterValidation.validationState.criticalErrors.length > 0 || parameterValidation.validationState.warnings.length > 0) && (
        <Box
          sx={{
            position: 'fixed',
            top: 20,
            right: 20,
            zIndex: 999,
            backgroundColor: parameterValidation.validationState.criticalErrors.length > 0 ? 'error.main' : 'warning.main',
            color: '#fff',
            padding: '6px 12px',
            borderRadius: '20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'scale(1.05)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            }
          }}
          onClick={() => actions.setShowCompactValidationAlerts(true)}
        >
          <Box display="flex" alignItems="center" gap={0.5}>
            {parameterValidation.validationState.criticalErrors?.length > 0 ? (
              <ErrorIcon fontSize="small" />
            ) : (
              <WarningIcon fontSize="small" />
            )}
            <Typography variant="caption" sx={{ fontSize: '11px', fontWeight: 'bold' }}>
              {parameterValidation.validationState.criticalErrors?.length > 0 
                ? `${parameterValidation.validationState.criticalErrors.length} error${parameterValidation.validationState.criticalErrors.length > 1 ? 'es' : ''}`
                : `${parameterValidation.validationState.warnings?.length || 0} aviso${(parameterValidation.validationState.warnings?.length || 0) > 1 ? 's' : ''}`
              }
            </Typography>
          </Box>
        </Box>
      )}
      
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
      
      <DashboardTabs
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