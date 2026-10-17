/*
* Funcionalidad: LessonNotesGroup
* Descripción: One lesson of /me/notes: lesson title with "Ir a la lección" (page 1 of the lesson in the learning viewer) and its notes rendered with the learning NoteItem (anchor page link resolved with the lesson Pages, date, edit and delete actions); the note being edited is replaced by the learning NoteComposer (lazy Tiptap editor with autosave). While the lesson read is pending or failed the title falls back to a generic label and page links are not offered. Depends on next/link, @features/learning (NoteItem, NoteComposer, notePageNumber, useLessonPages, buildLessonPageUrl), the student space entities and the student space CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Link from "next/link";
import { useId } from "react";
import { buildLessonPageUrl, NoteComposer, NoteItem, notePageNumber, useLessonPages } from "@features/learning";
import type { Note } from "@features/learning";
import { cx } from "@shared/lib/class-names";
import type { NoteLessonInfo } from "../entities/my-notes.entity";
import styles from "../../UI/student-space.module.css";

// TODO(i18n): move to a student-space namespace in src/i18n.
export const LESSON_GROUP_COPY = {
  unknownLesson: "Lección",
  openLesson: "Ir a la lección",
  openLessonAria: (title: string) => `Ir a la lección ${title}`,
  notesOf: (title: string) => `Notas de ${title}`,
} as const;

export type LessonNotesGroupProps = {
  lessonId: string
  lesson: NoteLessonInfo | null
  notes: readonly Note[]
  editingId: string | null
  onEdit: (note: Note) => void
  onDelete: (note: Note) => void
  onSaved: (note: Note) => void
  onCloseEditor: () => void
};

export function LessonNotesGroup({ lessonId, lesson, notes, editingId, onEdit, onDelete, onSaved, onCloseEditor }: LessonNotesGroupProps) {
  const headingId = useId();
  const { pages } = useLessonPages(lesson ? lessonId : null);
  const title = lesson?.lessonTitle ?? LESSON_GROUP_COPY.unknownLesson;

  return (
    <section aria-labelledby={headingId} className={cx(styles.lessonGroup)}>
      <div className={cx(styles.lessonHeader)}>
        <h3 id={headingId} className={cx(styles.lessonTitle)}>{title}</h3>
        {lesson ? (
          <Link href={buildLessonPageUrl(lesson.moduleId, lessonId)} aria-label={LESSON_GROUP_COPY.openLessonAria(title)} className={cx(styles.link)}>
            {LESSON_GROUP_COPY.openLesson}
          </Link>
        ) : null}
      </div>
      <ul className={cx(styles.noteList)} aria-label={LESSON_GROUP_COPY.notesOf(title)}>
        {notes.map((note) => (
          <NoteItem
            key={note.id}
            note={note}
            moduleId={lesson?.moduleId ?? ""}
            pageNumber={lesson ? notePageNumber(note.pageId, pages) : null}
            editor={editingId === note.id
              ? <NoteComposer lessonId={lessonId} note={note} currentPageId={null} onSaved={onSaved} onClose={onCloseEditor} />
              : undefined}
            onEdit={() => onEdit(note)}
            onDelete={() => onDelete(note)}
          />
        ))}
      </ul>
    </section>
  );
}
