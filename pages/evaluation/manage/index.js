/*
 * Funcionalidad: Gestión de Evaluaciones (índice docente)
 * Descripción: Lista todas las actividades agrupadas por tipo (Exámenes, Quizzes, Talleres)
 *              con badge de tipo y opciones de edición/calificación; requiere rol TEACHER o ADMIN
 * Versión: 1.1
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 * Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
 * Institución: Universidad del Valle
 * Contacto: marcela.mazo@correounivalle.edu.co
 */

import React, { useEffect } from 'react';
import Link from 'next/link';
import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import { useAuth } from '@/shared/contexts/AuthContext';
import { useActivities } from '@/features/evaluation/hooks/useActivities';
import evalStyles from '@/features/evaluation/UI/evaluation.module.css';
import styles from './UI/manage.module.css';

const TYPE_LABELS = {
  EXAM: 'Exámenes',
  QUIZ: 'Quizzes',
  TALLER: 'Talleres',
  WORKSHOP: 'Talleres',
};

const TYPE_COLORS = {
  EXAM: 'error',
  QUIZ: 'primary',
  TALLER: 'success',
  WORKSHOP: 'success',
};

// Display order for type groups
const TYPE_ORDER = ['EXAM', 'QUIZ', 'TALLER', 'WORKSHOP'];

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

  // Group activities by type; skip groups with no items
  const grouped = TYPE_ORDER.reduce((acc, type) => {
    const items = (activities ?? []).filter((a) => a.type === type);
    if (items.length) acc[type] = items;
    return acc;
  }, {});

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

      {Object.entries(grouped).map(([type, items]) => (
        <Box key={type} className={evalStyles.typeSection}>
          <Typography variant="h6" className={evalStyles.typeSectionTitle}>
            {TYPE_LABELS[type] ?? type}
          </Typography>

          <Stack spacing={1}>
            {items.map((a) => (
              <Stack
                key={a.id}
                direction={{ xs: 'column', md: 'row' }}
                spacing={1}
                alignItems={{ md: 'center' }}
                justifyContent="space-between"
                className={styles.activityItem}
              >
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography className={styles.activityTitle}>{a.title}</Typography>
                    <Chip
                      label={a.type}
                      color={TYPE_COLORS[a.type] ?? 'default'}
                      size="small"
                    />
                  </Stack>
                  <Typography variant="body2" className={styles.activityMeta}>
                    {a.isPublished ? 'Publicada' : 'Borrador'} · Entregas:{' '}
                    {a._count?.submissions ?? 0}
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
      ))}
    </Box>
  );
}
