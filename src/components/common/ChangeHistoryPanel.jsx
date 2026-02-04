/**
 * =============================================================================
 * ChangeHistoryPanel - Generic Changelog Viewer
 * =============================================================================
 * Fetches and renders change history for any teaching entity
 * (lessons, cards, etc.) using the teachingContentService.
 *
 * Responsibilities:
 * - Remote data fetching (GET /changelog?entityType&entityId)
 * - Loading / error / empty states
 * - Layout for the "Change History" side panel / section
 * - Delegates actual diff rendering to DiffViewer
 *
 * NOTE:
 * - This component is intentionally generic and only depends on:
 *   - entityType (e.g. 'lesson' | 'card')
 *   - entityId   (string)
 * - It does NOT perform any role checks; routes/pages must already be
 *   protected via withAuth/ProtectedRoute.
 * =============================================================================
 */

import React, { useEffect, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Box,
  CircularProgress,
  IconButton,
  Stack,
  Typography,
  Chip,
} from '@mui/material';
import {
  History as HistoryIcon,
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import teachingContentService from '@/services/api/teachingContentService';
import DiffViewer from './DiffViewer';

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('es-ES', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  } catch {
    return String(value);
  }
}

function getUserName(user) {
  if (!user) return 'Desconocido';
  if (typeof user === 'string') return user;
  return user.name || user.email || 'Desconocido';
}

export default function ChangeHistoryPanel({
  entityType,
  entityId,
  defaultExpanded = false,
  refreshKey = 0,
}) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadHistory = useCallback(async () => {
    if (!entityId || !entityType) return;

    setLoading(true);
    setError(null);

    const { success, data, error: serviceError } =
      await teachingContentService.getChangeHistory(entityType, entityId);

    if (!success) {
      setError(serviceError?.message || 'No se pudo cargar el historial.');
      setEntries([]);
    } else {
      const items = Array.isArray(data) ? data : data?.items || [];
      setEntries(items);
    }

    setLoading(false);
  }, [entityType, entityId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory, refreshKey]);

  return (
    <Accordion defaultExpanded={defaultExpanded}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{ flexGrow: 1, minWidth: 0 }}
        >
          <HistoryIcon fontSize="small" color="action" />
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Historial de cambios
          </Typography>
          {entries?.length > 0 && (
            <Chip
              size="small"
              label={`${entries.length}`}
              color="default"
              sx={{ ml: 1 }}
            />
          )}
          <Box sx={{ flexGrow: 1 }} />
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              loadHistory();
            }}
            disabled={loading}
            aria-label="Actualizar historial de cambios"
          >
            {loading ? (
              <CircularProgress size={18} />
            ) : (
              <RefreshIcon fontSize="small" />
            )}
          </IconButton>
        </Stack>
      </AccordionSummary>

      <AccordionDetails>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!error && loading && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              py: 3,
            }}
          >
            <CircularProgress size={32} />
          </Box>
        )}

        {!loading && !error && entries.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            Aún no hay cambios registrados para este elemento.
          </Typography>
        )}

        {!loading &&
          !error &&
          entries.map((entry) => (
            <Box
              key={entry.id || entry._id || `${entry.changedAt}-${entry.index}`}
              sx={{
                mb: 2.5,
                p: 1.5,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'grey.200',
                backgroundColor: 'grey.50',
              }}
            >
              <Box
                sx={{
                  mb: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1.5,
                  flexWrap: 'wrap',
                }}
              >
                <Box>
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 600, mb: 0.25 }}
                  >
                    {entry.actionLabel || 'Actualización de contenido'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Por {getUserName(entry.changedBy || entry.user)} ·{' '}
                    {formatDate(entry.changedAt || entry.createdAt)}
                  </Typography>
                </Box>
                {entry.version && (
                  <Chip
                    size="small"
                    label={`Versión ${entry.version}`}
                    color="info"
                  />
                )}
              </Box>

              <DiffViewer diffs={entry.diff || entry.changes} dense />
            </Box>
          ))}
      </AccordionDetails>
    </Accordion>
  );
}

ChangeHistoryPanel.propTypes = {
  entityType: PropTypes.oneOf(['lesson', 'card']).isRequired,
  entityId: PropTypes.string.isRequired,
  defaultExpanded: PropTypes.bool,
  /**
   * Optional key to force reload from parent (e.g. after saving).
   */
  refreshKey: PropTypes.number,
};

ChangeHistoryPanel.defaultProps = {
  defaultExpanded: false,
  refreshKey: 0,
};

