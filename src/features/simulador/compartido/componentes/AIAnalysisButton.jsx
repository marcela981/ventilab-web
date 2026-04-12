import React from 'react';
import { IconButton, Tooltip, CircularProgress } from '@mui/material';
import PsychologyIcon from '@mui/icons-material/Psychology';

const AIAnalysisButton = ({ isAnalyzing, onClick, children }) => {
  return (
    <Tooltip title="Analizar configuración con IA" arrow>
      <IconButton
        size="small"
        onClick={onClick}
        disabled={isAnalyzing}
        sx={{
          color: isAnalyzing ? 'text.secondary' : 'primary.main',
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          '&:hover': {
            backgroundColor: isAnalyzing ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.5)',
          }
        }}
      >
        {isAnalyzing ? (
          <CircularProgress size={16} />
        ) : (
          children || <PsychologyIcon fontSize="small" />
        )}
      </IconButton>
    </Tooltip>
  );
};

export default AIAnalysisButton;
