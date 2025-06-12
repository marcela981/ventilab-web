import React from 'react';
import './ParameterCard.css';

const ParameterCard = ({
  title,
  value,
  unit = '',
  subtitle = '',
  variant = 'default',
  size = 'medium'
}) => {
  // Formatear el valor
  const formatValue = (val) => {
    if (val === null || val === undefined || val === '') return '--';
    if (typeof val === 'number') {
      // Si es un número decimal, mostrar hasta 1 decimal
      return val % 1 !== 0 ? val.toFixed(1) : val.toString();
    }
    return val.toString();
  };

  return (
    <div className={`parameter-card parameter-card--${variant} parameter-card--${size}`}>
      {/* Valor principal */}
      <div className="parameter-card__value">
        {formatValue(value)}
      </div>

      {/* Unidad */}
      {unit && (
        <div className="parameter-card__unit">
          {unit}
        </div>
      )}

      {/* Título/Label */}
      <div className="parameter-card__title">
        {title}
      </div>

      {/* Subtítulo opcional */}
      {subtitle && (
        <div className="parameter-card__subtitle">
          {subtitle}
        </div>
      )}
    </div>
  );
};

export default ParameterCard; 