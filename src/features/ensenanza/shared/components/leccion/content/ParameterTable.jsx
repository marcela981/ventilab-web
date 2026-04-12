/**
 * =============================================================================
 * ParameterTable Component for VentyLab
 * =============================================================================
 * 
 * Specialized component for rendering ventilator parameter tables in a
 * professional and interactive manner. Used extensively in Module 3 lessons
 * to display protocol parameter configurations.
 * 
 * Features:
 * - Interactive hover effects and tooltips
 * - Expandable rows for detailed information
 * - Search and filtering capabilities
 * - Sortable columns
 * - Category grouping
 * - Responsive design with mobile card view
 * - Visual range indicators
 * - Accessibility support
 * 
 * @component
 * @example
 * ```jsx
 * <ParameterTable
 *   parameters={[
 *     {
 *       name: 'Volumen Tidal',
 *       unit: 'mL/kg',
 *       initialValue: 6,
 *       acceptableRange: { min: 4, max: 8 },
 *       objective: 'Prevenir volutrauma',
 *       criticality: 'critical',
 *       notes: 'Valores superiores a 8 pueden causar lesión pulmonar'
 *     }
 *   ]}
 *   showUnits={true}
 *   showObjective={true}
 *   interactive={true}
 *   highlightCritical={true}
 * />
 * ```
 */

