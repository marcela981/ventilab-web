/**
 * =============================================================================
 * UserSearchBar Component
 * =============================================================================
 *
 * Barra de búsqueda global para usuarios en el panel de administración.
 * Implementa búsqueda en tiempo real con debounce para optimizar las
 * peticiones al backend.
 *
 * Características:
 * - Búsqueda en tiempo real con debounce de 300ms
 * - Icono de búsqueda al inicio del campo
 * - Botón de limpiar que aparece cuando hay texto
 * - Indicador de loading durante la búsqueda
 * - Contador de resultados encontrados
 * - Diseño completamente responsive
 * - Limpieza apropiada de timeouts
 *
 * =============================================================================
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  TextField,
  InputAdornment,
  IconButton,
  CircularProgress,
  Typography,
} from '@mui/material';
import { Search, Clear } from '@mui/icons-material';

/**
 * Delay en milisegundos para el debounce de búsqueda
 */
const DEBOUNCE_DELAY = 300;

/**
 * Componente UserSearchBar
 *
 * Renderiza una barra de búsqueda con debounce para buscar usuarios
 * por nombre o email en el panel de administración.
 *
 * @component
 * @example
 * ```jsx
 * <UserSearchBar
 *   searchValue=""
 *   onSearchChange={(value) => setSearchQuery(value)}
 *   resultsCount={150}
 *   isSearching={false}
 * />
 * ```
 *
 * @param {Object} props - Propiedades del componente
 * @param {string} props.searchValue - Valor actual del campo de búsqueda
 * @param {Function} props.onSearchChange - Callback llamado cuando cambia el valor de búsqueda (con debounce)
 * @param {number} props.resultsCount - Número total de resultados encontrados
 * @param {boolean} props.isSearching - Indica si se está realizando una búsqueda
 * @returns {JSX.Element} Componente de barra de búsqueda
 */
const UserSearchBar = ({
  searchValue,
  onSearchChange,
  resultsCount,
  isSearching,
}) => {
  // ============================================================================
  // Estado Local
  // ============================================================================

  // Valor local del input (se actualiza inmediatamente al escribir)
  const [localValue, setLocalValue] = useState(searchValue);

  // Referencia al timeout del debounce para poder limpiarlo
  const debounceTimeoutRef = useRef(null);

  // ============================================================================
  // Sincronizar valor externo con valor local
  // ============================================================================

  /**
   * Sincroniza el valor local con el valor externo cuando cambia
   * Esto permite controlar el componente desde el padre
   */
  useEffect(() => {
    setLocalValue(searchValue);
  }, [searchValue]);

  // ============================================================================
  // Debounce de la Búsqueda
  // ============================================================================

  /**
   * Maneja el cambio en el campo de búsqueda con debounce
   * Actualiza el valor local inmediatamente pero espera 300ms
   * antes de notificar al padre mediante el callback
   */
  const handleSearchChange = useCallback(
    (event) => {
      const newValue = event.target.value;

      // Actualizar el valor local inmediatamente (para UX responsive)
      setLocalValue(newValue);

      // Limpiar el timeout anterior si existe
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      // Crear nuevo timeout para el debounce
      debounceTimeoutRef.current = setTimeout(() => {
        // Notificar al padre después del delay
        onSearchChange(newValue);
      }, DEBOUNCE_DELAY);
    },
    [onSearchChange]
  );

  /**
   * Limpia el timeout cuando el componente se desmonta
   */
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // ============================================================================
  // Manejadores de Eventos
  // ============================================================================

  /**
   * Maneja el click en el botón de limpiar búsqueda
   * Limpia tanto el valor local como notifica al padre inmediatamente
   */
  const handleClearSearch = useCallback(() => {
    // Limpiar el timeout pendiente
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Limpiar el valor local
    setLocalValue('');

    // Notificar al padre inmediatamente (sin debounce)
    onSearchChange('');
  }, [onSearchChange]);

  // ============================================================================
  // Lógica para Mostrar Resultados
  // ============================================================================

  // Determinar si hay una búsqueda activa
  const hasActiveSearch = searchValue.trim().length > 0;

  // Generar el texto de resultados
  const getResultsText = () => {
    if (!hasActiveSearch) {
      return null;
    }

    if (resultsCount === 0) {
      return 'No se encontraron usuarios';
    }

    return `${resultsCount} resultado${resultsCount !== 1 ? 's' : ''} encontrado${resultsCount !== 1 ? 's' : ''}`;
  };

  const resultsText = getResultsText();

  // ============================================================================
  // Renderizado
  // ============================================================================

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: { xs: '100%', md: 600 },
        mb: 3,
      }}
    >
      <TextField
        fullWidth
        variant="outlined"
        size="medium"
        placeholder="Buscar por nombre o email..."
        value={localValue}
        onChange={handleSearchChange}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search color="action" />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              {isSearching && (
                <CircularProgress
                  size={20}
                  sx={{ mr: localValue ? 1 : 0 }}
                />
              )}
              {localValue && !isSearching && (
                <IconButton
                  size="small"
                  onClick={handleClearSearch}
                  edge="end"
                  aria-label="Limpiar búsqueda"
                  sx={{
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                >
                  <Clear fontSize="small" />
                </IconButton>
              )}
            </InputAdornment>
          ),
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            backgroundColor: 'background.paper',
            '&:hover fieldset': {
              borderColor: 'primary.main',
            },
            '&.Mui-focused fieldset': {
              borderColor: 'primary.main',
            },
          },
        }}
      />

      {/* Contador de Resultados */}
      {resultsText && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            display: 'block',
            mt: 1,
            ml: 0.5,
          }}
        >
          {resultsText}
        </Typography>
      )}
    </Box>
  );
};

// ============================================================================
// PropTypes para Validación
// ============================================================================

UserSearchBar.propTypes = {
  /**
   * Valor actual del campo de búsqueda
   */
  searchValue: PropTypes.string.isRequired,

  /**
   * Callback llamado cuando cambia el valor de búsqueda (con debounce de 300ms)
   * @param {string} value - Nuevo valor de búsqueda
   */
  onSearchChange: PropTypes.func.isRequired,

  /**
   * Número total de resultados encontrados
   */
  resultsCount: PropTypes.number.isRequired,

  /**
   * Indica si se está realizando una búsqueda en este momento
   */
  isSearching: PropTypes.bool,
};

// ============================================================================
// Valores por Defecto
// ============================================================================

UserSearchBar.defaultProps = {
  isSearching: false,
};

// ============================================================================
// Exportación
// ============================================================================

export default UserSearchBar;
