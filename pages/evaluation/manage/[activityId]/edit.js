/*
 * Funcionalidad: Editar Actividad de Evaluación
 * Descripción: Carga la actividad por ID y presenta ActivityBuilder en modo edición; requiere rol TEACHER o ADMIN
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
import ActivityBuilder from '@/features/evaluation/components/builder/ActivityBuilder';
import styles from '../UI/manage.module.css';

export default function EditActivityPage() {
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
      <ActivityBuilder initialActivity={activity} />
    </Box>
  );
}
