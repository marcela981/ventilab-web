/*
* Funcionalidad: useNoteLesson
* Descripción: Reads the lesson of a note (`GET /api/lessons/{id}`) through useApiQuery and maps it to the NoteLessonInfo (lesson title and order, module id and title) that places the note in its module; NoteDTO carries only the lessonId (BACKEND GAP). Reads are cached and deduplicated by SWR, so a page of notes reads each lesson once (precedent: ai-chat use-conversation-origin). Depends on React, @shared/api-client and the student space mapper, service and entities.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useMemo } from "react";
import type { ApiError } from "@shared/api-client/api-error";
import { useApiQuery } from "@shared/api-client/use-api-query";
import { toNoteLessonInfo } from "../../api/mappers/my-notes.mapper";
import { LESSON_DETAIL_PATH } from "../../api/services/student-space.service";
import type { NoteLessonInfo } from "../entities/my-notes.entity";

const LESSON_QUERY_CONFIG = { revalidateOnFocus: false, revalidateIfStale: false } as const;

export type UseNoteLessonResult = {
  lesson: NoteLessonInfo | null
  error: ApiError | null
};

export function useNoteLesson(lessonId: string): UseNoteLessonResult {
  const { data, error } = useApiQuery(LESSON_DETAIL_PATH, { params: { id: lessonId } }, LESSON_QUERY_CONFIG);
  const lesson = useMemo(() => (data && data.data.id === lessonId ? toNoteLessonInfo(data.data) : null), [data, lessonId]);

  return { lesson, error: error ?? null };
}
