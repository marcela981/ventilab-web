/**
 * =============================================================================
 * TeachingEntityEditor - Generic Editor for Lessons / Cards
 * =============================================================================
 * Reusable editor surface for simple teaching entities that share the same
 * core fields:
 * - title      (string)
 * - content    (string)
 * - order      (number)
 * - isActive   (boolean)
 *
 * This component is intentionally generic and receives the data-loading and
 * data-saving functions as props, so it doesn't need to know if it's editing
 * a lesson, a flashcard, or any other entity that exposes these fields.
 *
 * Diff visualization and history:
 * - A global warning banner explains that changes affect all students.
 * - A side/inline panel renders the change history via ChangeHistoryPanel.
 *
 * IMPORTANT UX DECISIONS:
 * - No auto-save: user must click "Guardar cambios".
 * - Clear states: loading, saving, success, error.
 * - Students never reach this component because routes are protected with
 *   teacher-level auth at the page level (withTeacherAuth/withAuth).
 * =============================================================================
 */

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
  FormControlLabel,
} from '@mui/material';
import {
  Save as SaveIcon,
  Undo as UndoIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { ChangeHistoryPanel } from '@/shared/components';

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

export default function TeachingEntityEditor({
  entityType,
  entityId,
  fetchEntity,
  updateEntity,
  titleLabel,
}) {
  const [original, setOriginal] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSaveSuccess(false);

    const { success, data, error: serviceError } = await fetchEntity(entityId);

    if (!success) {
      setError(serviceError?.message || 'No se pudo cargar el contenido.');
      setOriginal(null);
      setForm(null);
      setLoading(false);
      return;
    }

    // Normalize expected fields while keeping the rest of the payload intact.
    const entity = data?.data || data;
    const hydrated = {
      ...entity,
      title: entity.title ?? '',
      content: entity.content ?? '',
      order: entity.order ?? 0,
      isActive: entity.isActive ?? true,
    };

    setOriginal(hydrated);
    setForm(hydrated);
    setLoading(false);
  }, [entityId, fetchEntity]);

  useEffect(() => {
    if (entityId) {
      load();
    }
  }, [entityId, load]);

  const isDirty = useMemo(() => {
    if (!original || !form) return false;
    return (
      original.title !== form.title ||
      original.content !== form.content ||
      Number(original.order) !== Number(form.order) ||
      Boolean(original.isActive) !== Boolean(form.isActive)
    );
  }, [original, form]);

  const handleFieldChange = (field) => (event) => {
    const value =
      field === 'isActive'
        ? event.target.checked
        : field === 'order'
        ? Number(event.target.value)
        : event.target.value;

    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
    setSaveSuccess(false);
  };

  const handleResetChanges = () => {
    setForm(original);
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    if (!form || !entityId) return;
    setSaving(true);
    setError(null);
    setSaveSuccess(false);

    const payload = {
      title: form.title,
      content: form.content,
      order: form.order,
      isActive: form.isActive,
    };

    const { success, data, error: serviceError } = await updateEntity(
      entityId,
      payload
    );

    setSaving(false);

    if (!success) {
      setError(
        serviceError?.message || 'No se pudieron guardar los cambios.'
      );
      return;
    }

    const updatedEntity = data?.data || data;
    const hydrated = {
      ...form,
      ...updatedEntity,
    };

    setOriginal(hydrated);
    setForm(hydrated);
    setSaveSuccess(true);
    setHistoryRefreshKey((prev) => prev + 1);
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress size={48} />
      </Box>
    );
  }

  if (error && !form) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="outlined" onClick={load}>
          Reintentar
        </Button>
      </Box>
    );
  }

  if (!form) {
    return null;
  }

  const lastModifiedBy =
    form.updatedBy || form.lastModifiedBy || form.modifiedBy || null;
  const lastModifiedAt =
    form.updatedAt || form.lastModifiedAt || form.modifiedAt || form.createdAt;

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Alert
          severity="warning"
          icon={<InfoIcon />}
          sx={{ mb: 1, alignItems: 'center' }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Cambios globales
          </Typography>
          <Typography variant="body2">
            Los cambios que realices aquí afectan a <strong>todos los
            estudiantes</strong> que consumen este contenido en el LMS.
          </Typography>
        </Alert>
      </Grid>

      <Grid item xs={12} md={8}>
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'grey.200',
          }}
        >
          <Stack
            direction="row"
            spacing={1.5}
            alignItems="center"
            justifyContent="space-between"
            sx={{ mb: 2 }}
          >
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                Editor de {entityType === 'lesson' ? 'lección' : 'tarjeta'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                ID: {entityId}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button
                startIcon={<UndoIcon />}
                variant="outlined"
                size="small"
                disabled={!isDirty || saving}
                onClick={handleResetChanges}
              >
                Descartar cambios
              </Button>
              <Button
                startIcon={<SaveIcon />}
                variant="contained"
                color="primary"
                disabled={!isDirty || saving}
                onClick={handleSave}
              >
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </Stack>
          </Stack>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {saveSuccess && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Cambios guardados correctamente.
            </Alert>
          )}

          <Stack spacing={2.5}>
            <TextField
              label={titleLabel}
              fullWidth
              value={form.title}
              onChange={handleFieldChange('title')}
              disabled={saving}
            />

            <TextField
              label="Contenido"
              fullWidth
              multiline
              minRows={6}
              value={form.content}
              onChange={handleFieldChange('content')}
              disabled={saving}
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Orden"
                type="number"
                value={form.order}
                onChange={handleFieldChange('order')}
                disabled={saving}
                sx={{ maxWidth: 200 }}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={Boolean(form.isActive)}
                    onChange={handleFieldChange('isActive')}
                    disabled={saving}
                  />
                }
                label="Contenido activo (visible para estudiantes)"
              />
            </Stack>
          </Stack>
        </Paper>
      </Grid>

      <Grid item xs={12} md={4}>
        {/* Metadata + change history */}
        <Stack spacing={2}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'grey.200',
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              Metadatos
            </Typography>

            <Stack spacing={0.75}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Última modificación
                </Typography>
                <Typography variant="body2">
                  {formatDate(lastModifiedAt)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Modificado por
                </Typography>
                <Typography variant="body2">
                  {getUserName(lastModifiedBy)}
                </Typography>
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary">
                  Estado
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Chip
                    size="small"
                    label={form.isActive ? 'Activo' : 'Inactivo'}
                    color={form.isActive ? 'success' : 'default'}
                  />
                </Box>
              </Box>
            </Stack>
          </Paper>

          <ChangeHistoryPanel
            entityType={entityType}
            entityId={entityId}
            defaultExpanded={false}
            refreshKey={historyRefreshKey}
          />
        </Stack>
      </Grid>
    </Grid>
  );
}

TeachingEntityEditor.propTypes = {
  entityType: PropTypes.oneOf(['lesson', 'card']).isRequired,
  entityId: PropTypes.string.isRequired,
  /**
   * Function that loads the entity:
   *   (id: string) => Promise<{ success, data, error }>
   */
  fetchEntity: PropTypes.func.isRequired,
  /**
   * Function that saves the entity:
   *   (id: string, payload: any) => Promise<{ success, data, error }>
   */
  updateEntity: PropTypes.func.isRequired,
  /**
   * Label for the title field (e.g. "Título de la lección").
   */
  titleLabel: PropTypes.string,
};

TeachingEntityEditor.defaultProps = {
  titleLabel: 'Título',
};

