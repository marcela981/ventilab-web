import React from 'react';
import PropTypes from 'prop-types';
import { useRouter } from 'next/router';
import { Button, Tooltip } from '@mui/material';
import { CheckCircle, Refresh, PlayArrow } from '@mui/icons-material';
import styles from '@/styles/curriculum.module.css';

/**
 * Footer de la LessonCard con botón de acción
 */
const LessonCardFooter = ({
  status,
  isAvailable,
  allowEmpty = false,
  levelColor,
  theme,
  onLessonClick,
  moduleId,
  lessonId,
  lessonTitle,
  missingPrerequisites = [],
  sections = []
}) => {
  const router = useRouter();
  
  // Determinar si la lección tiene secciones
  const sectionsLength = Array.isArray(sections) ? sections.length : 0;
  const hasSections = sectionsLength > 0;
  
  // Deshabilitar CTA cuando sections.length === 0 y allowEmpty !== true
  const shouldDisableForNoSections = sectionsLength === 0 && allowEmpty !== true;
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
    if (status === 'completed') return `Lección completada: ${lessonTitle || lessonId}`;
    if (status === 'in-progress') return `Continuar lección: ${lessonTitle || lessonId}`;
    if (allowEmpty) return `Lección en construcción: ${lessonTitle || lessonId}`;
    return isAvailable ? `Comenzar lección: ${lessonTitle || lessonId}` : `Lección bloqueada: ${lessonTitle || lessonId}`;
  };

  const getTooltipText = () => {
    // Si allowEmpty === true, mostrar 'Disponible próximamente'
    if (allowEmpty) {
      return 'Disponible próximamente';
    }
    // Si no hay secciones y allowEmpty !== true, no mostrar tooltip (botón deshabilitado)
    if (shouldDisableForNoSections) {
      return '';
    }
    if (isAvailable) {
      return '';
    }
    if (missingPrerequisites && missingPrerequisites.length > 0) {
      const missingList = Array.isArray(missingPrerequisites)
        ? missingPrerequisites.join(', ')
        : missingPrerequisites;
      return `Para acceder a esta lección, completa primero: ${missingList}`;
    }
    return 'Debes completar los prerequisitos del módulo antes de acceder a esta lección';
  };

  // Determinar si el botón debe estar deshabilitado
  const isDisabled = !isAvailable || allowEmpty || shouldDisableForNoSections;
  
  // Handler para el click: si hay secciones, navegar usando router.push
  const handleClick = (e) => {
    e.stopPropagation();
    
    // Solo navegar si hay secciones y el botón no está deshabilitado
    if (hasSections && !isDisabled) {
      if (onLessonClick) {
        onLessonClick(moduleId, lessonId);
      } else {
        // Fallback: usar router.push directamente
        router.push(`/teaching/${moduleId}/${lessonId}`);
      }
    }
  };

  const button = (
    <Button
      variant={status === 'completed' ? 'outlined' : 'contained'}
      fullWidth
      disabled={isDisabled}
      onClick={handleClick}
      aria-label={getAriaLabel()}
      aria-disabled={isDisabled ? true : undefined}
      startIcon={getButtonIcon()}
      sx={{
        fontSize: '0.875rem',
        fontWeight: 600,
        textTransform: 'none',
        py: 1,
        borderRadius: 1.5,
        backgroundColor: status !== 'completed' && !isDisabled && hasSections ? levelColor : 'transparent',
        borderColor: !isDisabled && hasSections ? levelColor : theme.palette.grey[300],
        color: status !== 'completed' && !isDisabled && hasSections ? '#fff' : levelColor,
        boxShadow: 'none',
        transition: 'all 0.25s ease-in-out',
        // Estilos específicos para allowEmpty o sin secciones
        ...((allowEmpty || shouldDisableForNoSections) && {
          pointerEvents: 'none',
          opacity: 0.6
        }),
        '&:hover': !isDisabled && hasSections ? {
          backgroundColor: status !== 'completed' ? levelColor : 'transparent',
          filter: 'brightness(0.92)',
          boxShadow: 'none',
          transform: 'scale(1.02)'
        } : {},
        '&.Mui-disabled': {
          backgroundColor: 'transparent',
          borderColor: theme.palette.grey[300],
          color: theme.palette.grey[400],
          ...((allowEmpty || shouldDisableForNoSections) && {
            pointerEvents: 'none',
            opacity: 0.6
          })
        }
      }}
    >
      {getButtonText()}
    </Button>
  );

  // Si el botón está deshabilitado o allowEmpty, envolver en tooltip si hay texto
  const tooltipText = getTooltipText();
  const shouldShowTooltip = (isDisabled || allowEmpty) && tooltipText;
  
  if (shouldShowTooltip) {
    return (
      <footer className={styles.cardFooter}>
        <Tooltip
          title={tooltipText}
          placement="top"
          arrow
          enterDelay={300}
          leaveDelay={100}
        >
          <span style={{ display: 'block', width: '100%' }}>
            {button}
          </span>
        </Tooltip>
      </footer>
    );
  }

  return (
    <footer className={styles.cardFooter}>
      {button}
    </footer>
  );
};

LessonCardFooter.propTypes = {
  status: PropTypes.string.isRequired,
  isAvailable: PropTypes.bool.isRequired,
  allowEmpty: PropTypes.bool,
  levelColor: PropTypes.string.isRequired,
  theme: PropTypes.object.isRequired,
  onLessonClick: PropTypes.func.isRequired,
  moduleId: PropTypes.string.isRequired,
  lessonId: PropTypes.string.isRequired,
  lessonTitle: PropTypes.string,
  missingPrerequisites: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.string),
    PropTypes.string
  ]),
  sections: PropTypes.array
};

export default LessonCardFooter;

