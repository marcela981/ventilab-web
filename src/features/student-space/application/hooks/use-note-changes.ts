/*
* Funcionalidad: useNoteChanges
* Descripción: Cache refresh after a note changes in /me/notes. After an edit (the student space page is already updated in place) the notes of the learning lesson viewer (LESSON_NOTES_PATH, so the lesson shows the edited note) and the home summary refresh; after a deletion every notes read of the student space (`GET /api/notes`, any filters) refreshes too. Depends on React, SWR, @shared/api-client, the learning public paths and the student space service. v1.1 (B2 closure): the module notes endpoint is no longer read by the student space.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback } from "react";
import { useSWRConfig } from "swr";
import { invalidateApiQueries } from "@shared/api-client/use-api-query";
import { LESSON_NOTES_PATH } from "@features/learning";
import { ME_SUMMARY_PATH, NOTES_PATH } from "../../api/services/student-space.service";

const AFTER_EDIT_PATHS = [LESSON_NOTES_PATH, ME_SUMMARY_PATH] as const;
const AFTER_DELETE_PATHS = [NOTES_PATH, LESSON_NOTES_PATH, ME_SUMMARY_PATH] as const;

export type NoteChanges = {
  afterEdit: () => Promise<void>
  afterDelete: () => Promise<void>
};

export function useNoteChanges(): NoteChanges {
  const { mutate } = useSWRConfig();

  const afterEdit = useCallback(async() => {
    await invalidateApiQueries(mutate, AFTER_EDIT_PATHS);
  }, [mutate]);

  const afterDelete = useCallback(async() => {
    await invalidateApiQueries(mutate, AFTER_DELETE_PATHS);
  }, [mutate]);

  return { afterEdit, afterDelete };
}
