import React from 'react';
import { Tooltip } from '@mui/material';
import { curriculumData } from '@/data/curriculumData';

/**
 * PrerequisiteTooltip - Componente accesible para mostrar información sobre prerrequisitos faltantes
 * 
 * Muestra un tooltip que explica qué prerrequisitos faltan cuando un módulo está bloqueado.
 * Se activa con hover y focus sobre el elemento hijo (típicamente un ícono de candado).
 * 
 * @param {Object} props - Props del componente
 * @param {string[]} [props.missing=[]] - Array de IDs de módulos prerrequisitos faltantes
 * @param {React.ReactNode} props.children - Elemento hijo sobre el cual se activa el tooltip
 * @param {'top'|'bottom'|'left'|'right'} [props.side='top'] - Posición del tooltip
 * @param {number} [props.maxWidth=280] - Ancho máximo del tooltip en píxeles
 * @returns {JSX.Element} Componente con tooltip
 * 
 * @example
 * // Módulo bloqueado con prerrequisitos faltantes
 * <PrerequisiteTooltip missing={['module-01-fundamentals', 'module-02-parameters']} side="top">
 *   <LockIcon />
 * </PrerequisiteTooltip>
 * 
 * @example
 * // Módulo disponible (sin prerrequisitos faltantes)
 * <PrerequisiteTooltip missing={[]}>
 *   <LockOpenIcon />
 * </PrerequisiteTooltip>
 */
const PrerequisiteTooltip = ({ 
  missing = [], 
  children, 
  side = 'top', 
  maxWidth = 280 
}) => {
  // Determinar el contenido del tooltip
  const getTooltipContent = () => {
    if (missing.length === 0) {
      return 'Este módulo está disponible.';
    }
    
    // Obtener títulos de módulos desde curriculumData
    const missingTitles = missing
      .map(moduleId => {
        const module = curriculumData.modules?.[moduleId];
        return module?.title || moduleId;
      })
      .filter(Boolean);
    
    if (missingTitles.length === 0) {
      return 'Este módulo requiere completar módulos previos.';
    }
    
    if (missingTitles.length === 1) {
      return `Para desbloquear este módulo, completa: ${missingTitles[0]}`;
    }
    
    return `Para desbloquear este módulo, completa los siguientes módulos: ${missingTitles.join(', ')}`;
  };

  return (
    <Tooltip
      title={getTooltipContent()}
      placement={side}
      arrow
      enterDelay={300}
      leaveDelay={100}
      componentsProps={{
        tooltip: {
          sx: {
            maxWidth: `${maxWidth}px`,
            bgcolor: '#111',
            color: '#fff',
            fontSize: '12px',
            padding: '8px',
            borderRadius: '6px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            '& .MuiTooltip-arrow': {
              color: '#111'
            }
          },
          role: 'tooltip',
          'aria-live': 'polite'
        }
      }}
    >
      <span style={{ display: 'inline-flex', cursor: 'help' }}>
        {children}
      </span>
    </Tooltip>
  );
};

export default PrerequisiteTooltip;

