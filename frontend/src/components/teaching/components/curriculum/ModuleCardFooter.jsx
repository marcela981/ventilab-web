import React from 'react';
import PropTypes from 'prop-types';
import { Button } from '@mui/material';
import { CheckCircle, Refresh, PlayArrow } from '@mui/icons-material';
import styles from '@/styles/curriculum.module.css';

/**
 * Footer de la ModuleCard con botón de acción
 */
const ModuleCardFooter = ({
  status,
  isAvailable,
  levelColor,
  theme,
  onModuleClick,
  moduleId
}) => {
  const getButtonText = () => {
    if (status === 'completed') return 'Completado';
    if (status === 'in-progress') return 'Continuar';
    return isAvailable ? 'Comenzar' : 'Bloqueado';
  };

  const getButtonIcon = () => {
    if (status === 'completed') return <CheckCircle />;
    if (status === 'in-progress') return <Refresh />;
    return <PlayArrow />;
  };

  const getAriaLabel = () => {
    if (status === 'completed') return 'Módulo completado';
    if (status === 'in-progress') return 'Continuar módulo';
    return isAvailable ? 'Comenzar módulo' : 'Módulo bloqueado';
  };

  return (
    <footer className={styles.cardFooter}>
      <Button
        variant={status === 'completed' ? 'outlined' : 'contained'}
        fullWidth
        disabled={!isAvailable}
        onClick={(e) => {
          e.stopPropagation();
          if (isAvailable && onModuleClick) {
            onModuleClick(moduleId);
          }
        }}
        aria-label={getAriaLabel()}
        startIcon={getButtonIcon()}
        sx={{
          fontSize: '0.875rem',
          fontWeight: 600,
          textTransform: 'none',
          py: 1,
          borderRadius: 1.5,
          backgroundColor: status !== 'completed' && isAvailable ? levelColor : 'transparent',
          borderColor: isAvailable ? levelColor : theme.palette.grey[300],
          color: status !== 'completed' && isAvailable ? '#fff' : levelColor,
          boxShadow: 'none',
          transition: 'all 0.25s ease-in-out',
          '&:hover': isAvailable ? {
            backgroundColor: status !== 'completed' ? levelColor : 'transparent',
            filter: 'brightness(0.92)',
            boxShadow: 'none',
            transform: 'scale(1.02)'
          } : {},
          '&.Mui-disabled': {
            backgroundColor: 'transparent',
            borderColor: theme.palette.grey[300],
            color: theme.palette.grey[400]
          }
        }}
      >
        {getButtonText()}
      </Button>
    </footer>
  );
};

ModuleCardFooter.propTypes = {
  status: PropTypes.string.isRequired,
  isAvailable: PropTypes.bool.isRequired,
  levelColor: PropTypes.string.isRequired,
  theme: PropTypes.object.isRequired,
  onModuleClick: PropTypes.func.isRequired,
  moduleId: PropTypes.string.isRequired
};

export default ModuleCardFooter;

