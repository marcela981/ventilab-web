import React, { useEffect, useMemo, useState } from 'react';
import { Box, Button, Divider, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { activityApi } from '../../api/activity.api';
import { submissionApi } from '../../api/submission.api';
import SubmissionReviewer from './SubmissionReviewer';
import { http } from '@/shared/services/api/http';

async function fetchMyGroups() {
  const { data } = await http.get('/api/groups?myGroups=true&isActive=true');
  return data.groups ?? [];
}

export default function GradingDashboard({ activityId }) {
  const [groupId, setGroupId] = useState('');
  const [submissions, setSubmissions] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [groups, setGroups] = useState([]);

  const selected = useMemo(
    () => submissions.find((s) => s.id === selectedId) ?? null,
    [submissions, selectedId]
  );

  const stats = useMemo(() => {
    const total = submissions.length;
    const submitted = submissions.filter((s) => s.status === 'SUBMITTED' || s.status === 'LATE' || s.status === 'GRADED').length;
    const graded = submissions.filter((s) => s.status === 'GRADED').length;
    return { total, submitted, graded };
  }, [submissions]);

  useEffect(() => {
    fetchMyGroups().then(setGroups).catch(() => setGroups([]));
  }, []);

  useEffect(() => {
    if (!activityId) return;
    const run = async () => {
      const items = await activityApi.listSubmissions(activityId, groupId ? { groupId } : undefined);
      setSubmissions(items);
      if (items.length && !selectedId) setSelectedId(items[0].id);
      if (selectedId && !items.some((s) => s.id === selectedId)) setSelectedId(items[0]?.id ?? '');
    };
    run();
  }, [activityId, groupId]);

  const onGraded = (updated) => {
    setSubmissions((prev) => prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)));
  };

  const handleReset = async (submissionId) => {
    try {
      await submissionApi.resetById(submissionId);
      const items = await activityApi.listSubmissions(activityId, groupId ? { groupId } : undefined);
      setSubmissions(items);
      if (selectedId === submissionId) setSelectedId(items[0]?.id ?? '');
    } catch { /* ignore */ }
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Stack spacing={1}>
        <Typography variant="body2" sx={{ opacity: 0.8 }}>
          Total: {stats.total} · Entregadas: {stats.submitted} · Calificadas: {stats.graded}
        </Typography>

        <TextField
          select
          label="Filtrar por grupo"
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
          sx={{ maxWidth: 420 }}
        >
          <MenuItem value="">Todos</MenuItem>
          {groups.map((g) => (
            <MenuItem key={g.id} value={g.id}>
              {g.name}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <Divider sx={{ my: 2 }} />

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="flex-start">
        <Box sx={{ width: { xs: '100%', md: 380 } }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
            Entregas
          </Typography>
          <Stack spacing={1}>
            {submissions.map((s) => (
              <Box
                key={s.id}
                sx={{
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 2,
                  p: 1.5,
                  backgroundColor: s.id === selectedId ? 'rgba(255,255,255,0.06)' : 'transparent',
                }}
              >
                <Box
                  onClick={() => setSelectedId(s.id)}
                  sx={{ cursor: 'pointer' }}
                >
                  <Typography sx={{ fontWeight: 600 }}>
                    {s.student?.name ?? s.student?.email ?? s.userId}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    {s.status} {s.score !== null && s.score !== undefined ? `· ${s.score}/${s.maxScore ?? s.activity?.maxScore ?? 100}` : ''}
                  </Typography>
                </Box>
                {(s.status === 'SUBMITTED' || s.status === 'GRADED') && (
                  <Button
                    size="small"
                    variant="outlined"
                    color="warning"
                    sx={{ mt: 0.5, fontSize: '0.72rem' }}
                    onClick={(e) => { e.stopPropagation(); handleReset(s.id); }}
                  >
                    Reiniciar intento
                  </Button>
                )}
              </Box>
            ))}
            {!submissions.length && (
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                No hay entregas todavía.
              </Typography>
            )}
          </Stack>
        </Box>

        <Box sx={{ flex: 1, width: '100%' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
            Revisión
          </Typography>
          <SubmissionReviewer submission={selected} onGraded={onGraded} />
        </Box>
      </Stack>
    </Box>
  );
}

