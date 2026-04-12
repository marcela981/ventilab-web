/*
 * Funcionalidad: Gestión de Evaluaciones (índice docente)
 * Descripción: Lista todas las actividades del docente con opciones de edición y calificación; requiere rol TEACHER o ADMIN
 * Versión: 1.0
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 * Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
 * Institución: Universidad del Valle
 * Contacto: marcela.mazo@correounivalle.edu.co
 */

import React, { useEffect } from 'react';
import Link from 'next/link';
import { Box, Button, Stack, Typography } from '@mui/material';
import { useAuth } from '@/shared/contexts/AuthContext';
import { useActivities } from '@/features/evaluation/hooks/useActivities';
import styles from './UI/manage.module.css';

export default function EvaluationManagePage() {
  const { isTeacher } = useAuth();
  const { activities, isLoading, error, refresh } = useActivities();

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (!isTeacher || !isTeacher()) {
    return (
      <Box className={styles.page}>
        <Typography>No autorizado.</Typography>
      </Box>
    );
  }

  return (
    <Box className={styles.page}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        className={styles.pageHeader}
      >
        <Typography variant="h4" className={styles.title}>
          Gestión de Evaluaciones
        </Typography>
        <Stack direction="row" spacing={1}>
          <Link href="/evaluation/manage/new" style={{ textDecoration: 'none' }}>
            <Button variant="contained">Crear</Button>
          </Link>
          <Button variant="outlined" onClick={refresh} disabled={isLoading}>
            Actualizar
          </Button>
        </Stack>
      </Stack>

      {error && (
        <Typography variant="body2" color="error" className={styles.errorText}>
          {error}
        </Typography>
      )}

      {!activities?.length && !error && (
        <Typography variant="body2" className={styles.emptyText}>
          Aún no tienes actividades creadas.
        </Typography>
      )}

      <Stack spacing={1}>
        {(activities ?? []).map((a) => (
          <Stack
            key={a.id}
            direction={{ xs: 'column', md: 'row' }}
            spacing={1}
            alignItems={{ md: 'center' }}
            justifyContent="space-between"
            className={styles.activityItem}
          >
            <Box>
              <Typography className={styles.activityTitle}>{a.title}</Typography>
              <Typography variant="body2" className={styles.activityMeta}>
                {a.type} · {a.isPublished ? 'Publicada' : 'Borrador'} · Entregas: {a._count?.submissions ?? 0}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Link href={`/evaluation/manage/${a.id}/edit`} style={{ textDecoration: 'none' }}>
                <Button variant="outlined">Editar</Button>
              </Link>
              <Link href={`/evaluation/grade/${a.id}`} style={{ textDecoration: 'none' }}>
                <Button variant="contained">Calificar</Button>
              </Link>
            </Stack>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}
