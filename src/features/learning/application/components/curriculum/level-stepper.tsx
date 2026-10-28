/*
* Funcionalidad: LevelStepper
* Descripción: Levels of one Currículo accordion as a vertical stepper (W4, Bloque 2; July LevelStepper): each step has a marker (its number, a check when completed, a lock when locked), the level title, its status chip (July texts: Completado, En progreso, Sin iniciar, Bloqueado), description, the backend progress bar with "x % · x/y módulos", and the module card grid. A level locked for a student shows the lock and "Completa el nivel anterior para desbloquear" (or the missing prerequisites by name) and no modules, like July (the locked level does not expand). Staff are never locked, see drafts with "Borrador" and, in edit mode, "Editar en el CMS" on each level. Each level is an anchor (level-<id>) for the deep links. Depends on MUI, the curriculum view selectors, the learning URLs, the ModuleCard and the curriculum CSS Module.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import CheckIcon from "@mui/icons-material/Check";
import EditIcon from "@mui/icons-material/Edit";
import LockIcon from "@mui/icons-material/Lock";
import LinearProgress from "@mui/material/LinearProgress";
import Link from "next/link";
import { cx } from "@shared/lib/class-names";
import type { CurriculumLevel } from "../../entities/curriculum.entity";
import type { LevelStatus } from "../../entities/curriculum-view.entity";
import { isDraft, levelLockText, levelModuleProgress, levelStatus, moduleCardState } from "../../entities/curriculum-view.entity";
import { buildContentNodeUrl, levelAnchorId } from "../../entities/learning-urls";
import type { ProgressSummary } from "../../entities/progress.entity";
import { ModuleCard } from "./module-card";
import styles from "../../../UI/curriculum.module.css";

// TODO(i18n): move to a learning namespace in src/i18n. Texts from July teaching.json.
export const LEVEL_STEPPER_COPY = {
  status: {
    "completed": "Completado",
    "in-progress": "En progreso",
    "not-started": "Sin iniciar",
    "locked": "Bloqueado",
  } satisfies Record<LevelStatus, string>,
  progress: (percentage: number, done: number, total: number) => `${percentage} % · ${done}/${total} módulos`,
  progressLabel: (title: string) => `Progreso de ${title}`,
  noModules: "No hay módulos disponibles en este nivel",
  draft: "Borrador",
  editInCms: "Editar en el CMS",
  modulesOf: (title: string) => `Módulos de ${title}`,
} as const;

export type LevelStepperProps = {
  levels: CurriculumLevel[]
  summary: ProgressSummary | null
  isStaff: boolean
  editMode: boolean
};

type LevelStepProps = Omit<LevelStepperProps, "levels"> & {
  level: CurriculumLevel
  previous: CurriculumLevel | null
  index: number
};

function LevelStep({ level, previous, index, summary, isStaff, editMode }: LevelStepProps) {
  const headingId = `${levelAnchorId(level.id)}-title`;
  const studentLocked = level.locked && !isStaff;
  const cards = level.modules.map((module) => {
    const progress = summary?.modules.get(module.id) ?? null;

    return { module, progress, state: moduleCardState({ module, levelLocked: level.locked, progress, isStaff }) };
  });
  const states = new Map(cards.map(({ module, state }) => [module.id, state]));
  const progress = levelModuleProgress(level, summary?.levels.get(level.id) ?? null, (module) => states.get(module.id) === "completed");
  const status = levelStatus(level, progress, isStaff);
  const lockText = studentLocked ? levelLockText(level, previous) : null;

  return (
    <li id={levelAnchorId(level.id)} className={cx(styles.step)} data-status={status} aria-labelledby={headingId}>
      <span className={cx(styles.stepMarker)} aria-hidden="true">
        {status === "completed" ? <CheckIcon fontSize="small" /> : null}
        {status === "locked" ? <LockIcon fontSize="small" /> : null}
        {status !== "completed" && status !== "locked" ? index + 1 : null}
      </span>
      <div className={cx(styles.stepBody)}>
        <div className={cx(styles.stepHeader)}>
          <h4 id={headingId} className={cx(styles.levelTitle)}>{level.title}</h4>
          <div className={cx(styles.badges)}>
            <span className={cx(styles.badge, status === "completed" ? styles.badgeSuccess : undefined)}>
              {status === "locked" ? <LockIcon fontSize="inherit" aria-hidden="true" /> : null}
              {LEVEL_STEPPER_COPY.status[status]}
            </span>
            {isStaff && isDraft(level) ? <span className={cx(styles.badge, styles.badgeDraft)}>{LEVEL_STEPPER_COPY.draft}</span> : null}
            {isStaff && editMode ? (
              <Link href={buildContentNodeUrl("level", level.id)} className={cx(styles.staffLink)} aria-label={`${LEVEL_STEPPER_COPY.editInCms}: ${level.title}`}>
                <EditIcon fontSize="inherit" aria-hidden="true" />
                {LEVEL_STEPPER_COPY.editInCms}
              </Link>
            ) : null}
          </div>
        </div>
        {level.description ? <p className={cx(styles.levelDescription)}>{level.description}</p> : null}
        {lockText ? (
          <p className={cx(styles.lockText)}>
            <LockIcon fontSize="inherit" aria-hidden="true" />
            {lockText}
          </p>
        ) : null}
        <div className={cx(styles.levelProgress)}>
          <LinearProgress
            variant="determinate"
            value={progress.percentage}
            aria-label={LEVEL_STEPPER_COPY.progressLabel(level.title)}
            color={status === "completed" ? "success" : "primary"}
            className={cx(styles.progressBar)}
          />
          <span className={cx(styles.progressText)}>
            {LEVEL_STEPPER_COPY.progress(progress.percentage, progress.completedModules, progress.totalModules)}
          </span>
        </div>
        {studentLocked ? null : (
          <>
            {cards.length > 0 ? (
              <ul aria-label={LEVEL_STEPPER_COPY.modulesOf(level.title)} className={cx(styles.moduleGrid)}>
                {cards.map(({ module, progress: moduleProgress, state }) => (
                  <li key={module.id}>
                    <ModuleCard module={module} state={state} progress={moduleProgress} isStaff={isStaff} editMode={editMode} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className={cx(styles.muted)}>{LEVEL_STEPPER_COPY.noModules}</p>
            )}
          </>
        )}
      </div>
    </li>
  );
}

export function LevelStepper({ levels, summary, isStaff, editMode }: LevelStepperProps) {
  return (
    <ol className={cx(styles.stepper)}>
      {levels.map((level, index) => (
        <LevelStep
          key={level.id}
          level={level}
          previous={levels[index - 1] ?? null}
          index={index}
          summary={summary}
          isStaff={isStaff}
          editMode={editMode}
        />
      ))}
    </ol>
  );
}
