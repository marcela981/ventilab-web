/*
 * Funcionalidad: Índice de Calificaciones (docente)
 * Descripción: Lista actividades con entregas para que el docente acceda al panel de calificación; requiere rol TEACHER o ADMIN
 * Versión: 1.0
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 * Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
 * Institución: Universidad del Valle
 * Contacto: marcela.mazo@correounivalle.edu.co
 */

import React from 'react';
import Link from 'next/link';
import { Box, Button, Stack, Typography } from '@mui/material';
import { useAuth } from '@/shared/contexts/AuthContext';
import { useActivities } from '@/features/evaluation/hooks/useActivities';
import styles from './UI/grade.module.css';

export default function GradeIndexPage() {
  const { isTeacher } = useAuth();
  const { activities, isLoading, error, refresh } = useActivities();

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
          Calificaciones
        </Typography>
        <Button variant="outlined" onClick={refresh} disabled={isLoading}>
          Actualizar
        </Button>
      </Stack>

      {error && (
        <Typography variant="body2" color="error" className={styles.errorText}>
          {error}
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
                {a.type} · Entregas: {a._count?.submissions ?? 0}
              </Typography>
            </Box>
            <Link href={`/evaluation/grade/${a.id}`} style={{ textDecoration: 'none' }}>
              <Button variant="contained">Abrir</Button>
            </Link>
          </Stack>
        ))}
        {!activities?.length && !error && (
          <Typography variant="body2" className={styles.emptyText}>
            No hay actividades para calificar.
          </Typography>
        )}
      </Stack>
    </Box>
  );
}
