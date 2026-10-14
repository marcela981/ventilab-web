/*
* Funcionalidad: NoteComposer
* Descripción: Create/edit form of one lesson note inside the notes panel: optional "Anclar a esta página" checkbox for a new note (sends the current pageId with the POST; locked once the note exists), the Tiptap editor loaded on demand (React.lazy + retryImport, design-system error boundary and skeleton fallback, C1 pattern) so Tiptap never enters the viewer's First Load JS, the autosave status ("Guardando…" / "Guardado" / "Error al guardar" with "Reintentar") and "Listo", which flushes the pending save and closes only when everything was saved. Blur flushes too, and unmounting flushes the last edit (useNoteAutosave). Depends on MUI, @shared/design-system, @shared/lib/retry-import, useNoteAutosave and the notes CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import { lazy, Suspense, useCallback, useState } from "react";
import { RouteErrorBoundary } from "@shared/design-system/components/route-error-boundary";
import { CardSkeleton } from "@shared/design-system/components/skeleton";
import { cx } from "@shared/lib/class-names";
import { retryImport } from "@shared/lib/retry-import";
import type { Note } from "../../entities/note.entity";
import { useNoteAutosave } from "../../hooks/use-note-autosave";
import type { AutosaveStatus } from "../../hooks/use-note-autosave";
import styles from "../../../UI/notes-panel.module.css";

const NoteEditor = lazy(() =>
  retryImport(() => import("./note-editor")).then((module) => ({ default: module.NoteEditor })),
);

// TODO(i18n): move to a learning namespace in src/i18n.
const COPY = {
  anchor: "Anclar a esta página",
  editorLabel: "Contenido de la nota",
  placeholder: "Escribe tu nota…",
  loadingEditor: "Cargando el editor…",
  done: "Listo",
  retry: "Reintentar",
} as const;

const STATUS_COPY: Record<AutosaveStatus, string> = {
  idle: "Se guarda automáticamente",
  saving: "Guardando…",
  saved: "Guardado",
  error: "Error al guardar",
};

export type NoteComposerProps = {
  lessonId: string
  // Note being edited; null to create a new one.
  note: Note | null
  currentPageId: string | null
  onSaved: (note: Note) => void
  onClose: () => void
};

export function NoteComposer({ lessonId, note, currentPageId, onSaved, onClose }: NoteComposerProps) {
  // The anchor is the page shown when the composer opened, even if the viewer moves on meanwhile.
  const [openedOnPageId] = useState(currentPageId);
  const [anchored, setAnchored] = useState(openedOnPageId !== null);
  const autosave = useNoteAutosave({ lessonId, initialNote: note, anchorPageId: anchored ? openedOnPageId : null, onSaved });
  const { flush } = autosave;
  const canAnchor = note === null && openedOnPageId !== null;

  const handleBlur = useCallback(() => {
    void flush();
  }, [flush]);

  const handleDone = async() => {
    if (await flush()) {
      onClose();
    }
  };

  return (
    <div className={cx(styles.composer)}>
      {canAnchor ? (
        <FormControlLabel
          control={(
            <Checkbox
              checked={anchored}
              onChange={(event) => setAnchored(event.target.checked)}
              disabled={autosave.noteId !== null}
              size="small"
            />
          )}
          label={COPY.anchor}
        />
      ) : null}
      <RouteErrorBoundary>
        <Suspense fallback={<CardSkeleton label={COPY.loadingEditor} />}>
          <NoteEditor
            initialContent={note?.content ?? null}
            label={COPY.editorLabel}
            placeholder={COPY.placeholder}
            onChange={autosave.change}
            onBlur={handleBlur}
          />
        </Suspense>
      </RouteErrorBoundary>
      <div className={cx(styles.composerFooter)}>
        <span role="status" className={cx(styles.saveStatus, autosave.status === "error" && styles.saveStatusError)}>
          {STATUS_COPY[autosave.status]}
        </span>
        {autosave.status === "error" ? (
          <Button size="small" onClick={() => void autosave.retry()}>{COPY.retry}</Button>
        ) : null}
        <Button size="small" variant="contained" onClick={() => void handleDone()}>{COPY.done}</Button>
      </div>
    </div>
  );
}
