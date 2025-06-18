import React from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import InfoIcon from '@mui/icons-material/Info';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';

const InfoPanel = styled(Paper)(({ theme }) => ({
  position: 'fixed',
  top: 80,
  left: 20,
  zIndex: 999,
  padding: theme.spacing(2),
  backgroundColor: 'rgba(0, 0, 0, 0.8)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: theme.spacing(1),
  maxWidth: 300,
  minWidth: 280,
}));

const ModeInfoPanel = ({ ventilationMode }) => {
  const volumeModeInfo = {
    title: 'Volumen Control',
    description: 'El ventilador entrega un volumen tidal fijo independientemente de la presión.',
    advantages: [
      'Volumen tidal garantizado',
      'Mejor para pacientes con compliance variable',
      'Control directo del volumen minuto',
    ],
    parameters: [
      'Volumen Tidal (ml)',
      'Flujo Máximo (L/min)',
      'Frecuencia Respiratoria',
      'PEEP',
    ],
  };

  const pressureModeInfo = {
    title: 'Presión Control',
    description: 'El ventilador mantiene una presión inspiratoria constante.',
    advantages: [
      'Presión de vía aérea controlada',
      'Menor riesgo de barotrauma',
      'Mejor distribución del flujo',
    ],
    parameters: [
      'Presión Inspiratoria (cmH₂O)',
      'Volumen Objetivo (ml)',
      'Frecuencia Respiratoria',
      'PEEP',
    ],
  };

  const currentInfo = ventilationMode === 'volume' ? volumeModeInfo : pressureModeInfo;

  return (
    <InfoPanel elevation={3}>
      <Box display="flex" alignItems="center" mb={2}>
        <InfoIcon sx={{ color: '#00c5da', mr: 1 }} />
        <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 600 }}>
          {currentInfo.title}
        </Typography>
      </Box>

      <Typography variant="body2" sx={{ color: '#b0b0b0', mb: 2 }}>
        {currentInfo.description}
      </Typography>

      <Typography variant="subtitle2" sx={{ color: '#00c5da', mb: 1, fontWeight: 600 }}>
        Ventajas:
      </Typography>
      <List dense sx={{ mb: 2 }}>
        {currentInfo.advantages.map((advantage, index) => (
          <ListItem key={index} sx={{ py: 0.5 }}>
            <ListItemIcon sx={{ minWidth: 24 }}>
              <CheckCircleIcon sx={{ color: '#00c5da', fontSize: 16 }} />
            </ListItemIcon>
            <ListItemText
              primary={advantage}
              primaryTypographyProps={{
                variant: 'body2',
                sx: { color: '#ffffff' }
              }}
            />
          </ListItem>
        ))}
      </List>

      <Typography variant="subtitle2" sx={{ color: '#00c5da', mb: 1, fontWeight: 600 }}>
        Parámetros principales:
      </Typography>
      <Box display="flex" flexWrap="wrap" gap={1}>
        {currentInfo.parameters.map((param, index) => (
          <Chip
            key={index}
            label={param}
            size="small"
            sx={{
              backgroundColor: 'rgba(0, 197, 218, 0.2)',
              color: '#00c5da',
              border: '1px solid rgba(0, 197, 218, 0.3)',
            }}
          />
        ))}
      </Box>

      {ventilationMode === 'pressure' && (
        <Box mt={2} p={1} sx={{ backgroundColor: 'rgba(255, 193, 7, 0.1)', borderRadius: 1 }}>
          <Box display="flex" alignItems="center" mb={0.5}>
            <WarningIcon sx={{ color: '#ffc107', fontSize: 16, mr: 0.5 }} />
            <Typography variant="caption" sx={{ color: '#ffc107', fontWeight: 600 }}>
              Nota importante:
            </Typography>
          </Box>
          <Typography variant="caption" sx={{ color: '#ffc107' }}>
            En modo presión, el volumen tidal puede variar según la compliance del paciente.
          </Typography>
        </Box>
      )}
    </InfoPanel>
  );
};

export default ModeInfoPanel;