/*
* Funcionalidad: useLessonNotes
* Descripción: The caller's own notes of a lesson (`GET /api/notes/lessons/{lessonId}`, newest first, one page of LESSON_NOTES_LIMIT) through useApiQuery with the learning cache config, plus cache updates after the notes mutations: `upsert` writes a saved note into the cached list without refetching (autosave would otherwise refetch every second) and `remove` drops a deleted note and revalidates. The backend answers ONLY the caller's notes (owner-only, no role exception), so a teacher/admin previewing a lesson sees only their own notes. Depends on @shared/api-client, the notes mapper/service and the note entity.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useMemo } from "react";
import type { ApiError } from "@shared/api-client/api-error";
import { useApiQuery } from "@shared/api-client/use-api-query";
import { toNotes } from "../../api/mappers/notes.mapper";
import { LESSON_NOTES_LIMIT, LESSON_NOTES_PATH } from "../../api/services/notes.service";
import { removeNote, upsertNote } from "../entities/note.entity";
import type { Note } from "../entities/note.entity";
import { LEARNING_QUERY_CONFIG } from "../entities/learning-query-config";

export type UseLessonNotesResult = {
  notes: Note[] | null
  isLoading: boolean
  error: ApiError | null
  reload: () => Promise<void>
  upsert: (note: Note) => Promise<void>
  remove: (noteId: string) => Promise<void>
};

export function useLessonNotes(lessonId: string | null): UseLessonNotesResult {
  const { data, error, isLoading, mutate } = useApiQuery(
    lessonId ? LESSON_NOTES_PATH : null,
    { params: { lessonId: lessonId ?? "" }, query: { limit: LESSON_NOTES_LIMIT } },
    LEARNING_QUERY_CONFIG,
  );
  const notes = useMemo(() => (data ? toNotes(data.data) : null), [data]);

  const reload = useCallback(async() => {
    await mutate();
  }, [mutate]);

  const upsert = useCallback(async(note: Note) => {
    await mutate((current) => (current ? { ...current, data: upsertNote(current.data, note) } : current), { revalidate: false });
  }, [mutate]);

  const remove = useCallback(async(noteId: string) => {
    await mutate((current) => (current ? { ...current, data: removeNote(current.data, noteId) } : current), { revalidate: true });
  }, [mutate]);

  return { notes, isLoading, error: error ?? null, reload, upsert, remove };
}
