/*
* Funcionalidad: LessonPageProgress
* Descripción: "Página x de N" line of the lesson viewer header with its determinate progress bar and the percentage (July layout, FLUJOS_JULIO §e.4: "Página x de N ■■■■□□ NN%"). The percentage is the position inside the lesson (x / N), rounded; the bar is named "Progreso de la lección". Depends on MUI LinearProgress and the viewer CSS Module.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import LinearProgress from "@mui/material/LinearProgress";
import { cx } from "@shared/lib/class-names";
import styles from "../../UI/lesson-viewer.module.css";

// TODO(i18n): move to a learning namespace in src/i18n.
const COPY = {
  pageOf: (page: number, total: number) => `Página ${page} de ${total}`,
  barLabel: "Progreso de la lección",
} as const;

export type LessonPageProgressProps = {
  pageNumber: number
  pageCount: number
};

export function LessonPageProgress({ pageNumber, pageCount }: LessonPageProgressProps) {
  const percent = pageCount > 0 ? Math.min(100, Math.max(0, Math.round((pageNumber / pageCount) * 100))) : 0;

  return (
    <div className={cx(styles.pageProgress)}>
      <span className={cx(styles.pageProgressLabel)}>{COPY.pageOf(pageNumber, pageCount)}</span>
      <LinearProgress
        variant="determinate"
        value={percent}
        aria-label={COPY.barLabel}
        color={percent >= 100 ? "success" : "primary"}
        className={cx(styles.pageProgressBar)}
      />
      <span className={cx(styles.pageProgressPercent)}>{`${percent}%`}</span>
    </div>
  );
}
