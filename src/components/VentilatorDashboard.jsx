import React, { useState, useEffect, useCallback, useRef } from 'react';
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
} from '@mui/material';
import { styled } from '@mui/material/styles';
import SendIcon from '@mui/icons-material/Send';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SettingsIcon from '@mui/icons-material/Settings';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

// Componentes que vamos a crear
import ControlPanel from './ControlPanel';
import RealTimeCharts from './RealTimeCharts';
import ConnectionPanel from './ConnectionPanel';
import ParameterDisplay from './ParameterDisplay';
import ComplianceStatus from './ComplianceStatus';

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

// Botón de envío
const SendButton = styled(Button)(({ theme }) => ({
  position: 'fixed',
  bottom: 20,
  right: 20,
  zIndex: 1000,
  backgroundColor: theme.palette.primary.main,
  color: '#000',
  fontWeight: 600,
  padding: theme.spacing(1.5, 3),
  borderRadius: theme.spacing(2),
  boxShadow: '0 4px 12px rgba(218, 0, 22, 0.3)',
  '&:hover': {
    backgroundColor: theme.palette.primary.dark,
    boxShadow: '0 6px 16px rgba(218, 0, 22, 0.4)',
  },
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

import { useSerialConnection } from '../hooks/useSerialConnection';
import { useVentilatorData } from '../hooks/useVentilatorData';
import { SerialProtocol } from '../utils/serialCommunication';
import { useComplianceCalculation } from '../hooks/useComplianceCalculation';
import { useSignalProcessing } from '../hooks/useSignalProcessing';
import { useErrorDetection } from '../hooks/useErrorDetection';
import useMockData from '../hooks/useMockData';

const VentilatorDashboard = () => {
  const serialConnection = useSerialConnection();
  const { ventilatorData, realTimeData, setVentilatorData, calculations } = useVentilatorData(serialConnection);
  
  // Datos de prueba para cuando no hay conexión
  const mockData = useMockData(!serialConnection.isConnected);
  
  // Combinar datos reales con datos de prueba
  const displayData = serialConnection.isConnected ? realTimeData : mockData;
  
  // Estado para el modo de ventilación
  const [ventilationMode, setVentilationMode] = useState('volume'); // 'volume' o 'pressure'
  const [configSent, setConfigSent] = useState(false);

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
    { id: 'compliance', label: 'Compliance', visible: false, order: 8 }, // Solo visible en presión control
    { id: 'presionMeseta', label: 'Presión Meseta', visible: false, order: 9 },
    { id: 'presionPlaton', label: 'Presión Platón', visible: false, order: 10 },
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

  // Estado para controlar el reenvío automático
  const [autoAdjustmentEnabled, setAutoAdjustmentEnabled] = useState(true);
  const [lastAutoAdjustment, setLastAutoAdjustment] = useState(null);
  
  // Estado para controlar la expansión de la tarjeta de compliance
  const [complianceCardExpanded, setComplianceCardExpanded] = useState(false);

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
    const mode = ventilationMode === 'volume' ? 'Volumen control' : 'Presion control';
    const configFrame = SerialProtocol.createConfigFrame(mode, ventilatorData);
    await serialConnection.sendData(configFrame);
    setConfigSent(true);
    
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
      { id: 'compliance', label: 'Compliance', visible: ventilationMode === 'pressure', order: 8 }, // Solo visible en presión control
      { id: 'presionMeseta', label: 'Presión Meseta', visible: false, order: 9 },
      { id: 'presionPlaton', label: 'Presión Platón', visible: false, order: 10 },
    ]);
  };

  // Funciones para calcular valores en tiempo real usando datos filtrados
  const getMax = arr => arr.length ? Math.max(...arr).toFixed(1) : '--';
  const getMin = arr => arr.length ? Math.min(...arr).toFixed(1) : '--';
  const getAvg = arr => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : '--';
  const getLast = arr => arr.length ? arr[arr.length - 1].toFixed(1) : '--';

  // Mapeo de datos de tarjetas usando datos filtrados cuando estén disponibles
  const cardDataMap = {
    presionPico: { 
      label: 'Presión Pico', 
      value: filteredData.pressure.max > 0 ? filteredData.pressure.max.toFixed(1) : getMax(displayData.pressure), 
      unit: 'cmH₂O',
      rawValue: filteredData.pressure.max || 0
    },
    presionMedia: { 
      label: 'Presión Media', 
      value: filteredData.pressure.avg > 0 ? filteredData.pressure.avg.toFixed(1) : getAvg(displayData.pressure), 
      unit: 'cmH₂O',
      rawValue: filteredData.pressure.avg || 0
    },
    peep: { 
      label: 'PEEP', 
      value: filteredData.pressure.min > 0 ? filteredData.pressure.min.toFixed(1) : getMin(displayData.pressure), 
      unit: 'cmH₂O',
      rawValue: filteredData.pressure.min || 0
    },
    flujoMax: { 
      label: 'Flujo Max', 
      value: filteredData.flow.max > 0 ? filteredData.flow.max.toFixed(1) : getMax(displayData.flow), 
      unit: 'L/min',
      rawValue: filteredData.flow.max || 0
    },
    flujo: { 
      label: 'Flujo', 
      value: filteredData.flow.filtered > 0 ? filteredData.flow.filtered.toFixed(1) : getLast(displayData.flow), 
      unit: 'L/min',
      rawValue: filteredData.flow.filtered || 0
    },
    flujoMin: { 
      label: 'Flujo Min', 
      value: filteredData.flow.min > 0 ? filteredData.flow.min.toFixed(1) : getMin(displayData.flow), 
      unit: 'L/min',
      rawValue: filteredData.flow.min || 0
    },
    volMax: { 
      label: 'Vol Max', 
      value: filteredData.volume.max > 0 ? filteredData.volume.max.toFixed(1) : getMax(displayData.volume), 
      unit: 'mL',
      rawValue: filteredData.volume.max || 0
    },
    volumen: { 
      label: 'Volumen', 
      value: filteredData.volume.filtered > 0 ? filteredData.volume.filtered.toFixed(1) : getLast(displayData.volume), 
      unit: 'mL',
      rawValue: filteredData.volume.filtered || 0
    },
    compliance: {
      label: 'Compliance',
      value: complianceData.compliance.toFixed(5),
      unit: 'L/cmH₂O',
      rawValue: complianceData.compliance,
      status: complianceData.calculationStatus,
      errors: errorDetection.errors
    },
    presionMeseta: { 
      label: 'Presión Meseta', 
      value: '--', 
      unit: 'cmH₂O',
      rawValue: 0
    },
    presionPlaton: { 
      label: 'Presión Platón', 
      value: '--', 
      unit: 'cmH₂O',
      rawValue: 0
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
    // Definir rangos normales para cada parámetro
    const ranges = {
      presionPico: { normal: [10, 35], warning: [35, 50], danger: [50, Infinity] },
      presionMedia: { normal: [5, 20], warning: [20, 30], danger: [30, Infinity] },
      peep: { normal: [3, 12], warning: [12, 20], danger: [20, Infinity] },
      flujoMax: { normal: [20, 80], warning: [80, 120], danger: [120, Infinity] },
      flujo: { normal: [10, 60], warning: [60, 100], danger: [100, Infinity] },
      flujoMin: { normal: [-10, 10], warning: [-20, -10], danger: [-Infinity, -20] },
      volMax: { normal: [300, 800], warning: [800, 1200], danger: [1200, Infinity] },
      volumen: { normal: [200, 600], warning: [600, 1000], danger: [1000, Infinity] }
    };

    const range = ranges[id];
    if (!range) return 'text.secondary';

    if (value >= range.danger[0] && value <= range.danger[1]) return 'error.main';
    if (value >= range.warning[0] && value <= range.warning[1]) return 'warning.main';
    if (value >= range.normal[0] && value <= range.normal[1]) return 'success.main';
    
    return 'text.secondary';
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
      volumen: { normal: [200, 600], warning: [600, 1000], danger: [1000, Infinity] }
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
      
      <Box display="flex" flexDirection="row" alignItems="flex-start" mb={2} ml={2}>
        {/* Imágenes*/}
        <Box display="flex" flexDirection="column" alignItems="left">
          <img src="/images/logo-univalle.svg" alt="Univalle" width={250} height={42} style={{ marginBottom: 0 }} />
          <img src="/images/logo.png" alt="VentyLab" width={220} height={110} />
          
          {/* Botón de modo de ajuste */}
          <Box mt={1} mb={1} display="flex" gap={1} flexDirection="column">
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
                <FormControlLabel
                  control={
                    <Switch
                      checked={autoAdjustmentEnabled}
                      onChange={(e) => setAutoAdjustmentEnabled(e.target.checked)}
                      size="small"
                      color="primary"
                    />
                  }
                  label={
                    <Typography variant="caption" sx={{ fontSize: '11px' }}>
                      Ajustes Automáticos
                    </Typography>
                  }
                />
                
                {/* Indicador de estado de compliance */}
                <Box display="flex" alignItems="center" gap={1} sx={{ bgcolor: 'rgba(0,0,0,0.3)', p: 0.5, borderRadius: 1 }}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: complianceData.calculationStatus.isCalculating 
                        ? 'orange' 
                        : complianceData.calculationStatus.lastAdjustment 
                        ? 'success.main' 
                        : 'text.secondary',
                      animation: complianceData.calculationStatus.isCalculating ? 'pulse 1s infinite' : 'none'
                    }}
                  />
                  <Typography variant="caption" sx={{ fontSize: '10px', color: 'text.secondary' }}>
                    {complianceData.calculationStatus.isCalculating 
                      ? `Calculando C (${complianceData.calculationStatus.currentCycle}/5)`
                      : complianceData.calculationStatus.lastAdjustment
                      ? `C actualizada: ${complianceData.compliance.toFixed(5)}`
                      : 'Compliance automática lista'
                    }
                  </Typography>
                </Box>
                
                {/* Indicador de último ajuste */}
                {lastAutoAdjustment && (
                  <Box sx={{ bgcolor: 'rgba(0,0,0,0.3)', p: 0.5, borderRadius: 1 }}>
                    <Typography variant="caption" sx={{ fontSize: '9px', color: 'success.main' }}>
                      Último ajuste: {lastAutoAdjustment.timestamp.toLocaleTimeString()}
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: '9px', color: 'text.secondary', display: 'block' }}>
                      Error: {lastAutoAdjustment.error?.toFixed(1)}%
                    </Typography>
                  </Box>
                )}
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
                      // Color dinámico basado en el valor
                      ...(card.rawValue > 0 && {
                        color: getValueColor(card.id, card.rawValue)
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
            <TextField
              type="number"
              variant="outlined"
              size="small"
              inputProps={{ min: 0, max: 100 }}
              sx={{ width: '180px', height: '100px' }}
              value={ventilatorData.fio2}
              onChange={e => handleParameterChange('fio2', Number(e.target.value))}
            />
          </Box>

          {/* Inputs específicos del modo Volumen Control */}
          {ventilationMode === 'volume' && (
            <>
              <Box display="flex" flexDirection="column" alignItems="center">
                <Typography variant="subtitle2" sx={{ fontSize: '24px', fontWeight: 300 }}>Volumen</Typography>
                <TextField
                  type="number"
                  variant="outlined"
                  size="small"
                  inputProps={{ min: 0 }}
                  sx={{ width: '180px', height: '80px' }}
                  value={ventilatorData.volumen}
                  onChange={e => handleParameterChange('volumen', Number(e.target.value))}
                />
              </Box>
              {/* Q Max solo en modo volumen */}
              <Box display="flex" flexDirection="column" alignItems="center">
                <Typography variant="subtitle2" sx={{ fontSize: '24px', fontWeight: 300 }}>Q Max</Typography>
                <TextField
                  type="number"
                  variant="outlined"
                  size="small"
                  inputProps={{ min: 0 }}
                  sx={{ width: '180px', height: '80px' }}
                  value={ventilatorData.qMax}
                  onChange={e => handleParameterChange('qMax', Number(e.target.value))}
                />
              </Box>
            </>
          )}

          {/* Inputs específicos del modo Presión Control */}
          {ventilationMode === 'pressure' && (
            <>
              <Box display="flex" flexDirection="column" alignItems="center" ml={12.7}>
                {/* PIP (Presión Inspiratoria Pico) */}
                <Typography variant="subtitle2" sx={{ fontSize: '24px', fontWeight: 300 }}>PIP [cmH2O]</Typography>
                <TextField
                  type="number"
                  variant="outlined"
                  size="small"
                  inputProps={{ min: 0 }}
                  sx={{ width: '180px', height: '80px' }}
                  value={ventilatorData.presionMax || 20}
                  onChange={e => handleParameterChange('presionMax', Number(e.target.value))}
                />
              </Box>
            </>
          )}

          {/* PEEP común para ambos modos */}
          <Box display="flex" flexDirection="column" alignItems="center" ml={ventilationMode === 'pressure' ? 12.8 : 0}>
            <Typography variant="subtitle2" sx={{ fontSize: '24px', fontWeight: 300 }}>PEEP</Typography>
            <TextField
              type="number"
              variant="outlined"
              size="small"
              inputProps={{ min: 0 }}
              sx={{ width: '180px', height: '80px' }}
              value={ventilatorData.peep}
              onChange={e => handleParameterChange('peep', Number(e.target.value))}
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
            </ModeToggle>
          </Box>

          {/* Graficos */}
          <DashboardContainer>
            <Container maxWidth="xl" sx={{ mt: 1, marginLeft: -95, marginTop: 15 }}>
              <Grid container spacing={3} justifyContent="center" alignItems="center">
                {/* Gráficas individuales */}
                <Grid item xs={12} display="flex" flexDirection="column" alignItems="center" justifyContent="center">
                  <Box display="flex" flexDirection="column" alignItems="center" gap={2} alignSelf="flex-start" sx={{ marginLeft: -28 }}>
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
          <Box display="flex" flexDirection="column" alignItems="center" ml={-14} mt={18}>
            {/* Slider Insp-Esp */}
            <Box display="flex" flexDirection="row" justifyContent="space-between" alignItems="center" width={300} mb={-1} sx={{ marginLeft: -18 }}>
              <Typography variant="subtitle1" sx={{ fontSize: '24px', fontWeight: 200, textAlign: 'center' }}>Insp</Typography>
              <Typography variant="subtitle1" sx={{ fontSize: '24px', fontWeight: 200, textAlign: 'center' }}>Esp</Typography>
            </Box>
            <Slider
              value={ventilatorData.inspiracionEspiracion}
              min={0}
              max={1}
              step={0.01}
              sx={{ width: 300, mb: 3, marginLeft: -18 }}
              onChange={(_, value) => handleParameterChange('inspiracionEspiracion', value)}
            />
            {/* 3 inputs verticales */}
            <Box display="flex" flexDirection="column" gap={2} mb={3} sx={{ width: 300, marginLeft: -18 }}>
              {/* Relación I:E */}
              <Typography variant="subtitle1" sx={{ fontSize: '24px', fontWeight: 200, textAlign: 'center' }}>Relación I:E</Typography>
              <Box display="flex" flexDirection="row" justifyContent="center" gap={2}>
                <TextField
                  type="number"
                  variant="outlined"
                  size="small"
                  sx={{ width: 140 }}
                  value={ventilatorData.relacionIE1}
                  onChange={e => handleParameterChange('relacionIE1', Number(e.target.value))}
                />
                <TextField
                  type="number"
                  variant="outlined"
                  size="small"
                  sx={{ width: 140 }}
                  value={ventilatorData.relacionIE2}
                  onChange={e => handleParameterChange('relacionIE2', Number(e.target.value))}
                />
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
            <Box display="flex" flexDirection="row" alignItems="center" width={300} mb={1} sx={{ marginLeft: -18 }}>
              <Typography variant="subtitle1" sx={{ fontSize: '24px', fontWeight: 200, flex: 1, textAlign: 'left' }}>Frecuencia</Typography>
              <TextField
                type="number"
                variant="outlined"
                size="small"
                inputProps={{ min: 0, max: 24 }}
                sx={{ width: 80, ml: 2 }}
                value={ventilatorData.frecuencia}
                onChange={e => handleParameterChange('frecuencia', Number(e.target.value))}
              />
            </Box>
            <Slider
              value={ventilatorData.frecuencia}
              min={0}
              max={24}
              step={1}
              sx={{ width: 300, marginLeft: -18 }}
              onChange={(_, value) => handleParameterChange('frecuencia', value)}
            />
            
            {/* Sistema de Compliance Automático */}
            <Box sx={{ width: 300, marginLeft: -18, mt: 2 }}>
              <ComplianceStatus
                complianceData={complianceData}
                errorDetection={errorDetection}
                autoAdjustmentEnabled={autoAdjustmentEnabled}
                lastAutoAdjustment={lastAutoAdjustment}
                ventilationMode={ventilationMode}
              />
            </Box>
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default VentilatorDashboard; 