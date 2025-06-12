import React from 'react';
import './ModeSelector.css';

const ModeSelector = ({
  mode,
  onChange,
  options = [],
  disabled = false
}) => {
  // Opciones por defecto si no se proporcionan
  const defaultOptions = [
    { value: 'volume', label: 'Volumen Control' },
    { value: 'pressure', label: 'Presión Control' },
    { value: 'flow', label: 'Flujo Control' }
  ];

  const modeOptions = options.length > 0 ? options : defaultOptions;

  const handleModeChange = (newMode) => {
    if (disabled || mode === newMode) return;
    onChange?.(newMode);
  };

  return (
    <div className={`mode-selector ${disabled ? 'mode-selector--disabled' : ''}`}>
      <div className="mode-selector__tabs">
        {modeOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`mode-selector__tab ${
              mode === option.value ? 'mode-selector__tab--active' : ''
            } ${option.disabled ? 'mode-selector__tab--disabled' : ''}`}
            onClick={() => handleModeChange(option.value)}
            disabled={disabled || option.disabled}
            aria-label={`Seleccionar modo ${option.label}`}
            role="tab"
            aria-selected={mode === option.value}
          >
            <span className="mode-selector__tab-text">
              {option.label}
            </span>
          </button>
        ))}
      </div>
      
      {/* Indicador visual del modo activo */}
      <div className="mode-selector__indicator">
        <div className="mode-selector__indicator-text">
          Modo Activo: {modeOptions.find(opt => opt.value === mode)?.label || 'Ninguno'}
        </div>
      </div>
    </div>
  );
};

export default ModeSelector; 