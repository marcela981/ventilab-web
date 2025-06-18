import React, { useState, useEffect } from 'react';
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

// Tema personalizado para el ventilador
const ventilatorTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00c5da',
    },
    secondary: {
      main: '#da0037',
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

// Toggle Switch personalizado - Sin caja de fondo
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
  border: active ? '2px solid #00c5da' : '2px solid rgba(255, 255, 255, 0.2)',
  fontSize: '6px',
  textAlign: 'center',
  lineHeight: 1.1,
  position: 'relative',
  overflow: 'hidden',
  '&:hover': {
    backgroundColor: active ? theme.palette.primary.dark : 'rgba(255, 255, 255, 0.2)',
    transform: 'scale(1.1)',
    boxShadow: active 
      ? '0 4px 12px rgba(0, 197, 218, 0.5)' 
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
    background: 'radial-gradient(circle, rgba(0, 197, 218, 0.3) 0%, transparent 70%)',
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

// Botón de envío personalizado
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
  boxShadow: '0 4px 12px rgba(0, 197, 218, 0.3)',
  '&:hover': {
    backgroundColor: theme.palette.primary.dark,
    boxShadow: '0 6px 16px rgba(0, 197, 218, 0.4)',
  },
}));

// Botón de ajuste personalizado
const AdjustButton = styled(Button)(({ theme, active }) => ({
  backgroundColor: active ? theme.palette.secondary.main : 'rgba(255, 255, 255, 0.1)',
  color: active ? '#fff' : theme.palette.text.primary,
  fontWeight: 600,
  padding: theme.spacing(1, 2),
  borderRadius: theme.spacing(1),
  border: active ? '2px solid #da0037' : '2px solid rgba(255, 255, 255, 0.2)',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    backgroundColor: active ? theme.palette.secondary.dark : 'rgba(255, 255, 255, 0.2)',
    transform: 'scale(1.05)',
  },
}));

