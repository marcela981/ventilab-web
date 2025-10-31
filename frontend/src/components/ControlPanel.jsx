import React, { useState, useEffect } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Typography,
  TextField,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Alert,
  Divider,
  Grid,
} from '@mui/material';
import { ventilatorCalculations } from '../utils/ventilatorCalculations';

const ControlPanel = ({ data, onParameterChange }) => {
  const [mode, setMode] = useState('volume');
  const [ieRatioSlider, setIeRatioSlider] = useState(0);
  const [validation, setValidation] = useState({ valid: true, errors: [], warnings: [] });

  // Parámetros del ventilador
  const [parameters, setParameters] = useState({
    frequency: data.frequency || 12,
    tidalVolume: data.tidalVolume || 500,
    peakPressure: data.peakPressure || 20,
    peep: data.peep || 5,
    fio2: data.fio2 || 21,
    expiratoryPause1: 0,
    expiratoryPause2: 0,
    inspiratoryPause: 0,
  });

  // Calcular tiempos cuando cambian los parámetros
  useEffect(() => {
    const timing = ventilatorCalculations.calculateTimingFromIERatio(
      parameters.frequency,
      ieRatioSlider,
      parameters.expiratoryPause1,
      parameters.expiratoryPause2
    );

    // Actualizar parámetros calculados
    const updatedParameters = {
      ...parameters,
      inspiratoryTime: timing.inspiratoryTime,
      expiratoryTime: timing.expiratoryTime,
    };

    // Calcular flujo máximo y presión del tanque según el modo
    if (mode === 'volume') {
      const maxFlow = ventilatorCalculations.calculateMaxFlow(
        parameters.tidalVolume,
        timing.inspiratoryTime
      );
      const tankPressure = ventilatorCalculations.calculateTankPressure(maxFlow);
      
      updatedParameters.maxFlow = maxFlow;
      updatedParameters.tankPressure = tankPressure;
    } else {
      const pressureControl = ventilatorCalculations.calculateTidalVolumePressureControl(
        parameters.peakPressure,
        parameters.peep,
        timing.inspiratoryTime
      );
      
      updatedParameters.tidalVolume = pressureControl.tidalVolume;
      updatedParameters.maxFlow = pressureControl.maxFlow;
      updatedParameters.tankPressure = pressureControl.tankPressure;
    }

    setParameters(updatedParameters);

    // Validar parámetros
    const validation = ventilatorCalculations.validateParameters(
      parameters.frequency,
      timing.inspiratoryTime,
      timing.expiratoryTime,
      updatedParameters.tidalVolume,
      parameters.peakPressure
    );
    setValidation(validation);

    // Notificar cambios al componente padre
    onParameterChange('inspiratoryTime', timing.inspiratoryTime);
    onParameterChange('expiratoryTime', timing.expiratoryTime);
    onParameterChange('maxFlow', updatedParameters.maxFlow);
    onParameterChange('tankPressure', updatedParameters.tankPressure);
    onParameterChange('tidalVolume', updatedParameters.tidalVolume);

  }, [parameters.frequency, ieRatioSlider, parameters.expiratoryPause1, parameters.expiratoryPause2, mode]);

  const handleParameterChange = (param, value) => {
    setParameters(prev => ({
      ...prev,
      [param]: value
    }));
    onParameterChange(param, value);
  };

  const handleModeChange = (event, newMode) => {
    if (newMode !== null) {
      setMode(newMode);
      onParameterChange('mode', newMode);
    }
  };

  const handleIeRatioChange = (event, newValue) => {
    setIeRatioSlider(newValue);
  };

  const TabPanel = ({ children, value, index }) => (
    <div hidden={value !== index} style={{ paddingTop: 16 }}>
      {value === index && children}
    </div>
  );

  return (
    <Box>
      {/* Selector de Modo */}
      <Tabs value={mode} onChange={handleModeChange} variant="fullWidth" sx={{ mb: 2 }}>
        <Tab label="Volumen Control" value="volume" />
        <Tab label="Presión Control" value="pressure" />
      </Tabs>

      {/* Alertas de validación */}
      {!validation.valid && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {validation.errors.map((error, index) => (
            <div key={index}>{error}</div>
          ))}
        </Alert>
      )}
      
      {validation.warnings.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {validation.warnings.map((warning, index) => (
            <div key={index}>{warning}</div>
          ))}
        </Alert>
      )}

      {/* Panel de Volumen Control */}
      <TabPanel value={mode} index="volume">
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Frecuencia (resp/min)"
              type="number"
              value={parameters.frequency}
              onChange={(e) => handleParameterChange('frequency', parseFloat(e.target.value))}
              inputProps={{ min: 5, max: 60, step: 1 }}
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Volumen Tidal (ml)"
              type="number"
              value={parameters.tidalVolume}
              onChange={(e) => handleParameterChange('tidalVolume', parseFloat(e.target.value))}
              inputProps={{ min: 100, max: 2000, step: 10 }}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="PEEP (cmH2O)"
              type="number"
              value={parameters.peep}
              onChange={(e) => handleParameterChange('peep', parseFloat(e.target.value))}
              inputProps={{ min: 0, max: 20, step: 1 }}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="FiO2 (%)"
              type="number"
              value={parameters.fio2}
              onChange={(e) => handleParameterChange('fio2', parseFloat(e.target.value))}
              inputProps={{ min: 21, max: 100, step: 1 }}
            />
          </Grid>
        </Grid>
      </TabPanel>

      {/* Panel de Presión Control */}
      <TabPanel value={mode} index="pressure">
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Frecuencia (resp/min)"
              type="number"
              value={parameters.frequency}
              onChange={(e) => handleParameterChange('frequency', parseFloat(e.target.value))}
              inputProps={{ min: 5, max: 60, step: 1 }}
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Presión Pico (cmH2O)"
              type="number"
              value={parameters.peakPressure}
              onChange={(e) => handleParameterChange('peakPressure', parseFloat(e.target.value))}
              inputProps={{ min: 5, max: 50, step: 1 }}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="PEEP (cmH2O)"
              type="number"
              value={parameters.peep}
              onChange={(e) => handleParameterChange('peep', parseFloat(e.target.value))}
              inputProps={{ min: 0, max: 20, step: 1 }}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="FiO2 (%)"
              type="number"
              value={parameters.fio2}
              onChange={(e) => handleParameterChange('fio2', parseFloat(e.target.value))}
              inputProps={{ min: 21, max: 100, step: 1 }}
            />
          </Grid>
        </Grid>
      </TabPanel>

      <Divider sx={{ my: 2 }} />

      {/* Control de Relación I:E */}
      <Typography variant="h6" gutterBottom>
        Relación I:E
      </Typography>
      
      <Box sx={{ px: 2 }}>
        <Slider
          value={ieRatioSlider}
          onChange={handleIeRatioChange}
          min={-10}
          max={10}
          step={1}
          marks={[
            { value: -10, label: '2:1' },
            { value: -5, label: '1.5:1' },
            { value: 0, label: '1:1' },
            { value: 5, label: '1:1.5' },
            { value: 10, label: '1:2' },
          ]}
          valueLabelDisplay="auto"
          valueLabelFormat={(value) => {
            if (value === 0) return '1:1';
            if (value > 0) return `1:${1 + (value / 10)}`;
            return `${1 + (value / (-10))}:1`;
          }}
        />
      </Box>

      {/* Tiempos Calculados */}
      <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
        <Typography variant="subtitle2" gutterBottom>
          Tiempos Calculados:
        </Typography>
        <Typography variant="body2">
          Tiempo Inspiratorio: {parameters.inspiratoryTime?.toFixed(2)}s
        </Typography>
        <Typography variant="body2">
          Tiempo Espiratorio: {parameters.expiratoryTime?.toFixed(2)}s
        </Typography>
        <Typography variant="body2">
          Flujo Máximo: {parameters.maxFlow?.toFixed(1)} L/min
        </Typography>
        <Typography variant="body2">
          Presión Tanque: {parameters.tankPressure?.toFixed(1)} bar
        </Typography>
      </Box>

      {/* Botones de Control */}
      <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
        <Button
          variant="contained"
          color="primary"
          fullWidth
          onClick={() => {
            // Aquí iría la lógica para enviar configuración al ventilador
            console.log('Enviando configuración:', parameters);
          }}
        >
          Enviar Configuración
        </Button>
        <Button
          variant="outlined"
          color="secondary"
          onClick={() => {
            // Aquí iría la lógica para detener el ventilador
            console.log('Deteniendo ventilador');
          }}
        >
          Stop
        </Button>
      </Box>
    </Box>
  );
};

export default ControlPanel; 