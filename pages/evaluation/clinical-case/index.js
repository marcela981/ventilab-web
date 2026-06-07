/*
 * Funcionalidad: Lista de casos clínicos (flujo paramétrico OE2/OE3)
 * Descripción: Muestra los casos clínicos sembrados en el backend. Al abrir uno,
 *              el estudiante ingresa parámetros y los compara con el experto.
 *              Consume `evaluationApi.getCases` (GET /api/cases). Sigue las
 *              convenciones de las páginas vecinas de `pages/evaluation/`.
 * Versión: 1.0
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 * Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria
 *        que integre un sistema de retroalimentación usando modelos de lenguaje
 * Institución: Universidad del Valle
 * Contacto: marcela.mazo@correounivalle.edu.co
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import { evaluationApi } from '@/features/evaluation/evaluation.api';
import styles from '../UI/evaluation.module.css';

const DIFFICULTY_LABEL = {
  BEGINNER: 'Principiante',
  INTERMEDIATE: 'Intermedio',
  ADVANCED: 'Avanzado',
};

export default function ClinicalCaseListPage() {
  const router = useRouter();
  const [cases, setCases] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await evaluationApi.getCases();
      setCases(Array.isArray(data?.cases) ? data.cases : []);
    } catch (e) {
      setError(e?.message ?? 'Error cargando los casos clínicos');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <Box className={styles.page}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        className={styles.pageHeader}
      >
        <Box>
          <Typography variant="h4" className={styles.title}>
            Casos clínicos
          </Typography>
          <Typography variant="body2" className={styles.subtitle}>
            Configura el ventilador para cada paciente y compara tu decisión con la del experto.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="text" onClick={() => router.push('/evaluation')}>
            ← Evaluaciones
          </Button>
          <Button variant="outlined" onClick={load} disabled={isLoading}>
            Actualizar
          </Button>
        </Stack>
      </Stack>

      {isLoading && (
        <Box className={styles.loadingBox}><CircularProgress /></Box>
      )}

      {!isLoading && error && (
        <Box className={styles.errorBox}>
          <Typography color="error">{error}</Typography>
          <Button variant="outlined" onClick={load} sx={{ mt: 1 }}>Reintentar</Button>
        </Box>
      )}

      {!isLoading && !error && cases.length === 0 && (
        <Box className={styles.errorBox}>
          <Typography>No hay casos clínicos disponibles.</Typography>
        </Box>
      )}

      {!isLoading && !error && cases.length > 0 && (
        <Stack spacing={2} sx={{ mt: 1 }}>
          {cases.map((c) => (
            <Card key={c.id} sx={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(232,244,253,0.12)' }}>
              <CardActionArea onClick={() => router.push(`/evaluation/clinical-case/${c.id}`)}>
                <CardContent>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                    <Typography variant="h6" className={styles.title}>{c.title}</Typography>
                    <Stack direction="row" spacing={1}>
                      {c.pathology && <Chip label={c.pathology} size="small" />}
                      {c.difficulty && (
                        <Chip label={DIFFICULTY_LABEL[c.difficulty] ?? c.difficulty} size="small" variant="outlined" />
                      )}
                    </Stack>
                  </Stack>
                  <Typography variant="body2" className={styles.subtitle} sx={{ mt: 0.5 }}>
                    {c.description}
                  </Typography>
                  <Typography variant="caption" className={styles.detailMeta} sx={{ display: 'block', mt: 1 }}>
                    {c.mainDiagnosis} · {c.patientAge} años · {c.patientWeight} kg
                    {c.userAttempts?.hasAttempted
                      ? ` · Mejor score: ${c.userAttempts.bestScore ?? '—'}`
                      : ''}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  );
}
