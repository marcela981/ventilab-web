/*
 * Funcionalidad: Lista de evaluaciones del estudiante
 * Descripción: Organiza actividades y quizzes en 3 acordeones (Quizzes, Talleres, Exámenes),
 *              agrupados por track (Mecánica / VentyLab) y nivel (Principiante / Intermedio / Avanzado).
 * Versión: 2.0
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 */

import React, { useMemo } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Skeleton,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EvaluationCard from './EvaluationCard';
import { groupEvaluations } from '../../shared/utils/groupActivities';
import styles from '../../UI/evaluation.module.css';

// ─── Constants ───────────────────────────────────────────────────────────────

const LEVELS = ['principiante', 'intermedio', 'avanzado'];
const LEVEL_LABELS = {
  principiante: 'Principiante',
  intermedio:   'Intermedio',
  avanzado:     'Avanzado',
};

const TRACKS = [
  { key: 'mecanica', label: 'Mecánica' },
  { key: 'ventylab', label: 'VentyLab' },
];

const SECTIONS = [
  { key: 'quizzes',  label: '📝 Quizzes' },
  { key: 'talleres', label: '📋 Talleres' },
  { key: 'examenes', label: '🎓 Exámenes Finales' },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

/**
 * Renders the level groups inside one track section.
 * Skips levels that have no items.
 */
function LevelGroup({ byLevel, submissionMap }) {
  const hasAny = LEVELS.some((l) => byLevel[l].length > 0);

  if (!hasAny) {
    return (
      <Typography className={styles.emptyTrack}>
        Sin evaluaciones asignadas.
      </Typography>
    );
  }

  return (
    <>
      {LEVELS.map((level) => {
        const items = byLevel[level];
        if (!items.length) return null;
        return (
          <div key={level}>
            <Typography className={styles.levelLabel}>
              {LEVEL_LABELS[level]}
            </Typography>
            <div className={styles.cardGrid}>
              {items.map((item) => (
                <EvaluationCard
                  key={item.id}
                  item={item}
                  submission={submissionMap?.[item.id]}
                />
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}

/**
 * Renders the two track sub-sections (Mecánica / VentyLab) inside one accordion.
 */
function TrackSections({ sectionData, submissionMap }) {
  return (
    <>
      {TRACKS.map(({ key, label }) => {
        const byLevel = sectionData[key];
        const hasAny = LEVELS.some((l) => byLevel[l].length > 0);
        if (!hasAny) return null;
        return (
          <div key={key}>
            <Typography className={styles.trackTitle}>{label}</Typography>
            <LevelGroup byLevel={byLevel} submissionMap={submissionMap} />
          </div>
        );
      })}
    </>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function ActivityList({ activities, quizzes, isLoading, error, onRetry, submissionMap }) {
  const grouped = useMemo(
    () => groupEvaluations(activities ?? [], quizzes ?? []),
    [activities, quizzes],
  );

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <Box>
        {[1, 2, 3].map((n) => (
          <Skeleton
            key={n}
            variant="rectangular"
            height={56}
            className={styles.skeletonCard}
            style={{ marginBottom: 12, borderRadius: 12 }}
          />
        ))}
      </Box>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <Box className={styles.errorContainer}>
        <Typography variant="body2" color="error">{error}</Typography>
        {onRetry && (
          <Button variant="outlined" size="small" onClick={onRetry}>
            Reintentar
          </Button>
        )}
      </Box>
    );
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  const isEmpty =
    !activities?.length && !quizzes?.length;

  if (isEmpty) {
    return (
      <Typography variant="body2" color="text.secondary">
        No tienes evaluaciones asignadas todavía.
      </Typography>
    );
  }

  // ── Accordion layout ───────────────────────────────────────────────────────
  return (
    <Box>
      {SECTIONS.map(({ key, label }) => {
        const sectionData = grouped[key];
        const totalItems = TRACKS.reduce(
          (sum, t) => sum + LEVELS.reduce((s, l) => s + sectionData[t.key][l].length, 0),
          0,
        );
        if (totalItems === 0) return null;

        return (
          <Accordion
            key={key}
            defaultExpanded
            disableGutters
            elevation={0}
            className={styles.accordionRoot}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography className={styles.accordionSummaryContent}>
                {label}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <TrackSections sectionData={sectionData} submissionMap={submissionMap} />
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Box>
  );
}

