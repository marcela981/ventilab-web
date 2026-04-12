/*
 * Funcionalidad: Panel de Calificación de Actividad
 * Descripción: Carga la actividad y presenta GradingDashboard para que el docente revise y califique entregas; requiere rol TEACHER o ADMIN
 * Versión: 1.0
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 * Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
 * Institución: Universidad del Valle
 * Contacto: marcela.mazo@correounivalle.edu.co
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useAuth } from '@/shared/contexts/AuthContext';
import { activityApi } from '@/features/evaluation/api/activity.api';
import GradingDashboard from '@/features/evaluation/components/grading/GradingDashboard';
import styles from './UI/grade.module.css';

export default function GradeActivityPage() {
  const router = useRouter();
  const { activityId } = router.query;
  const { isTeacher } = useAuth();

  const [activity, setActivity] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!activityId) return;
    const run = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const a = await activityApi.getById(String(activityId));
        setActivity(a);
      } catch (e) {
        setError(e?.message ?? 'Error cargando actividad');
      } finally {
        setIsLoading(false);
      }
    };
    run();
  }, [activityId]);

  if (!isTeacher || !isTeacher()) {
    return (
      <Box className={styles.page}>
        <Typography>No autorizado.</Typography>
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box className={styles.loadingBox}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box className={styles.page}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box className={styles.page}>
      <Typography variant="h4" className={styles.title}>
        {activity?.title ?? 'Calificar'}
      </Typography>
      <GradingDashboard activityId={String(activityId)} />
    </Box>
  );
}
