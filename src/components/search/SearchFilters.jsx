/**
 * =============================================================================
 * SearchFilters Component - VentiLab
 * =============================================================================
 * Componente dedicado para filtros de búsqueda con sidebar responsive
 * 
 * Features:
 * - Accordions colapsables para cada categoría de filtro
 * - Checkboxes para selección múltiple
 * - Radio buttons para selección única
 * - Contador de resultados en tiempo real
 * - Chips removibles para filtros activos
 * - Responsive: sidebar (desktop) / drawer (mobile)
 * - FAB para abrir filtros en móvil
 * - Optimizado con useCallback/useMemo
 * 
 * =============================================================================
 */

import React, { useState, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Radio,
  RadioGroup,
  Button,
  Chip,
  Divider,
  Drawer,
  Fab,
  IconButton,
  Paper,
  Stack,
  Badge,
  useTheme,
  useMediaQuery,
  alpha,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  FilterList as FilterListIcon,
  Close as CloseIcon,
  Category as CategoryIcon,
  Speed as SpeedIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Article as ArticleIcon,
  School as SchoolIcon,
  Folder as FolderIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';

/**
 * Configuración de categorías de módulo
 */
const MODULE_CATEGORIES = [
  {
    value: 'FUNDAMENTALS',
    label: 'Fundamentos Fisiológicos',
    icon: SchoolIcon,
  },
  {
    value: 'VENTILATION_PRINCIPLES',
    label: 'Principios de Ventilación',
    icon: ArticleIcon,
  },
  {
    value: 'CLINICAL_APPLICATIONS',
    label: 'Aplicaciones Clínicas',
    icon: CheckCircleIcon,
  },
  {
    value: 'ADVANCED_TECHNIQUES',
    label: 'Técnicas Avanzadas',
    icon: SpeedIcon,
  },
  {
    value: 'TROUBLESHOOTING',
    label: 'Solución de Problemas',
    icon: CategoryIcon,
  },
  {
    value: 'PATIENT_SAFETY',
    label: 'Seguridad del Paciente',
    icon: CheckCircleIcon,
  },
];

/**
 * Configuración de niveles de dificultad
 */
const DIFFICULTY_LEVELS = [
  {
    value: 'BEGINNER',
    label: 'Principiante',
    color: 'success',
  },
  {
    value: 'INTERMEDIATE',
    label: 'Intermedio',
    color: 'warning',
  },
  {
    value: 'ADVANCED',
    label: 'Avanzado',
    color: 'error',
  },
];

/**
 * Configuración de duraciones
 */
const DURATION_OPTIONS = [
  {
    value: 'SHORT',
    label: 'Corta (< 15 min)',
  },
  {
    value: 'MEDIUM',
    label: 'Media (15-30 min)',
  },
  {
    value: 'LONG',
    label: 'Larga (> 30 min)',
  },
];

/**
 * Configuración de estados
 */
const STATUS_OPTIONS = [
  {
    value: 'all',
    label: 'Todas',
  },
  {
    value: 'not_started',
    label: 'No iniciadas',
  },
  {
    value: 'in_progress',
    label: 'En progreso',
  },
  {
    value: 'completed',
    label: 'Completadas',
  },
];

/**
 * Configuración de tipos de contenido
 */
const CONTENT_TYPES = [
  {
    value: 'lesson',
    label: 'Solo lecciones',
    icon: ArticleIcon,
  },
  {
    value: 'module',
    label: 'Solo módulos',
    icon: FolderIcon,
  },
  {
    value: 'both',
    label: 'Ambos',
    icon: CategoryIcon,
  },
];

/**
 * SearchFilters Component
 */
const SearchFilters = ({
  filters,
  setFilter,
  clearFilters,
  totalResults = 0,
  isSearching = false,
  onApplyFilters,
  autoApply = true,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // State para controlar el drawer en móvil
  const [drawerOpen, setDrawerOpen] = useState(false);

  // State para controlar qué accordions están expandidos
  const [expanded, setExpanded] = useState({
    categories: true,
    difficulty: true,
    duration: false,
    status: false,
    type: false,
  });

  /**
   * Handle accordion expand/collapse
   */
  const handleAccordionChange = useCallback((panel) => (event, isExpanded) => {
    setExpanded((prev) => ({
      ...prev,
      [panel]: isExpanded,
    }));
  }, []);

  /**
   * Handle category checkbox change
   */
  const handleCategoryChange = useCallback((categoryValue) => (event) => {
    const newCategories = event.target.checked
      ? [...filters.categories, categoryValue]
      : filters.categories.filter((c) => c !== categoryValue);
    
    setFilter('categories', newCategories);
  }, [filters.categories, setFilter]);

  /**
   * Handle difficulty checkbox change
   */
  const handleDifficultyChange = useCallback((difficultyValue) => (event) => {
    const newDifficulties = event.target.checked
      ? [...filters.difficulties, difficultyValue]
      : filters.difficulties.filter((d) => d !== difficultyValue);
    
    setFilter('difficulties', newDifficulties);
  }, [filters.difficulties, setFilter]);

  /**
   * Handle duration radio change
   */
  const handleDurationChange = useCallback((event) => {
    const value = event.target.value;
    setFilter('duration', value === '' ? null : value);
  }, [setFilter]);

  /**
   * Handle status radio change
   */
  const handleStatusChange = useCallback((event) => {
    setFilter('status', event.target.value);
  }, [setFilter]);

  /**
   * Handle type checkbox change
   */
  const handleTypeChange = useCallback((typeValue) => (event) => {
    setFilter('type', typeValue);
  }, [setFilter]);

  /**
   * Handle clear all filters
   */
  const handleClearFilters = useCallback(() => {
    clearFilters();
    if (isMobile) {
      setDrawerOpen(false);
    }
  }, [clearFilters, isMobile]);

  /**
   * Handle apply filters (for manual mode)
   */
  const handleApplyFilters = useCallback(() => {
    if (onApplyFilters) {
      onApplyFilters();
    }
    if (isMobile) {
      setDrawerOpen(false);
    }
  }, [onApplyFilters, isMobile]);

  /**
   * Calculate active filters count
   */
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.categories.length > 0) count += filters.categories.length;
    if (filters.difficulties.length > 0) count += filters.difficulties.length;
    if (filters.duration) count += 1;
    if (filters.status && filters.status !== 'all') count += 1;
    if (filters.type && filters.type !== 'both') count += 1;
    return count;
  }, [filters]);

  /**
   * Get active filters as array for chips
   */
  const activeFiltersArray = useMemo(() => {
    const active = [];

    // Categories
    filters.categories.forEach((cat) => {
      const config = MODULE_CATEGORIES.find((c) => c.value === cat);
      if (config) {
        active.push({
          type: 'category',
          value: cat,
          label: config.label,
          onRemove: () => {
            const newCategories = filters.categories.filter((c) => c !== cat);
            setFilter('categories', newCategories);
          },
        });
      }
    });

    // Difficulties
    filters.difficulties.forEach((diff) => {
      const config = DIFFICULTY_LEVELS.find((d) => d.value === diff);
      if (config) {
        active.push({
          type: 'difficulty',
          value: diff,
          label: config.label,
          color: config.color,
          onRemove: () => {
            const newDifficulties = filters.difficulties.filter((d) => d !== diff);
            setFilter('difficulties', newDifficulties);
          },
        });
      }
    });

    // Duration
    if (filters.duration) {
      const config = DURATION_OPTIONS.find((d) => d.value === filters.duration);
      if (config) {
        active.push({
          type: 'duration',
          value: filters.duration,
          label: config.label,
          onRemove: () => setFilter('duration', null),
        });
      }
    }

    // Status
    if (filters.status && filters.status !== 'all') {
      const config = STATUS_OPTIONS.find((s) => s.value === filters.status);
      if (config) {
        active.push({
          type: 'status',
          value: filters.status,
          label: config.label,
          onRemove: () => setFilter('status', 'all'),
        });
      }
    }

    // Type
    if (filters.type && filters.type !== 'both') {
      const config = CONTENT_TYPES.find((t) => t.value === filters.type);
      if (config) {
        active.push({
          type: 'type',
          value: filters.type,
          label: config.label,
          onRemove: () => setFilter('type', 'both'),
        });
      }
    }

    return active;
  }, [filters, setFilter]);

  /**
   * Render filter content
   */
  const renderFiltersContent = () => (
    <Box>
      {/* Header con contador de resultados */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" fontWeight={600}>
            Filtros
          </Typography>
          {isMobile && (
            <IconButton onClick={() => setDrawerOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          )}
        </Box>

        {/* Results counter */}
        <Paper
          sx={{
            p: 2,
            backgroundColor: alpha(theme.palette.primary.main, 0.1),
            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
          }}
        >
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Resultados encontrados
          </Typography>
          <Typography variant="h5" fontWeight={700} color="primary">
            {isSearching ? '...' : totalResults}
          </Typography>
        </Paper>

        {/* Active filters count badge */}
        {activeFiltersCount > 0 && (
          <Chip
            label={`${activeFiltersCount} filtro${activeFiltersCount !== 1 ? 's' : ''} activo${activeFiltersCount !== 1 ? 's' : ''}`}
            size="small"
            color="primary"
            sx={{ mt: 1 }}
          />
        )}
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Categorías de Módulo */}
      <Accordion
        expanded={expanded.categories}
        onChange={handleAccordionChange('categories')}
        elevation={0}
        sx={{
          '&:before': { display: 'none' },
          backgroundColor: 'transparent',
        }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CategoryIcon fontSize="small" color="action" />
            <Typography fontWeight={600}>Categoría de Módulo</Typography>
            {filters.categories.length > 0 && (
              <Chip label={filters.categories.length} size="small" color="primary" />
            )}
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <FormGroup>
            {MODULE_CATEGORIES.map((category) => (
              <FormControlLabel
                key={category.value}
                control={
                  <Checkbox
                    checked={filters.categories.includes(category.value)}
                    onChange={handleCategoryChange(category.value)}
                    size="small"
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <category.icon sx={{ fontSize: 18, color: 'action.active' }} />
                    <Typography variant="body2">{category.label}</Typography>
                  </Box>
                }
              />
            ))}
          </FormGroup>
        </AccordionDetails>
      </Accordion>

      {/* Nivel de Dificultad */}
      <Accordion
        expanded={expanded.difficulty}
        onChange={handleAccordionChange('difficulty')}
        elevation={0}
        sx={{
          '&:before': { display: 'none' },
          backgroundColor: 'transparent',
        }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SpeedIcon fontSize="small" color="action" />
            <Typography fontWeight={600}>Nivel de Dificultad</Typography>
            {filters.difficulties.length > 0 && (
              <Chip label={filters.difficulties.length} size="small" color="primary" />
            )}
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <FormGroup>
            {DIFFICULTY_LEVELS.map((difficulty) => (
              <FormControlLabel
                key={difficulty.value}
                control={
                  <Checkbox
                    checked={filters.difficulties.includes(difficulty.value)}
                    onChange={handleDifficultyChange(difficulty.value)}
                    size="small"
                    color={difficulty.color}
                  />
                }
                label={
                  <Chip
                    label={difficulty.label}
                    size="small"
                    color={difficulty.color}
                    variant={filters.difficulties.includes(difficulty.value) ? 'filled' : 'outlined'}
                    sx={{ height: 24 }}
                  />
                }
              />
            ))}
          </FormGroup>
        </AccordionDetails>
      </Accordion>

      {/* Duración Estimada */}
      <Accordion
        expanded={expanded.duration}
        onChange={handleAccordionChange('duration')}
        elevation={0}
        sx={{
          '&:before': { display: 'none' },
          backgroundColor: 'transparent',
        }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ScheduleIcon fontSize="small" color="action" />
            <Typography fontWeight={600}>Duración Estimada</Typography>
            {filters.duration && (
              <Chip label="1" size="small" color="primary" />
            )}
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <RadioGroup value={filters.duration || ''} onChange={handleDurationChange}>
            <FormControlLabel
              value=""
              control={<Radio size="small" />}
              label={<Typography variant="body2">Todas las duraciones</Typography>}
            />
            {DURATION_OPTIONS.map((duration) => (
              <FormControlLabel
                key={duration.value}
                value={duration.value}
                control={<Radio size="small" />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ScheduleIcon sx={{ fontSize: 16, color: 'action.active' }} />
                    <Typography variant="body2">{duration.label}</Typography>
                  </Box>
                }
              />
            ))}
          </RadioGroup>
        </AccordionDetails>
      </Accordion>

      {/* Estado de Completado */}
      <Accordion
        expanded={expanded.status}
        onChange={handleAccordionChange('status')}
        elevation={0}
        sx={{
          '&:before': { display: 'none' },
          backgroundColor: 'transparent',
        }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircleIcon fontSize="small" color="action" />
            <Typography fontWeight={600}>Estado de Completado</Typography>
            {filters.status && filters.status !== 'all' && (
              <Chip label="1" size="small" color="primary" />
            )}
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <RadioGroup value={filters.status} onChange={handleStatusChange}>
            {STATUS_OPTIONS.map((status) => (
              <FormControlLabel
                key={status.value}
                value={status.value}
                control={<Radio size="small" />}
                label={<Typography variant="body2">{status.label}</Typography>}
              />
            ))}
          </RadioGroup>
        </AccordionDetails>
      </Accordion>

      {/* Tipo de Contenido */}
      <Accordion
        expanded={expanded.type}
        onChange={handleAccordionChange('type')}
        elevation={0}
        sx={{
          '&:before': { display: 'none' },
          backgroundColor: 'transparent',
        }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ArticleIcon fontSize="small" color="action" />
            <Typography fontWeight={600}>Tipo de Contenido</Typography>
            {filters.type && filters.type !== 'both' && (
              <Chip label="1" size="small" color="primary" />
            )}
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <RadioGroup value={filters.type || 'both'} onChange={(e) => handleTypeChange(e.target.value)(e)}>
            {CONTENT_TYPES.map((type) => (
              <FormControlLabel
                key={type.value}
                value={type.value}
                control={<Radio size="small" />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <type.icon sx={{ fontSize: 18, color: 'action.active' }} />
                    <Typography variant="body2">{type.label}</Typography>
                  </Box>
                }
              />
            ))}
          </RadioGroup>
        </AccordionDetails>
      </Accordion>

      {/* Action Buttons */}
      <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<ClearIcon />}
          onClick={handleClearFilters}
          disabled={activeFiltersCount === 0}
        >
          Limpiar Filtros
        </Button>

        {!autoApply && (
          <Button
            fullWidth
            variant="contained"
            onClick={handleApplyFilters}
          >
            Aplicar Filtros
          </Button>
        )}
      </Box>
    </Box>
  );

  // Desktop: render as sidebar
  if (!isMobile) {
    return (
      <Paper
        elevation={1}
        sx={{
          p: 2,
          position: 'sticky',
          top: 80,
          maxHeight: 'calc(100vh - 100px)',
          overflowY: 'auto',
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: alpha(theme.palette.divider, 0.1),
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: alpha(theme.palette.primary.main, 0.3),
            borderRadius: '4px',
            '&:hover': {
              backgroundColor: alpha(theme.palette.primary.main, 0.5),
            },
          },
        }}
      >
        {renderFiltersContent()}
      </Paper>
    );
  }

  // Mobile: render FAB + Drawer
  return (
    <>
      {/* FAB Button */}
      <Fab
        color="primary"
        aria-label="filtros"
        onClick={() => setDrawerOpen(true)}
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          zIndex: 1000,
        }}
      >
        <Badge badgeContent={activeFiltersCount} color="error">
          <FilterListIcon />
        </Badge>
      </Fab>

      {/* Drawer */}
      <Drawer
        anchor="bottom"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{
          '& .MuiDrawer-paper': {
            maxHeight: '85vh',
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            p: 2,
          },
        }}
      >
        {renderFiltersContent()}
      </Drawer>
    </>
  );
};

