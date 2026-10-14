/*
* Funcionalidad: Module completion
* Descripción: Completion card of a module, shown on /learn/modules/[moduleId]?completed=1 (the viewer's "Finalizar módulo" after the last Page). Shows the backend module progress (never recalculated; it is refetched after the last page view) and links to the next unlocked module of the curriculum (findNextModule excluding this one); when there is none, it links back to the section (or to /learn for modules without section). Depends on MUI, next/link, the progress bar and the viewer CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { cx } from "@shared/lib/class-names";
import type { CurriculumModule } from "../entities/curriculum.entity";
import { buildModuleUrl } from "../entities/learning-urls";
import type { ProgressValue } from "../entities/progress.entity";
import { LearningProgressBar } from "./progress-bar";
import learningStyles from "../../UI/learning.module.css";
import styles from "../../UI/lesson-viewer.module.css";

// TODO(i18n): move to a learning namespace in src/i18n.
const COPY = {
  heading: "¡Completaste el módulo!",
  intro: (title: string) => `Terminaste todas las páginas de «${title}».`,
  next: (title: string) => `Siguiente módulo: ${title}`,
} as const;

export type ModuleCompletionProps = {
  title: string
  progress: ProgressValue | null
  nextModule: CurriculumModule | null
  backHref: string
  backLabel: string
};

export function ModuleCompletion({ title, progress, nextModule, backHref, backLabel }: ModuleCompletionProps) {
  return (
    <section className={cx(styles.completion)} aria-labelledby="module-completion-heading">
      <EmojiEventsIcon className={cx(styles.completionIcon)} aria-hidden="true" />
      <Typography id="module-completion-heading" variant="h5" component="h2">
        {COPY.heading}
      </Typography>
      <Typography variant="body1">{COPY.intro(title)}</Typography>
      {progress ? (
        <div className={cx(styles.completionProgress)}>
          <LearningProgressBar title={title} progress={progress} />
        </div>
      ) : null}
      {nextModule ? (
        <Link href={buildModuleUrl(nextModule.id)} className={cx(learningStyles.primaryAction)}>
          {COPY.next(nextModule.title)}
        </Link>
      ) : (
        <Link href={backHref} className={cx(learningStyles.link)}>
          {backLabel}
        </Link>
      )}
    </section>
  );
}
