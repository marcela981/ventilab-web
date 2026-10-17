/*
* Funcionalidad: StudentProgressTree
* Descripción: Progress tree of one student in /teacher/students/[userId]: overall progress, then sections → levels → modules as the learning progress summary nests them (ids linked by sectionId / levelId, labelled with the curriculum titles), each with the API percentage and completed / total lessons. The summary has no lesson level (BACKEND GAP). Depends on MUI, the teacher dashboard entities and CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import LinearProgress from "@mui/material/LinearProgress";
import { useMemo } from "react";
import { cx } from "@shared/lib/class-names";
import { buildProgressTree } from "../entities/curriculum-titles.entity";
import type { CurriculumTitles, LearningSummary, ProgressValues } from "../entities/curriculum-titles.entity";
import { formatPercent } from "../entities/teacher-dashboard-labels";
import styles from "../../UI/teacher-dashboard.module.css";

// TODO(i18n): move to a teacher-dashboard namespace in src/i18n.
export const PROGRESS_TREE_COPY = {
  overall: "Progreso general",
  lessons: (completed: number, total: number) => `${completed} de ${total} lecciones`,
  progressAria: (title: string) => `Progreso de ${title}`,
  empty: "El estudiante aún no tiene progreso registrado.",
} as const;

function ProgressLine({ title, progress }: { title: string, progress: ProgressValues }) {
  return (
    <div className={cx(styles.treeRow)}>
      <div className={cx(styles.treeHeader)}>
        <span className={cx(styles.itemTitle)}>{title}</span>
        <span className={cx(styles.itemMeta)}>
          {`${formatPercent(progress.percentage)} · ${PROGRESS_TREE_COPY.lessons(progress.completedLessons, progress.totalLessons)}`}
        </span>
      </div>
      <LinearProgress
        variant="determinate"
        // Display only: the API percentage bounded to the 0–100 range of the bar.
        value={Math.min(100, Math.max(0, progress.percentage))}
        color={progress.completed ? "success" : "primary"}
        aria-label={PROGRESS_TREE_COPY.progressAria(title)}
        className={cx(styles.progressBar)}
      />
    </div>
  );
}

export function StudentProgressTree({ summary, titles }: { summary: LearningSummary, titles: CurriculumTitles }) {
  const tree = useMemo(() => buildProgressTree(summary, titles), [summary, titles]);

  return (
    <div className={cx(styles.section)}>
      <ProgressLine title={PROGRESS_TREE_COPY.overall} progress={summary.overall} />
      {tree.length === 0 ? <p className={cx(styles.emptyText)}>{PROGRESS_TREE_COPY.empty}</p> : (
        <ul className={cx(styles.tree)}>
          {tree.map((section) => (
            <li key={section.id ?? "unsectioned"}>
              {section.progress ? <ProgressLine title={section.title} progress={section.progress} /> : <span className={cx(styles.itemTitle)}>{section.title}</span>}
              {section.levels.length > 0 ? (
                <ul className={cx(styles.treeChildren)}>
                  {section.levels.map((level) => (
                    <li key={level.id}>
                      <ProgressLine title={level.title} progress={level} />
                      {level.modules.length > 0 ? (
                        <ul className={cx(styles.treeChildren)}>
                          {level.modules.map((module) => (
                            <li key={module.id}>
                              <ProgressLine title={module.title} progress={module} />
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
