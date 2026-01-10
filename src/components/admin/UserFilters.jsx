/**
 * =============================================================================
 * UserFilters Component
 * =============================================================================
 *
 * Componente modular para filtrar la tabla de usuarios en el panel de
 * administración. Proporciona filtros por rol, estado activo/inactivo y
 * fecha de registro.
 *
 * Características:
 * - Filtro por rol (ALL, STUDENT, TEACHER, ADMIN)
 * - Filtro por estado (Todos, Activos, Inactivos)
 * - Filtro por fecha de registro con opciones predefinidas
 * - Rango de fechas personalizado con DatePickers
 * - Botón para limpiar todos los filtros
 * - Diseño completamente responsive
 * - Aplicación automática de filtros mediante callbacks
 *
 * =============================================================================
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Paper,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ButtonGroup,
  Button,
  Typography,
} from '@mui/material';
import { FilterAltOff } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';

/**
 * Opciones predefinidas para el filtro de fechas
 */
const DATE_FILTER_OPTIONS = {
  ALL: 'all',
  LAST_WEEK: 'last_week',
  LAST_MONTH: 'last_month',
  LAST_YEAR: 'last_year',
  CUSTOM_RANGE: 'custom_range',
};

/**
 * Etiquetas para las opciones de fecha
 */
const DATE_FILTER_LABELS = {
  [DATE_FILTER_OPTIONS.ALL]: 'Todas las fechas',
  [DATE_FILTER_OPTIONS.LAST_WEEK]: 'Última semana',
  [DATE_FILTER_OPTIONS.LAST_MONTH]: 'Último mes',
  [DATE_FILTER_OPTIONS.LAST_YEAR]: 'Último año',
  [DATE_FILTER_OPTIONS.CUSTOM_RANGE]: 'Rango personalizado',
};

/**
 * Componente UserFilters
 *
 * Renderiza todos los filtros para la tabla de usuarios del panel de administración.
 * Los filtros se aplican automáticamente a través de los callbacks proporcionados como props.
 *
 * @component
 * @example
 * ```jsx
 * <UserFilters
 *   roleFilter="ALL"
 *   statusFilter="all"
 *   dateFilter={{ type: 'all', dateFrom: null, dateTo: null }}
 *   onRoleChange={(role) => setRoleFilter(role)}
 *   onStatusChange={(status) => setStatusFilter(status)}
 *   onDateChange={(dateFilter) => setDateFilter(dateFilter)}
 *   onClearFilters={() => clearAllFilters()}
 * />
 * ```
 *
 * @param {Object} props - Propiedades del componente
 * @param {string} props.roleFilter - Valor actual del filtro de rol ('ALL', 'STUDENT', 'TEACHER', 'ADMIN')
 * @param {string} props.statusFilter - Valor actual del filtro de estado ('all', 'active', 'inactive')
 * @param {Object} props.dateFilter - Objeto con el filtro de fecha actual
 * @param {string} props.dateFilter.type - Tipo de filtro de fecha (valores de DATE_FILTER_OPTIONS)
 * @param {Date|null} props.dateFilter.dateFrom - Fecha de inicio para rango personalizado
 * @param {Date|null} props.dateFilter.dateTo - Fecha de fin para rango personalizado
 * @param {Function} props.onRoleChange - Callback llamado cuando cambia el filtro de rol
 * @param {Function} props.onStatusChange - Callback llamado cuando cambia el filtro de estado
 * @param {Function} props.onDateChange - Callback llamado cuando cambia el filtro de fecha
 * @param {Function} props.onClearFilters - Callback llamado cuando se limpian todos los filtros
 * @returns {JSX.Element} Componente de filtros
 */
