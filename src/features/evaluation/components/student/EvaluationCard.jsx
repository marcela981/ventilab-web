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
import PropTypes from 'prop-types';
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

export default function EvaluationCard({ item }) {
  const router = useRouter();
  const published = item.isPublished !== false;

  function handleStart() {
    router.push(`/evaluation/${item.id}`);
  }

  return (
    <article className={`${styles.evalCard} ${!published ? styles.evalCardUnavailable : ''}`}>

      {/* Badges row */}
      <div className={styles.evalCardBadges}>
        {!published && (
          <Chip
            label="No disponible"
            size="small"
            className={styles.chipUnavailable}
          />
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

      {/* Footer — start button */}
      <div className={styles.evalCardFooter}>
        <Button
          variant="contained"
          size="small"
          disabled={!published}
          onClick={handleStart}
          className={styles.evalCardStartBtn}
        >
          Iniciar →
        </Button>
      </div>

    </article>
  );
}

EvaluationCard.propTypes = {
  item: PropTypes.shape({
    id:           PropTypes.string.isRequired,
    title:        PropTypes.string.isRequired,
    itemType:     PropTypes.oneOf(['QUIZ', 'TALLER', 'EXAM']).isRequired,
    description:  PropTypes.string,
    maxScore:     PropTypes.number,
    isPublished:  PropTypes.bool,
    passingScore: PropTypes.number,
    level:        PropTypes.oneOf(['principiante', 'intermedio', 'avanzado']).isRequired,
    track:        PropTypes.oneOf(['mecanica', 'ventylab']).isRequired,
  }).isRequired,
};