// Tarjeta personalizada con modo de edición
const EditableCard = styled(Paper)(({ theme, isEditing, isVisible, isDragging }) => ({
  width: '300px',
  height: '85px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(1),
  backgroundColor: isVisible ? 'rgba(31, 31, 31, 0.2)' : 'rgba(31, 31, 31, 0.05)',
  position: 'relative',
  opacity: isVisible ? 1 : 0.4,
  cursor: isEditing ? 'grab' : 'default',
  transform: isDragging ? 'scale(1.05) rotate(2deg)' : 'scale(1)',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  border: isEditing 
    ? (isVisible ? '2px dashed rgba(0, 197, 218, 0.5)' : '2px dashed rgba(255, 255, 255, 0.2)')
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

const VentilatorDashboard = () => {
  const serialConnection = useSerialConnection();
  const { ventilatorData, realTimeData, setVentilatorData, calculations } = useVentilatorData(serialConnection);
  
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
  ]);
  const [draggedCard, setDraggedCard] = useState(null);

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
    ]);
  };

  // Funciones para calcular valores en tiempo real
  const getMax = arr => arr.length ? Math.max(...arr).toFixed(1) : '--';
  const getMin = arr => arr.length ? Math.min(...arr).toFixed(1) : '--';
  const getAvg = arr => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : '--';
  const getLast = arr => arr.length ? arr[arr.length - 1].toFixed(1) : '--';

  // Mapeo de datos de tarjetas
  const cardDataMap = {
    presionPico: { label: 'Presión Pico', value: getMax(realTimeData.pressure), unit: 'cmH₂O' },
    presionMedia: { label: 'Presión Media', value: getAvg(realTimeData.pressure), unit: 'cmH₂O' },
    peep: { label: 'PEEP', value: getMin(realTimeData.pressure), unit: 'cmH₂O' },
    flujoMax: { label: 'Flujo Max', value: getMax(realTimeData.flow), unit: 'L/min' },
    flujo: { label: 'Flujo', value: getLast(realTimeData.flow), unit: 'L/min' },
    flujoMin: { label: 'Flujo Min', value: getMin(realTimeData.flow), unit: 'L/min' },
    volMax: { label: 'Vol Max', value: getMax(realTimeData.volume), unit: 'mL' },
    volumen: { label: 'Volumen', value: getLast(realTimeData.volume), unit: 'mL' },
  };

  // Generar datos de tarjetas basados en la configuración
  const cardData = cardConfig
    .filter(card => isAdjustMode || card.visible) // Solo mostrar ocultas en modo ajuste
    .sort((a, b) => a.order - b.order)
    .map(card => ({
      ...cardDataMap[card.id],
      id: card.id,
      config: card,
    }));

  return (
    <ThemeProvider theme={ventilatorTheme}>
      <CssBaseline />
      
      <Box display="flex" flexDirection="row" alignItems="flex-start" mb={2} ml={2}>
        {/* Imágenes*/}
        <Box display="flex" flexDirection="column" alignItems="left">
          <img src="/images/logo-univalle.svg" alt="Univalle" width={250} height={42} style={{ marginBottom: 0 }} />
          <img src="/images/logo.png" alt="VentyLab" width={220} height={110} />
          
          {/* Botón de modo de ajuste */}
          <Box mt={1} mb={1} display="flex" gap={1}>
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
          
          {/* Valores de los parámetros - tiempo real*/}
          <Box mt={1} display="flex" flexDirection="column" gap={0}>
            {cardData.map((card, idx) => (
              <EditableCard
                key={card.id}
                elevation={3}
                isEditing={isAdjustMode}
                isVisible={card.config.visible}
                isDragging={draggedCard === card.id}
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
                      color: card.config.visible ? 'inherit' : 'text.secondary'
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
                
                {/* Indicador de tarjeta oculta */}
                {!card.config.visible && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      backgroundColor: 'rgba(0, 0, 0, 0.7)',
                      color: 'text.secondary',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 600,
                      pointerEvents: 'none',
                      zIndex: 5,
                    }}
                  >
                    OCULTA
                  </Box>
                )}
              </EditableCard>
            ))}
          </Box>
        </Box>
        
        {/* Inputs según el modo seleccionado */}
        <Box display="flex" flexDirection="row" alignItems="flex-start" ml={4} mt={2} gap={3}>
          {/* Inputs comunes */}
          <Box display="flex" flexDirection="column" alignItems="center">
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
              <Box display="flex" flexDirection="column" alignItems="center">
                <Typography variant="subtitle2" sx={{ fontSize: '24px', fontWeight: 300 }}>Presión Max</Typography>
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
              <Box display="flex" flexDirection="column" alignItems="center">
                <Typography variant="subtitle2" sx={{ fontSize: '24px', fontWeight: 300 }}>Volumen Obj</Typography>
                <TextField
                  type="number"
                  variant="outlined"
                  size="small"
                  inputProps={{ min: 0 }}
                  sx={{ width: '180px', height: '80px' }}
                  value={ventilatorData.volumenObjetivo || 500}
                  onChange={e => handleParameterChange('volumenObjetivo', Number(e.target.value))}
                />
              </Box>
            </>
          )}

          {/* PEEP común para ambos modos */}
          <Box display="flex" flexDirection="column" alignItems="center">
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
                {/* Graficas */}
                <Grid item xs={12} md={4} display="flex" flexDirection="column" alignItems="center" justifyContent="center">
                  <Box display="flex" flexDirection="column" alignItems="center" gap={2} alignSelf="flex-start" sx={{ marginLeft: -28 }}>
                    <Paper elevation={0} sx={{ width: 700, height: 230, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', p: 1, backgroundColor: 'rgba(141, 138, 138, 0.2)' }}>
                      <Typography variant="h6" sx={{ mb: 1 }}>Gráfica de Presión</Typography>
                      <RealTimeCharts type="pressure" data={realTimeData} />
                    </Paper>
                    <Paper elevation={0} sx={{ width: 700, height: 230, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', p: 1, backgroundColor: 'rgba(141, 138, 138, 0.2)' }}>
                      <Typography variant="h6" sx={{ mb: 1 }}>Gráfica de Flujo</Typography>
                      <RealTimeCharts type="flow" data={realTimeData} />
                    </Paper>
                    <Paper elevation={0} sx={{ width: 700, height: 230, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', p: 1, backgroundColor: 'rgba(141, 138, 138, 0.2)' }}>
                      <Typography variant="h6" sx={{ mb: 1 }}>Gráfica de Volumen</Typography>
                      <RealTimeCharts type="volume" data={realTimeData} />
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
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default VentilatorDashboard; 