import React from 'react';
import Chip from '@mui/material/Chip';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import SyncIcon from '@mui/icons-material/Sync';
import { useLearningProgress } from '../LearningProgressContext';

const getChipProps = (status, errorMessage) => {
  switch (status) {
    case 'loading':
    case 'saving':
      return {
        icon: <SyncIcon fontSize="small" className="progress-sync-badge__spin" />,
        color: 'info',
        label: status === 'saving' ? 'Guardando…' : 'Cargando…',
      };
    case 'saved':
      return {
        icon: <CheckCircleIcon fontSize="small" />,
        color: 'success',
        label: 'Guardado',
      };
    case 'offline-queued':
      return {
        icon: <CloudOffIcon fontSize="small" />,
        color: 'warning',
        label: 'Offline: en cola',
      };
    case 'error':
      return {
        icon: <ErrorOutlineIcon fontSize="small" />,
        color: 'error',
        label: errorMessage ? `Error: ${errorMessage}` : 'Error al sincronizar',
      };
    default:
      return null;
  }
};

export const ProgressSyncBadge = () => {
  const { syncStatus, lastSyncError } = useLearningProgress();
  const chipProps = getChipProps(syncStatus, lastSyncError);
  
  if (!chipProps) {
    return null;
  }
  
  return (
    <Chip
      size="small"
      variant="filled"
      {...chipProps}
      sx={{
        '& .progress-sync-badge__spin': {
          animation: 'progress-sync-spin 1s linear infinite',
        },
        '@keyframes progress-sync-spin': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      }}
    />
  );
};

