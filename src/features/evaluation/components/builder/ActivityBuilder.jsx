import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Box, Button, Divider, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useActivityBuilder } from '../../hooks/useActivityBuilder';
import { assignmentApi } from '../../api/assignment.api';
import GroupAssignmentSelector from './GroupAssignmentSelector';

const TYPES = [
  { value: 'EXAM', label: 'Examen' },
  { value: 'QUIZ', label: 'Quiz' },
  { value: 'WORKSHOP', label: 'Workshop' },
  { value: 'TALLER', label: 'Taller' },
];

export default function ActivityBuilder({ initialActivity, onSaved }) {
  const { isSaving, error, create, update, publish } = useActivityBuilder();
  const isEdit = Boolean(initialActivity?.id);

  const [title, setTitle] = useState(initialActivity?.title ?? '');
  const [description, setDescription] = useState(initialActivity?.description ?? '');
  const [instructions, setInstructions] = useState(initialActivity?.instructions ?? '');
  const [type, setType] = useState(initialActivity?.type ?? 'EXAM');
  const [maxScore, setMaxScore] = useState(initialActivity?.maxScore ?? 100);
  const [timeLimit, setTimeLimit] = useState(initialActivity?.timeLimit ?? '');
  const [dueDate, setDueDate] = useState(initialActivity?.dueDate ?? '');

  const [assignments, setAssignments] = useState([]);

  const payload = useMemo(
    () => ({
      title,
      description: description || null,
      instructions: instructions || null,
      type,
      maxScore: Number(maxScore),
      timeLimit: timeLimit === '' ? null : Number(timeLimit),
      dueDate: dueDate || null,
    }),
    [title, description, instructions, type, maxScore, timeLimit, dueDate]
  );

  const saveAssignments = async (activityId) => {
    for (const a of assignments) {
      await assignmentApi.upsert({
        activityId,
        groupId: a.groupId,
        visibleFrom: a.visibleFrom,
        dueDate: a.dueDate,
      });
    }
  };

  const handleSaveDraft = async () => {
    const activity = isEdit ? await update(initialActivity.id, payload) : await create(payload);
    await saveAssignments(activity.id);
    onSaved?.(activity);
  };

  const handlePublish = async () => {
    let activity = isEdit ? await update(initialActivity.id, payload) : await create(payload);
    await saveAssignments(activity.id);
    activity = await publish(activity.id);
    onSaved?.(activity);
  };

  const handleReloadAssignments = async () => {
    if (!initialActivity?.id) return;
    const list = await assignmentApi.listForActivity(initialActivity.id);
    setAssignments(
      list.map((x) => ({
        groupId: x.groupId,
        visibleFrom: x.visibleFrom,
        dueDate: x.dueDate,
      }))
    );
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" sx={{ fontWeight: 700 }}>
        {isEdit ? 'Editar actividad' : 'Crear actividad'}
      </Typography>

      {error && (
        <Typography variant="body2" color="error" sx={{ mt: 1 }}>
          {error}
        </Typography>
      )}

      <Stack spacing={1.5} sx={{ mt: 2, maxWidth: 900 }}>
        <TextField label="Título" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <TextField
          label="Descripción"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          multiline
          minRows={2}
        />
        <TextField
          label="Instrucciones"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          multiline
          minRows={4}
        />
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
          <TextField select label="Tipo" value={type} onChange={(e) => setType(e.target.value)} fullWidth>
            {TYPES.map((t) => (
              <MenuItem key={t.value} value={t.value}>
                {t.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Puntaje máximo"
            type="number"
            value={maxScore}
            onChange={(e) => setMaxScore(e.target.value)}
            fullWidth
          />
          <TextField
            label="Tiempo límite (min)"
            type="number"
            value={timeLimit}
            onChange={(e) => setTimeLimit(e.target.value)}
            fullWidth
          />
        </Stack>
        <TextField
          label="Fecha límite (general)"
          type="datetime-local"
          value={dueDate ?? ''}
          onChange={(e) => setDueDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />

        <Divider />
        <GroupAssignmentSelector value={assignments} onChange={setAssignments} />

        <Stack direction="row" spacing={1} justifyContent="flex-end">
          {isEdit && (
            <Button variant="outlined" onClick={handleReloadAssignments} disabled={isSaving}>
              Recargar asignaciones
            </Button>
          )}
          <Button variant="outlined" onClick={handleSaveDraft} disabled={isSaving}>
            Guardar borrador
          </Button>
          <Button variant="contained" onClick={handlePublish} disabled={isSaving}>
            Publicar
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}

ActivityBuilder.propTypes = {
  initialActivity: PropTypes.object,
  onSaved: PropTypes.func,
};

