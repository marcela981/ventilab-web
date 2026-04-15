/*
 * Funcionalidad: Página índice de Evaluaciones
 * Descripción: Lista actividades disponibles para el estudiante; redirige al docente al panel de gestión y calificación
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
import ActivityList from '@/features/evaluation/components/student/ActivityList';
import styles from './UI/evaluation.module.css';

export default function EvaluationIndexPage() {
  const { isTeacher } = useAuth();
  const { activities, isLoading, error, refresh } = useActivities();

  if (isTeacher && isTeacher()) {
    return (
      <Box className={styles.page}>
        <Stack spacing={1.5}>
          <Typography variant="h4" className={styles.title}>
            Evaluaciones
          </Typography>
          <Typography variant="body2" className={styles.subtitle}>
            Panel docente/administrador para crear, asignar y calificar actividades.
          </Typography>
          <Stack direction="row" spacing={1}>
            <Link href="/evaluation/manage" style={{ textDecoration: 'none' }}>
              <Button variant="contained">Ir a gestión</Button>
            </Link>
            <Link href="/evaluation/grade" style={{ textDecoration: 'none' }}>
              <Button variant="outlined">Ir a calificaciones</Button>
            </Link>
          </Stack>
        </Stack>
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
          Evaluación
        </Typography>
        <Button variant="outlined" onClick={refresh} disabled={isLoading}>
          Actualizar
        </Button>
      </Stack>

      <ActivityList activities={activities} isLoading={isLoading} error={error} onRetry={refresh} />
    </Box>
  );
}
