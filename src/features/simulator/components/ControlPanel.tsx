import React, { useState, useMemo } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Typography,
  TextField,
  Slider,
  Button,
  Alert,
  Divider,
  Grid,
} from '@mui/material';
import { ventilatorCalculations } from '@/features/simulator/utils/ventilatorCalculations';

interface ControlPanelProps {
  data: Record<string, number>;
  onParameterChange: (param: string, value: number) => void;
}

/**
 * FIX: Replaced the useEffect that called setParameters (causing a render loop)
 * with useMemo for derived calculations. The effect was updating state that
 * included its own deps → infinite loop.
 */
const ControlPanel: React.FC<ControlPanelProps> = ({ data, onParameterChange }) => {
  const [mode, setMode] = useState<'volume' | 'pressure'>('volume');
  const [ieRatioSlider, setIeRatioSlider] = useState(0);

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

  // Derived calculations — no longer in a useEffect to avoid the render loop.
  // These recompute only when their specific inputs change.
  const calculatedValues = useMemo(() => {
    const timing = ventilatorCalculations.calculateTimingFromIERatio(
      parameters.frequency,
      ieRatioSlider,
      parameters.expiratoryPause1,
      parameters.expiratoryPause2,
    );

    let maxFlow = 0;
    let tankPressure = 0;
    let tidalVolume = parameters.tidalVolume;

    if (mode === 'volume') {
      maxFlow = ventilatorCalculations.calculateMaxFlow(parameters.tidalVolume, timing.inspiratoryTime);
      tankPressure = ventilatorCalculations.calculateTankPressure(maxFlow);
    } else {
      const pressureControl = ventilatorCalculations.calculateTidalVolumePressureControl(
        parameters.peakPressure,
        parameters.peep,
        timing.inspiratoryTime,
      );
      tidalVolume = pressureControl.tidalVolume;
      maxFlow = pressureControl.maxFlow;
      tankPressure = pressureControl.tankPressure;
    }

    const validation = ventilatorCalculations.validateParameters(
      parameters.frequency,
      timing.inspiratoryTime,
      timing.expiratoryTime,
      tidalVolume,
      parameters.peakPressure,
    );

    return {
      inspiratoryTime: timing.inspiratoryTime,
      expiratoryTime: timing.expiratoryTime,
      maxFlow,
      tankPressure,
      tidalVolume,
      validation,
    };
  }, [parameters.frequency, ieRatioSlider, parameters.expiratoryPause1, parameters.expiratoryPause2, mode, parameters.tidalVolume, parameters.peakPressure, parameters.peep]);

  const handleParameterChange = (param: string, value: number) => {
    setParameters((prev) => ({ ...prev, [param]: value }));
    onParameterChange(param, value);
  };

  const handleModeChange = (_event: React.SyntheticEvent, newMode: 'volume' | 'pressure') => {
    if (newMode !== null) {
      setMode(newMode);
      onParameterChange('mode', newMode as unknown as number);
    }
  };

  const handleIeRatioChange = (_event: Event, newValue: number | number[]) => {
    setIeRatioSlider(newValue as number);
  };

  const { validation } = calculatedValues;

  const TabPanel: React.FC<{ children: React.ReactNode; value: string; index: string }> = ({
    children,
    value,
    index,
  }) => (
    <div hidden={value !== index} style={{ paddingTop: 16 }}>
      {value === index && children}
    </div>
  );

  return (
    <Box>
      <Tabs value={mode} onChange={handleModeChange} variant="fullWidth" sx={{ mb: 2 }}>
        <Tab label="Volumen Control" value="volume" />
        <Tab label="Presión Control" value="pressure" />
      </Tabs>

      {!validation.valid && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {validation.errors.map((error: string, index: number) => (
            <div key={index}>{error}</div>
          ))}
        </Alert>
      )}

      {validation.warnings.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {validation.warnings.map((warning: string, index: number) => (
            <div key={index}>{warning}</div>
          ))}
        </Alert>
      )}

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
            if (value > 0) return `1:${1 + value / 10}`;
            return `${1 + value / -10}:1`;
          }}
        />
      </Box>

      <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
        <Typography variant="subtitle2" gutterBottom>
          Tiempos Calculados:
        </Typography>
        <Typography variant="body2">
          Tiempo Inspiratorio: {calculatedValues.inspiratoryTime?.toFixed(2)}s
        </Typography>
        <Typography variant="body2">
          Tiempo Espiratorio: {calculatedValues.expiratoryTime?.toFixed(2)}s
        </Typography>
        <Typography variant="body2">
          Flujo Máximo: {calculatedValues.maxFlow?.toFixed(1)} L/min
        </Typography>
        <Typography variant="body2">
          Presión Tanque: {calculatedValues.tankPressure?.toFixed(1)} bar
        </Typography>
      </Box>

      <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
        <Button variant="contained" color="primary" fullWidth onClick={() => {}}>
          Enviar Configuración
        </Button>
        <Button variant="outlined" color="secondary" onClick={() => {}}>
          Stop
        </Button>
      </Box>
    </Box>
  );
};

export default ControlPanel;
