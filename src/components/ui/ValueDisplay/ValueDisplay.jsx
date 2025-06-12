import React from 'react';
import './ValueDisplay.css';

const ValueDisplay = ({
  value,
  unit = '',
  label = '',
  showArrows = false,
  onIncrement,
  onDecrement,
  precision = 0,
  color = 'primary',
  disabled = false,
  min,
  max
}) => {
  // Formatear el valor según la precisión
  const formatValue = (val) => {
    if (val === null || val === undefined || val === '') return '--';
    if (typeof val === 'number') {
      return precision > 0 ? val.toFixed(precision) : Math.round(val).toString();
    }
    return val.toString();
  };

  // Manejar incremento
  const handleIncrement = () => {
    if (disabled || !onIncrement) return;
    if (max !== undefined && value >= max) return;
    onIncrement();
  };

  // Manejar decremento
  const handleDecrement = () => {
    if (disabled || !onDecrement) return;
    if (min !== undefined && value <= min) return;
    onDecrement();
  };

  return (
    <div className={`value-display value-display--${color} ${disabled ? 'value-display--disabled' : ''}`}>
      {/* Contenedor principal de valor y unidad */}
      <div className="value-display__main">
        <div className="value-display__value">
          {formatValue(value)}
        </div>
        
        {unit && (
          <div className="value-display__unit">
            {unit}
          </div>
        )}

        {/* Flechas de control */}
        {showArrows && (
          <div className="value-display__arrows">
            <button
              type="button"
              className="value-display__arrow value-display__arrow--up"
              onClick={handleIncrement}
              disabled={disabled || (max !== undefined && value >= max)}
              aria-label={`Incrementar ${label || 'valor'}`}
            >
              ▲
            </button>
            <button
              type="button"
              className="value-display__arrow value-display__arrow--down"
              onClick={handleDecrement}
              disabled={disabled || (min !== undefined && value <= min)}
              aria-label={`Decrementar ${label || 'valor'}`}
            >
              ▼
            </button>
          </div>
        )}
      </div>

      {/* Label */}
      {label && (
        <div className="value-display__label">
          {label}
        </div>
      )}
    </div>
  );
};

export default ValueDisplay; 