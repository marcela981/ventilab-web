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
  createTheme,
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

// Tema personalizado para el ventilador
const ventilatorTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#de0b24', // Rojo Cereza
    },
    secondary: {
      main: '#5B0002', // Rojo Sangre toro
    },
    tertiary: {
      main: '#2F2E2E', // Gris oscuro
    },
    text: {
      primary: '#ffffff',
      secondary: '#b0b0b0',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 500,
    },
  },
});

const DashboardContainer = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  padding: theme.spacing(2),
  paddingBottom: '80px', // Espacio para la barra de navegación fija
}));

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  backgroundColor: 'rgba(121, 10, 10, 0.57)',
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.spacing(1),
}));

// Toggle Switch
const ModeToggle = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  position: 'relative',
}));

const CircularModeButton = styled(Box)(({ theme, active }) => ({
  width: 50,
  height: 50,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  backgroundColor: active ? theme.palette.primary.main : 'rgba(255, 255, 255, 0.1)',
  color: active ? '#000' : theme.palette.text.primary,
  fontWeight: active ? 700 : 400,
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  border: active ? '2px solid #de0b24' : '2px solid rgba(255, 255, 255, 0.2)',
  fontSize: '6px',
  textAlign: 'center',
  lineHeight: 1.1,
  position: 'relative',
  overflow: 'hidden',
  '&:hover': {
    backgroundColor: active ? theme.palette.primary.dark : 'rgba(255, 255, 255, 0.2)',
    transform: 'scale(1.1)',
    boxShadow: active 
      ? '0 4px 12px rgba(218, 0, 22, 0.5)' 
      : '0 4px 12px rgba(255, 255, 255, 0.3)',
  },
  '&:active': {
    transform: 'scale(0.95)',
  },
  '&::before': active ? {
    content: '""',
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: '120%',
    height: '120%',
    background: 'radial-gradient(circle, rgba(218, 0, 22, 0.3) 0%, transparent 70%)',
    transform: 'translate(-50%, -50%)',
    borderRadius: '50%',
    animation: 'pulse 2s infinite',
  } : {},
  '@keyframes pulse': {
    '0%': {
      transform: 'translate(-50%, -50%) scale(1)',
      opacity: 0.7,
    },
    '50%': {
      transform: 'translate(-50%, -50%) scale(1.2)',
      opacity: 0.3,
    },
    '100%': {
      transform: 'translate(-50%, -50%) scale(1)',
      opacity: 0.7,
    },
  },
}));

const ModeIndicator = styled(Box)(({ theme }) => ({
  position: 'fixed',
  top: 20,
  left: 20,
  zIndex: 1000,
  padding: theme.spacing(1, 2),
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  borderRadius: theme.spacing(1),
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
}));

// Botón de ajuste personalizado
const AdjustButton = styled(Button)(({ theme, active }) => ({
  backgroundColor: active ? theme.palette.secondary.main : 'rgba(255, 255, 255, 0.1)',
  color: active ? '#fff' : theme.palette.text.primary,
  fontWeight: 600,
  padding: theme.spacing(1, 2),
  borderRadius: theme.spacing(1),
  border: active ? '2px solid #de0b24' : '2px solid rgba(255, 255, 255, 0.2)',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    backgroundColor: active ? theme.palette.secondary.dark : 'rgba(255, 255, 255, 0.2)',
    transform: 'scale(1.05)',
  },
}));

// Tarjeta personalizada con modo de edición
const EditableCard = styled(Paper)(({ theme, isEditing, isVisible, isDragging, isExpanded }) => ({
  width: '300px',
  height: isExpanded ? 'auto' : '85px',
  minHeight: isExpanded ? '250px' : '85px',
  maxHeight: isExpanded ? '400px' : '85px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: isExpanded ? 'flex-start' : 'center',
  justifyContent: isExpanded ? 'flex-start' : 'center',
  padding: theme.spacing(1),
  backgroundColor: isVisible ? 'rgba(31, 31, 31, 0.2)' : 'rgba(31, 31, 31, 0.05)',
  position: 'relative',
  opacity: isVisible ? 1 : 0.4,
  cursor: isEditing ? 'grab' : 'default',
  transform: isDragging ? 'scale(1.05) rotate(2deg)' : 'scale(1)',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  overflow: isExpanded ? 'auto' : 'hidden',
  borderRadius: 0,
  border: isEditing 
    ? (isVisible ? '2px dashed rgba(218, 0, 22, 0.5)' : '2px dashed rgba(255, 255, 255, 0.2)')
    : (isVisible ? '1px solid transparent' : '1px solid rgba(255, 255, 255, 0.1)'),
  '&:hover': {
    backgroundColor: isEditing 
      ? (isVisible ? 'rgba(31, 31, 31, 0.4)' : 'rgba(31, 31, 31, 0.1)')
      : (isVisible ? 'rgba(31, 31, 31, 0.2)' : 'rgba(31, 31, 31, 0.05)'),
    transform: isEditing ? 'scale(1.02)' : 'scale(1)',
    opacity: isVisible ? 1 : 0.6,
  },
  '&:active': {
    cursor: isEditing ? 'grabbing' : 'default',
  },
  // Estilo especial para tarjetas ocultas
  ...(isVisible ? {} : {
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'linear-gradient(45deg, transparent 40%, rgba(255, 255, 255, 0.05) 50%, transparent 60%)',
      pointerEvents: 'none',
    }
  }),
}));

// Contenedor de controles de edición
const EditControls = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: 4,
  right: 4,
  display: 'flex',
  gap: theme.spacing(0.5),
  zIndex: 10,
}));

// Botón de IA personalizado
const AIAnalysisButton = styled(Box)(({ theme, isAnalyzing }) => ({
  width: 100,
  height: 50,
  borderRadius: '8px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  backgroundColor: isAnalyzing ? theme.palette.secondary.main : 'rgba(255, 255, 255, 0.1)',
  color: isAnalyzing ? '#fff' : theme.palette.text.primary,
  fontWeight: isAnalyzing ? 700 : 400,
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  border: isAnalyzing ? '2px solid #5B0002' : '2px solid rgba(255, 255, 255, 0.2)',
  fontSize: '6px',
  textAlign: 'center',
  lineHeight: 1.1,
  position: 'absolute',
  top: '50%',
  left: 'calc(100% + 16px)',
  transform: 'translateY(-50%)',
  overflow: 'hidden',
  zIndex: 10,
  '&:hover': {
    backgroundColor: isAnalyzing ? theme.palette.secondary.dark : 'rgba(255, 255, 255, 0.2)',
    transform: 'translateY(-50%) translateY(-8px) scale(1.1)',
    boxShadow: isAnalyzing 
      ? '0 8px 20px rgba(91, 0, 2, 0.6)' 
      : '0 8px 20px rgba(255, 255, 255, 0.4)',
  },
  '&:active': {
    transform: 'translateY(-50%) translateY(-4px) scale(0.95)',
  },
  '&::before': isAnalyzing ? {
    content: '""',
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: '140%',
    height: '140%',
    background: 'radial-gradient(circle, rgba(91, 0, 2, 0.4) 0%, transparent 70%)',
    transform: 'translate(-50%, -50%)',
    borderRadius: '50%',
    animation: 'aiPulse 2s infinite',
  } : {},
  '@keyframes aiPulse': {
    '0%': {
      transform: 'translate(-50%, -50%) scale(1)',
      opacity: 0.8,
    },
    '50%': {
      transform: 'translate(-50%, -50%) scale(1.3)',
      opacity: 0.4,
    },
    '100%': {
      transform: 'translate(-50%, -50%) scale(1)',
      opacity: 0.8,
    },
  },
}));

