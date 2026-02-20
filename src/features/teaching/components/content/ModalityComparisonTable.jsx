/**
 * ModalityComparisonTable.jsx
 *
 * Componente especializado para renderizar tablas comparativas de modalidades ventilatorias
 * de forma visualmente atractiva, ordenable y responsiva. En móviles se renderiza como cards.
 *
 * Requiere Material UI (MUI) y sigue el tema de VentyLab, usando el color secondary
 * y acentos del nivel intermediate (naranja).
 */

import React, { useMemo, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Icon,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

/**
 * Mapa de iconos por modalidad (id o nombre común), usa Material Icons font.
 */
const MODALITY_ICON_MAP = {
  VCV: 'volume_up',
  PCV: 'speed',
  'SIMV-VC': 'sync',
  'SIMV-PC': 'sync_alt',
  PSV: 'support',
  CPAP: 'air',
  BiPAP: 'swap_vert'
};

/**
 * Retorna el valor seguro para ordenar, normalizando strings y números.
 * @param {any} value
 * @returns {string|number}
 */
function normalizeForSort(value) {
  if (value == null) return '';
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return value.toLowerCase();
  return String(value).toLowerCase();
}

/**
 * Aplica ordenamiento estable a filas.
 * @param {Array<Object>} rows
 * @param {string} columnKey
 * @param {'asc'|'desc'} direction
 * @returns {Array<Object>}
 */
function sortRows(rows, columnKey, direction) {
  const dir = direction === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => {
    const av = normalizeForSort(a[columnKey]);
    const bv = normalizeForSort(b[columnKey]);
    if (av < bv) return -1 * dir;
    if (av > bv) return 1 * dir;
    return 0;
  });
}

/**
 * ModalityComparisonTable
 *
 * @param {Object} props
 * @param {{
 *   columns: Array<{ key: string, label: string, tooltip?: string }>,
 *   rows: Array<{ id?: string, modality: string, [key: string]: any }>,
 *   title?: string
 * }} props.tableData - Datos de la tabla (columnas y filas)
 * @returns {JSX.Element}
 */
const ModalityComparisonTable = ({ tableData }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [orderBy, setOrderBy] = useState(tableData?.columns?.[0]?.key || 'modality');
  const [order, setOrder] = useState('asc');

  const handleSort = useCallback((key) => {
    setOrder((prev) => (orderBy === key ? (prev === 'asc' ? 'desc' : 'asc') : 'asc'));
    setOrderBy(key);
  }, [orderBy]);

  const sortedRows = useMemo(() => {
    if (!tableData?.rows?.length) return [];
    return sortRows(tableData.rows, orderBy, order);
  }, [tableData, orderBy, order]);

  if (!tableData || !Array.isArray(tableData.columns) || !Array.isArray(tableData.rows)) {
    return (
      <Typography variant="body2" color="text.secondary">
        Datos de tabla no disponibles.
      </Typography>
    );
  }

  const headerBg = theme.palette.secondary.main;
  const headerFg = theme.palette.getContrastText(headerBg);
  const zebraA = theme.palette.action.hover;
  const zebraB = theme.palette.background.paper;

  // Vista móvil: cards verticales
  if (isMobile) {
    return (
      <Box display="flex" flexDirection="column" gap={2}>
        {sortedRows.map((row, idx) => {
          const iconName = MODALITY_ICON_MAP[row.modality] || 'biotech';
          return (
            <Card key={row.id || `${row.modality}-${idx}`} variant="outlined" sx={{ borderColor: theme.palette.secondary.light }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <Icon color="secondary">{iconName}</Icon>
                  <Typography variant="h6" fontWeight={700} color="secondary.main">{row.modality}</Typography>
                </Box>
                <Box display="grid" gridTemplateColumns="1fr" gap={0.75}>
                  {tableData.columns.filter(c => c.key !== 'modality').map((col) => (
                    <Box key={col.key} display="flex" flexDirection="column">
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>{col.label}</Typography>
                      <Typography variant="body2">{row[col.key] ?? '-'}</Typography>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          );
        })}
      </Box>
    );
  }

  // Vista desktop: tabla con ordenamiento y zebra striping
  return (
    <TableContainer sx={{ borderRadius: 1, border: `1px solid ${theme.palette.divider}` }}>
      <Table size="small" aria-label="Tabla comparativa de modalidades ventilatorias">
        <TableHead>
          <TableRow sx={{ backgroundColor: headerBg }}>
            {tableData.columns.map((col) => (
              <TableCell
                key={col.key}
                onClick={() => handleSort(col.key)}
                sx={{
                  cursor: 'pointer',
                  color: headerFg,
                  fontWeight: 700,
                  userSelect: 'none',
                  whiteSpace: 'nowrap'
                }}
              >
                <Tooltip title={col.tooltip || ''} arrow placement="top">
                  <Box display="inline-flex" alignItems="center" gap={1}>
                    <span>{col.label}</span>
                    {orderBy === col.key && (
                      <Chip size="small" label={order === 'asc' ? '↑' : '↓'} sx={{ height: 18, color: headerFg, borderColor: headerFg }} variant="outlined" />
                    )}
                  </Box>
                </Tooltip>
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedRows.map((row, idx) => {
            const rowBg = idx % 2 === 0 ? zebraB : zebraA;
            const iconName = MODALITY_ICON_MAP[row.modality] || 'biotech';
            return (
              <TableRow key={row.id || `${row.modality}-${idx}`} sx={{ backgroundColor: rowBg }} hover>
                {tableData.columns.map((col, cidx) => (
                  <TableCell key={`${col.key}-${cidx}`} sx={{ verticalAlign: 'top' }}>
                    {col.key === 'modality' ? (
                      <Box display="flex" alignItems="center" gap={1.25}>
                        <Icon color="secondary">{iconName}</Icon>
                        <Typography variant="subtitle2" fontWeight={700}>{row[col.key]}</Typography>
                      </Box>
                    ) : (
                      <Typography variant="body2">{row[col.key] ?? '-'}</Typography>
                    )}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

ModalityComparisonTable.propTypes = {
  /** Datos de la tabla: columnas (key, label, tooltip) y filas con al menos la clave "modality" */
  tableData: PropTypes.shape({
    title: PropTypes.string,
    columns: PropTypes.arrayOf(PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      tooltip: PropTypes.string
    })).isRequired,
    rows: PropTypes.arrayOf(PropTypes.object).isRequired
  }).isRequired
};

export default ModalityComparisonTable;


