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
} from '@mui/material';
import { styled } from '@mui/material/styles';

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

const VentilatorDashboard = () => {
  const [ventilatorData, setVentilatorData] = useState({
    // Datos en tiempo real
    pressure: 0,
    flow: 0,
    volume: 0,
    
    // Parámetros de configuración
    fio2: 21,
    volumen: 500,
    qMax: 60,
    peep: 5,
    // Ciclo respiratorio
    inspiracionEspiracion: 0,
    relacionIE1: 1,
    relacionIE2: 2,
    pausaInspiratoria: 0,
    pausaEspiratoria: 0,
    frecuencia: 12,
    
    // Estado de conexión
    isConnected: false,
    port: '',
    baudRate: 9600,
  });

  const [realTimeData, setRealTimeData] = useState({
    pressure: [],
    flow: [],
    volume: [],
    time: [],
  });

  // Simulación de datos en tiempo real
  useEffect(() => {
    if (!ventilatorData.isConnected) return;

    const interval = setInterval(() => {
      const now = Date.now();
      
      // Simular datos del ventilador
      const simulatedPressure = 15 + Math.sin(now / 1000) * 5 + Math.random() * 2;
      const simulatedFlow = 30 + Math.sin(now / 1000) * 20 + Math.random() * 5;
      const simulatedVolume = 400 + Math.sin(now / 1000) * 100 + Math.random() * 20;

      setRealTimeData(prev => ({
        pressure: [...prev.pressure.slice(-100), simulatedPressure],
        flow: [...prev.flow.slice(-100), simulatedFlow],
        volume: [...prev.volume.slice(-100), simulatedVolume],
        time: [...prev.time.slice(-100), now],
      }));

      setVentilatorData(prev => ({
        ...prev,
        pressure: simulatedPressure,
        flow: simulatedFlow,
        volume: simulatedVolume,
      }));
    }, 100);

    return () => clearInterval(interval);
  }, [ventilatorData.isConnected]);

  const handleParameterChange = (parameter, value) => {
    setVentilatorData(prev => ({
      ...prev,
      [parameter]: value,
    }));
  };

  const handleConnection = (port, baudRate) => {
    setVentilatorData(prev => ({
      ...prev,
      isConnected: true,
      port,
      baudRate,
    }));
  };

  const handleDisconnection = () => {
    setVentilatorData(prev => ({
      ...prev,
      isConnected: false,
    }));
  };

  // Funciones para calcular valores en tiempo real
  const getMax = arr => arr.length ? Math.max(...arr).toFixed(1) : '--';
  const getMin = arr => arr.length ? Math.min(...arr).toFixed(1) : '--';
  const getAvg = arr => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : '--';
  const getLast = arr => arr.length ? arr[arr.length - 1].toFixed(1) : '--';

  const cardData = [
    { label: 'Presión Pico', value: getMax(realTimeData.pressure), unit: 'cmH₂O' },
    { label: 'Presión Media', value: getAvg(realTimeData.pressure), unit: 'cmH₂O' },
    { label: 'PEEP', value: getMin(realTimeData.pressure), unit: 'cmH₂O' },
    { label: 'Flujo Max', value: getMax(realTimeData.flow), unit: 'L/min' },
    { label: 'Flujo', value: getLast(realTimeData.flow), unit: 'L/min' },
    { label: 'Flujo Min', value: getMin(realTimeData.flow), unit: 'L/min' },
    { label: 'Vol Max', value: getMax(realTimeData.volume), unit: 'mL' },
    { label: 'Volumen', value: getLast(realTimeData.volume), unit: 'mL' },
  ];

  return (
    <ThemeProvider theme={ventilatorTheme}>
      <CssBaseline />
      <Box display="flex" flexDirection="row" alignItems="flex-start" mb={2} ml={2}>
        {/* Imágenes*/}
        <Box display="flex" flexDirection="column" alignItems="left">
          <img src="/images/logo-univalle.svg" alt="Univalle" width={250} height={42} style={{ marginBottom: 0 }} />
          <img src="/images/logo.png" alt="VentyLab" width={220} height={110} />
          {/* Valores de los parámetros - tiempo real*/}
          <Box mt={1} display="flex" flexDirection="column" gap={0}>
            {cardData.map((card, idx) => (
              <Paper key={idx} elevation={3} sx={{ width: '300px', height: '85px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 1, backgroundColor: 'rgba(31, 31, 31, 0.2)' }}>
                <Box display="flex" flexDirection="row" alignItems="flex-end" justifyContent="center" width="100%" mt={1}>
                  <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1 }}>{card.value}</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 300, mr: 1 }}>{card.unit}</Typography>
                </Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 0.5 }}>{card.label}</Typography>
              </Paper>
            ))}
          </Box>
        </Box>
        {/* Inputs volumen control*/}
        <Box display="flex" flexDirection="row" alignItems="flex-start" ml={4} mt={2} gap={3}>
          {/* Inputs de volumen control */}
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
          {/* Graficos */}
          <DashboardContainer>
            <Container maxWidth="xl" sx={{ mt: 1, marginLeft: -80, marginTop: 15 }}>
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
          <Box display="flex" flexDirection="column" alignItems="center" ml={1} mt={18}>
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