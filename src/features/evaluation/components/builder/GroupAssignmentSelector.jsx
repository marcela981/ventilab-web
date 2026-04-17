import React, { useEffect, useMemo, useState } from 'react';
import { Box, Checkbox, FormControlLabel, Stack, TextField, Typography } from '@mui/material';
import { http } from '@/shared/services/api/http';

async function fetchMyGroups() {
  const { data } = await http.get('/api/groups?myGroups=true&isActive=true');
  return data.groups ?? [];
}

export default function GroupAssignmentSelector({ value, onChange }) {
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    fetchMyGroups().then(setGroups).catch(() => setGroups([]));
  }, []);

  const selectedIds = useMemo(() => new Set((value ?? []).map((v) => v.groupId)), [value]);

  const toggle = (groupId) => {
    const exists = selectedIds.has(groupId);
    if (exists) {
      onChange((value ?? []).filter((v) => v.groupId !== groupId));
      return;
    }
    onChange([...(value ?? []), { groupId, visibleFrom: null, dueDate: null }]);
  };

  const updateField = (groupId, field, fieldValue) => {
    onChange(
      (value ?? []).map((v) => (v.groupId === groupId ? { ...v, [field]: fieldValue } : v))
    );
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
        Asignación por grupo
      </Typography>

      {!groups.length ? (
        <Typography variant="body2" sx={{ opacity: 0.8 }}>
          No hay grupos disponibles (o no perteneces como docente a ningún grupo).
        </Typography>
      ) : (
        <Stack spacing={1}>
          {groups.map((g) => {
            const isChecked = selectedIds.has(g.id);
            const current = (value ?? []).find((v) => v.groupId === g.id);
            return (
              <Box key={g.id} sx={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 2, p: 1.5 }}>
                <FormControlLabel
                  control={<Checkbox checked={isChecked} onChange={() => toggle(g.id)} />}
                  label={<Typography sx={{ fontWeight: 600 }}>{g.name}</Typography>}
                />
                {isChecked && (
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mt: 1 }}>
                    <TextField
                      label="Visible desde"
                      type="datetime-local"
                      value={current?.visibleFrom ?? ''}
                      onChange={(e) => updateField(g.id, 'visibleFrom', e.target.value || null)}
                      InputLabelProps={{ shrink: true }}
                      fullWidth
                    />
                    <TextField
                      label="Fecha límite"
                      type="datetime-local"
                      value={current?.dueDate ?? ''}
                      onChange={(e) => updateField(g.id, 'dueDate', e.target.value || null)}
                      InputLabelProps={{ shrink: true }}
                      fullWidth
                    />
                  </Stack>
                )}
              </Box>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}

