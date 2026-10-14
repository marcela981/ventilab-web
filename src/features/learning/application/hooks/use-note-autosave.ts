/*
* Funcionalidad: useNoteAutosave
* Descripción: Debounced autosave of one lesson note while it is edited. `change(doc)` keeps only the latest document and schedules a save after NOTE_AUTOSAVE_DELAY_MS (1 s) of inactivity; `flush()` saves now (blur, "Listo", close) and resolves whether everything was saved; the pending edit is also flushed on unmount. Saves are serialized: a new note is created once with POST /api/notes (lessonId + the anchor pageId read at that moment) and every later edit PATCHes the created id, never before the POST resolved; the latest edit always wins. A new note is not created while its document has no text. Status: idle | saving | saved | error; a failed save keeps the edit pending and is not retried in a loop: `retry()` (or a new edit) tries again. Depends on react and the notes service.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useEffect, useRef, useState } from "react";
import { createNote, updateNoteContent } from "../../api/services/notes.service";
import { hasNoteText } from "../entities/note.entity";
import type { Note, NoteDoc } from "../entities/note.entity";

export const NOTE_AUTOSAVE_DELAY_MS = 1_000;

export type AutosaveStatus = "idle" | "saving" | "saved" | "error";

export type UseNoteAutosaveOptions = {
  lessonId: string
  // Note being edited; null for a new note (created on the first save).
  initialNote: Note | null
  // Page sent with the POST of a new note; ignored once the note exists.
  anchorPageId: string | null
  onSaved: (note: Note) => void
  delayMs?: number
};

export type NoteAutosave = {
  status: AutosaveStatus
  noteId: string | null
  change: (doc: NoteDoc) => void
  // Saves now; resolves true when nothing is left unsaved.
  flush: () => Promise<boolean>
  retry: () => Promise<boolean>
};

export function useNoteAutosave({
  lessonId,
  initialNote,
  anchorPageId,
  onSaved,
  delayMs = NOTE_AUTOSAVE_DELAY_MS,
}: UseNoteAutosaveOptions): NoteAutosave {
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const [noteId, setNoteId] = useState<string | null>(initialNote?.id ?? null);
  const noteIdRef = useRef<string | null>(initialNote?.id ?? null);
  const pendingRef = useRef<NoteDoc | null>(null);
  const runningRef = useRef<Promise<void> | null>(null);
  const failedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Latest values read by the async save loop without re-creating the callbacks.
  const contextRef = useRef({ lessonId, anchorPageId, onSaved });

  useEffect(() => {
    contextRef.current = { lessonId, anchorPageId, onSaved };
  }, [lessonId, anchorPageId, onSaved]);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const persist = useCallback((doc: NoteDoc): Promise<Note> => {
    const id = noteIdRef.current;
    const context = contextRef.current;

    return id === null
      ? createNote({ lessonId: context.lessonId, pageId: context.anchorPageId, content: doc })
      : updateNoteContent(id, doc);
  }, []);

  const drain = useCallback(async(): Promise<void> => {
    while (pendingRef.current !== null) {
      const doc = pendingRef.current;

      if (noteIdRef.current === null && !hasNoteText(doc)) {
        // Nothing worth creating yet: drop the empty draft.
        pendingRef.current = null;

        return;
      }

      pendingRef.current = null;
      setStatus("saving");

      try {
        const saved = await persist(doc);

        noteIdRef.current = saved.id;
        setNoteId(saved.id);
        contextRef.current.onSaved(saved);
      } catch {
        // Keep the failed document unless a newer edit already replaced it.
        pendingRef.current ??= doc;
        failedRef.current = true;
        setStatus("error");

        return;
      }
    }

    setStatus("saved");
  }, [persist]);

  const flushPending = useCallback((): Promise<void> => {
    clearTimer();

    const running = runningRef.current;

    if (running) {
      // Serialize: an edit made while a save is in flight is saved right after it (e.g. PATCH after the POST).
      return running.then(() => (pendingRef.current !== null && !failedRef.current ? flushPending() : undefined));
    }

    if (pendingRef.current === null || failedRef.current) {
      return Promise.resolve();
    }

    const run = drain().finally(() => {
      if (runningRef.current === run) {
        runningRef.current = null;
      }
    });

    runningRef.current = run;

    return run;
  }, [clearTimer, drain]);

  const flush = useCallback(
    (): Promise<boolean> => flushPending().then(() => pendingRef.current === null),
    [flushPending],
  );

  const change = useCallback((doc: NoteDoc) => {
    pendingRef.current = doc;
    failedRef.current = false;
    clearTimer();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void flushPending();
    }, delayMs);
  }, [clearTimer, delayMs, flushPending]);

  const retry = useCallback((): Promise<boolean> => {
    failedRef.current = false;

    return flush();
  }, [flush]);

  useEffect(() => () => {
    // Closing the editor must not lose the last keystrokes.
    void flushPending();
  }, [flushPending]);

  return { status, noteId, change, flush, retry };
}
