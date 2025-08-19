import React from 'react';
import { Box, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import PsychologyIcon from '@mui/icons-material/Psychology';

const Root = styled(Box)(({ theme, isAnalyzing }) => ({
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
}));

const AIAnalysisButton = ({ isAnalyzing, onClick }) => (
  <Root isAnalyzing={isAnalyzing} onClick={onClick}>
    <Box display="flex" flexDirection="column" alignItems="center" >
      <PsychologyIcon sx={{ fontSize: '20px', mb: 0.5 }} />
      <Typography variant="caption" sx={{ fontSize: '8px', lineHeight: 1 }}>
        ANALIZAR
      </Typography>
      <Typography variant="caption" sx={{ fontSize: '8px', lineHeight: 1 }}>
        CON IA
      </Typography>
    </Box>
  </Root>
);

export default AIAnalysisButton;
