/*
* Funcionalidad: NoteItem
* Descripción: One saved lesson note in the notes panel: its Tiptap document rendered by the pure TiptapDocView (no Tiptap loaded), the anchor indicator (link "Pág. N" to the anchored page URL when its pageId is in the lesson Pages, "Página no disponible" when the page is unknown, nothing for a free note), the last update time and the edit/delete actions. Depends on MUI, next/link, @shared/rich-content (TiptapDocView only), the learning URLs and the notes CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import IconButton from "@mui/material/IconButton";
import Link from "next/link";
import type { ReactNode } from "react";
import { cx } from "@shared/lib/class-names";
import { TiptapDocView } from "@shared/rich-content/blocks/tiptap-doc-view";
import { buildLessonPageUrl } from "../../entities/learning-urls";
import type { Note } from "../../entities/note.entity";
import styles from "../../../UI/notes-panel.module.css";

// TODO(i18n): move to a learning namespace in src/i18n.
const COPY = {
  page: (page: number) => `Pág. ${page}`,
  goToPage: (page: number) => `Ir a la página ${page}`,
  unknownPage: "Página no disponible",
  edit: "Editar nota",
  delete: "Eliminar nota",
} as const;

const DATE_FORMAT = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" });

export type NoteItemProps = {
  note: Note
  moduleId: string
  // 1-based page of the anchor inside the lesson; null when the note is free or the page is unknown.
  pageNumber: number | null
  // Replaces the read-only body while the note is being edited.
  editor?: ReactNode
  onEdit: () => void
  onDelete: () => void
};

function PageIndicator({ note, moduleId, pageNumber }: Pick<NoteItemProps, "note" | "moduleId" | "pageNumber">) {
  if (note.pageId === null) {
    return null;
  }

  if (pageNumber === null) {
    return <span className={cx(styles.pageUnknown)}>{COPY.unknownPage}</span>;
  }

  return (
    <Link href={buildLessonPageUrl(moduleId, note.lessonId, pageNumber)} aria-label={COPY.goToPage(pageNumber)} className={cx(styles.pageLink)}>
      {COPY.page(pageNumber)}
    </Link>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "" : DATE_FORMAT.format(date);
}

export function NoteItem({ note, moduleId, pageNumber, editor, onEdit, onDelete }: NoteItemProps) {
  return (
    <li className={cx(styles.item)}>
      {editor ?? <TiptapDocView doc={note.content} className={cx(styles.itemBody)} />}
      <div className={cx(styles.itemFooter)}>
        <PageIndicator note={note} moduleId={moduleId} pageNumber={pageNumber} />
        <time dateTime={note.updatedAt} className={cx(styles.time)}>{formatDate(note.updatedAt)}</time>
        {editor ? null : (
          <span className={cx(styles.actions)}>
            <IconButton size="small" aria-label={COPY.edit} onClick={onEdit}>
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" aria-label={COPY.delete} onClick={onDelete}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </span>
        )}
      </div>
    </li>
  );
}
