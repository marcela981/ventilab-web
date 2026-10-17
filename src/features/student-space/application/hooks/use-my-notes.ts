/*
* Funcionalidad: useMyNotes
* Descripción: Reads one page of the caller's notes through useApiQuery: `GET /api/notes` when no module is selected, `GET /api/notes/modules/{moduleId}` when one is (page, limit, newest first), mapped to a NotesPage. The previous page stays on screen while the next one loads (keepPreviousData). replaceNote updates a saved note in the cached page without a request (autosave). Depends on React, @shared/api-client, the learning Note type and the student space mapper, service and entities.
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
import type { Note } from "@features/learning";
import { toNotesPage } from "../../api/mappers/my-notes.mapper";
import { MODULE_NOTES_PATH, NOTES_PATH } from "../../api/services/student-space.service";
import type { NotesPage, NotesQuery } from "../entities/my-notes.entity";

export type UseMyNotesResult = {
  page: NotesPage | null
  isLoading: boolean
  error: ApiError | null
  reload: () => Promise<void>
  replaceNote: (note: Note) => Promise<void>
};

const NOTES_QUERY_CONFIG = { keepPreviousData: true } as const;

type CachedNotes = { data: Array<{ id: string, content: Record<string, unknown>, updatedAt: string }> };

function replaceIn<T extends CachedNotes>(note: Note) {
  return (current: T | undefined): T | undefined => (
    current
      ? { ...current, data: current.data.map((item) => (item.id === note.id ? { ...item, content: note.content, updatedAt: note.updatedAt } : item)) }
      : current
  );
}

export function useMyNotes(moduleId: string | null, query: NotesQuery): UseMyNotesResult {
  const all = useApiQuery(moduleId ? null : NOTES_PATH, { query }, NOTES_QUERY_CONFIG);
  const byModule = useApiQuery(moduleId ? MODULE_NOTES_PATH : null, { params: { moduleId: moduleId ?? "" }, query }, NOTES_QUERY_CONFIG);
  const { data, error, isLoading } = moduleId ? byModule : all;
  const page = useMemo(() => (data ? toNotesPage(data.data, data.pagination) : null), [data]);
  const mutateAll = all.mutate;
  const mutateModule = byModule.mutate;

  const reload = useCallback(async() => {
    await (moduleId ? mutateModule() : mutateAll());
  }, [moduleId, mutateAll, mutateModule]);

  const replaceNote = useCallback(async(note: Note) => {
    if (moduleId) {
      await mutateModule(replaceIn(note), { revalidate: false });
    } else {
      await mutateAll(replaceIn(note), { revalidate: false });
    }
  }, [moduleId, mutateAll, mutateModule]);

  return { page, isLoading, error: error ?? null, reload, replaceNote };
}
