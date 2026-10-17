/*
* Funcionalidad: useMyNotes
* Descripción: Reads one page of the caller's notes through useApiQuery (`GET /api/notes` with page, limit, newest first and the server-side filters search, moduleId, lessonId and pageId of the NotesQuery), mapped to a NotesPage. The previous page stays on screen while the next one loads (keepPreviousData). replaceNote updates a saved note in the cached page without a request (autosave). Depends on React, @shared/api-client, the learning Note type and the student space mapper, service and entities. v1.1 (B2 closure): one endpoint with server-side filters instead of the per-module endpoint.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useMemo } from "react";
import type { ApiError } from "@shared/api-client/api-error";
import { useApiQuery } from "@shared/api-client/use-api-query";
import type { Note } from "@features/learning";
import { toNotesPage } from "../../api/mappers/my-notes.mapper";
import { NOTES_PATH } from "../../api/services/student-space.service";
import type { NotesPage, NotesQuery } from "../entities/my-notes.entity";

export type UseMyNotesResult = {
  page: NotesPage | null
  isLoading: boolean
  error: ApiError | null
  reload: () => Promise<void>
  replaceNote: (note: Note) => Promise<void>
};

const NOTES_QUERY_CONFIG = { keepPreviousData: true } as const;

export function useMyNotes(query: NotesQuery): UseMyNotesResult {
  const { data, error, isLoading, mutate } = useApiQuery(NOTES_PATH, { query }, NOTES_QUERY_CONFIG);
  const page = useMemo(() => (data ? toNotesPage(data.data, data.pagination) : null), [data]);

  const reload = useCallback(async() => {
    await mutate();
  }, [mutate]);

  const replaceNote = useCallback(async(note: Note) => {
    await mutate(
      (current) => (current
        ? { ...current, data: current.data.map((item) => (item.id === note.id ? { ...item, content: note.content, updatedAt: note.updatedAt } : item)) }
        : current),
      { revalidate: false },
    );
  }, [mutate]);

  return { page, isLoading, error: error ?? null, reload, replaceNote };
}