SearchFilters.propTypes = {
  /**
   * Objeto de filtros actual del hook useSearch
   */
  filters: PropTypes.shape({
    categories: PropTypes.arrayOf(PropTypes.string),
    difficulties: PropTypes.arrayOf(PropTypes.string),
    duration: PropTypes.string,
    status: PropTypes.string,
    type: PropTypes.string,
  }).isRequired,

  /**
   * Función para actualizar un filtro individual
   */
  setFilter: PropTypes.func.isRequired,

  /**
   * Función para limpiar todos los filtros
   */
  clearFilters: PropTypes.func.isRequired,

  /**
   * Número total de resultados encontrados
   */
  totalResults: PropTypes.number,

  /**
   * Indica si está cargando resultados
   */
  isSearching: PropTypes.bool,

  /**
   * Callback cuando se aplican filtros (modo manual)
   */
  onApplyFilters: PropTypes.func,

  /**
   * Si true, aplica filtros automáticamente al cambiar
   * Si false, requiere hacer clic en "Aplicar Filtros"
   */
  autoApply: PropTypes.bool,
};

export default SearchFilters;

/**
 * Export ActiveFiltersChips component for use in search page
 */
export const ActiveFiltersChips = ({ filters, setFilter }) => {
  const theme = useTheme();

  // Get active filters
  const activeFilters = useMemo(() => {
    const active = [];

    // Categories
    filters.categories?.forEach((cat) => {
      const config = MODULE_CATEGORIES.find((c) => c.value === cat);
      if (config) {
        active.push({
          type: 'category',
          value: cat,
          label: config.label,
          onRemove: () => {
            const newCategories = filters.categories.filter((c) => c !== cat);
            setFilter('categories', newCategories);
          },
        });
      }
    });

    // Difficulties
    filters.difficulties?.forEach((diff) => {
      const config = DIFFICULTY_LEVELS.find((d) => d.value === diff);
      if (config) {
        active.push({
          type: 'difficulty',
          value: diff,
          label: config.label,
          color: config.color,
          onRemove: () => {
            const newDifficulties = filters.difficulties.filter((d) => d !== diff);
            setFilter('difficulties', newDifficulties);
          },
        });
      }
    });

    // Duration
    if (filters.duration) {
      const config = DURATION_OPTIONS.find((d) => d.value === filters.duration);
      if (config) {
        active.push({
          type: 'duration',
          value: filters.duration,
          label: config.label,
          onRemove: () => setFilter('duration', null),
        });
      }
    }

    // Status
    if (filters.status && filters.status !== 'all') {
      const config = STATUS_OPTIONS.find((s) => s.value === filters.status);
      if (config) {
        active.push({
          type: 'status',
          value: filters.status,
          label: config.label,
          onRemove: () => setFilter('status', 'all'),
        });
      }
    }

    // Type
    if (filters.type && filters.type !== 'both') {
      const config = CONTENT_TYPES.find((t) => t.value === filters.type);
      if (config) {
        active.push({
          type: 'type',
          value: filters.type,
          label: config.label,
          onRemove: () => setFilter('type', 'both'),
        });
      }
    }

    return active;
  }, [filters, setFilter]);

  if (activeFilters.length === 0) {
    return null;
  }

  return (
    <Paper
      sx={{
        p: 2,
        mb: 2,
        backgroundColor: alpha(theme.palette.background.paper, 0.6),
      }}
    >
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Filtros activos:
      </Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
        {activeFilters.map((filter, index) => (
          <Chip
            key={`${filter.type}-${filter.value}-${index}`}
            label={filter.label}
            color={filter.color || 'default'}
            onDelete={filter.onRemove}
            deleteIcon={<CloseIcon />}
            size="small"
          />
        ))}
      </Stack>
    </Paper>
  );
};

ActiveFiltersChips.propTypes = {
  filters: PropTypes.shape({
    categories: PropTypes.arrayOf(PropTypes.string),
    difficulties: PropTypes.arrayOf(PropTypes.string),
    duration: PropTypes.string,
    status: PropTypes.string,
    type: PropTypes.string,
  }).isRequired,
  setFilter: PropTypes.func.isRequired,
};

