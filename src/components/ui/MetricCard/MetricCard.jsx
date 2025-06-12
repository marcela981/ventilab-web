import React from 'react';
import './MetricCard.css';

const MetricCard = ({ 
  value = '31',
  unit = 'cm H2O',
  label = 'Presión pico',
  className = ''
}) => {
  return (
    <div className={`metric-card ${className}`}>
      <div className="metric-card__content">
        <div className="metric-card__value-row">
          <span className="metric-card__value">{value}</span>
          <span className="metric-card__unit">{unit}</span>
        </div>
        <div className="metric-card__label">{label}</div>
      </div>
    </div>
  );
};

export default MetricCard; 