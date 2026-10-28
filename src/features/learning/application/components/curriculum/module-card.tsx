/*
* Funcionalidad: ModuleCard
* Descripción: Card of a module in the Currículo tab (W4, Bloque 2; July ModuleCard, ModuleCardFooter and ComingSoonBadge): title, state badges (completed, locked, "Próximamente" for a published module without lessons with pages, "Borrador" for staff), description, lesson progress and the footer button with the July texts per state (Comenzar, Continuar, Completado, Bloqueado; "Próximamente" for coming soon). ONLY the button navigates (the card itself is not clickable): it links to /learn/modules/[id], which resolves where the module continues; locked and coming-soon cards get a disabled button. A locked module names its missing prerequisites (July PrerequisiteTooltip text). Staff also get the module PDF (print view) and, in edit mode, "Editar en el CMS". Depends on MUI icons, next/link, the curriculum view selectors, the learning URLs and the curriculum CSS Module.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ConstructionIcon from "@mui/icons-material/Construction";
import EditIcon from "@mui/icons-material/Edit";
import LockIcon from "@mui/icons-material/Lock";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import RefreshIcon from "@mui/icons-material/Refresh";
import Link from "next/link";
import type { ReactNode } from "react";
import { cx } from "@shared/lib/class-names";
import type { CurriculumModule } from "../../entities/curriculum.entity";
import type { ModuleCardState } from "../../entities/curriculum-view.entity";
import { canOpenModule, isComingSoon, isDraft } from "../../entities/curriculum-view.entity";
import { buildContentNodeUrl, buildModulePrintUrl, buildModuleUrl } from "../../entities/learning-urls";
import type { ProgressValue } from "../../entities/progress.entity";
import styles from "../../../UI/curriculum.module.css";

// TODO(i18n): move to a learning namespace in src/i18n. Texts from July teaching.json and ModuleCard.
export const MODULE_CARD_COPY = {
  button: {
    "completed": "Completado",
    "in-progress": "Continuar",
    "available": "Comenzar",
    "locked": "Bloqueado",
    "coming_soon": "Próximamente",
  } satisfies Record<ModuleCardState, string>,
  action: {
    "completed": "Módulo completado",
    "in-progress": "Continuar módulo",
    "available": "Comenzar módulo",
    "locked": "Módulo bloqueado",
    "coming_soon": "Próximamente",
  } satisfies Record<ModuleCardState, string>,
  comingSoon: "Próximamente",
  comingSoonTooltip: "Este módulo está en preparación y se habilitará pronto",
  draft: "Borrador",
  completed: "Completado",
  locked: "Bloqueado",
  lessons: (count: number) => (count === 1 ? "1 lección" : `${count} lecciones`),
  lessonProgress: (done: number, total: number) => `${done} de ${total} lecciones completadas`,
  missing: (titles: string[]) => (titles.length === 1
    ? `Para desbloquear este módulo, completa: ${titles[0]}`
    : `Para desbloquear este módulo, completa los siguientes módulos: ${titles.join(", ")}`),
  pdf: "PDF del módulo",
  editInCms: "Editar en el CMS",
} as const;

const BUTTON_ICONS: Record<ModuleCardState, ReactNode> = {
  "completed": <CheckCircleIcon fontSize="small" aria-hidden="true" />,
  "in-progress": <RefreshIcon fontSize="small" aria-hidden="true" />,
  "available": <PlayArrowIcon fontSize="small" aria-hidden="true" />,
  "locked": <LockIcon fontSize="small" aria-hidden="true" />,
  "coming_soon": <ConstructionIcon fontSize="small" aria-hidden="true" />,
};

export type ModuleCardProps = {
  module: CurriculumModule
  state: ModuleCardState
  progress: ProgressValue | null
  isStaff: boolean
  editMode: boolean
};

function ModuleCardButton({ module, state }: { module: CurriculumModule, state: ModuleCardState }) {
  const label = `${MODULE_CARD_COPY.action[state]}: ${module.title}`;
  const className = cx(styles.cardButton, state === "completed" ? styles.cardButtonOutlined : undefined);

  if (!canOpenModule(state)) {
    return (
      <button type="button" className={className} disabled aria-label={label}>
        {BUTTON_ICONS[state]}
        {MODULE_CARD_COPY.button[state]}
      </button>
    );
  }

  return (
    <Link href={buildModuleUrl(module.id)} className={className} aria-label={label}>
      {BUTTON_ICONS[state]}
      {MODULE_CARD_COPY.button[state]}
    </Link>
  );
}

export function ModuleCard({ module, state, progress, isStaff, editMode }: ModuleCardProps) {
  const titleId = `module-card-${module.id}-title`;
  const comingSoon = isComingSoon(module);
  const showLessonProgress = progress !== null && progress.totalLessons > 0 && state !== "coming_soon";

  return (
    <article className={cx(styles.moduleCard)} data-state={state} aria-labelledby={titleId}>
      <div className={cx(styles.moduleCardHeader)}>
        <h5 id={titleId} className={cx(styles.moduleTitle)}>{module.title}</h5>
        <div className={cx(styles.badges)}>
          {state === "completed" ? (
            <span className={cx(styles.badge, styles.badgeSuccess)}>
              <CheckCircleIcon fontSize="inherit" aria-hidden="true" />
              {MODULE_CARD_COPY.completed}
            </span>
          ) : null}
          {state === "locked" ? (
            <span className={cx(styles.badge)}>
              <LockIcon fontSize="inherit" aria-hidden="true" />
              {MODULE_CARD_COPY.locked}
            </span>
          ) : null}
          {comingSoon ? (
            <span className={cx(styles.badge, styles.badgeWarning)} title={MODULE_CARD_COPY.comingSoonTooltip}>
              <ConstructionIcon fontSize="inherit" aria-hidden="true" />
              {MODULE_CARD_COPY.comingSoon}
            </span>
          ) : null}
          {isStaff && isDraft(module) ? <span className={cx(styles.badge, styles.badgeDraft)}>{MODULE_CARD_COPY.draft}</span> : null}
        </div>
      </div>
      {module.description ? <p className={cx(styles.moduleDescription)}>{module.description}</p> : null}
      <p className={cx(styles.moduleMeta)}>
        {showLessonProgress
          ? MODULE_CARD_COPY.lessonProgress(progress.completedLessons, progress.totalLessons)
          : MODULE_CARD_COPY.lessons(module.lessonCount)}
      </p>
      {state === "locked" && module.missingPrerequisites.length > 0 ? (
        <p className={cx(styles.lockText)}>
          <LockIcon fontSize="inherit" aria-hidden="true" />
          {MODULE_CARD_COPY.missing(module.missingPrerequisites.map(({ title }) => title))}
        </p>
      ) : null}
      <footer className={cx(styles.moduleCardFooter)}>
        <ModuleCardButton module={module} state={state} />
        {isStaff ? (
          <div className={cx(styles.staffActions)}>
            <Link href={buildModulePrintUrl(module.id)} className={cx(styles.staffLink)} aria-label={`${MODULE_CARD_COPY.pdf}: ${module.title}`}>
              <PictureAsPdfIcon fontSize="inherit" aria-hidden="true" />
              {MODULE_CARD_COPY.pdf}
            </Link>
            {editMode ? (
              <Link href={buildContentNodeUrl("module", module.id)} className={cx(styles.staffLink)} aria-label={`${MODULE_CARD_COPY.editInCms}: ${module.title}`}>
                <EditIcon fontSize="inherit" aria-hidden="true" />
                {MODULE_CARD_COPY.editInCms}
              </Link>
            ) : null}
          </div>
        ) : null}
      </footer>
    </article>
  );
}