const VentilatorDashboard = () => {
  const serialConnection = useSerialConnection();
  const { 
    ventilatorData, 
    realTimeData, 
    setVentilatorData, 
    calculations,
    integratedVolume,
    getCurrentIntegratedVolume,
    resetIntegratedVolume
  } = useVentilatorData(serialConnection);
  
  // Estado para el modo de ventilación
  const [ventilationMode, setVentilationMode] = useState('volume'); // 'volume' o 'pressure'
  const [configSent, setConfigSent] = useState(false);

  // Datos para mostrar: según el archivo Python, cuando NO hay conexión, 
  // las tarjetas deben mostrar valores estáticos (configurados) o "--" para medidos,
  // NO datos simulados cambiantes
  const displayData = useMemo(() => {
    if (serialConnection.isConnected) {
      // Con conexión: usar datos reales
      return realTimeData;
    } else {
      // Sin conexión: usar estructura vacía (no datos simulados cambiantes)
      // Esto hará que las tarjetas muestren valores configurados o "--"
      return {
        pressure: [],
        flow: [],
        volume: [],
        time: []
      };
    }
  }, [serialConnection.isConnected, realTimeData]);

  // Estado para la navegación por pestañas
  const [activeTab, setActiveTab] = useState(1); // 0: Simular paciente, 1: Monitoreo, 2: Gráficas, 3: Conexión

  // Estado para el modo de ajuste de tarjetas
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

  // Hooks para cálculos y monitoreo
  const complianceData = useComplianceCalculation(displayData, ventilationMode);
  const filteredData = useSignalProcessing(displayData);
  const errorDetection = useErrorDetection(
    ventilatorData, // valores objetivo
    filteredData,   // valores actuales
    complianceData.compliance      // compliance calculada
  );

  // Hook para grabación de datos
  const dataRecording = useDataRecording();

  // Hook para validación de parámetros
  const parameterValidation = useParameterValidation();

  // Estado para controlar el reenvío automático
  const [autoAdjustmentEnabled, setAutoAdjustmentEnabled] = useState(true);
  const [lastAutoAdjustment, setLastAutoAdjustment] = useState(null);
  
  // Estado para controlar la expansión de la tarjeta de compliance
  const [complianceCardExpanded, setComplianceCardExpanded] = useState(false);

  // Estado para el menú de descarga
  const [downloadMenuAnchor, setDownloadMenuAnchor] = useState(null);

  // Estado para notificaciones
  const [notification, setNotification] = useState(null);

  // Estado para el botón de IA
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Estado para alertas de validación
  const [showValidationAlerts, setShowValidationAlerts] = useState(false);
  const [showCompactValidationAlerts, setShowCompactValidationAlerts] = useState(false);

  // Refs para mantener referencias estables y evitar bucles infinitos
  const ventilatorDataRef = useRef(ventilatorData);
  const complianceDataRef = useRef(complianceData);
  const serialConnectionRef = useRef(serialConnection);
  const autoAdjustmentEnabledRef = useRef(autoAdjustmentEnabled);

  // Actualizar refs cuando cambien los valores
  useEffect(() => {
    ventilatorDataRef.current = ventilatorData;
  }, [ventilatorData]);

  useEffect(() => {
    complianceDataRef.current = complianceData;
  }, [complianceData]);

  useEffect(() => {
    serialConnectionRef.current = serialConnection;
  }, [serialConnection]);

  useEffect(() => {
    autoAdjustmentEnabledRef.current = autoAdjustmentEnabled;
  }, [autoAdjustmentEnabled]);

  // Memoizar las validaciones de parámetros individuales para evitar recálculos
  // TEMPORALMENTE COMENTADO PARA DEBUGGING DEL BUCLE INFINITO
  /*
  const fio2Validation = useMemo(() => 
    parameterValidation.validateSingleParameter('fio2', ventilatorData.fio2, ventilatorData, ventilationMode),
    [ventilatorData.fio2, ventilatorData, ventilationMode]
  );

  const volumenValidation = useMemo(() => 
    parameterValidation.validateSingleParameter('volumen', ventilatorData.volumen, ventilatorData, ventilationMode),
    [ventilatorData.volumen, ventilatorData, ventilationMode]
  );

  const presionMaxValidation = useMemo(() => 
    parameterValidation.validateSingleParameter('presionMax', ventilatorData.presionMax || 20, ventilatorData, ventilationMode),
    [ventilatorData.presionMax, ventilatorData, ventilationMode]
  );

  const peepValidation = useMemo(() => 
    parameterValidation.validateSingleParameter('peep', ventilatorData.peep, ventilatorData, ventilationMode),
    [ventilatorData.peep, ventilatorData, ventilationMode]
  );

  const frecuenciaValidation = useMemo(() => 
    parameterValidation.validateSingleParameter('frecuencia', ventilatorData.frecuencia, ventilatorData, ventilationMode),
    [ventilatorData.frecuencia, ventilatorData, ventilationMode]
  );

  // Memoizar los rangos de parámetros
  const fio2Ranges = useMemo(() => parameterValidation.getParameterRanges('fio2'), []);
  const volumenRanges = useMemo(() => parameterValidation.getParameterRanges('volumen'), []);
  const presionMaxRanges = useMemo(() => parameterValidation.getParameterRanges('presionMax'), []);
  const peepRanges = useMemo(() => parameterValidation.getParameterRanges('peep'), []);
  const frecuenciaRanges = useMemo(() => parameterValidation.getParameterRanges('frecuencia'), []);
  */

  // Función para calcular automáticamente parámetros en modo volumen control (como calcular() en Python)
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
  }, []); // Sin dependencias para evitar bucles

  // Función para calcular automáticamente parámetros en modo presión control (como calcularP() en Python)
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
  }, []); // Sin dependencias para evitar bucles

  // Función para recalcular parámetros cuando cambia la compliance (como configP en Python)
  const recalculateParametersWithCompliance = useCallback((newCompliance, adjustmentData) => {
    console.log('Recalculando parámetros con nueva compliance:', newCompliance);
    
    const currentData = ventilatorDataRef.current;
    const currentCompliance = complianceDataRef.current;
    const currentSerialConnection = serialConnectionRef.current;
    const currentAutoAdjustmentEnabled = autoAdjustmentEnabledRef.current;
    
    // Calcular tiempo inspiratorio actual
    const tciclo = (60 / currentData.frecuencia) - (currentData.pausaEspiratoria || 0);
    const ieValue = currentData.inspiracionEspiracion || 0.5;
    let ti = tciclo * 0.5; // por defecto 1:1
    
    if (ieValue !== 0.5) {
      if (ieValue > 0.5) {
        const ratio = 1 + ((ieValue - 0.5) * 10);
        ti = tciclo * (1 / (1 + ratio));
      } else {
        const ratio = 1 + ((0.5 - ieValue) * 10);
        ti = tciclo * (ratio / (1 + ratio));
      }
    }

    // Calcular nuevos parámetros usando la compliance actualizada
    const C = newCompliance;
    const PEEP = currentData.peep;
    const PIP = currentData.presionMax;
    
    const Vtil = 1000 * (C * (PIP - PEEP)); // ml
    const Qmax = (C * (PIP - PEEP)) / (ti / 60); // L/min
    const PresT = (0.0025 * Math.pow(Qmax, 2)) + (0.2203 * Qmax) - 0.5912;

    const newParameters = {
          ...currentData,
      volumen: Math.round(Vtil),
      qMax: Math.round(Qmax * 10) / 10,
      presionTanque: Math.round(PresT * 10) / 10
    };

    setVentilatorData(newParameters);
    setLastAutoAdjustment({
      timestamp: new Date(),
      compliance: newCompliance,
      parameters: newParameters,
      reason: 'Compliance recalculada automáticamente',
      error: adjustmentData.error
    });

    console.log(`Parámetros recalculados:`, {
      'Volumen Tidal': `${Vtil.toFixed(0)} ml`,
      'Flujo Máximo': `${Qmax.toFixed(1)} L/min`,
      'Presión Tanque': `${PresT.toFixed(1)} cmH2O`,
      'Nueva Compliance': `${newCompliance.toFixed(5)} L/cmH2O`,
      'Error': `${adjustmentData.error.toFixed(1)}%`
    });

    // Marcar como procesado
    currentCompliance.markRecalculationProcessed();

    // Reenviar configuración automáticamente después de 1 segundo
    if (currentAutoAdjustmentEnabled && currentSerialConnection.isConnected) {
      setTimeout(() => {
        handleSendConfiguration();
        console.log('Configuración reenviada automáticamente tras recálculo de compliance');
      }, 1000);
    }

  }, []); // Sin dependencias para evitar bucles

  // Registrar el callback de actualización de compliance - SOLO UNA VEZ
  useEffect(() => {
    complianceData.registerUpdateCallback(recalculateParametersWithCompliance);
  }, []); // Sin dependencias para que solo se ejecute una vez

  // Efecto para aplicar ajustes automáticos cuando hay errores críticos
  useEffect(() => {
    if (errorDetection.hasErrors && ventilationMode === 'pressure' && errorDetection.hasHighSeverityErrors && autoAdjustmentEnabled) {
      // Aplicar ajustes automáticos solo para errores de alta severidad
      const highSeverityErrors = errorDetection.getHighSeverityErrors();
      
      highSeverityErrors.forEach(error => {
        errorDetection.applyAdjustment(error, handleParameterChange);
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
  }, [errorDetection.hasHighSeverityErrors, ventilationMode, autoAdjustmentEnabled, serialConnection.isConnected]);

  // Efecto para ejecutar cálculos automáticos cuando cambien parámetros relevantes
  useEffect(() => {
    // Usar setTimeout para evitar actualizaciones síncronas que causen bucles
    const timeoutId = setTimeout(() => {
      if (ventilationMode === 'volume') {
        calculateVolumeControlParameters();
      } else if (ventilationMode === 'pressure') {
        calculatePressureControlParameters();
      }
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [
    ventilationMode,
    ventilatorData.inspiracionEspiracion,
    ventilatorData.frecuencia,
    ventilatorData.pausaInspiratoria,
    ventilatorData.pausaEspiratoria,
    ventilatorData.volumen,
    ventilatorData.peep,
    ventilatorData.presionMax,
    complianceData.compliance
  ]);

  // Efecto para procesar recálculos pendientes de compliance
  useEffect(() => {
    if (complianceData.calculationStatus.requiresRecalculation && ventilationMode === 'pressure') {
      console.log('Procesando recálculo de compliance pendiente...');
      
      // El callback ya fue ejecutado automáticamente, solo necesitamos pasar el PIP objetivo
      if (complianceData.calculateNewCompliance) {
        complianceData.calculateNewCompliance(ventilatorData.presionMax);
      }
    }
  }, [complianceData.calculationStatus.requiresRecalculation, ventilationMode, ventilatorData.presionMax]);

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

  const handleConnection = async (port, baudRate) => {
    const success = await serialConnection.connect(port, baudRate);
    if (success) {
      // Enviar frame de inicio
      await serialConnection.sendData(SerialProtocol.createStartFrame());
    }
  };

  const handleDisconnection = async () => {
    await serialConnection.sendData(SerialProtocol.createStopFrame());
    await serialConnection.disconnect();
  };

  const handleSendConfiguration = async () => {
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
    
    // Registrar los datos enviados si la grabación está activa
    dataRecording.addSentData(ventilationMode, ventilatorData, configFrame);
    
    // Reiniciar el cálculo de compliance cuando se envían nuevos parámetros (como en Python)
    if (ventilationMode === 'pressure') {
      complianceData.resetComplianceCalculation();
      console.log('Reiniciando cálculo automático de compliance tras envío de configuración');
    }
    
    setTimeout(() => setConfigSent(false), 3000); // Ocultar después de 3 segundos
  };

  const handleParameterChange = (parameter, value) => {
    setVentilatorData(prev => ({
      ...prev,
      [parameter]: value,
    }));
  };

  const handleModeChange = (newMode) => {
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
  };

  // Funciones para el modo de ajuste
  const toggleAdjustMode = () => {
    setIsAdjustMode(!isAdjustMode);
  };

  const toggleCardVisibility = (cardId) => {
    setCardConfig(prev => prev.map(card => 
      card.id === cardId ? { ...card, visible: !card.visible } : card
    ));
  };

  const handleDragStart = (e, cardId) => {
    if (!isAdjustMode) return;
    setDraggedCard(cardId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetCardId) => {
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
  };

  const handleDragEnd = () => {
    setDraggedCard(null);
  };

  const resetCardConfiguration = () => {
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
  };

  // Funciones para el menú de descarga
  const handleDownloadMenuOpen = (event) => {
    setDownloadMenuAnchor(event.currentTarget);
  };

  const handleDownloadMenuClose = () => {
    setDownloadMenuAnchor(null);
  };

  const handleDownloadTxt = () => {
    dataRecording.downloadAsTxt();
    setNotification({
      type: 'success',
      message: 'Configuraciones enviadas descargadas como TXT',
      timestamp: Date.now()
    });
    handleDownloadMenuClose();
  };

  const handleDownloadPdf = () => {
    dataRecording.downloadAsPdf();
    setNotification({
      type: 'success',
      message: 'Configuraciones enviadas descargadas como PDF',
      timestamp: Date.now()
    });
    handleDownloadMenuClose();
  };

  const handleToggleRecording = () => {
    if (dataRecording.isRecording) {
      dataRecording.stopRecording();
    } else {
      dataRecording.startRecording();
    }
  };

  // Función para manejar el análisis con IA
  const handleAIAnalysis = () => {
    setIsAnalyzing(!isAnalyzing);
    // Por ahora no hace nada más, como se solicitó
    console.log('Botón de análisis con IA clickeado');
  };

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
      value: ventilationMode === 'pressure' 
        ? (ventilatorData.presionMax || 20).toFixed(1)
        : (filteredData.pressure.max > 0 ? filteredData.pressure.max.toFixed(1) : getMax(displayData.pressure)), 
      unit: 'cmH₂O',
      rawValue: ventilationMode === 'pressure' 
        ? (ventilatorData.presionMax || 20)
        : (filteredData.pressure.max || parseFloat(getMax(displayData.pressure)) || 0),
      isConfigured: ventilationMode === 'pressure'
    },
    presionMedia: { 
      label: 'Presión Media', 
      // Siempre mostrar valor medido
      value: filteredData.pressure.avg > 0 ? filteredData.pressure.avg.toFixed(1) : getAvg(displayData.pressure), 
      unit: 'cmH₂O',
      rawValue: filteredData.pressure.avg || parseFloat(getAvg(displayData.pressure)) || 0,
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
      value: ventilatorData.qMax ? ventilatorData.qMax.toFixed(1) : (filteredData.flow.max > 0 ? filteredData.flow.max.toFixed(1) : getMax(displayData.flow)), 
      unit: 'L/min',
      rawValue: ventilatorData.qMax || filteredData.flow.max || parseFloat(getMax(displayData.flow)) || 0,
      isConfigured: !!ventilatorData.qMax
    },
    flujo: { 
      label: 'Flujo', 
      // Siempre mostrar valor medido en tiempo real
      value: filteredData.flow.filtered > 0 ? filteredData.flow.filtered.toFixed(1) : getLast(displayData.flow), 
      unit: 'L/min',
      rawValue: filteredData.flow.filtered || parseFloat(getLast(displayData.flow)) || 0,
      isConfigured: false
    },
    flujoMin: { 
      label: 'Flujo Min', 
      // Siempre mostrar valor medido
      value: filteredData.flow.min > 0 ? filteredData.flow.min.toFixed(1) : getMin(displayData.flow), 
      unit: 'L/min',
      rawValue: filteredData.flow.min || parseFloat(getMin(displayData.flow)) || 0,
      isConfigured: false
    },
    volMax: { 
      label: 'Vol Max', 
      // Siempre mostrar valor medido
      value: filteredData.volume.max > 0 ? filteredData.volume.max.toFixed(1) : getMax(displayData.volume), 
      unit: 'mL',
      rawValue: filteredData.volume.max || parseFloat(getMax(displayData.volume)) || 0,
      isConfigured: false
    },
    volumen: { 
      label: 'Volumen', 
      // En modo volumen: mostrar valor configurado, en modo presión: mostrar valor medido/calculado
      value: ventilationMode === 'volume' 
        ? (ventilatorData.volumen || 500).toFixed(0)
        : (filteredData.volume.filtered > 0 ? filteredData.volume.filtered.toFixed(1) : getLast(displayData.volume)), 
      unit: 'mL',
      rawValue: ventilationMode === 'volume' 
        ? (ventilatorData.volumen || 500)
        : (filteredData.volume.filtered || parseFloat(getLast(displayData.volume)) || 0),
      isConfigured: ventilationMode === 'volume'
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
      value: complianceData.compliance.toFixed(5),
      unit: 'L/cmH₂O',
      rawValue: complianceData.compliance,
      status: complianceData.calculationStatus,
      errors: errorDetection.errors,
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
  const cardData = cardConfig
    .filter(card => {
      // En modo ajuste, mostrar todas las tarjetas
      if (isAdjustMode) return true;
      
      // En modo normal, mostrar solo las visibles
      if (!card.visible) return false;
      
      // Para compliance, solo mostrar en modo presión control
      if (card.id === 'compliance' && ventilationMode !== 'pressure') return false;
      
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

  // Función para renderizar el contenido según la pestaña activa
  const renderContent = () => {
    switch (activeTab) {
      case 0: // Simular Paciente
  return (
          <Suspense fallback={<Box display="flex" justifyContent="center" alignItems="center" height="50vh">
            <Typography variant="h6">Cargando Simulador de Paciente...</Typography>
          </Box>}>
            <PatientSimulator />
          </Suspense>
        );
      case 1: // Monitoreo (contenido actual)
        return (
      <Box display="flex" flexDirection="row" alignItems="flex-start" mb={2} ml={2}>
        {/* Imágenes*/}
        <Box display="flex" flexDirection="column" alignItems="left">
          <img src="/images/logo-univalle.svg" alt="Univalle" width={250} height={42} style={{ marginBottom: 0 }} />
          <img src="/images/logo.png" alt="VentyLab" width={220} height={110} />
          
          {/* Botón de modo de ajuste */}
          <Box mt={1} mb={1} display="flex" gap={1} flexDirection="column">
            {/* Botones Enviar y Detener */}
            <Box display="flex" gap={1}>
              <Tooltip 
                title="Enviar configuración actual al ventilador" 
                placement="bottom"
                arrow
              >
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleSendConfiguration}
                  disabled={!serialConnection.isConnected}
                  startIcon={configSent ? <CheckCircleIcon /> : <SendIcon />}
                  sx={{
                    backgroundColor: configSent ? 'success.main' : 'success.main',
                    color: '#fff',
                    minWidth: '80px',
                    height: '32px',
                    fontSize: '12px',
                    fontWeight: 600,
                    '&:hover': {
                      backgroundColor: configSent ? 'success.dark' : 'success.dark',
                    }
                  }}
                >
                  {configSent ? 'Enviado' : 'Enviar'}
                </Button>
              </Tooltip>
              <Button
                variant="contained"
                size="small"
                sx={{
                  backgroundColor: 'error.main',
                  color: '#fff',
                  minWidth: '80px',
                  height: '32px',
                  fontSize: '12px',
                  fontWeight: 600,
                  '&:hover': {
                    backgroundColor: 'error.dark',
                  }
                }}
              >
                Detener
              </Button>
            </Box>
            
            <Box display="flex" gap={1}>
              <Tooltip 
                title={isAdjustMode ? "Salir del modo de ajuste" : "Entrar al modo de ajuste para reorganizar tarjetas"} 
                placement="bottom"
                arrow
              >
                <AdjustButton
                  active={isAdjustMode}
                  onClick={toggleAdjustMode}
                  startIcon={<SettingsIcon />}
                  size="small"
                >
                  {isAdjustMode ? 'Salir Ajuste' : 'Ajustar Tarjetas'}
                </AdjustButton>
              </Tooltip>
              
              {/* Botón de restablecer - solo visible en modo de ajuste */}
              {isAdjustMode && (
                <Tooltip title="Restablecer configuración original de tarjetas" placement="bottom" arrow>
                  <Button
                    variant="outlined"
                    onClick={resetCardConfiguration}
                    size="small"
                    sx={{
                      color: 'warning.main',
                      borderColor: 'warning.main',
                      '&:hover': {
                        backgroundColor: 'warning.main',
                        color: '#fff',
                      }
                    }}
                  >
                    Restablecer
                  </Button>
                </Tooltip>
                )}
            </Box>
            
            {/* Control de compliance automática - solo visible en modo presión */}
            {ventilationMode === 'pressure' && (
              <Box display="flex" flexDirection="column" gap={1}>
                {/* Integrado en Sistema de Compliance Automático */}
              </Box>
            )}
          </Box>
          
          {/* Valores de los parámetros - tiempo real*/}
          <Box mt={1} display="flex" flexDirection="column" gap={0}>
            {cardData.map((card, idx) => (
              <EditableCard
                key={card.id}
                elevation={3}
                isEditing={isAdjustMode}
                isVisible={card.config.visible}
                isDragging={draggedCard === card.id}
                isExpanded={card.id === 'compliance' && complianceCardExpanded}
                draggable={isAdjustMode}
                onDragStart={(e) => handleDragStart(e, card.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, card.id)}
                onDragEnd={handleDragEnd}
              >
                {/* Controles de edición */}
                {isAdjustMode && (
                  <EditControls>
                    <Tooltip title={card.config.visible ? "Ocultar tarjeta" : "Mostrar tarjeta"} arrow>
                      <IconButton
                        size="small"
                        onClick={() => toggleCardVisibility(card.id)}
                        sx={{ 
                          color: card.config.visible ? 'primary.main' : 'text.secondary',
                          backgroundColor: 'rgba(0, 0, 0, 0.3)',
                          '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.5)' }
                        }}
                      >
                        {card.config.visible ? <VisibilityIcon fontSize="small" /> : <VisibilityOffIcon fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Arrastrar para reorganizar" arrow>
                      <IconButton
                        size="small"
                        sx={{ 
                          color: 'text.secondary',
                          backgroundColor: 'rgba(0, 0, 0, 0.3)',
                          cursor: 'grab',
                          '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.5)' }
                        }}
                      >
                        <DragIndicatorIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <AIAnalysisButton isAnalyzing={isAnalyzing}>
                      <PsychologyIcon fontSize="small" />
                    </AIAnalysisButton>
                  </EditControls>
                )}
                
                {/* Contenido de la tarjeta */}
                <Box display="flex" flexDirection="row" alignItems="flex-end" justifyContent="center" width="100%" mt={1}>
                  <Typography 
                    variant="h4" 
                    sx={{ 
                      fontWeight: 800, 
                      lineHeight: 1,
                      color: card.config.visible ? 'inherit' : 'text.secondary',
                      // Color dinámico basado en el valor y si es configurado o medido
                      ...(card.rawValue > 0 && {
                        color: card.isConfigured 
                          ? '#4caf50' // Verde para valores configurados
                          : getValueColor(card.id, card.rawValue) // Colores dinámicos para valores medidos
                      })
                    }}
                  >
                    {card.value}
                  </Typography>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      fontWeight: 300, 
                      mr: 1,
                      color: card.config.visible ? 'inherit' : 'text.secondary'
                    }}
                  >
                    {card.unit}
                  </Typography>
                </Box>
                <Box display="flex" flexDirection="column" alignItems="center" width="100%">
                  <Typography 
                    variant="subtitle1" 
                    sx={{ 
                      fontWeight: 600, 
                      mt: 0.5,
                      color: card.config.visible ? 'inherit' : 'text.secondary'
                    }}
                  >
                    {card.label}
                  </Typography>
                  {/* Indicador de tipo de valor */}
                  {card.config.visible && (
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        fontSize: '8px',
                        color: card.isConfigured ? '#4caf50' : '#ff9800',
                        backgroundColor: card.isConfigured ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 152, 0, 0.1)',
                        px: 0.5,
                        py: 0.2,
                        borderRadius: 0.5,
                        mt: 0.3,
                        fontWeight: 500
                      }}
                    >
                      {card.isConfigured ? 'CONFIGURADO' : 'MEDIDO'}
                    </Typography>
                  )}
                </Box>

                {/* Botón de reset para volumen integrado */}
                {card.id === 'volumenIntegrado' && card.config.visible && (
                  <Box display="flex" justifyContent="center" mt={0.5}>
                    <Tooltip title="Resetear volumen integrado a 0" arrow>
                      <IconButton
                        size="small"
                        onClick={card.onReset}
                        sx={{ 
                          color: 'warning.main',
                          backgroundColor: 'rgba(255, 152, 0, 0.1)',
                          '&:hover': { 
                            backgroundColor: 'rgba(255, 152, 0, 0.2)',
                            transform: 'scale(1.1)'
                          },
                          width: 24,
                          height: 24
                        }}
                      >
                        <Typography variant="caption" sx={{ fontSize: '10px', fontWeight: 'bold' }}>
                          ↺
                        </Typography>
                      </IconButton>
                    </Tooltip>
                  </Box>
                )}

                {/* Información adicional para la tarjeta de compliance */}
                {card.id === 'compliance' && card.config.visible && ventilationMode === 'pressure' && (
                  <Box mt={1} sx={{ width: '100%' }}>
                    {/* Información básica siempre visible */}
                    <Box display="flex" alignItems="center" justifyContent="center" mb={0.5}>
                      <Box
                        sx={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          backgroundColor: card.status?.isCalculating 
                            ? 'orange' 
                            : card.status?.lastAdjustment 
                            ? 'success.main' 
                            : 'text.secondary',
                          animation: card.status?.isCalculating ? 'pulse 1s infinite' : 'none',
                          mr: 0.5
                        }}
                      />
                      <Typography variant="caption" sx={{ fontSize: '9px', color: 'text.secondary' }}>
                        {card.status?.isCalculating 
                          ? `Calculando (${card.status.currentCycle}/5)`
                          : card.status?.lastAdjustment
                          ? 'Actualizada'
                          : 'Lista'
                        }
                      </Typography>
                    </Box>

                    {/* Información expandida */}
                    <Collapse in={complianceCardExpanded}>
                      <Box sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 1 }}>
                        {/* Estado de cálculo */}
                        {card.status && card.status.isCalculating && (
                          <Box sx={{ bgcolor: 'rgba(255, 152, 0, 0.1)', p: 0.5, borderRadius: 0.5, mb: 0.5 }}>
                            <Typography variant="caption" color="warning.main" display="block" sx={{ fontSize: '9px' }}>
                              <strong>Estado:</strong> Calculando compliance automática
                            </Typography>
                            <Typography variant="caption" color="warning.main" display="block" sx={{ fontSize: '9px' }}>
                              <strong>Progreso:</strong> Ciclo {card.status.currentCycle} de {card.status.totalCycles}
                            </Typography>
                          </Box>
                        )}

                        {/* Último ajuste */}
                        {card.status && card.status.lastAdjustment && (
                          <Box sx={{ bgcolor: 'rgba(76, 175, 80, 0.1)', p: 0.5, borderRadius: 0.5, mb: 0.5 }}>
                            <Typography variant="caption" color="success.main" display="block" sx={{ fontSize: '9px' }}>
                              <strong>Último ajuste:</strong> {card.status.lastAdjustment.timestamp.toLocaleTimeString()}
                            </Typography>
                            {card.status.lastAdjustment.error && (
                              <Typography variant="caption" color="success.main" display="block" sx={{ fontSize: '9px' }}>
                                <strong>Error detectado:</strong> {card.status.lastAdjustment.error.toFixed(1)}%
                              </Typography>
                            )}
                            <Typography variant="caption" color="success.main" display="block" sx={{ fontSize: '9px' }}>
                              <strong>Nueva C:</strong> {card.status.lastAdjustment.newCompliance?.toFixed(5)} L/cmH₂O
                            </Typography>
                          </Box>
                        )}

                        {/* Errores actuales */}
                        {card.errors && card.errors.length > 0 && (
                          <Box sx={{ bgcolor: 'rgba(244, 67, 54, 0.1)', p: 0.5, borderRadius: 0.5, mb: 0.5 }}>
                            <Typography variant="caption" color="error.main" display="block" sx={{ fontSize: '9px', fontWeight: 'bold' }}>
                              Errores detectados ({card.errors.length}):
                            </Typography>
                            {card.errors.slice(0, 3).map((error, index) => (
                              <Typography 
                                key={index} 
                                variant="caption" 
                                color={error.severity === 'high' ? 'error.main' : 'warning.main'}
                                display="block"
                                sx={{ fontSize: '8px', ml: 1 }}
                              >
                                • {error.type.replace('_', ' ')}: {error.errorPercentage?.toFixed(1)}%
                              </Typography>
                            ))}
                            {card.errors.length > 3 && (
                              <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '8px', ml: 1 }}>
                                ... y {card.errors.length - 3} más
                              </Typography>
                            )}
                          </Box>
                        )}

                        {/* Información técnica */}
                        <Box sx={{ bgcolor: 'rgba(255, 255, 255, 0.05)', p: 0.5, borderRadius: 0.5 }}>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '9px' }}>
                            <strong>Rango normal:</strong> 0.015 - 0.15 L/cmH₂O
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '9px' }}>
                            <strong>Precisión:</strong> ±5% (umbral de recálculo)
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '9px' }}>
                            <strong>Método:</strong> Promedio de 3 ciclos (filtrado)
                          </Typography>
                        </Box>
                      </Box>
                    </Collapse>

                    {/* Flecha para expandir/colapsar */}
                    <Box display="flex" justifyContent="center" mt={0.5}>
                      <IconButton
                        size="small"
                        onClick={() => setComplianceCardExpanded(!complianceCardExpanded)}
                        sx={{ 
                          color: 'text.secondary', 
                          p: 0.5,
                          '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
                        }}
                      >
                        {complianceCardExpanded ? (
                          <KeyboardArrowDownIcon sx={{ fontSize: 16, transform: 'rotate(180deg)' }} />
                        ) : (
                          <KeyboardArrowDownIcon sx={{ fontSize: 16 }} />
                        )}
                      </IconButton>
                    </Box>
                  </Box>
                )}
                
                {/* Indicador de estado en tiempo real */}
                {card.config.visible && card.rawValue > 0 && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 8,
                      left: 8,
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: getValueColor(card.id, card.rawValue),
                      animation: 'pulse 2s infinite',
                      '@keyframes pulse': {
                        '0%': { opacity: 1 },
                        '50%': { opacity: 0.5 },
                        '100%': { opacity: 1 }
                      }
                    }}
                  />
                )}

                {/* Indicador de tendencia */}
                {card.config.visible && card.rawValue > 0 && card.id !== 'compliance' && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      width: 0,
                      height: 0,
                      borderLeft: '4px solid transparent',
                      borderRight: '4px solid transparent',
                      ...(getTrend(card.id, card.rawValue) === 'increasing' && {
                        borderBottom: '8px solid #4caf50'
                      }),
                      ...(getTrend(card.id, card.rawValue) === 'decreasing' && {
                        borderTop: '8px solid #f44336'
                      }),
                      ...(getTrend(card.id, card.rawValue) === 'stable' && {
                        width: 8,
                        height: 2,
                        backgroundColor: '#ff9800',
                        borderRadius: 1
                      })
                    }}
                  />
                )}
              </EditableCard>
            ))}
          </Box>
        </Box>
        
        {/* Inputs Presión control y Volumen control */}
        <Box 
          display="flex" 
          flexDirection="row" 
          alignItems="flex-start" 
          ml={4} 
          mt={2} 
          gap={3}
        >
          {/* Input FIO2 */}
          <Box display="flex" flexDirection="column" alignItems="center" ml={ventilationMode === 'pressure' ? 0 : 0}>
            <Typography variant="subtitle2" sx={{ fontSize: '24px', fontWeight: 200 }}>% FIO2</Typography>
            <ValidatedInput
              parameter="fio2"
              value={ventilatorData.fio2}
              onChange={handleParameterChange}
              label="FIO2"
              unit="%"
              validation={parameterValidation.validateSingleParameter('fio2', ventilatorData.fio2, ventilatorData, ventilationMode)}
              ranges={parameterValidation.getParameterRanges('fio2')}
              sx={{ width: '180px', height: '100px' }}
              inputProps={{ min: 21, max: 100 }}
            />
          </Box>

          {/* Inputs específicos del modo Volumen Control */}
          {ventilationMode === 'volume' && (
            <>
              <Box display="flex" flexDirection="column" alignItems="center">
                <Typography variant="subtitle2" sx={{ fontSize: '24px', fontWeight: 300 }}>Volumen</Typography>
                <ValidatedInput
                  parameter="volumen"
                  value={ventilatorData.volumen}
                  onChange={handleParameterChange}
                  label="Volumen"
                  unit="ml"
                  validation={parameterValidation.validateSingleParameter('volumen', ventilatorData.volumen, ventilatorData, ventilationMode)}
                  ranges={parameterValidation.getParameterRanges('volumen')}
                  sx={{ width: '180px', height: '80px' }}
                  inputProps={{ min: 50, max: 2000 }}
                />
              </Box>
              {/* Q Max solo en modo volumen */}
              <Box display="flex" flexDirection="column" alignItems="center">
                <Typography variant="subtitle2" sx={{ fontSize: '24px', fontWeight: 300 }}>Q Max</Typography>
                <TextField
                  type="number"
                  variant="outlined"
                  size="small"
                  inputProps={{ min: 0, step: 0.1 }}
                  sx={{ 
                    width: '180px', 
                    height: '80px',
                    '& .MuiInputBase-input': {
                      backgroundColor: ventilatorData.qMax ? 'rgba(76, 175, 80, 0.08)' : 'inherit'
                    }
                  }}
                  value={ventilatorData.qMax || ''}
                  onChange={e => handleParameterChange('qMax', Number(e.target.value))}
                  helperText={ventilatorData.qMax ? `Calculado: ${ventilatorData.qMax.toFixed(1)} L/min` : 'Auto-calculado'}
                  InputProps={{
                    readOnly: true // Solo lectura porque es calculado automáticamente
                  }}
                />
              </Box>
            </>
          )}

          {/* Inputs específicos del modo Presión Control */}
          {ventilationMode === 'pressure' && (
            <>
              <Box display="flex" flexDirection="column" alignItems="center" ml={2}>
                {/* PIP (Presión Inspiratoria Pico) */}
                <Typography variant="subtitle2" sx={{ fontSize: '24px', fontWeight: 300 }}>PIP [cmH2O]</Typography>
                <ValidatedInput
                  parameter="presionMax"
                  value={ventilatorData.presionMax || 20}
                  onChange={handleParameterChange}
                  label="PIP"
                  unit="cmH2O"
                  validation={parameterValidation.validateSingleParameter('presionMax', ventilatorData.presionMax || 20, ventilatorData, ventilationMode)}
                  ranges={parameterValidation.getParameterRanges('presionMax')}
                  sx={{ width: '180px', height: '80px' }}
                  inputProps={{ min: 5, max: 60 }}
                />
              </Box>
            </>
          )}

          {/* PEEP común para ambos modos */}
          <Box display="flex" flexDirection="column" alignItems="center" ml={ventilationMode === 'pressure' ? 2 : 0}>
            <Typography variant="subtitle2" sx={{ fontSize: '24px', fontWeight: 300 }}>PEEP</Typography>
            <ValidatedInput
              parameter="peep"
              value={ventilatorData.peep}
              onChange={handleParameterChange}
              label="PEEP"
              unit="cmH2O"
              validation={parameterValidation.validateSingleParameter('peep', ventilatorData.peep, ventilatorData, ventilationMode)}
              ranges={parameterValidation.getParameterRanges('peep')}
              sx={{ width: '180px', height: '80px' }}
              inputProps={{ min: 0, max: 20 }}
            />
          </Box>

          {/* Toggle de modo al lado derecho */}
          <Box display="flex" flexDirection="column" alignItems="center" mt={4}>
            <ModeToggle>
              <Tooltip 
                title="Modo Volumen Control: El ventilador entrega un volumen tidal fijo" 
                placement="bottom"
                arrow
              >
                <CircularModeButton
                  active={ventilationMode === 'volume'}
                  onClick={() => handleModeChange('volume')}
                >
                  <Box display="flex" flexDirection="column" alignItems="center" >
                    <Typography variant="caption" sx={{ fontSize: '14px', fontWeight: 'bold', lineHeight: 1 }}>
                      VOL
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: '8px', lineHeight: 1 }}>
                      CTRL
                    </Typography>
                  </Box>
                </CircularModeButton>
              </Tooltip>
              <Tooltip 
                title="Modo Presión Control: El ventilador mantiene una presión inspiratoria constante" 
                placement="bottom"
                arrow
              >
                <CircularModeButton
                  active={ventilationMode === 'pressure'}
                  onClick={() => handleModeChange('pressure')}
                >
                  <Box display="flex" flexDirection="column" alignItems="center">
                    <Typography variant="caption" sx={{ fontSize: '14px', fontWeight: 'bold', lineHeight: 1 }}>
                      PRES
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: '8px', lineHeight: 1 }}>
                      CTRL
                    </Typography>
                  </Box>
                </CircularModeButton>
              </Tooltip>
              <Tooltip 
                title="Analizar datos con Inteligencia Artificial" 
                placement="bottom"
                arrow
              >
                <AIAnalysisButton
                  isAnalyzing={isAnalyzing}
                  onClick={handleAIAnalysis}
                >
                  <Box display="flex" flexDirection="column" alignItems="center" >
                    <PsychologyIcon sx={{ fontSize: '20px', mb: 0.5 }} />
                    <Typography variant="caption" sx={{ fontSize: '8px', lineHeight: 1 }}>
                      ANALIZAR
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: '8px', lineHeight: 1 }}>
                      CON IA
                    </Typography>
                  </Box>
                </AIAnalysisButton>
              </Tooltip>
            </ModeToggle>
          </Box>

          {/* Graficos */}
          <DashboardContainer>
            <Container maxWidth="xl" sx={{ mt: 1, marginLeft: ventilationMode === 'pressure' ? -62 : -83, marginTop: 15 }}>
              <Grid container spacing={3} justifyContent="center" alignItems="center">
                {/* Gráficas individuales */}
                <Grid item xs={12} display="flex" flexDirection="column" alignItems="center" justifyContent="center">
                  <Box display="flex" flexDirection="column" alignItems="center" gap={2} alignSelf="flex-start" sx={{ marginLeft: -40 }}>
                    <Paper elevation={0} sx={{ width: 700, height: 230, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', p: 1, backgroundColor: 'rgba(141, 138, 138, 0.2)' }}>
                      <Typography variant="h6" sx={{ mb: 1, color: '#fff' }}>Gráfica de Presión</Typography>
                      <RealTimeCharts type="pressure" data={displayData} isConnected={serialConnection.isConnected} />
                    </Paper>
                    <Paper elevation={0} sx={{ width: 700, height: 230, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', p: 1, backgroundColor: 'rgba(141, 138, 138, 0.2)' }}>
                      <Typography variant="h6" sx={{ mb: 1, color: '#fff' }}>Gráfica de Flujo</Typography>
                      <RealTimeCharts type="flow" data={displayData} isConnected={serialConnection.isConnected} />
                    </Paper>
                    <Paper elevation={0} sx={{ width: 700, height: 230, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', p: 1, backgroundColor: 'rgba(141, 138, 138, 0.2)' }}>
                      <Typography variant="h6" sx={{ mb: 1, color: '#fff' }}>Gráfica de Volumen</Typography>
                      <RealTimeCharts type="volume" data={displayData} isConnected={serialConnection.isConnected} />
                    </Paper>
                  </Box>
                </Grid>
              </Grid>
            </Container>
          </DashboardContainer>
          
          {/* Panel derecho: sliders e inputs */}
          <Box display="flex" flexDirection="column" alignItems="center" ml={ventilationMode === 'pressure' ? -3 : -14} mt={18}>
            {/* Slider Insp-Esp */}
            <Box display="flex" flexDirection="row" justifyContent="space-between" alignItems="center" width={300} mb={-1} sx={{ marginLeft: ventilationMode === 'pressure' ? -7 : -18 }}>
              <Typography variant="subtitle1" sx={{ fontSize: '24px', fontWeight: 200, textAlign: 'center' }}>Insp</Typography>
              <Typography variant="subtitle1" sx={{ fontSize: '24px', fontWeight: 200, textAlign: 'center' }}>Esp</Typography>
            </Box>
            <Slider
              value={ventilatorData.inspiracionEspiracion}
              min={0}
              max={1}
              step={0.01}
              sx={{ width: 300, mb: 3, marginLeft: ventilationMode === 'pressure' ? -9 : -18 }}
              onChange={(_, value) => handleParameterChange('inspiracionEspiracion', value)}
            />
            {/* 3 inputs verticales */}
            <Box display="flex" flexDirection="column" gap={2} mb={3} sx={{ width: 300, marginLeft: ventilationMode === 'pressure' ? -9 : -18 }}>
              {/* Relación I:E */}
              <Typography variant="subtitle1" sx={{ fontSize: '24px', fontWeight: 200, textAlign: 'center' }}>Relación I:E</Typography>
              <Box display="flex" flexDirection="row" justifyContent="center" gap={2}>
                <TextField
                  type="number"
                  variant="outlined"
                  size="small"
                  sx={{ 
                    width: 140,
                    '& .MuiInputBase-input': {
                      backgroundColor: 'rgba(76, 175, 80, 0.08)',
                      color: '#4caf50',
                      fontWeight: 'bold'
                    }
                  }}
                  value={ventilatorData.relacionIE1 || 1}
                  InputProps={{
                    readOnly: true
                  }}
                  helperText="Inspiración"
                />
                <TextField
                  type="number"
                  variant="outlined"
                  size="small"
                  sx={{ 
                    width: 140,
                    '& .MuiInputBase-input': {
                      backgroundColor: 'rgba(76, 175, 80, 0.08)',
                      color: '#4caf50',
                      fontWeight: 'bold'
                    }
                  }}
                  value={ventilatorData.relacionIE2 || 1}
                  InputProps={{
                    readOnly: true
                  }}
                  helperText="Espiración"
                />
              </Box>
              {/* Mostrar tiempos calculados */}
              <Box display="flex" justifyContent="center" mt={1}>
                <Typography variant="caption" sx={{ 
                  fontSize: '11px', 
                  color: '#4caf50',
                  backgroundColor: 'rgba(76, 175, 80, 0.1)',
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  textAlign: 'center'
                }}>
                  Ti: {ventilatorData.tiempoInspiratorio?.toFixed(2) || '0.00'}s | 
                  Te: {ventilatorData.tiempoEspiratorio?.toFixed(2) || '0.00'}s
                </Typography>
              </Box>
              {/* Pausa Inspiratoria */}
              <Typography variant="subtitle1" sx={{ fontSize: '24px', fontWeight: 200, textAlign: 'center' }}>Pausa Inspiratoria</Typography>
              <TextField
                type="number"
                variant="outlined"
                size="small"
                value={ventilatorData.pausaInspiratoria}
                onChange={e => handleParameterChange('pausaInspiratoria', Number(e.target.value))}
              />
              {/* Pausa Espiratoria */}
              <Typography variant="subtitle1" sx={{ fontSize: '24px', fontWeight: 200, textAlign: 'center' }}>Pausa Espiratoria</Typography>
              <TextField
                type="number"
                variant="outlined"
                size="small"
                value={ventilatorData.pausaEspiratoria}
                onChange={e => handleParameterChange('pausaEspiratoria', Number(e.target.value))}
              />
            </Box>
            {/* Frecuencia: título a la izquierda, input a la derecha, slider debajo */}
            <Box display="flex" flexDirection="row" alignItems="center" width={300} mb={1} sx={{ marginLeft: ventilationMode === 'pressure' ? -9 : -18 }}>
              <Typography variant="subtitle1" sx={{ fontSize: '24px', fontWeight: 200, flex: 1, textAlign: 'left' }}>Frecuencia</Typography>
              <ValidatedInput
                parameter="frecuencia"
                value={ventilatorData.frecuencia}
                onChange={handleParameterChange}
                label="Frecuencia"
                unit="resp/min"
                validation={parameterValidation.validateSingleParameter('frecuencia', ventilatorData.frecuencia, ventilatorData, ventilationMode)}
                ranges={parameterValidation.getParameterRanges('frecuencia')}
                sx={{ width: 80, ml: 2 }}
                inputProps={{ min: 5, max: 60 }}
              />
            </Box>
            <Slider
              value={ventilatorData.frecuencia}
              min={0}
              max={24}
              step={1}
              sx={{ width: 300, marginLeft: ventilationMode === 'pressure' ? -9 : -18 }}
              onChange={(_, value) => handleParameterChange('frecuencia', value)}
            />
            
            {/* Sistema de Compliance Automático */}
            <Box sx={{ width: 300, marginLeft: ventilationMode === 'pressure' ? -9 : -18, mt: 2 }}>
              <ComplianceStatus
                complianceData={complianceData}
                errorDetection={errorDetection}
                autoAdjustmentEnabled={autoAdjustmentEnabled}
                lastAutoAdjustment={lastAutoAdjustment}
                ventilationMode={ventilationMode}
              />
            </Box>

            {/* Alertas de validación completas */}
            <Box sx={{ width: 300, marginLeft: ventilationMode === 'pressure' ? -9 : -18, mt: 2 }}>
              <ValidationAlerts
                validationState={parameterValidation.validationState}
                onClose={() => setShowValidationAlerts(false)}
                show={showValidationAlerts}
                compact={false}
              />
              
              {/* Botón para mostrar/ocultar alertas detalladas */}
              <Box display="flex" justifyContent="center" mt={1}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setShowValidationAlerts(!showValidationAlerts)}
                  sx={{
                    color: 'text.secondary',
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    '&:hover': {
                      borderColor: 'primary.main',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    }
                  }}
                  startIcon={showValidationAlerts ? <VisibilityOffIcon /> : <VisibilityIcon />}
                >
                  {showValidationAlerts ? 'Ocultar Alertas' : 'Ver Alertas Detalladas'}
                </Button>
              </Box>
            </Box>


          </Box>
        </Box>
      </Box>
        );
      case 2: // Gráficas
        return (
          <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
            <Typography variant="h4" sx={{ color: '#de0b24' }}>
              Módulo de Gráficas Avanzadas - Próximamente
            </Typography>
          </Box>
        );
      case 3: // Conexión
        return (
          <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
            <Typography variant="h4" sx={{ color: '#de0b24' }}>
              Módulo de Conexión - Próximamente
            </Typography>
          </Box>
        );
      default:
        return (
          <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
            <Typography variant="h6">Pestaña no encontrada</Typography>
          </Box>
        );
    }
  };

  return (
    <ThemeProvider theme={ventilatorTheme}>
      <CssBaseline />
      
      {/* Alertas de validación compactas */}
      <ValidationAlerts
        validationState={parameterValidation.validationState}
        onClose={() => setShowCompactValidationAlerts(false)}
        show={showCompactValidationAlerts}
        compact={true}
      />
      
      {/* Indicador compacto de alertas sin mostrar */}
      {!showCompactValidationAlerts && (parameterValidation.validationState.criticalErrors.length > 0 || parameterValidation.validationState.warnings.length > 0) && (
        <Box
          sx={{
            position: 'fixed',
            top: 20,
            left: 20,
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
          onClick={() => setShowCompactValidationAlerts(true)}
        >
          <Box display="flex" alignItems="center" gap={0.5}>
            {parameterValidation.validationState.criticalErrors.length > 0 ? (
              <ErrorIcon fontSize="small" />
            ) : (
              <WarningIcon fontSize="small" />
            )}
            <Typography variant="caption" sx={{ fontSize: '11px', fontWeight: 'bold' }}>
              {parameterValidation.validationState.criticalErrors.length > 0 
                ? `${parameterValidation.validationState.criticalErrors.length} error${parameterValidation.validationState.criticalErrors.length > 1 ? 'es' : ''}`
                : `${parameterValidation.validationState.warnings.length} aviso${parameterValidation.validationState.warnings.length > 1 ? 's' : ''}`
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

        {/* Botón de descarga */}
        <Tooltip 
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
        </Tooltip>

        {/* Menú de descarga */}
        <Menu
          anchorEl={downloadMenuAnchor}
          open={Boolean(downloadMenuAnchor)}
          onClose={handleDownloadMenuClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          <MenuItem onClick={handleDownloadTxt}>
            <DownloadIcon sx={{ mr: 1 }} />
            Descargar como TXT
          </MenuItem>
          <MenuItem onClick={handleDownloadPdf}>
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
      {notification && (
        <Box
          sx={{
            position: 'fixed',
            top: 80,
            right: 20,
            zIndex: 1001,
            backgroundColor: notification.type === 'success' ? 'success.main' : 'error.main',
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
            {notification.message}
          </Typography>
        </Box>
      )}
      
      {renderContent()}
      
      {/* Barra de navegación fija en la parte inferior */}
      <BottomNavigation
        value={activeTab}
        onChange={(event, newValue) => setActiveTab(newValue)}
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          width: '100%',
          backgroundColor: 'rgba(31, 31, 31, 0.95)',
          backdropFilter: 'blur(10px)',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          zIndex: 1100,
          '& .MuiBottomNavigationAction-root': {
            color: 'rgba(255, 255, 255, 0.6)',
            '&.Mui-selected': {
              color: '#de0b24',
            },
            '&:hover': {
              color: 'rgba(255, 255, 255, 0.8)',
            },
            minWidth: 80,
            fontSize: '12px'
          }
        }}
      >
        <BottomNavigationAction
          label="Simular Paciente"
          value={0}
          icon={<PersonIcon />}
        />
        <BottomNavigationAction
          label="Monitoreo"
          value={1}
          icon={<MonitorHeartIcon />}
        />
        <BottomNavigationAction
          label="Gráficas"
          value={2}
          icon={<ShowChartIcon />}
        />
        <BottomNavigationAction
          label="Conexión"
          value={3}
          icon={<WifiIcon />}
        />
      </BottomNavigation>
    </ThemeProvider>
  );
};

export default VentilatorDashboard; 