import React, { useState, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
  Typography,
  Box,
  Chip,
  IconButton,
  Tooltip,
  Popover,
  Collapse,
  Card,
  CardContent,
  Grid,
  useTheme,
  useMediaQuery,
  alpha,
  LinearProgress,
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Search as SearchIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

// =============================================================================
// Styled Components
// =============================================================================

/**
 * Styled TableRow with hover effects
 */
const StyledTableRow = styled(TableRow)(({ theme, criticality, interactive }) => ({
  '&:hover': interactive
    ? {
        backgroundColor: criticality === 'critical'
          ? alpha(theme.palette.error.main, 0.08)
          : criticality === 'important'
          ? alpha(theme.palette.warning.main, 0.08)
          : alpha(theme.palette.primary.main, 0.04),
        cursor: interactive ? 'pointer' : 'default',
      }
    : {},
  '&.Mui-expanded': {
    backgroundColor: alpha(theme.palette.primary.main, 0.04),
  },
}));

/**
 * Category header row
 */
const CategoryHeaderRow = styled(TableRow)(({ theme }) => ({
  backgroundColor: theme.palette.grey[100],
  '& th': {
    fontWeight: 600,
    fontSize: '0.875rem',
    color: theme.palette.text.primary,
    borderBottom: `2px solid ${theme.palette.divider}`,
  },
}));

/**
 * Range indicator bar
 */
const RangeIndicator = styled(Box)(({ theme }) => ({
  position: 'relative',
  height: 6,
  backgroundColor: theme.palette.grey[200],
  borderRadius: 3,
  marginTop: theme.spacing(0.5),
  overflow: 'hidden',
}));

const RangeFill = styled(Box)(({ theme, position, width }) => ({
  position: 'absolute',
  left: `${position}%`,
  width: `${width}%`,
  height: '100%',
  backgroundColor: theme.palette.primary.main,
  borderRadius: 3,
}));

const ValueMarker = styled(Box)(({ theme, position }) => ({
  position: 'absolute',
  left: `${position}%`,
  top: '-2px',
  width: 10,
  height: 10,
  backgroundColor: theme.palette.error.main,
  borderRadius: '50%',
  border: `2px solid ${theme.palette.background.paper}`,
  transform: 'translateX(-50%)',
}));

/**
 * Sortable header cell
 */
const SortableHeaderCell = styled(TableCell)(({ theme, sortable }) => ({
  cursor: sortable ? 'pointer' : 'default',
  userSelect: 'none',
  '&:hover': sortable
    ? {
        backgroundColor: alpha(theme.palette.primary.main, 0.08),
      }
    : {},
}));

/**
 * Parameter card for mobile view
 */
const ParameterCard = styled(Card)(({ theme, criticality }) => ({
  marginBottom: theme.spacing(2),
  borderLeft: `4px solid ${
    criticality === 'critical'
      ? theme.palette.error.main
      : criticality === 'important'
      ? theme.palette.warning.main
      : theme.palette.divider
  }`,
}));

// =============================================================================
// Main Component
// =============================================================================

const ParameterTable = ({
  parameters = [],
  showUnits = true,
  showObjective = true,
  interactive = true,
  highlightCritical = true,
  compactMode = false,
  searchTerm = '',
  title = '',
  onParameterClick,
  categories = null,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const effectiveCompactMode = compactMode || isMobile;

  // State for expanded rows
  const [expandedRows, setExpandedRows] = useState(new Set());

  // State for sorting
  const [sortConfig, setSortConfig] = useState({
    column: null,
    direction: 'asc', // 'asc', 'desc', or null
  });

  // State for search
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);

  // State for popover
  const [popoverAnchor, setPopoverAnchor] = useState(null);
  const [popoverContent, setPopoverContent] = useState(null);

  // ===========================================================================
  // Computed Values
  // ===========================================================================

  /**
   * Filter parameters based on search term
   */
  const filteredParameters = useMemo(() => {
    const search = localSearchTerm.toLowerCase();
    if (!search) return parameters;

    return parameters.filter(
      (param) =>
        param.name?.toLowerCase().includes(search) ||
        param.objective?.toLowerCase().includes(search) ||
        param.notes?.toLowerCase().includes(search)
    );
  }, [parameters, localSearchTerm]);

  /**
   * Sort parameters based on sort configuration
   */
  const sortedParameters = useMemo(() => {
    if (!sortConfig.column || !sortConfig.direction) {
      return filteredParameters;
    }

    const sorted = [...filteredParameters].sort((a, b) => {
      let aValue, bValue;

      switch (sortConfig.column) {
        case 'name':
          aValue = a.name || '';
          bValue = b.name || '';
          return aValue.localeCompare(bValue);
        case 'initialValue':
          aValue = a.initialValue ?? 0;
          bValue = b.initialValue ?? 0;
          return aValue - bValue;
        case 'criticality':
          const criticalityOrder = { critical: 3, important: 2, standard: 1 };
          aValue = criticalityOrder[a.criticality] || 0;
          bValue = criticalityOrder[b.criticality] || 0;
          return aValue - bValue;
        default:
          return 0;
      }
    });

    return sortConfig.direction === 'desc' ? sorted.reverse() : sorted;
  }, [filteredParameters, sortConfig]);

  /**
   * Group parameters by category if categories are provided
   */
  const groupedParameters = useMemo(() => {
    if (!categories || !Array.isArray(categories)) {
      return [{ category: null, parameters: sortedParameters }];
    }

    const groups = [];
    const categoryMap = new Map();

    // Initialize category map
    categories.forEach((cat) => {
      categoryMap.set(cat.id, { category: cat, parameters: [] });
    });

    // Add uncategorized group
    categoryMap.set(null, { category: null, parameters: [] });

    // Group parameters
    sortedParameters.forEach((param) => {
      const categoryId = param.category || null;
      const group = categoryMap.get(categoryId) || categoryMap.get(null);
      group.parameters.push(param);
    });

    // Convert to array and filter empty groups
    return Array.from(categoryMap.values()).filter(
      (group) => group.parameters.length > 0
    );
  }, [sortedParameters, categories]);

  // ===========================================================================
  // Event Handlers
  // ===========================================================================

  /**
   * Toggle row expansion
   */
  const handleToggleExpand = useCallback((paramIndex) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(paramIndex)) {
        newSet.delete(paramIndex);
      } else {
        newSet.add(paramIndex);
      }
      return newSet;
    });
  }, []);

  /**
   * Handle column sorting
   */
  const handleSort = useCallback((column) => {
    setSortConfig((prev) => {
      if (prev.column === column) {
        // Rotate: asc -> desc -> null
        if (prev.direction === 'asc') {
          return { column, direction: 'desc' };
        } else if (prev.direction === 'desc') {
          return { column: null, direction: null };
        }
      }
      return { column, direction: 'asc' };
    });
  }, []);

  /**
   * Handle info icon click
   */
  const handleInfoClick = useCallback((event, notes) => {
    setPopoverAnchor(event.currentTarget);
    setPopoverContent(notes);
  }, []);

  const handlePopoverClose = useCallback(() => {
    setPopoverAnchor(null);
    setPopoverContent(null);
  }, []);

  /**
   * Calculate range indicator position
   */
  const calculateRangePosition = (initialValue, min, max) => {
    if (min === max) return { position: 0, width: 100 };
    const range = max - min;
    const position = ((initialValue - min) / range) * 100;
    return {
      position: Math.max(0, Math.min(100, position)),
      width: 5, // 5% width for the marker
    };
  };

  /**
   * Get color based on criticality
   */
  const getCriticalityColor = (criticality) => {
    switch (criticality) {
      case 'critical':
        return theme.palette.error.main;
      case 'important':
        return theme.palette.warning.main;
      default:
        return theme.palette.text.primary;
    }
  };

  // ===========================================================================
  // Render Functions
  // ===========================================================================

  /**
   * Render range indicator
   */
  const renderRangeIndicator = (param) => {
    const { initialValue, acceptableRange } = param;
    if (!acceptableRange || acceptableRange.min === undefined || acceptableRange.max === undefined) {
      return null;
    }

    const { position } = calculateRangePosition(
      initialValue,
      acceptableRange.min,
      acceptableRange.max
    );

    return (
      <Box sx={{ mt: 1 }}>
        <RangeIndicator>
          <RangeFill
            position={0}
            width={100}
            sx={{ backgroundColor: theme.palette.grey[300] }}
          />
          <ValueMarker position={position} />
        </RangeIndicator>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          {acceptableRange.min} - {acceptableRange.max}
        </Typography>
      </Box>
    );
  };

  /**
   * Render sort icon
   */
  const renderSortIcon = (column) => {
    if (sortConfig.column !== column || !sortConfig.direction) {
      return null;
    }
    return sortConfig.direction === 'asc' ? (
      <ArrowUpwardIcon fontSize="small" sx={{ ml: 0.5, verticalAlign: 'middle' }} />
    ) : (
      <ArrowDownwardIcon fontSize="small" sx={{ ml: 0.5, verticalAlign: 'middle' }} />
    );
  };

  /**
   * Render desktop table view
   */
  const renderTableView = () => {
    const allParameters = groupedParameters.flatMap((group) => {
      if (group.category) {
        return [{ type: 'category', data: group.category }, ...group.parameters.map((p) => ({ type: 'parameter', data: p }))];
      }
      return group.parameters.map((p) => ({ type: 'parameter', data: p }));
    });

    return (
      <TableContainer component={Paper} elevation={2}>
        <Table size={effectiveCompactMode ? 'small' : 'medium'} aria-label={title || 'Tabla de parámetros ventilatorios'}>
          {title && (
            <caption style={{ captionSide: 'top', padding: theme.spacing(2), fontWeight: 600 }}>
              {title}
            </caption>
          )}
          <TableHead>
            <TableRow>
              <SortableHeaderCell
                sortable
                onClick={() => handleSort('name')}
                scope="col"
                sx={{
                  backgroundColor: theme.palette.grey[50],
                  fontWeight: 600,
                }}
              >
                Parámetro
                {renderSortIcon('name')}
              </SortableHeaderCell>
              {showUnits && (
                <TableCell
                  scope="col"
                  sx={{
                    backgroundColor: theme.palette.grey[50],
                    fontWeight: 600,
                  }}
                >
                  Unidad
                </TableCell>
              )}
              <SortableHeaderCell
                sortable
                onClick={() => handleSort('initialValue')}
                scope="col"
                sx={{
                  backgroundColor: theme.palette.grey[50],
                  fontWeight: 600,
                }}
              >
                Valor Inicial
                {renderSortIcon('initialValue')}
              </SortableHeaderCell>
              <TableCell
                scope="col"
                sx={{
                  backgroundColor: theme.palette.grey[50],
                  fontWeight: 600,
                }}
              >
                Rango Aceptable
              </TableCell>
              {showObjective && (
                <TableCell
                  scope="col"
                  sx={{
                    backgroundColor: theme.palette.grey[50],
                    fontWeight: 600,
                  }}
                >
                  Objetivo
                </TableCell>
              )}
              {interactive && (
                <TableCell
                  scope="col"
                  sx={{
                    backgroundColor: theme.palette.grey[50],
                    fontWeight: 600,
                    width: 50,
                  }}
                />
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {allParameters.map((item, index) => {
              if (item.type === 'category') {
                return (
                  <CategoryHeaderRow key={`category-${item.data.id}`}>
                    <TableCell colSpan={showObjective ? (showUnits ? 6 : 5) : showUnits ? 5 : 4}>
                      {item.data.name}
                    </TableCell>
                  </CategoryHeaderRow>
                );
              }

              const param = item.data;
              const paramIndex = parameters.findIndex((p) => p === param);
              const isExpanded = expandedRows.has(paramIndex);
              const hasNotes = Boolean(param.notes);

              return (
                <React.Fragment key={paramIndex}>
                  <StyledTableRow
                    criticality={param.criticality}
                    interactive={interactive}
                    onClick={() => {
                      if (interactive && hasNotes) {
                        handleToggleExpand(paramIndex);
                      }
                      if (onParameterClick) {
                        onParameterClick(param);
                      }
                    }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography
                          variant="body1"
                          sx={{
                            color: getCriticalityColor(param.criticality),
                            fontWeight: param.criticality === 'critical' ? 600 : 400,
                          }}
                        >
                          {param.name}
                        </Typography>
                        {param.criticality === 'critical' && highlightCritical && (
                          <Chip label="Crítico" size="small" color="error" />
                        )}
                        {hasNotes && (
                          <Tooltip title="Información adicional">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleInfoClick(e, param.notes);
                              }}
                            >
                              <InfoIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                    {showUnits && (
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {param.unit || '-'}
                        </Typography>
                      </TableCell>
                    )}
                    <TableCell>
                      <Typography variant="body1" fontWeight="medium">
                        {param.initialValue !== undefined && param.initialValue !== null
                          ? `${param.initialValue} ${param.unit || ''}`
                          : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {param.acceptableRange ? (
                        <Box>
                          <Typography variant="body2">
                            {param.acceptableRange.min} - {param.acceptableRange.max}{' '}
                            {param.unit || ''}
                          </Typography>
                          {renderRangeIndicator(param)}
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          -
                        </Typography>
                      )}
                    </TableCell>
                    {showObjective && (
                      <TableCell>
                        <Tooltip
                          title={param.objective && param.objective.length > 50 ? param.objective : ''}
                          arrow
                        >
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              maxWidth: 200,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {param.objective || '-'}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                    )}
                    {interactive && hasNotes && (
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleExpand(paramIndex);
                          }}
                        >
                          {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </IconButton>
                      </TableCell>
                    )}
                  </StyledTableRow>
                  {interactive && hasNotes && (
                    <TableRow>
                      <TableCell colSpan={showObjective ? (showUnits ? 6 : 5) : showUnits ? 5 : 4} sx={{ py: 0 }}>
                        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                          <Box sx={{ py: 2, px: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              <strong>Notas adicionales:</strong> {param.notes}
                            </Typography>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  /**
   * Render mobile card view
   */
  const renderCardView = () => {
    return (
      <Box>
        {groupedParameters.map((group, groupIndex) => {
          if (group.category) {
            return (
              <Box key={`group-${groupIndex}`}>
                <Typography
                  variant="h6"
                  sx={{ mb: 2, mt: groupIndex > 0 ? 3 : 0, fontWeight: 600 }}
                >
                  {group.category.name}
                </Typography>
                {group.parameters.map((param, paramIndex) => {
                  const globalIndex = parameters.findIndex((p) => p === param);
                  return renderParameterCard(param, globalIndex);
                })}
              </Box>
            );
          }
          return group.parameters.map((param, paramIndex) => {
            const globalIndex = parameters.findIndex((p) => p === param);
            return renderParameterCard(param, globalIndex);
          });
        })}
      </Box>
    );
  };

  /**
   * Render individual parameter card
   */
  const renderParameterCard = (param, paramIndex) => {
    const isExpanded = expandedRows.has(paramIndex);
    const hasNotes = Boolean(param.notes);

    return (
      <ParameterCard key={paramIndex} criticality={param.criticality}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Typography
              variant="h6"
              sx={{
                color: getCriticalityColor(param.criticality),
                fontWeight: param.criticality === 'critical' ? 600 : 400,
              }}
            >
              {param.name}
            </Typography>
            {param.criticality === 'critical' && highlightCritical && (
              <Chip label="Crítico" size="small" color="error" />
            )}
            {hasNotes && (
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleInfoClick(e, param.notes);
                }}
              >
                <InfoIcon />
              </IconButton>
            )}
          </Box>

          <Grid container spacing={2}>
            {showUnits && (
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  Unidad
                </Typography>
                <Typography variant="body2">{param.unit || '-'}</Typography>
              </Grid>
            )}
            <Grid item xs={showUnits ? 6 : 12}>
              <Typography variant="caption" color="text.secondary">
                Valor Inicial
              </Typography>
              <Typography variant="body1" fontWeight="medium">
                {param.initialValue !== undefined && param.initialValue !== null
                  ? `${param.initialValue} ${param.unit || ''}`
                  : '-'}
              </Typography>
            </Grid>
            {param.acceptableRange && (
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">
                  Rango Aceptable
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  {param.acceptableRange.min} - {param.acceptableRange.max} {param.unit || ''}
                </Typography>
                {renderRangeIndicator(param)}
              </Grid>
            )}
            {showObjective && param.objective && (
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">
                  Objetivo
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {param.objective}
                </Typography>
              </Grid>
            )}
            {hasNotes && interactive && (
              <Grid item xs={12}>
                <Box
                  onClick={() => handleToggleExpand(paramIndex)}
                  sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1 }}
                >
                  {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  <Typography variant="caption" color="primary">
                    {isExpanded ? 'Ocultar' : 'Ver'} notas adicionales
                  </Typography>
                </Box>
                <Collapse in={isExpanded}>
                  <Box sx={{ mt: 1, p: 1, backgroundColor: theme.palette.grey[50], borderRadius: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      {param.notes}
                    </Typography>
                  </Box>
                </Collapse>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </ParameterCard>
    );
  };

  // ===========================================================================
  // Main Render
  // ===========================================================================

  if (parameters.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No hay parámetros disponibles
        </Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ mb: 4 }}>
      {/* Search Bar */}
      {interactive && (
        <TextField
          fullWidth
          size="small"
          placeholder="Buscar parámetros..."
          value={localSearchTerm}
          onChange={(e) => setLocalSearchTerm(e.target.value)}
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      )}

      {/* Results count */}
      {localSearchTerm && (
        <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
          {filteredParameters.length} de {parameters.length} parámetros
        </Typography>
      )}

      {/* Table or Card View */}
      {effectiveCompactMode ? renderCardView() : renderTableView()}

      {/* Popover for notes */}
      <Popover
        open={Boolean(popoverAnchor)}
        anchorEl={popoverAnchor}
        onClose={handlePopoverClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
      >
        <Box sx={{ p: 2, maxWidth: 300 }}>
          <Typography variant="body2">{popoverContent}</Typography>
        </Box>
      </Popover>
    </Box>
  );
};

// =============================================================================
// PropTypes
// =============================================================================

ParameterTable.propTypes = {
  /**
   * Array of parameter objects to display
   */
  parameters: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      unit: PropTypes.string,
      initialValue: PropTypes.number,
      acceptableRange: PropTypes.shape({
        min: PropTypes.number.isRequired,
        max: PropTypes.number.isRequired,
      }),
      objective: PropTypes.string,
      criticality: PropTypes.oneOf(['critical', 'important', 'standard']),
      notes: PropTypes.string,
      category: PropTypes.string,
    })
  ).isRequired,
  /**
   * Show units column
   */
  showUnits: PropTypes.bool,
  /**
   * Show objective column
   */
  showObjective: PropTypes.bool,
  /**
   * Enable interactive features (hover, expand, etc.)
   */
  interactive: PropTypes.bool,
  /**
   * Highlight critical parameters visually
   */
  highlightCritical: PropTypes.bool,
  /**
   * Use compact mode (smaller table, mobile-friendly)
   */
  compactMode: PropTypes.bool,
  /**
   * Initial search term for filtering
   */
  searchTerm: PropTypes.string,
  /**
   * Table title/caption
   */
  title: PropTypes.string,
  /**
   * Callback when a parameter is clicked
   */
  onParameterClick: PropTypes.func,
  /**
   * Categories for grouping parameters
   */
  categories: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
    })
  ),
};

export default ParameterTable;

