import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Divider,
} from '@mui/material';

const ParameterDisplay = ({ data }) => {
  const formatValue = (value, unit) => {
    if (typeof value === 'number') {
      return `${value.toFixed(1)} ${unit}`;
    }
    return `${value} ${unit}`;
  };

  const getStatusColor = (parameter, value) => {
    // Lógica para determinar el color según el valor del parámetro
    if (parameter === 'pressure' && value > 35) return 'error';
    if (parameter === 'flow' && value > 60) return 'warning';
    return 'default';
  };

  return (
    <Box>
      <Grid container spacing={2}>
        {/* Parámetros en Tiempo Real */}
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            Valores en Tiempo Real
          </Typography>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Presión
              </Typography>
              <Typography variant="h4" component="div" color="primary">
                {formatValue(data.pressure, 'cmH₂O')}
              </Typography>
              <Chip 
                label="Normal" 
                color={getStatusColor('pressure', data.pressure)}
                size="small"
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Flujo
              </Typography>
              <Typography variant="h4" component="div" color="secondary">
                {formatValue(data.flow, 'L/min')}
              </Typography>
              <Chip 
                label="Normal" 
                color={getStatusColor('flow', data.flow)}
                size="small"
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Volumen
              </Typography>
              <Typography variant="h4" component="div" color="success.main">
                {formatValue(data.volume, 'ml')}
              </Typography>
              <Chip 
                label="Normal" 
                color="default"
                size="small"
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Estado
              </Typography>
              <Typography variant="h4" component="div" color="info.main">
                {data.isConnected ? 'Conectado' : 'Desconectado'}
              </Typography>
              <Chip 
                label={data.isConnected ? 'Online' : 'Offline'} 
                color={data.isConnected ? 'success' : 'error'}
                size="small"
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Divider sx={{ my: 2 }} />
        </Grid>

        {/* Parámetros de Configuración */}
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            Configuración Actual
          </Typography>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Modo de Ventilación
              </Typography>
              <Typography variant="h6" component="div">
                {data.mode === 'volume' ? 'Control por Volumen' : 'Control por Presión'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Frecuencia
              </Typography>
              <Typography variant="h6" component="div">
                {data.frequency} resp/min
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Volumen Tidal
              </Typography>
              <Typography variant="h6" component="div">
                {data.tidalVolume} ml
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                PEEP
              </Typography>
              <Typography variant="h6" component="div">
                {data.peep} cmH₂O
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Presión Pico
              </Typography>
              <Typography variant="h6" component="div">
                {data.peakPressure} cmH₂O
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Relación I:E
              </Typography>
              <Typography variant="h6" component="div">
                1:{data.ieRatio}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ParameterDisplay;
