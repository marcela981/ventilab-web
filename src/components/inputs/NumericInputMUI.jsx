import React, { forwardRef } from 'react';
import { TextField, styled } from '@mui/material';

// Styled TextField con el diseño de Figma
const StyledTextField = styled(TextField)(({ theme, error }) => ({
  '& .MuiInputBase-root': {
    // Dimensiones ajustadas para pantalla mediana
    width: '160px',
    height: '42px',
    
    // Estilos visuales con tono #171515
    background: 'rgba(23, 21, 21, 0.3)',
    border: '1px solid #171515',
    boxShadow: 'inset 0px 2px 4px rgba(0, 0, 0, 0.3)',
    borderRadius: '5px',
    
    // Tipografía
    fontFamily: 'var(--font-body, "Inter", sans-serif)',
    fontSize: '14px',
    color: 'var(--text-primary, #FFFFFF)',
    
    // Eliminar bordes por defecto de MUI
    '&:before, &:after': {
      display: 'none',
    },
    
    // Estados de foco
    '&.Mui-focused': {
      borderColor: 'var(--primary-red, #da0037)',
      boxShadow: `
        inset 0px 4px 4px rgba(0, 0, 0, 0.25),
        0 0 0 2px rgba(218, 0, 55, 0.2)
      `,
    },
    
    // Estados de hover
    '&:hover:not(.Mui-disabled)': {
      borderColor: 'rgba(255, 255, 255, 0.4)',
      background: 'rgba(23, 21, 21, 0.5)',
    },
    
    // Estado de error
    ...(error && {
      borderColor: 'var(--error-color, #ff4444)',
      background: 'rgba(255, 68, 68, 0.1)',
      
      '&.Mui-focused': {
        boxShadow: `
          inset 0px 4px 4px rgba(0, 0, 0, 0.25),
          0 0 0 2px rgba(255, 68, 68, 0.3)
        `,
      },
    }),
    
    // Estado deshabilitado
    '&.Mui-disabled': {
      opacity: 0.6,
      background: 'rgba(23, 21, 21, 0.1)',
      borderColor: '#171515',
    },
  },
  
  '& .MuiInputBase-input': {
    padding: '8px 12px',
    color: 'var(--text-primary, #FFFFFF)',
    
    // Eliminar spinners del navegador
    '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': {
      WebkitAppearance: 'none',
      margin: 0,
    },
    
    // Firefox
    '&[type=number]': {
      MozAppearance: 'textfield',
    },
    
    // Placeholder
    '&::placeholder': {
      color: 'rgba(255, 255, 255, 0.5)',
      fontStyle: 'italic',
      opacity: 1,
    },
  },
  
  // Label styling
  '& .MuiInputLabel-root': {
    fontFamily: 'var(--font-body, "Inter", sans-serif)',
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--text-primary, #FFFFFF)',
    marginBottom: '8px',
    position: 'static',
    transform: 'none',
    
    '&.Mui-focused': {
      color: 'var(--primary-red, #da0037)',
    },
    
    '&.Mui-error': {
      color: 'var(--error-color, #ff4444)',
    },
  },
  
  // Helper text styling
  '& .MuiFormHelperText-root': {
    fontFamily: 'var(--font-body, "Inter", sans-serif)',
    fontSize: '12px',
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: '4px',
    
    '&.Mui-error': {
      color: 'var(--error-color, #ff4444)',
    },
  },
  
  // Responsive
  '@media (max-width: 768px)': {
    '& .MuiInputBase-root': {
      width: '100%',
      minWidth: '140px',
      height: '38px',
      fontSize: '13px',
    },
    
    '& .MuiInputBase-input': {
      padding: '6px 10px',
    },
    
    '& .MuiInputLabel-root': {
      fontSize: '12px',
    },
  },
}));

const NumericInputMUI = forwardRef(({
  value,
  onChange,
  label = "",
  placeholder = "",
  helperText = "",
  error = false,
  disabled = false,
  min,
  max,
  step = 1,
  variant = 'standard',
  size = 'medium',
  className = "",
  sx = {},
  InputProps = {},
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

  return (
    <StyledTextField
      ref={ref}
      value={value}
      onChange={handleChange}
      label={label}
      placeholder={placeholder}
      helperText={helperText}
      error={error}
      disabled={disabled}
      type="number"
      variant={variant}
      size={size}
      className={className}
      sx={sx}
      InputProps={{
        inputProps: {
          min,
          max,
          step,
        },
        ...InputProps,
      }}
      {...props}
    />
  );
});

NumericInputMUI.displayName = 'NumericInputMUI';

export default NumericInputMUI; 