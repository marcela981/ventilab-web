import React, { useState, useCallback } from 'react';
import './FormField.css';

const FormField = ({
  label,
  value,
  unit = '',
  min = 0,
  max = 100,
  step = 1,
  onChange,
  disabled = false,
  error = false,
  helperText = '',
  precision = 0
}) => {
  const [inputValue, setInputValue] = useState(value?.toString() || '');
  const [isFocused, setIsFocused] = useState(false);

  // Formatear el valor según la precisión
  const formatValue = useCallback((val) => {
    if (val === '' || val === null || val === undefined) return '';
    const num = parseFloat(val);
    if (isNaN(num)) return '';
    return precision > 0 ? num.toFixed(precision) : Math.round(num).toString();
  }, [precision]);

  // Manejar cambios en el input
  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    // Validar y convertir a número
    if (newValue === '') {
      onChange?.(min);
      return;
    }
    
    const numValue = parseFloat(newValue);
    if (!isNaN(numValue)) {
      const clampedValue = Math.min(Math.max(numValue, min), max);
      onChange?.(clampedValue);
    }
  };

  // Manejar blur del input
  const handleBlur = () => {
    setIsFocused(false);
    const formattedValue = formatValue(value);
    setInputValue(formattedValue);
  };

  // Manejar focus del input
  const handleFocus = () => {
    setIsFocused(true);
    setInputValue(value?.toString() || '');
  };

  // Incrementar valor
  const handleIncrement = () => {
    if (disabled) return;
    const newValue = Math.min((value || 0) + step, max);
    onChange?.(newValue);
  };

  // Decrementar valor
  const handleDecrement = () => {
    if (disabled) return;
    const newValue = Math.max((value || 0) - step, min);
    onChange?.(newValue);
  };

  // Manejar teclas del teclado
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      handleIncrement();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      handleDecrement();
    }
  };

  return (
    <div className={`form-field ${disabled ? 'form-field--disabled' : ''} ${error ? 'form-field--error' : ''}`}>
      {/* Label */}
      <div className="form-field__label">
        {label}
      </div>

      {/* Input Container */}
      <div className={`form-field__input-container ${isFocused ? 'form-field__input-container--focused' : ''}`}>
        <input
          type="text"
          className="form-field__input"
          value={isFocused ? inputValue : formatValue(value)}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          aria-label={label}
        />
        
        {/* Unit */}
        {unit && (
          <span className="form-field__unit">{unit}</span>
        )}

        {/* Arrow Controls */}
        <div className="form-field__arrows">
          <button
            type="button"
            className="form-field__arrow form-field__arrow--up"
            onClick={handleIncrement}
            disabled={disabled || value >= max}
            aria-label={`Incrementar ${label}`}
          >
            ▲
          </button>
          <button
            type="button"
            className="form-field__arrow form-field__arrow--down"
            onClick={handleDecrement}
            disabled={disabled || value <= min}
            aria-label={`Decrementar ${label}`}
          >
            ▼
          </button>
        </div>
      </div>

      {/* Helper Text */}
      {helperText && (
        <div className={`form-field__helper ${error ? 'form-field__helper--error' : ''}`}>
          {helperText}
        </div>
      )}
    </div>
  );
};

export default FormField; 