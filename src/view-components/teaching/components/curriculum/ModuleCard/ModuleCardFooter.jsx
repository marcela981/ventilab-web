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
    // Show "Completado" ONLY when status is 'completed', which means progress === 100
    // This ensures no impossible states like "0% progress but Completed"
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

  // Verde como CTA principal para Comenzar/Continuar; Completado con borde
  const isPrimaryAction = (status === 'available' || status === 'in-progress') && isAvailable;
  const buttonBg = isPrimaryAction ? '#22c55e' : 'transparent';
  const buttonHoverBg = isPrimaryAction ? '#16a34a' : 'transparent';

  return (
    <footer className={styles.cardFooter} data-card-footer>
      <Button
        type="button"
        variant={status === 'completed' ? 'outlined' : 'contained'}
        fullWidth
        disabled={!isAvailable}
        aria-disabled={!isAvailable}
        onClick={(e) => {
          e.preventDefault();
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
          backgroundColor: status !== 'completed' && isAvailable ? buttonBg : 'transparent',
          borderColor: isAvailable ? (isPrimaryAction ? '#22c55e' : levelColor) : theme.palette.grey[300],
          color: status !== 'completed' && isAvailable ? '#fff' : (isAvailable ? levelColor : theme.palette.grey[400]),
          boxShadow: isPrimaryAction ? '0 1px 3px rgba(34, 197, 94, 0.3)' : 'none',
          transition: 'all 0.25s ease-in-out',
          '&:hover': isAvailable ? {
            backgroundColor: status !== 'completed' ? buttonHoverBg : 'transparent',
            borderColor: isPrimaryAction ? '#16a34a' : levelColor,
            boxShadow: isPrimaryAction ? '0 2px 8px rgba(34, 197, 94, 0.35)' : 'none',
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

