/*
* Funcionalidad: LevelCard
* Descripción: Card of one curriculum level (section page and the levels without section on /learn), anchored by its level id: title, backend progress, and its modules (completed / locked marks). A locked level shows a lock icon and the links to its missing prerequisites; for students its modules are listed without links, for staff (preview) they stay navigable with a hint that students would see them locked. Depends on MUI icons, next/link, the curriculum entity, learning-urls, PrerequisiteList, LockedHint, LearningProgressBar and the learning CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LockIcon from "@mui/icons-material/Lock";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { cx } from "@shared/lib/class-names";
import type { CurriculumLevel, CurriculumModule, CurriculumTree } from "../entities/curriculum.entity";
import { levelPrerequisiteLinks } from "../entities/curriculum.entity";
import { buildModuleUrl, levelAnchorId } from "../entities/learning-urls";
import type { ProgressValue } from "../entities/progress.entity";
import { LockedHint } from "./locked-hint";
import { PrerequisiteList } from "./prerequisite-list";
import { LearningProgressBar } from "./progress-bar";
import styles from "../../UI/learning.module.css";

export type LevelCardProps = {
  tree: CurriculumTree
  level: CurriculumLevel
  progress: ProgressValue | null
  isPreview: boolean
};

function ModuleLabel({ module }: { module: CurriculumModule }) {
  return (
    <>
      {module.completed ? <CheckCircleIcon fontSize="small" className={cx(styles.doneIcon)} aria-label="Completado" /> : null}
      {module.locked ? <LockIcon fontSize="small" className={cx(styles.lockIcon)} aria-label="Bloqueado" /> : null}
      <span>{module.title}</span>
    </>
  );
}

export function LevelCard({ tree, level, progress, isPreview }: LevelCardProps) {
  const headingId = `${levelAnchorId(level.id)}-title`;
  const prerequisites = levelPrerequisiteLinks(tree, level.missingPrerequisites);
  const studentLocked = level.locked && !isPreview;

  return (
    <section id={levelAnchorId(level.id)} aria-labelledby={headingId} className={cx(styles.card)}>
      <div className={cx(styles.cardHeader)}>
        <Typography id={headingId} variant="h6" component="h2">
          {level.title}
        </Typography>
        {level.locked ? (
          <span className={cx(styles.badge)}>
            <LockIcon fontSize="small" aria-hidden="true" />
            Bloqueado
          </span>
        ) : null}
      </div>
      {level.description ? <p className={cx(styles.muted)}>{level.description}</p> : null}
      {progress ? <LearningProgressBar title={level.title} progress={progress} /> : null}
      {studentLocked ? (
        <div className={cx(styles.hint)}>
          <p className={cx(styles.hintText)}>Para desbloquear este nivel primero completa:</p>
          {prerequisites.length > 0 ? <PrerequisiteList prerequisites={prerequisites} /> : null}
        </div>
      ) : null}
      {level.locked && isPreview ? <LockedHint prerequisites={prerequisites} /> : null}
      <ul aria-label={`Módulos de ${level.title}`} className={cx(styles.list)}>
        {level.modules.map((module) => (
          <li key={module.id} className={cx(styles.item)}>
            {studentLocked ? (
              <span className={cx(styles.itemLabel, styles.muted)}>
                <ModuleLabel module={module} />
              </span>
            ) : (
              <Link href={buildModuleUrl(module.id)} className={cx(styles.itemLabel, styles.link)}>
                <ModuleLabel module={module} />
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
