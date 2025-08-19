import React from 'react';
import { Box, Tooltip, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';

const ModeToggleRoot = styled(Box)(({ theme }) => ({
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
}));

const ModeToggle = ({ ventilationMode, onChange, AnalysisButton }) => {
  return (
    <ModeToggleRoot>
      <Tooltip 
        title="Modo Volumen Control: El ventilador entrega un volumen tidal fijo" 
        placement="bottom"
        arrow
      >
        <CircularModeButton
          active={ventilationMode === 'volume'}
          onClick={() => onChange('volume')}
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
          onClick={() => onChange('pressure')}
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
      {AnalysisButton}
    </ModeToggleRoot>
  );
};

export default ModeToggle;
