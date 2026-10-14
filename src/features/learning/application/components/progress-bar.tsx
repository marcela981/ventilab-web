/*
* Funcionalidad: LearningProgressBar
* Descripción: Determinate progress bar with the backend values (percentage and completed / total lessons) and an accessible name "Progreso de <title>". The percentage is only rounded and kept inside 0..100 for display; nothing is recalculated. Depends on MUI LinearProgress and the learning CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import LinearProgress from "@mui/material/LinearProgress";
import { cx } from "@shared/lib/class-names";
import type { ProgressValue } from "../entities/progress.entity";
import styles from "../../UI/learning.module.css";

export type LearningProgressBarProps = {
  title: string
  progress: ProgressValue
};

export function LearningProgressBar({ title, progress }: LearningProgressBarProps) {
  const value = Math.min(100, Math.max(0, Math.round(progress.percentage)));

  return (
    <div className={cx(styles.progress)}>
      <LinearProgress
        variant="determinate"
        value={value}
        aria-label={`Progreso de ${title}`}
        color={progress.completed ? "success" : "primary"}
        className={cx(styles.progressBar)}
      />
      <span className={cx(styles.progressLabel)}>
        {`${value} % · ${progress.completedLessons} de ${progress.totalLessons} lecciones`}
      </span>
    </div>
  );
}