const UserFilters = ({
  roleFilter,
  statusFilter,
  dateFilter,
  onRoleChange,
  onStatusChange,
  onDateChange,
  onClearFilters,
}) => {
  // ============================================================================
  // Estado Local
  // ============================================================================

  // Estado interno para las fechas del rango personalizado
  const [customDateFrom, setCustomDateFrom] = useState(dateFilter.dateFrom);
  const [customDateTo, setCustomDateTo] = useState(dateFilter.dateTo);

  // ============================================================================
  // Manejadores de Eventos
  // ============================================================================

  /**
   * Maneja el cambio en el filtro de rol
   *
   * @param {Object} event - Evento del select
   */
  const handleRoleChange = (event) => {
    const newRole = event.target.value;
    onRoleChange(newRole);
  };

  /**
   * Maneja el cambio en el filtro de estado
   *
   * @param {string} status - Nuevo estado ('all', 'active', 'inactive')
   */
  const handleStatusChange = (status) => {
    onStatusChange(status);
  };

  /**
   * Maneja el cambio en el tipo de filtro de fecha
   *
   * @param {Object} event - Evento del select
   */
  const handleDateTypeChange = (event) => {
    const newType = event.target.value;

    // Calcular fechas automáticamente para opciones predefinidas
    let dateFrom = null;
    let dateTo = null;
    const today = new Date();

    switch (newType) {
      case DATE_FILTER_OPTIONS.LAST_WEEK:
        dateFrom = new Date(today);
        dateFrom.setDate(today.getDate() - 7);
        dateTo = today;
        break;

      case DATE_FILTER_OPTIONS.LAST_MONTH:
        dateFrom = new Date(today);
        dateFrom.setMonth(today.getMonth() - 1);
        dateTo = today;
        break;

      case DATE_FILTER_OPTIONS.LAST_YEAR:
        dateFrom = new Date(today);
        dateFrom.setFullYear(today.getFullYear() - 1);
        dateTo = today;
        break;

      case DATE_FILTER_OPTIONS.CUSTOM_RANGE:
        // Mantener las fechas personalizadas actuales
        dateFrom = customDateFrom;
        dateTo = customDateTo;
        break;

      case DATE_FILTER_OPTIONS.ALL:
      default:
        // Sin filtro de fecha
        dateFrom = null;
        dateTo = null;
        break;
    }

    onDateChange({
      type: newType,
      dateFrom,
      dateTo,
    });
  };

  /**
   * Maneja el cambio en la fecha de inicio del rango personalizado
   *
   * @param {Date|null} newDate - Nueva fecha de inicio
   */
  const handleCustomDateFromChange = (newDate) => {
    setCustomDateFrom(newDate);
    onDateChange({
      type: DATE_FILTER_OPTIONS.CUSTOM_RANGE,
      dateFrom: newDate,
      dateTo: customDateTo,
    });
  };

  /**
   * Maneja el cambio en la fecha de fin del rango personalizado
   *
   * @param {Date|null} newDate - Nueva fecha de fin
   */
  const handleCustomDateToChange = (newDate) => {
    setCustomDateTo(newDate);
    onDateChange({
      type: DATE_FILTER_OPTIONS.CUSTOM_RANGE,
      dateFrom: customDateFrom,
      dateTo: newDate,
    });
  };

  /**
   * Maneja la limpieza de todos los filtros
   */
  const handleClearFilters = () => {
    setCustomDateFrom(null);
    setCustomDateTo(null);
    onClearFilters();
  };

  // ============================================================================
  // Verificar si hay filtros activos
  // ============================================================================

  const hasActiveFilters =
    roleFilter !== 'ALL' ||
    statusFilter !== 'all' ||
    dateFilter.type !== DATE_FILTER_OPTIONS.ALL;

  // ============================================================================
  // Renderizado
  // ============================================================================

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
      <Paper
        elevation={2}
        sx={{
          p: 2,
          borderRadius: 1,
          mb: 3,
        }}
      >
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" component="h2">
            Filtros
          </Typography>
          {hasActiveFilters && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<FilterAltOff />}
              onClick={handleClearFilters}
              color="secondary"
            >
              Limpiar filtros
            </Button>
          )}
        </Box>

        <Grid container spacing={2}>
          {/* =================================================================== */}
          {/* Filtro por Rol */}
          {/* =================================================================== */}
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel id="role-filter-label">Rol</InputLabel>
              <Select
                labelId="role-filter-label"
                id="role-filter"
                value={roleFilter}
                label="Rol"
                onChange={handleRoleChange}
              >
                <MenuItem value="ALL">
                  <Typography variant="body2">Todos los roles</Typography>
                </MenuItem>
                <MenuItem value="STUDENT">
                  <Typography variant="body2">Estudiante</Typography>
                </MenuItem>
                <MenuItem value="TEACHER">
                  <Typography variant="body2">Profesor</Typography>
                </MenuItem>
                <MenuItem value="ADMIN">
                  <Typography variant="body2">Administrador</Typography>
                </MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* =================================================================== */}
          {/* Filtro por Estado (Activo/Inactivo) */}
          {/* =================================================================== */}
          <Grid item xs={12} sm={6} md={3}>
            <Box>
              <Typography
                variant="caption"
                display="block"
                gutterBottom
                sx={{ color: 'text.secondary', mb: 0.5 }}
              >
                Estado
              </Typography>
              <ButtonGroup fullWidth size="small" variant="outlined">
                <Button
                  variant={statusFilter === 'all' ? 'contained' : 'outlined'}
                  onClick={() => handleStatusChange('all')}
                >
                  Todos
                </Button>
                <Button
                  variant={statusFilter === 'active' ? 'contained' : 'outlined'}
                  onClick={() => handleStatusChange('active')}
                  color="success"
                >
                  Activos
                </Button>
                <Button
                  variant={statusFilter === 'inactive' ? 'contained' : 'outlined'}
                  onClick={() => handleStatusChange('inactive')}
                  color="error"
                >
                  Inactivos
                </Button>
              </ButtonGroup>
            </Box>
          </Grid>

          {/* =================================================================== */}
          {/* Filtro por Fecha de Registro */}
          {/* =================================================================== */}
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel id="date-filter-label">Fecha de registro</InputLabel>
              <Select
                labelId="date-filter-label"
                id="date-filter"
                value={dateFilter.type}
                label="Fecha de registro"
                onChange={handleDateTypeChange}
              >
                {Object.entries(DATE_FILTER_LABELS).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    <Typography variant="body2">{label}</Typography>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Espacio vacío para alineación en desktop cuando no hay rango personalizado */}
          {dateFilter.type !== DATE_FILTER_OPTIONS.CUSTOM_RANGE && (
            <Grid item xs={12} sm={6} md={3} />
          )}

          {/* =================================================================== */}
          {/* Rango Personalizado de Fechas */}
          {/* =================================================================== */}
          {dateFilter.type === DATE_FILTER_OPTIONS.CUSTOM_RANGE && (
            <>
              <Grid item xs={12} sm={6} md={3}>
                <DatePicker
                  label="Fecha de inicio"
                  value={customDateFrom}
                  onChange={handleCustomDateFromChange}
                  slotProps={{
                    textField: {
                      size: 'small',
                      fullWidth: true,
                    },
                  }}
                  maxDate={customDateTo || new Date()}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <DatePicker
                  label="Fecha de fin"
                  value={customDateTo}
                  onChange={handleCustomDateToChange}
                  slotProps={{
                    textField: {
                      size: 'small',
                      fullWidth: true,
                    },
                  }}
                  minDate={customDateFrom}
                  maxDate={new Date()}
                />
              </Grid>
            </>
          )}
        </Grid>
      </Paper>
    </LocalizationProvider>
  );
};

