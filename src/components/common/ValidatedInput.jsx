import React, { useState, useEffect } from 'react';
import {
  TextField,
  Box,
  Typography,
  Tooltip,
  InputAdornment,
  IconButton
} from '@mui/material';
import {
  Error as ErrorIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon
} from '@mui/icons-material';

const ValidatedInput = ({
  parameter,
  value,
  onChange,
  label,
  unit = '',
  validation,
  ranges,
  disabled = false,
  size = 'small',
  variant = 'outlined',
  sx = {},
  ...props
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (event) => {
    const newValue = Number(event.target.value);
    setLocalValue(newValue);
    onChange(parameter, newValue);
  };

  const getValidationStatus = () => {
    if (!validation) return { status: 'neutral', color: 'text.secondary' };
    
    if (validation.severity === 'critical') {
      return { status: 'error', color: 'error.main' };
    } else if (validation.severity === 'warning') {
      return { status: 'warning', color: 'warning.main' };
    } else {
      return { status: 'success', color: 'success.main' };
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'error':
        return <ErrorIcon fontSize="small" color="error" />;
      case 'warning':
        return <WarningIcon fontSize="small" color="warning" />;
      case 'success':
        return <CheckCircleIcon fontSize="small" color="success" />;
      default:
        return <InfoIcon fontSize="small" color="action" />;
    }
  };

  const getRangeInfo = () => {
    if (!ranges) return '';
    
    const { min, max, safe, unit: rangeUnit } = ranges;
    const displayUnit = unit || rangeUnit || '';
    
    let info = `Rango: ${min} - ${max} ${displayUnit}`;
    
    if (safe) {
      info += ` | Seguro: ${safe[0]} - ${safe[1]} ${displayUnit}`;
    }
    
    return info;
  };

  const getValidationMessage = () => {
    if (!validation) return '';
    
    const messages = [];
    
    if (validation.errors && validation.errors.length > 0) {
      messages.push(...validation.errors);
    }
    
    if (validation.warnings && validation.warnings.length > 0) {
      messages.push(...validation.warnings);
    }
    
    return messages.join('\n');
  };

  const validationStatus = getValidationStatus();
  const rangeInfo = getRangeInfo();
  const validationMessage = getValidationMessage();

  return (
    <Box sx={{ position: 'relative', ...sx }}>
      <TextField
        type="number"
        variant={variant}
        size={size}
        label={label}
        value={localValue}
        onChange={handleChange}
        disabled={disabled}
        error={validationStatus.status === 'error'}
        helperText={validationMessage}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              {unit && (
                <Typography variant="caption" color="text.secondary">
                  {unit}
                </Typography>
              )}
              {validation && (
                <IconButton
                  size="small"
                  onClick={() => setShowTooltip(!showTooltip)}
                  sx={{ ml: 0.5 }}
                >
                  {getStatusIcon(validationStatus.status)}
                </IconButton>
              )}
            </InputAdornment>
          ),
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            '&.Mui-focused fieldset': {
              borderColor: validationStatus.color,
            },
          },
          '& .MuiInputLabel-root.Mui-focused': {
            color: validationStatus.color,
          },
        }}
        {...props}
      />
      
      {validation && (
        <Tooltip
          open={showTooltip}
          onClose={() => setShowTooltip(false)}
          title={
            <Box>
              <Typography variant="body2" fontWeight="bold">
                {validationStatus.status === 'error' ? 'Errores:' : 
                 validationStatus.status === 'warning' ? 'Advertencias:' : 'Configuración válida'}
              </Typography>
              {validationMessage && (
                <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                  {validationMessage}
                </Typography>
              )}
              {rangeInfo && (
                <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
                  {rangeInfo}
                </Typography>
              )}
            </Box>
          }
          arrow
          placement="top"
        >
          <Box />
        </Tooltip>
      )}
    </Box>
  );
};

export default ValidatedInput; 