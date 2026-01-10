import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Alert,
} from '@mui/material';
import { chartTheme, getChartColor } from '../../styles/chart-theme';

/**
 * Componente de ejemplo que demuestra cómo usar la nueva paleta de colores
 * Este archivo puede ser eliminado después de la implementación
 */
const ThemeExample = () => {
  return (
    <Box className="dashboard-container">
      {/* Ejemplo de uso de clases CSS utilitarias */}
      <Paper className="ventilab-card">
        <Typography variant="h4" className="text-primary">
          Ejemplo de Nueva Paleta de Colores
        </Typography>
        
        <Box sx={{ mt: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {/* Botones con diferentes estilos */}
          <Button variant="contained" className="btn btn-primary">
            Botón Primario
          </Button>
          <Button variant="outlined" className="btn btn-outline">
            Botón Outline
          </Button>
          <Button variant="text" className="btn btn-secondary">
            Botón Secundario
          </Button>
        </Box>

        {/* Ejemplo de parámetros */}
        <Box sx={{ mt: 3, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
          <Box className="parameter-card">
            <Typography variant="h3" className="parameter-value">
              25
            </Typography>
            <Typography className="parameter-label">
              Presión (cmH₂O)
            </Typography>
          </Box>
          
          <Box className="parameter-card">
            <Typography variant="h3" className="parameter-value" style={{ color: '#4caf50' }}>
              450
            </Typography>
            <Typography className="parameter-label">
              Volumen (mL)
            </Typography>
          </Box>
        </Box>

        {/* Ejemplo de estados */}
        <Box sx={{ mt: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Chip 
            label="Conectado" 
            className="status-indicator success"
            size="small"
          />
          <Chip 
            label="Advertencia" 
            className="status-indicator warning"
            size="small"
          />
          <Chip 
            label="Error" 
            className="status-indicator error"
            size="small"
          />
          <Chip 
            label="Info" 
            className="status-indicator info"
            size="small"
          />
        </Box>

        {/* Ejemplo de progreso */}
        <Box sx={{ mt: 3 }}>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Progreso de Calibración
          </Typography>
          <LinearProgress 
            variant="determinate" 
            value={75} 
            sx={{
              height: 8,
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              '& .MuiLinearProgress-bar': {
                backgroundColor: '#10aede',
              },
            }}
          />
        </Box>

        {/* Ejemplo de alertas */}
        <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Alert severity="success" sx={{ backgroundColor: 'rgba(76, 175, 80, 0.1)', border: '1px solid #4caf50' }}>
            Sistema funcionando correctamente
          </Alert>
          <Alert severity="warning" sx={{ backgroundColor: 'rgba(255, 152, 0, 0.1)', border: '1px solid #ff9800' }}>
            Presión ligeramente elevada
          </Alert>
          <Alert severity="error" sx={{ backgroundColor: 'rgba(244, 67, 54, 0.1)', border: '1px solid #f44336' }}>
            Error de conexión detectado
          </Alert>
        </Box>

        {/* Ejemplo de gradientes */}
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Gradientes Disponibles
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box 
              sx={{ 
                width: 100, 
                height: 60, 
                borderRadius: 'var(--radius-md)',
                background: 'var(--gradient-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-on-primary)',
                fontWeight: 'bold',
                fontSize: '0.875rem',
              }}
            >
              Primario
            </Box>
            <Box 
              sx={{ 
                width: 100, 
                height: 60, 
                borderRadius: 'var(--radius-md)',
                background: 'var(--gradient-accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-on-primary)',
                fontWeight: 'bold',
                fontSize: '0.875rem',
              }}
            >
              Acento
            </Box>
          </Box>
        </Box>

        {/* Ejemplo de uso de Chart.js */}
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Colores para Chart.js
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {chartTheme.palettes.line.slice(0, 6).map((color, index) => (
              <Box
                key={index}
                sx={{
                  width: 40,
                  height: 40,
                  backgroundColor: color,
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                }}
              >
                {index + 1}
              </Box>
            ))}
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default ThemeExample;
