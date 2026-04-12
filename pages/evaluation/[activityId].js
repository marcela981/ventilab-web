/*
 * Funcionalidad: Página de detalle de Actividad de Evaluación
 * Descripción: Carga la actividad por ID, muestra instrucciones y el formulario de entrega (SubmissionForm) para el estudiante; vista de solo lectura para el docente
 * Versión: 1.0
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 * Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
 * Institución: Universidad del Valle
 * Contacto: marcela.mazo@correounivalle.edu.co
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Box, CircularProgress, Divider, Stack, Typography } from '@mui/material';
import { useAuth } from '@/shared/contexts/AuthContext';
import { activityApi } from '@/features/evaluation/api/activity.api';
import { submissionApi } from '@/features/evaluation/api/submission.api';
import SubmissionForm from '@/features/evaluation/components/student/SubmissionForm';
import GradeResult from '@/features/evaluation/components/student/GradeResult';
import SubmissionStatusBadge from '@/features/evaluation/components/student/SubmissionStatusBadge';
import styles from './UI/evaluation.module.css';

export default function ActivityDetailPage() {
  const router = useRouter();
  const { activityId } = router.query;
  const { isTeacher } = useAuth();

  const [activity, setActivity] = useState(null);
  const [submission, setSubmission] = useState(null);
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

        if (!isTeacher || !isTeacher()) {
          const s = await submissionApi.getOrCreateForActivity(String(activityId));
          setSubmission(s);
        }
      } catch (e) {
        setError(e?.message ?? 'Error cargando actividad');
      } finally {
        setIsLoading(false);
      }
    };
    run();
  }, [activityId, isTeacher]);

  if (isLoading) {
    return (
      <Box className={styles.loadingBox}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box className={styles.errorBox}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  if (!activity) {
    return (
      <Box className={styles.errorBox}>
        <Typography>Actividad no encontrada.</Typography>
      </Box>
    );
  }

  return (
    <Box className={styles.page}>
      <Stack spacing={1}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={2}
        >
          <Typography variant="h4" className={styles.title}>
            {activity.title}
          </Typography>
          <SubmissionStatusBadge status={submission?.status} />
        </Stack>

        <Typography variant="body2" className={styles.detailMeta}>
          Tipo: {activity.type} · Puntaje máximo: {activity.maxScore}
        </Typography>

        {activity.description && (
          <Typography variant="body1">
            {activity.description}
          </Typography>
        )}
      </Stack>

      <Divider className={styles.divider} />

      {activity.instructions && (
        <>
          <Typography variant="h6" className={styles.sectionTitle}>
            Instrucciones
          </Typography>
          <Typography variant="body2" className={styles.instructions}>
            {activity.instructions}
          </Typography>
          <Divider className={styles.divider} />
        </>
      )}

      {!isTeacher || !isTeacher() ? (
        <>
          <Typography variant="h6" className={styles.sectionTitle}>
            Entrega
          </Typography>
          <SubmissionForm
            activityId={activity.id}
            submission={submission}
            onSubmissionChange={setSubmission}
          />
          <GradeResult submission={submission} />
        </>
      ) : (
        <Typography variant="body2" className={styles.teacherNote}>
          Vista docente en construcción. Usa el panel de calificación para revisar entregas.
        </Typography>
      )}
    </Box>
  );
}
