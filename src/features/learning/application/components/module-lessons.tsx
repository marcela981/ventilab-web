/*
* Funcionalidad: ModuleLessons
* Descripción: Lessons block of the module page: the "Continuar donde quedé" link (shown only once the module progress loaded; label by kind: start / continue / review; v1.1 (L3): hidden when the progress failed instead of offering "Comenzar módulo") and the ordered lesson list, each lesson linking to its first Page with its backend page progress ("x de y páginas") and a completed mark. Loading skeleton and error with retry for the lessons query. Depends on MUI icons, next/link, @shared/design-system, continue-target, learning-urls and the learning CSS Module.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import type { ApiError } from "@shared/api-client/api-error";
import { ErrorState } from "@shared/design-system/components/error-state";
import { ListSkeleton } from "@shared/design-system/components/skeleton";
import { cx } from "@shared/lib/class-names";
import type { ContinueTarget } from "../entities/continue-target";
import { findContinueTarget } from "../entities/continue-target";
import { getLearningErrorMessage } from "../entities/learning-error-messages";
import { buildLessonPageUrl } from "../entities/learning-urls";
import type { LessonSummary } from "../entities/lesson.entity";
import type { LessonProgress } from "../entities/progress.entity";
import styles from "../../UI/learning.module.css";

// TODO(i18n): move to a learning namespace in src/i18n.
const COPY = {
  heading: "Lecciones",
  loading: "Cargando las lecciones…",
  loadErrorTitle: "No se pudieron cargar las lecciones",
  empty: "Este módulo aún no tiene lecciones publicadas.",
  pages: (viewed: number, total: number) => `${viewed} de ${total} páginas`,
  completed: "Completada",
} as const;

const CONTINUE_LABELS: Record<ContinueTarget["kind"], string> = {
  start: "Comenzar módulo",
  continue: "Continuar donde quedé",
  review: "Repasar desde el inicio",
};

export type ModuleLessonsProps = {
  moduleId: string
  lessons: LessonSummary[] | null
  isLoading: boolean
  error: ApiError | null
  onRetry: () => void
  // null while loading or after a failure: the continue link is then hidden (never a misleading "start").
  progress: LessonProgress[] | null
};

export function ModuleLessons({ moduleId, lessons, isLoading, error, onRetry, progress }: ModuleLessonsProps) {
  if (!lessons) {
    if (!isLoading && error) {
      return <ErrorState title={COPY.loadErrorTitle} description={getLearningErrorMessage(error)} onRetry={onRetry} />;
    }

    return <ListSkeleton rows={3} label={COPY.loading} />;
  }

  const byLesson = new Map((progress ?? []).map((item) => [item.lessonId, item]));
  const target = progress ? findContinueTarget(lessons, progress) : null;

  return (
    <section className={cx(styles.card)} aria-labelledby="module-lessons-heading">
      <div className={cx(styles.cardHeader)}>
        <Typography id="module-lessons-heading" variant="h6" component="h2">
          {COPY.heading}
        </Typography>
        {target ? (
          <Link href={buildLessonPageUrl(moduleId, target.lessonId, target.pageNumber)} className={cx(styles.primaryAction)}>
            <PlayArrowIcon fontSize="small" aria-hidden="true" />
            {CONTINUE_LABELS[target.kind]}
          </Link>
        ) : null}
      </div>
      {lessons.length === 0 ? <p className={cx(styles.muted)}>{COPY.empty}</p> : (
        <ul aria-label={COPY.heading} className={cx(styles.list)}>
          {lessons.map((lesson) => {
            const entry = byLesson.get(lesson.id);

            return (
              <li key={lesson.id} className={cx(styles.item)}>
                <span className={cx(styles.itemLabel)}>
                  {entry?.completed ? <CheckCircleIcon fontSize="small" className={cx(styles.doneIcon)} aria-label={COPY.completed} /> : null}
                  <Link href={buildLessonPageUrl(moduleId, lesson.id)} className={cx(styles.link)}>
                    {lesson.title}
                  </Link>
                </span>
                {progress ? (
                  <span className={cx(styles.progressLabel)}>
                    {COPY.pages(entry?.viewedPages ?? 0, entry?.totalPages ?? lesson.pageCount)}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
