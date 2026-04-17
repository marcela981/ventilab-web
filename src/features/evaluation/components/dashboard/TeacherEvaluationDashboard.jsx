import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Box, Button, Stack, Tab, Tabs, Typography } from '@mui/material';
import { useActivities } from '../../hooks/useActivities';
import ActivityBuilder from '../builder/ActivityBuilder';

function TabPanel({ value, index, children }) {
  if (value !== index) return null;
  return <Box sx={{ mt: 2 }}>{children}</Box>;
}

export default function TeacherEvaluationDashboard() {
  const [tab, setTab] = useState(0);
  const { activities, isLoading, error, refresh } = useActivities();

  const myActivities = useMemo(() => activities ?? [], [activities]);

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Evaluaciones
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={refresh} disabled={isLoading}>
            Actualizar
          </Button>
          <Link href="/evaluation/grade" style={{ textDecoration: 'none' }}>
            <Button variant="contained">Calificar</Button>
          </Link>
        </Stack>
      </Stack>

      <Tabs value={tab} onChange={(_, v) => setTab(v)}>
        <Tab label="Mis Actividades" />
        <Tab label="Crear Actividad" />
      </Tabs>

      <TabPanel value={tab} index={0}>
        {error && (
          <Typography color="error" variant="body2">
            {error}
          </Typography>
        )}
        {!error && !myActivities.length && (
          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            Aún no tienes actividades creadas.
          </Typography>
        )}
        {!!myActivities.length && (
          <Stack spacing={1}>
            {myActivities.map((a) => (
              <Stack
                key={a.id}
                direction={{ xs: 'column', md: 'row' }}
                spacing={1}
                alignItems={{ md: 'center' }}
                justifyContent="space-between"
                sx={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 2, p: 2 }}
              >
                <Box>
                  <Typography sx={{ fontWeight: 600 }}>{a.title}</Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    {a.type} · {a.isPublished ? 'Publicada' : 'Borrador'} · Entregas: {a._count?.submissions ?? 0}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                  <Link href={`/evaluation/manage/${a.id}/edit`} style={{ textDecoration: 'none' }}>
                    <Button variant="outlined">Editar</Button>
                  </Link>
                  <Link href={`/evaluation/grade/${a.id}`} style={{ textDecoration: 'none' }}>
                    <Button variant="contained">Revisar entregas</Button>
                  </Link>
                </Stack>
              </Stack>
            ))}
          </Stack>
        )}
      </TabPanel>

      <TabPanel value={tab} index={1}>
        <ActivityBuilder onSaved={() => { setTab(0); refresh(); }} />
      </TabPanel>
    </Box>
  );
}

