import React from 'react';
import PropTypes from 'prop-types';

/**
 * Overlay para módulos bloqueados - bloqueador transparente para prevenir interacciones
 * 
 * Este overlay proporciona una capa adicional de protección contra clicks
 * en módulos bloqueados. El icono Lock y el tooltip se muestran en el header.
 */
const ModuleCardOverlay = () => {
  return (
    <div
      data-block-overlay
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'auto', // Permitir eventos para bloquear clicks en el contenido
        background: 'transparent',
        zIndex: 10,
        cursor: 'not-allowed',
      }}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
      aria-hidden="true"
    />
  );
};

ModuleCardOverlay.propTypes = {
  // missingPrerequisites ya no se usa aquí, se pasa al header para el tooltip
};

export default ModuleCardOverlay;

