/*
* Funcionalidad: LessonNotesPanel
* Descripción: "Notas" tab of the lesson viewer side panel. Lists the caller's own notes of the lesson, newest first (each one rendered by NoteItem with its anchor page link), creates a note ("Nueva nota", optionally anchored to the current page) and edits one in place with the lazy Tiptap NoteComposer (debounced autosave, the cached list is updated with every saved note), deletes a note after a confirmation dialog (then removes it from the cache and revalidates) and runs the AI analysis of the lesson notes. Privacy: `GET /api/notes/lessons/{lessonId}` answers ONLY the caller's notes (owner-only on the backend, no role exception), so in teacher/admin preview mode this panel shows only the viewer's own notes, never a student's. Depends on MUI, @shared/design-system, the notes hooks/service/entities, NoteItem, NoteComposer, NotesAnalysisSection and the notes CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import AddIcon from "@mui/icons-material/Add";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import { useCallback, useState } from "react";
import { ConfirmDialog } from "@shared/design-system/components/confirm-dialog";
import { ErrorState } from "@shared/design-system/components/error-state";
import { ListSkeleton } from "@shared/design-system/components/skeleton";
import { cx } from "@shared/lib/class-names";
import { deleteNote } from "../../../api/services/notes.service";
import { getLearningErrorMessage } from "../../entities/learning-error-messages";
import type { LessonPage } from "../../entities/lesson.entity";
import { notePageNumber } from "../../entities/note.entity";
import type { Note } from "../../entities/note.entity";
import { useLessonNotes } from "../../hooks/use-lesson-notes";
import { NoteComposer } from "./note-composer";
import { NoteItem } from "./note-item";
import { NotesAnalysisSection } from "./notes-analysis-section";
import styles from "../../../UI/notes-panel.module.css";

// TODO(i18n): move to a learning namespace in src/i18n.
const COPY = {
  newNote: "Nueva nota",
  loading: "Cargando tus notas…",
  loadErrorTitle: "No se pudieron cargar tus notas",
  empty: "Todavía no tienes notas en esta lección.",
  listLabel: "Mis notas de la lección",
  deleteTitle: "¿Eliminar esta nota?",
  deleteDescription: "Esta acción no se puede deshacer.",
  deleteConfirm: "Eliminar",
} as const;

const NEW_NOTE = "new";

export type LessonNotesPanelProps = {
  moduleId: string
  lessonId: string
  // Page shown in the viewer: the anchor of a new note.
  currentPageId: string | null
  // Ordered Pages of the lesson (already loaded by the viewer) to resolve anchors to page numbers.
  pages: readonly LessonPage[] | null
};

export function LessonNotesPanel({ moduleId, lessonId, currentPageId, pages }: LessonNotesPanelProps) {
  const { notes, error, reload, upsert, remove } = useLessonNotes(lessonId);
  // NEW_NOTE, the id of the note being edited, or null.
  const [editing, setEditing] = useState<string | null>(null);
  // Id given by the backend to the note created by the open "new note" composer (hidden from the list meanwhile).
  const [draftId, setDraftId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Note | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<unknown>(null);

  const handleSaved = useCallback((note: Note) => {
    void upsert(note);
  }, [upsert]);

  const handleDraftSaved = useCallback((note: Note) => {
    setDraftId(note.id);
    void upsert(note);
  }, [upsert]);

  const closeEditor = useCallback(() => {
    setEditing(null);
    setDraftId(null);
  }, []);

  const confirmDelete = async() => {
    if (!deleteTarget) {
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteNote(deleteTarget.id);
      await remove(deleteTarget.id);
      setDeleteTarget(null);
    } catch (caught) {
      setDeleteError(caught);
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const renderList = () => {
    if (!notes) {
      return error
        ? <ErrorState title={COPY.loadErrorTitle} description={getLearningErrorMessage(error)} onRetry={() => void reload()} />
        : <ListSkeleton label={COPY.loading} />;
    }

    const visible = editing === NEW_NOTE ? notes.filter((note) => note.id !== draftId) : notes;

    if (visible.length === 0) {
      return editing === NEW_NOTE ? null : <p className={cx(styles.empty)}>{COPY.empty}</p>;
    }

    return (
      <ul className={cx(styles.list)} aria-label={COPY.listLabel}>
        {visible.map((note) => (
          <NoteItem
            key={note.id}
            note={note}
            moduleId={moduleId}
            pageNumber={notePageNumber(note.pageId, pages)}
            editor={editing === note.id
              ? <NoteComposer lessonId={lessonId} note={note} currentPageId={currentPageId} onSaved={handleSaved} onClose={closeEditor} />
              : undefined}
            onEdit={() => setEditing(note.id)}
            onDelete={() => setDeleteTarget(note)}
          />
        ))}
      </ul>
    );
  };

  return (
    <div className={cx(styles.panel)}>
      <div className={cx(styles.toolbar)}>
        <Button size="small" variant="contained" startIcon={<AddIcon />} disabled={editing !== null} onClick={() => setEditing(NEW_NOTE)}>
          {COPY.newNote}
        </Button>
      </div>
      {editing === NEW_NOTE ? (
        <NoteComposer lessonId={lessonId} note={null} currentPageId={currentPageId} onSaved={handleDraftSaved} onClose={closeEditor} />
      ) : null}
      {deleteError ? <Alert severity="error" onClose={() => setDeleteError(null)}>{getLearningErrorMessage(deleteError)}</Alert> : null}
      {renderList()}
      <NotesAnalysisSection lessonId={lessonId} canAnalyze={notes !== null && notes.length > 0} />
      <ConfirmDialog
        open={deleteTarget !== null}
        title={COPY.deleteTitle}
        description={COPY.deleteDescription}
        confirmLabel={COPY.deleteConfirm}
        destructive
        isPending={isDeleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
