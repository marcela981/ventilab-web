import React, { forwardRef } from 'react';
import './NumericInput.css';

const NumericInput = forwardRef(({
  value,
  onChange,
  placeholder = "",
  min,
  max,
  step = 1,
  disabled = false,
  error = false,
  helperText = "",
  label = "",
  unit = "",
  className = "",
  style = {},
  ...props
}, ref) => {
  const handleChange = (e) => {
    const newValue = e.target.value;
    
    // Permitir valores vacíos para facilitar la edición
    if (newValue === '') {
      onChange && onChange(e);
      return;
    }

    // Validar que sea un número
    const numericValue = parseFloat(newValue);
    if (!isNaN(numericValue)) {
      onChange && onChange(e);
    }
  };

  const inputClasses = [
    'numeric-input',
    error ? 'numeric-input--error' : '',
    disabled ? 'numeric-input--disabled' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className="numeric-input-container" style={style}>
      {label && (
        <label className="numeric-input-label">
          {label}
        </label>
      )}
      
      <div className="numeric-input-wrapper">
        <input
          ref={ref}
          type="number"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          className={inputClasses}
          {...props}
        />
        {unit && (
          <span className="numeric-input-unit">
            {unit}
          </span>
        )}
      </div>
      
      {helperText && (
        <div className={`numeric-input-helper ${error ? 'numeric-input-helper--error' : ''}`}>
          {helperText}
        </div>
      )}
    </div>
  );
});

NumericInput.displayName = 'NumericInput';

export default NumericInput; 