// ============================================================================
// PropTypes para Validación
// ============================================================================

UserFilters.propTypes = {
  /**
   * Valor actual del filtro de rol
   */
  roleFilter: PropTypes.oneOf(['ALL', 'STUDENT', 'TEACHER', 'ADMIN']).isRequired,

  /**
   * Valor actual del filtro de estado
   */
  statusFilter: PropTypes.oneOf(['all', 'active', 'inactive']).isRequired,

  /**
   * Objeto con el filtro de fecha actual
   */
  dateFilter: PropTypes.shape({
    /**
     * Tipo de filtro de fecha
     */
    type: PropTypes.oneOf([
      DATE_FILTER_OPTIONS.ALL,
      DATE_FILTER_OPTIONS.LAST_WEEK,
      DATE_FILTER_OPTIONS.LAST_MONTH,
      DATE_FILTER_OPTIONS.LAST_YEAR,
      DATE_FILTER_OPTIONS.CUSTOM_RANGE,
    ]).isRequired,

    /**
     * Fecha de inicio para rango personalizado (puede ser null)
     */
    dateFrom: PropTypes.instanceOf(Date),

    /**
     * Fecha de fin para rango personalizado (puede ser null)
     */
    dateTo: PropTypes.instanceOf(Date),
  }).isRequired,

  /**
   * Callback llamado cuando cambia el filtro de rol
   * @param {string} role - Nuevo rol seleccionado
   */
  onRoleChange: PropTypes.func.isRequired,

  /**
   * Callback llamado cuando cambia el filtro de estado
   * @param {string} status - Nuevo estado seleccionado
   */
  onStatusChange: PropTypes.func.isRequired,

  /**
   * Callback llamado cuando cambia el filtro de fecha
   * @param {Object} dateFilter - Nuevo filtro de fecha
   * @param {string} dateFilter.type - Tipo de filtro
   * @param {Date|null} dateFilter.dateFrom - Fecha de inicio
   * @param {Date|null} dateFilter.dateTo - Fecha de fin
   */
  onDateChange: PropTypes.func.isRequired,

  /**
   * Callback llamado cuando se limpian todos los filtros
   */
  onClearFilters: PropTypes.func.isRequired,
};

// ============================================================================
// Valores por Defecto
// ============================================================================

UserFilters.defaultProps = {
  roleFilter: 'ALL',
  statusFilter: 'all',
  dateFilter: {
    type: DATE_FILTER_OPTIONS.ALL,
    dateFrom: null,
    dateTo: null,
  },
};

// ============================================================================
// Exportaciones
// ============================================================================

export default UserFilters;

// Exportar también las constantes para uso externo
export { DATE_FILTER_OPTIONS, DATE_FILTER_LABELS };
