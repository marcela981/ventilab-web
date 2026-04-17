/*
 * Funcionalidad: Tarjeta de evaluación del estudiante
 * Descripción: Muestra un item de evaluación (quiz, taller o examen) con badges de tipo
 *              y nivel, descripción breve y botón de inicio. Estilo visual alineado con
 *              las tarjetas de módulos del módulo de enseñanza.
 * Versión: 1.0
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 */

import React from 'react';
import { useRouter } from 'next/router';
import { Button, Chip, Typography } from '@mui/material';
import styles from '../../UI/evaluation.module.css';

// ─── Label / colour maps ─────────────────────────────────────────────────────

const TYPE_LABELS = { QUIZ: 'Quiz', TALLER: 'Taller', EXAM: 'Examen' };
const TYPE_CHIP_CLASS = {
  QUIZ:   styles.chipTypeQuiz,
  TALLER: styles.chipTypeTaller,
  EXAM:   styles.chipTypeExam,
};

const LEVEL_LABELS = {
  principiante: 'Principiante',
  intermedio:   'Intermedio',
  avanzado:     'Avanzado',
};
const LEVEL_CHIP_CLASS = {
  principiante: styles.chipLevelPrincipiante,
  intermedio:   styles.chipLevelIntermedio,
  avanzado:     styles.chipLevelAvanzado,
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function EvaluationCard({ item, submission }) {
  const router = useRouter();
  const published = item.isPublished !== false;
  const isCompleted = submission?.status === 'SUBMITTED' || submission?.status === 'GRADED';

  function handleStart() {
    if (!isCompleted) router.push(`/evaluation/${item.id}`);
  }

  const scoreText = isCompleted && submission.score != null
    ? `Nota: ${submission.score}${submission.maxScore != null ? `/${submission.maxScore}` : ''}`
    : null;

  return (
    <article
      className={[
        styles.evalCard,
        !published ? styles.evalCardUnavailable : '',
        isCompleted ? styles.cardCompleted : '',
      ].join(' ')}
    >

      {/* Badges row */}
      <div className={styles.evalCardBadges}>
        {!published && (
          <Chip label="No disponible" size="small" className={styles.chipUnavailable} />
        )}
        {isCompleted && (
          <Chip label="Completado ✓" size="small" className={styles.completedBadge} />
        )}
        <Chip
          label={TYPE_LABELS[item.itemType] ?? item.itemType}
          size="small"
          className={TYPE_CHIP_CLASS[item.itemType] ?? ''}
        />
        <Chip
          label={LEVEL_LABELS[item.level] ?? item.level}
          size="small"
          className={LEVEL_CHIP_CLASS[item.level] ?? ''}
        />
      </div>

      {/* Title */}
      <Typography variant="h6" className={styles.evalCardTitle}>
        {item.title}
      </Typography>

      {/* Description — 2 lines max */}
      {item.description && (
        <Typography variant="body2" className={styles.evalCardDescription}>
          {item.description}
        </Typography>
      )}

      {/* Passing score (quizzes only) */}
      {item.passingScore != null && (
        <Typography variant="body2" className={styles.evalCardPassingScore}>
          Aprobación: {item.passingScore}%
        </Typography>
      )}

      {/* Score on completed card */}
      {scoreText && (
        <Typography variant="body2" className={styles.completedScore}>
          {scoreText}
        </Typography>
      )}

      {/* Footer */}
      <div className={styles.evalCardFooter}>
        {isCompleted ? (
          <Button
            variant="outlined"
            size="small"
            onClick={handleStart}
            className={styles.completedBtn}
          >
            Ver resultados
          </Button>
        ) : (
          <Button
            variant="contained"
            size="small"
            disabled={!published}
            onClick={handleStart}
            className={styles.evalCardStartBtn}
          >
            Iniciar →
          </Button>
        )}
      </div>

    </article>
  );
}

