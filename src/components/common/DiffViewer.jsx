/**
 * =============================================================================
 * DiffViewer - Generic Field-Level Diff Renderer
 * =============================================================================
 * Renders structured diffs with clear visual semantics:
 * - Added    → green background
 * - Removed  → red background + strikethrough
 * - Modified → yellow background (before/after)
 *
 * Input format (flexible):
 * - Array of { field, before, after }
 * - OR object map: { fieldName: { before, after }, ... }
 *
 * This component is intentionally UI-only and makes no assumptions about
 * the entity type (lesson, card, user, etc.), so it can be reused across
 * the app and is ready for future rollback tooling.
 * =============================================================================
 */

import React from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Chip,
  Typography,
  Stack,
  useTheme,
  Tooltip,
} from '@mui/material';

/**
 * Normalize any supported diff input into a flat array.
 */
function normalizeDiffs(diffs) {
  if (!diffs) return [];

  // Already an array of { field, before, after }
  if (Array.isArray(diffs)) {
    return diffs
      .filter((d) => d && typeof d.field === 'string')
      .map((d) => ({
        field: d.field,
        before: d.before,
        after: d.after,
      }));
  }

  // Object map: { fieldName: { before, after } }
  if (typeof diffs === 'object') {
    return Object.entries(diffs).map(([field, value]) => ({
      field,
      before: value?.before,
      after: value?.after,
    }));
  }

  return [];
}

/**
 * Compute change type and simple summary from before/after.
 */
function classifyChange(before, after) {
  const isBeforeEmpty =
    before === null || before === undefined || before === '';
  const isAfterEmpty = after === null || after === undefined || after === '';

  if (isBeforeEmpty && !isAfterEmpty) return 'added';
  if (!isBeforeEmpty && isAfterEmpty) return 'removed';
  if (JSON.stringify(before) !== JSON.stringify(after)) return 'modified';
  return 'unchanged';
}

/**
 * Format values for display (stringify non-primitives, truncate long text).
 */
function formatValue(value) {
  if (typeof value === 'boolean') {
    return value ? 'Activo' : 'Inactivo';
  }
  if (typeof value === 'number') {
    return String(value);
  }
  if (typeof value === 'string') {
    return value;
  }
  if (value === null || value === undefined) {
    return '—';
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

/**
 * DiffViewer component
 */
export default function DiffViewer({ diffs, dense = false }) {
  const theme = useTheme();
  const normalized = normalizeDiffs(diffs).filter((d) => {
    const type = classifyChange(d.before, d.after);
    return type !== 'unchanged';
  });

  if (!normalized.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        No hay cambios registrados para este elemento.
      </Typography>
    );
  }

  const getColors = (type) => {
    switch (type) {
      case 'added':
        return {
          bg: theme.palette.success.light + '33',
          border: theme.palette.success.main + '55',
          chipColor: 'success',
          label: 'Añadido',
        };
      case 'removed':
        return {
          bg: theme.palette.error.light + '33',
          border: theme.palette.error.main + '55',
          chipColor: 'error',
          label: 'Eliminado',
        };
      case 'modified':
      default:
        return {
          bg: theme.palette.warning.light + '33',
          border: theme.palette.warning.main + '55',
          chipColor: 'warning',
          label: 'Modificado',
        };
    }
  };

  return (
    <Stack spacing={dense ? 1 : 1.5}>
      {normalized.map(({ field, before, after }) => {
        const type = classifyChange(before, after);
        const { bg, border, chipColor, label } = getColors(type);

        const beforeText = formatValue(before);
        const afterText = formatValue(after);

        // For very long text (e.g. lesson content), show a truncated preview
        const isLongText =
          typeof beforeText === 'string' || typeof afterText === 'string';

        const truncated = (text) => {
          if (typeof text !== 'string') return text;
          if (text.length <= 220) return text;
          return `${text.slice(0, 200)}…`;
        };

        return (
          <Box
            key={field}
            sx={{
              borderRadius: 2,
              border: '1px solid',
              borderColor: border,
              backgroundColor: bg,
              p: dense ? 1.5 : 2,
            }}
          >
            <Stack
              direction="row"
              spacing={1.5}
              alignItems="center"
              justifyContent="space-between"
              sx={{ mb: 1 }}
            >
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 600, textTransform: 'capitalize' }}
              >
                {field}
              </Typography>
              <Chip size="small" color={chipColor} label={label} />
            </Stack>

            {type === 'added' && (
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {isLongText ? (
                  <Tooltip title={beforeText} placement="top-start">
                    <span>{truncated(afterText)}</span>
                  </Tooltip>
                ) : (
                  afterText
                )}
              </Typography>
            )}

            {type === 'removed' && (
              <Typography
                variant="body2"
                sx={{
                  whiteSpace: 'pre-wrap',
                  textDecoration: 'line-through',
                }}
              >
                {isLongText ? (
                  <Tooltip title={beforeText} placement="top-start">
                    <span>{truncated(beforeText)}</span>
                  </Tooltip>
                ) : (
                  beforeText
                )}
              </Typography>
            )}

            {type === 'modified' && (
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.5}
                divider={
                  <Box
                    sx={{
                      width: 1,
                      borderTop: {
                        xs: '1px dashed rgba(0,0,0,0.12)',
                        sm: 'none',
                      },
                      borderLeft: {
                        xs: 'none',
                        sm: '1px dashed rgba(0,0,0,0.12)',
                      },
                    }}
                  />
                }
              >
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontWeight: 500 }}
                  >
                    Antes
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      whiteSpace: 'pre-wrap',
                      textDecoration: isLongText ? 'line-through' : 'none',
                      color: isLongText
                        ? theme.palette.text.secondary
                        : theme.palette.text.primary,
                    }}
                  >
                    {isLongText ? (
                      <Tooltip title={beforeText} placement="top-start">
                        <span>{truncated(beforeText)}</span>
                      </Tooltip>
                    ) : (
                      beforeText
                    )}
                  </Typography>
                </Box>

                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontWeight: 500 }}
                  >
                    Después
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      whiteSpace: 'pre-wrap',
                      fontWeight: 500,
                    }}
                  >
                    {isLongText ? (
                      <Tooltip title={afterText} placement="top-start">
                        <span>{truncated(afterText)}</span>
                      </Tooltip>
                    ) : (
                      afterText
                    )}
                  </Typography>
                </Box>
              </Stack>
            )}
          </Box>
        );
      })}
    </Stack>
  );
}

DiffViewer.propTypes = {
  /**
   * Structured diffs to render. Either:
   * - Array<{ field: string, before: any, after: any }>
   * - Object map: { [field: string]: { before: any, after: any } }
   */
  diffs: PropTypes.oneOfType([
    PropTypes.arrayOf(
      PropTypes.shape({
        field: PropTypes.string.isRequired,
        before: PropTypes.any,
        after: PropTypes.any,
      })
    ),
    PropTypes.object,
  ]),
  /**
   * Render in a more compact style (reduced paddings).
   */
  dense: PropTypes.bool,
};

DiffViewer.defaultProps = {
  diffs: [],
  dense: false,
};

