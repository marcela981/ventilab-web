/*
* Funcionalidad: LessonIndex
* Descripción: Module lesson index of the lesson viewer (W5, Bloque 2; July LessonIndexNavigator, FLUJOS_JULIO §e.4 step 4). On desktop it is the right column, collapsible ("Ocultar índice" / "Mostrar índice", local state); below the MUI md breakpoint the column is hidden by CSS and an "Índice de lecciones" button opens the same list in a right Drawer. Each entry is a link to page 1 of its lesson (the current one with aria-current and a completed check), except the locked ones: later incomplete lessons are shown with a lock, are not links and say "bloqueada" to screen readers (mandatory order; the server enforces it too). The entries come from buildLessonIndex. Depends on MUI (Drawer, Button, IconButton, icons), next/link, the learning URLs and the viewer CSS Module.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CloseIcon from "@mui/icons-material/Close";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LockIcon from "@mui/icons-material/Lock";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import Button from "@mui/material/Button";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import Link from "next/link";
import { useId, useState } from "react";
import { cx } from "@shared/lib/class-names";
import type { LessonIndexEntry } from "../entities/lesson-access.entity";
import { buildLessonPageUrl } from "../entities/learning-urls";
import styles from "../../UI/lesson-viewer.module.css";

// TODO(i18n): move to a learning namespace in src/i18n.
export const LESSON_INDEX_COPY = {
  heading: "Índice de lecciones",
  hide: "Ocultar índice",
  show: "Mostrar índice",
  close: "Cerrar índice",
  locked: "(bloqueada)",
  completed: "(completada)",
} as const;

export type LessonIndexProps = {
  moduleId: string
  entries: LessonIndexEntry[]
};

const noop = (): void => undefined;

function LessonIndexList({ moduleId, entries, onNavigate = noop }: LessonIndexProps & { onNavigate?: () => void }) {
  return (
    <ol className={cx(styles.indexList)}>
      {entries.map((entry) => (
        <li key={entry.id}>
          {entry.locked ? (
            <span className={cx(styles.indexItem, styles.indexItemLocked)} aria-disabled="true">
              <LockIcon fontSize="small" aria-hidden="true" />
              <span>{entry.title}</span>
              <span className={cx(styles.visuallyHidden)}>{LESSON_INDEX_COPY.locked}</span>
            </span>
          ) : (
            <Link
              href={buildLessonPageUrl(moduleId, entry.id)}
              className={cx(styles.indexItem, entry.current && styles.indexItemCurrent)}
              aria-current={entry.current ? "page" : undefined}
              onClick={onNavigate}
            >
              {entry.completed ? <CheckCircleIcon fontSize="small" className={cx(styles.indexCheck)} aria-hidden="true" /> : <span className={cx(styles.indexBullet)} aria-hidden="true" />}
              <span>{entry.title}</span>
              {entry.completed ? <span className={cx(styles.visuallyHidden)}>{LESSON_INDEX_COPY.completed}</span> : null}
            </Link>
          )}
        </li>
      ))}
    </ol>
  );
}

export function LessonIndex({ moduleId, entries }: LessonIndexProps) {
  const [expanded, setExpanded] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const listId = useId();
  const headingId = useId();

  return (
    <>
      <aside className={cx(styles.index)} aria-labelledby={headingId}>
        <div className={cx(styles.indexHeader)}>
          <MenuBookIcon fontSize="small" aria-hidden="true" />
          <h2 id={headingId} className={cx(styles.indexHeading)}>{LESSON_INDEX_COPY.heading}</h2>
          <IconButton
            size="small"
            aria-label={expanded ? LESSON_INDEX_COPY.hide : LESSON_INDEX_COPY.show}
            aria-expanded={expanded}
            aria-controls={listId}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </div>
        <div id={listId} hidden={!expanded}>
          <LessonIndexList moduleId={moduleId} entries={entries} />
        </div>
      </aside>
      <Button
        variant="outlined"
        startIcon={<MenuBookIcon />}
        className={cx(styles.indexSheetButton)}
        onClick={() => setSheetOpen(true)}
      >
        {LESSON_INDEX_COPY.heading}
      </Button>
      <Drawer anchor="right" open={sheetOpen} onClose={() => setSheetOpen(false)} classes={{ paper: cx(styles.indexSheet) }}>
        <div className={cx(styles.indexHeader)}>
          <h2 className={cx(styles.indexHeading)}>{LESSON_INDEX_COPY.heading}</h2>
          <IconButton size="small" aria-label={LESSON_INDEX_COPY.close} onClick={() => setSheetOpen(false)}>
            <CloseIcon />
          </IconButton>
        </div>
        <LessonIndexList moduleId={moduleId} entries={entries} onNavigate={() => setSheetOpen(false)} />
      </Drawer>
    </>
  );
}
