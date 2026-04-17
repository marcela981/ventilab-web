/*
 * Funcionalidad: Pantalla de Resultados Compartida
 * Descripción: Componente reutilizable que muestra los resultados finales de una
 *              evaluación (Quiz, Taller o Examen). Presenta puntaje, estado
 *              aprobado/reprobado y un botón para regresar a la lista.
 * Versión: 1.0
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 * Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria
 *        que integre un sistema de retroalimentación usando modelos de lenguaje
 * Institución: Universidad del Valle
 * Contacto: marcela.mazo@correounivalle.edu.co
 */

import React from 'react';
import { useRouter } from 'next/router';
import { Box, Button, Typography } from '@mui/material';
import evalStyles from '@/features/evaluation/UI/evaluation.module.css';

/**
 * Shared results screen used by QuizRenderer, TallerRenderer and ExamRenderer.
 *
 * @param {number|null} score      - 0-100 auto-computed score (null if not auto-gradable)
 * @param {number}      correct    - Number of correct answers
 * @param {number}      total      - Total number of questions
 * @param {boolean|null} passed    - Whether the student passed
 * @param {boolean}     showEmojis - QuizRenderer / TallerRenderer use emojis; ExamRenderer does not
 */
export default function ResultsScreen({ score, correct, total, passed, showEmojis }) {
  const router = useRouter();
  const hasScore = score !== null && score !== undefined;
  const percentage = hasScore ? score.toFixed(0) : '—';

  return (
    <Box className={evalStyles.resultsWrapper}>
      {/* Score band */}
      <Box
        className={`${evalStyles.resultsBand} ${
          passed !== false ? evalStyles.resultsBandPassed : evalStyles.resultsBandFailed
        }`}
      >
        {hasScore ? (
          <>
            <Box>
              <Typography
                className={`${evalStyles.resultsScoreNumber} ${
                  passed ? evalStyles.resultsScorePassed : evalStyles.resultsScoreFailed
                }`}
              >
                {percentage}
              </Typography>
              <Typography className={evalStyles.resultsScoreCaption}>/ 100</Typography>
            </Box>
            <Box>
              <Typography className={evalStyles.resultsStatusText}>
                {passed
                  ? showEmojis
                    ? '¡Aprobado! 🎉'
                    : 'Aprobado'
                  : showEmojis
                    ? 'Reprobado 😔'
                    : 'Reprobado'}
              </Typography>
              <Typography className={evalStyles.resultsDetail}>
                {correct} de {total} correctas
              </Typography>
            </Box>
          </>
        ) : (
          <Typography className={evalStyles.resultsStatusText}>
            Respuestas enviadas — pendiente de revisión por el docente
          </Typography>
        )}
      </Box>

      {/* Back button */}
      <Button
        variant="outlined"
        className={evalStyles.resultsBackBtn}
        onClick={() => router.push('/evaluation')}
      >
        Volver a evaluaciones
      </Button>
    </Box>
  );
}

