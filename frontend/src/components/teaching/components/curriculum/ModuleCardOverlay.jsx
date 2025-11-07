import React from 'react';
import PropTypes from 'prop-types';
import ModuleStatusIcons from './ModuleStatusIcons';
import PrerequisiteTooltip from './PrerequisiteTooltip';

/**
 * Overlay para módulos bloqueados - muestra candado pero sin interacción
 */
const ModuleCardOverlay = ({ missingPrerequisites }) => {
  return (
    <div
      data-block-overlay
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'flex-end',
        padding: '8px',
        pointerEvents: 'none',
        background: 'transparent',
        zIndex: 10,
      }}
    >
      <div
        style={{
          pointerEvents: 'auto',
        }}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
      >
        <PrerequisiteTooltip
          missing={missingPrerequisites}
          side="top"
          maxWidth={280}
        >
          <span 
            tabIndex={-1} 
            style={{ 
              outline: 'none',
              cursor: 'not-allowed',
              pointerEvents: 'auto'
            }}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
          >
            <ModuleStatusIcons isAvailable={false} size={20} color={undefined} />
          </span>
        </PrerequisiteTooltip>
      </div>
    </div>
  );
};

ModuleCardOverlay.propTypes = {
  missingPrerequisites: PropTypes.array.isRequired
};

export default ModuleCardOverlay;

